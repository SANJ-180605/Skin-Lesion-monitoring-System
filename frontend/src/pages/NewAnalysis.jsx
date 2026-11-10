
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  UserPlus,
  Save,
  AlertCircle,
  CheckCircle2,
  Download,
  Camera,
  Info,
  Check
} from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import SegmentationViewer from '../components/SegmentationViewer';
import ConfidenceCard from '../components/ConfidenceCard';
import ProbabilityChart from '../components/ProbabilityChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { predictLesion, getPatients, linkAnalysisToPatient, downloadAnalysisReport } from '../services/api';

const NewAnalysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [patientId, setPatientId] = useState('');
  const [spotName, setSpotName] = useState('');
  const [notes, setNotes] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchPatientsList = async () => {
      try {
        const res = await getPatients();
        setPatients(res.data);
      } catch (err) {
        console.warn('Could not load profile list:', err);
      }
    };
    fetchPatientsList();
  }, []);

  const handleLoadSample = async () => {
    try {
      const res = await fetch('/samples/sample_spot_1.jpg');
      const blob = await res.blob();
      const file = new File([blob], 'sample_spot_1.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setError(null);
    } catch (e) {
      console.error('Failed to load sample image:', e);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select or take a photo of the skin spot first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (patientId) formData.append('patient_id', patientId);
      formData.append('spot_name', spotName.trim() || 'Skin Spot');
      if (notes) formData.append('notes', notes);

      const res = await predictLesion(formData);
      setResult(res.data);
    } catch (err) {
      console.error('Inference error:', err);
      const detail = err.response?.data?.detail || err.message || 'Analysis failed.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPatient = async () => {
    if (!result || !patientId) return;
    try {
      await linkAnalysisToPatient(result.analysis_id, { 
        patient_id: patientId, 
        spot_name: spotName.trim() || result.spot_name || 'Skin Spot',
        notes 
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('Failed to link spot check to profile.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Check a Skin Spot or Mole
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload a clear photo to trace its boundary and check AI pattern likelihood.
        </p>
      </div>

      {/* Upload & Setup Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Image Uploader */}
          <div className="md:col-span-2 space-y-4">
            <ImageUploader
              onImageSelected={(file) => setSelectedFile(file)}
              selectedFile={selectedFile}
              label="Select or Drop Your Skin Spot Photo"
              description="Supports JPEG, PNG, or WEBP (Max 15MB)"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs font-semibold text-brand-700 hover:text-brand-900 underline flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Don't have a photo right now? Load a demo sample spot
              </button>
            </div>

            {/* Photo Taking Tips */}
            <div className="p-4 bg-brand-50/60 rounded-2xl border border-brand-100 space-y-1.5 text-xs text-brand-900">
              <span className="font-bold flex items-center gap-1.5 text-brand-800">
                <Camera className="w-4 h-4 text-brand-600" />
                Tips for Best Results:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Good daylight or soft flash
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Sharp focus on the mole
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Close-up (4-6 inches away)
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Spot centered in frame
                </li>
              </ul>
            </div>
          </div>

          {/* Right 1 Col: Profile & Notes */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assign to Profile (Optional)
                </label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- General / Myself --</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.patient_name} ({p.patient_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Spot Name / Body Location</span>
                  <span className="text-[10px] text-brand-600 font-semibold normal-case">e.g. Upper Back Mole</span>
                </label>
                <input
                  type="text"
                  value={spotName}
                  onChange={(e) => setSpotName(e.target.value)}
                  placeholder="e.g. Upper Back Mole, Left Forearm Spot..."
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Noticed it looks darker lately, slightly raised..."
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !selectedFile}
              className={`
                w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all
                flex items-center justify-center space-x-2
                ${loading || !selectedFile
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 active:scale-[0.98]'}
              `}
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Checking with AI...' : 'Analyze My Skin Spot'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Check Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading Spinner */}
      {loading && <LoadingSpinner message="Tracing spot borders and calculating AI match likelihood..." />}

      {/* Inferred Results Sections */}
      {result && !loading && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section 1: Spot Boundary */}
          <section>
            <SegmentationViewer
              originalUrl={result.original_image_url}
              maskUrl={result.mask_image_url}
              overlayUrl={result.overlay_image_url}
              metrics={result.segmentation_metrics}
            />
          </section>

          {/* Section 2: Three-Class Assessment */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConfidenceCard
              predictedClass={result.predicted_class}
              confidenceScore={result.confidence_score}
              modelName={result.model_name}
              modelVersion={result.model_version}
            />

            <ProbabilityChart
              probabilities={result.probabilities}
            />
          </section>

          {/* Section 3: Summary & PDF Report */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-600" />
                  Your Spot Check Summary
                </h3>
                <p className="text-xs text-slate-500">Record #{result.analysis_id}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => downloadAnalysisReport(result.analysis_id)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report to Show Doctor</span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-medium">Assigned Profile</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {result.patient_id || 'General Check'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-medium">AI Category</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {result.predicted_class}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-medium">AI Confidence</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {result.confidence_score.toFixed(1)}% match
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-medium">Scan Time</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {new Date(result.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Quick Profile Link */}
            {!result.patient_id && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <UserPlus className="w-4 h-4 text-slate-400" />
                  <span>Save this result to a specific family member's profile?</span>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="text-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-800"
                  >
                    <option value="">Choose Profile</option>
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>{p.patient_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkPatient}
                    disabled={!patientId}
                    className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    Save
                  </button>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default NewAnalysis;
