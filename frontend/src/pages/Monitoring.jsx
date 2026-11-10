import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  FileText, 
  Download, 
  AlertCircle, 
  Info,
  Calendar,
  Sparkles,
  Camera,
  Check,
  Clock
} from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import MonitoringComparison from '../components/MonitoringComparison';
import MeasurementTable from '../components/MeasurementTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { compareMonitoring, getPatients, getAllHistory, downloadMonitoringReport } from '../services/api';

const Monitoring = () => {
  const [prevFile, setPrevFile] = useState(null);
  const [currFile, setCurrFile] = useState(null);
  const [patientId, setPatientId] = useState('');
  const [spotName, setSpotName] = useState('');
  const [notes, setNotes] = useState('');
  const [patients, setPatients] = useState([]);
  const [pastAnalyses, setPastAnalyses] = useState([]);
  const [earlierMode, setEarlierMode] = useState('upload'); // 'upload' | 'history'
  const [selectedPastId, setSelectedPastId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [patientsRes, historyRes] = await Promise.all([
          getPatients(),
          getAllHistory()
        ]);
        setPatients(patientsRes.data || []);
        setPastAnalyses(historyRes.data?.analyses || []);
      } catch (err) {
        console.warn('Could not load initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  const handleSelectPastAnalysis = async (anlId) => {
    setSelectedPastId(anlId);
    if (!anlId) return;
    const anl = pastAnalyses.find(a => a.analysis_id === anlId);
    if (!anl) return;
    
    try {
      const res = await fetch(anl.original_image_url);
      const blob = await res.blob();
      const file = new File([blob], `${anl.spot_name || 'past_spot'}.jpg`, { type: blob.type || 'image/jpeg' });
      setPrevFile(file);
      if (anl.spot_name && !spotName) {
        setSpotName(anl.spot_name);
      }
      if (anl.patient_id && !patientId) {
        setPatientId(anl.patient_id);
      }
      setError(null);
    } catch (e) {
      console.error('Failed to load past spot check image:', e);
    }
  };

  const handleLoadSamplePair = async () => {
    try {
      const res1 = await fetch('/samples/sample_spot_1.jpg');
      const blob1 = await res1.blob();
      const file1 = new File([blob1], 'sample_baseline.jpg', { type: 'image/jpeg' });
      setPrevFile(file1);
      setSelectedPastId('');

      const res2 = await fetch('/samples/sample_spot_2.jpg');
      const blob2 = await res2.blob();
      const file2 = new File([blob2], 'sample_followup.jpg', { type: 'image/jpeg' });
      setCurrFile(file2);
      setSpotName('Demo Sample Spot');
      setError(null);
    } catch (e) {
      console.error('Failed to load sample monitoring images:', e);
    }
  };

  const handleCompare = async () => {
    if (!prevFile || !currFile) {
      setError('Please choose both the earlier photo and the recent photo of the spot.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('previous_image', prevFile);
      formData.append('current_image', currFile);
      formData.append('spot_name', spotName.trim() || 'Skin Spot');
      if (patientId) formData.append('patient_id', patientId);
      if (notes) formData.append('notes', notes);

      const res = await compareMonitoring(formData);
      setResult(res.data);
    } catch (err) {
      console.error('Monitoring error:', err);
      const detail = err.response?.data?.detail || err.message || 'Comparison failed.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Spot Changes Over Time
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Compare two photos of the same mole to see if it has grown, changed border shape, or evolved.
        </p>
      </div>

      {/* Dual Image Uploaders */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs text-slate-500">Compare two photos of the same skin spot to measure changes</span>
          <button
            type="button"
            onClick={handleLoadSamplePair}
            className="text-xs font-semibold text-brand-700 hover:text-brand-900 underline flex items-center gap-1.5"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Load sample before & after photos
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Uploader 1: Earlier Photo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Earlier Photo (Baseline)</span>
              </span>

              {/* Toggle: Upload vs Choose from Past Checks */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setEarlierMode('upload')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    earlierMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setEarlierMode('history')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    earlierMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3 h-3 text-brand-600" />
                  <span>From Past Checks</span>
                  {pastAnalyses.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-brand-100 text-brand-700 rounded-full text-[10px] font-bold">
                      {pastAnalyses.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {earlierMode === 'upload' ? (
              <ImageUploader
                onImageSelected={(file) => { setPrevFile(file); setSelectedPastId(''); }}
                selectedFile={prevFile}
                label="Select Earlier Photo"
                description="Photo from your previous check or visit"
              />
            ) : (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                <div className="text-xs text-slate-600 font-semibold flex items-center justify-between">
                  <span>Select a saved check from your database:</span>
                  {selectedPastId && (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </div>

                {pastAnalyses.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pastAnalyses.map((anl) => (
                      <div
                        key={anl.analysis_id}
                        onClick={() => handleSelectPastAnalysis(anl.analysis_id)}
                        className={`p-2.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                          selectedPastId === anl.analysis_id
                            ? 'bg-brand-50 border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                            : 'bg-white border-slate-200 hover:border-brand-300'
                        }`}
                      >
                        <img
                          src={anl.overlay_image_url || anl.original_image_url}
                          alt="Past Spot"
                          className="w-12 h-12 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {anl.spot_name || 'Skin Spot'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(anl.created_at).toLocaleDateString()} • {anl.predicted_class} ({anl.confidence_score?.toFixed(0)}%)
                          </div>
                        </div>
                        {selectedPastId === anl.analysis_id && (
                          <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-xl text-center text-xs text-slate-400 border border-slate-200/60">
                    No past spot checks found yet in database. Use "Upload File" above or check a spot first!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Uploader 2: Recent Photo */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Recent Photo (Today)</span>
            </span>
            <ImageUploader
              onImageSelected={(file) => setCurrFile(file)}
              selectedFile={currFile}
              label="Select Recent Photo"
              description="Latest photo of the same mole or spot"
            />
          </div>
        </div>

        {/* Setup & Details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Spot Name / Location
            </label>
            <input
              type="text"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              placeholder="e.g. Upper Back Mole"
              className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Profile (Optional)
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Myself / General --</option>
              {patients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.patient_name} ({p.patient_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Time Elapsed / Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 3 months apart"
              className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <button
              onClick={handleCompare}
              disabled={loading || !prevFile || !currFile}
              className={`
                w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md transition-all
                flex items-center justify-center space-x-2
                ${loading || !prevFile || !currFile 
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 active:scale-[0.98]'}
              `}
            >
              <GitCompare className="w-4 h-4" />
              <span>{loading ? 'Aligning & Comparing...' : 'Compare Photos with AI'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-xs text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Comparison Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <LoadingSpinner message="Aligning photo angles, matching mole edges, and generating color change map..." />
      )}

      {/* Monitoring Outputs */}
      {result && !loading && (
        <div className="space-y-8 animate-fadeIn">
          {/* Comparison imagery & difference map */}
          <section>
            <MonitoringComparison monitoringData={result} />
          </section>

          {/* Morphometric Comparison Table */}
          <section>
            <MeasurementTable comparisonTable={result.comparison_table} />
          </section>

          {/* Download summary */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Comparison Ready</h3>
              <p className="text-xs text-slate-500">
                You can download a clean PDF summary of both photos to share with your dermatologist.
              </p>
            </div>

            <button
              onClick={() => downloadMonitoringReport(result.monitoring_id)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF to Show Doctor</span>
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default Monitoring;
