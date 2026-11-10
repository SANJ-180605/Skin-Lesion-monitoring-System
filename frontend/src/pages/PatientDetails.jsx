import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  User, 
  Sparkles, 
  GitCompare, 
  Calendar, 
  ArrowLeft, 
  FileText, 
  Clock,
  Layers,
  TrendingUp
} from 'lucide-react';
import { getPatient, getPatientHistory, downloadAnalysisReport, downloadMonitoringReport } from '../services/api';
import HistoryTable from '../components/HistoryTable';
import LoadingSpinner from '../components/LoadingSpinner';

const PatientDetails = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getPatientHistory(id);
        setPatient(res.data.patient);
        setAnalyses(res.data.analyses || []);
        setMonitoring(res.data.monitoring || []);
      } catch (err) {
        console.error('Failed to load patient history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <LoadingSpinner message="Retrieving profile & spot history..." />;
  if (!patient) return <div className="p-8 text-center text-slate-500">Profile not found.</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link to="/patients" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Family Profiles</span>
        </Link>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 font-bold text-xl">
              {patient.patient_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{patient.patient_name}</h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {patient.patient_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {patient.age ? `${patient.age} years old` : 'Age Unspecified'} • {patient.gender || 'Unspecified'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to={`/analysis`}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Check a Skin Spot</span>
            </Link>
            <Link
              to={`/monitoring`}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm"
            >
              <GitCompare className="w-4 h-4" />
              <span>Track Spot Changes</span>
            </Link>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Personal & Skin Notes</span>
            <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Analyses History Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <span>Spot Checks & AI Assessments</span>
            <span className="text-xs font-mono font-normal bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
              {analyses.length}
            </span>
          </h2>
        </div>

        <HistoryTable 
          analyses={analyses} 
          onSelectAnalysis={(a) => setSelectedAnalysis(a)}
        />
      </section>

      {/* Selected Analysis Modal / Flyout if clicked */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Spot Check Details ({selectedAnalysis.analysis_id})
              </h3>
              <button onClick={() => setSelectedAnalysis(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <img src={selectedAnalysis.original_image_url} alt="Original" className="rounded-lg object-contain bg-slate-900 h-40 w-full" />
                <span className="text-[11px] text-slate-500 font-medium block text-center mt-1">Your Photo</span>
              </div>
              <div>
                <img src={selectedAnalysis.mask_image_url} alt="Mask" className="rounded-lg object-contain bg-slate-900 h-40 w-full" />
                <span className="text-[11px] text-slate-500 font-medium block text-center mt-1">Spot Outline</span>
              </div>
              <div>
                <img src={selectedAnalysis.overlay_image_url} alt="Overlay" className="rounded-lg object-contain bg-slate-900 h-40 w-full" />
                <span className="text-[11px] text-slate-500 font-medium block text-center mt-1">Highlighted Boundary</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <p><b>AI Pattern Match:</b> <span className="font-semibold text-slate-800">{selectedAnalysis.predicted_class}</span></p>
              <p><b>Match Likelihood (Softmax):</b> <span className="font-semibold text-slate-800">{selectedAnalysis.confidence_score?.toFixed(1)}%</span></p>
              <p><b>Estimated Spot Area:</b> <span className="font-semibold text-slate-800">{selectedAnalysis.segmentation_metrics?.area_px?.toLocaleString()} pixels</span></p>
              <p className="text-[11px] text-slate-500 italic pt-1">
                Note: This AI evaluation is meant to assist you in preparing for a doctor's examination. It is not a definitive diagnosis.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => downloadAnalysisReport(selectedAnalysis.analysis_id)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Download Summary for Doctor (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Sessions Section */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-blue-600" />
          <span>Spot Change Tracking Comparisons</span>
          <span className="text-xs font-mono font-normal bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
            {monitoring.length}
          </span>
        </h2>

        {monitoring.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitoring.map((m) => (
              <div key={m.monitoring_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-mono text-xs font-bold text-slate-800">{m.monitoring_id}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.registration_status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {m.registration_status === 'confirmed' ? 'ALIGNED (ACCURATE)' : 'ROUGH FIT (CHECK ANGLE)'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <img src={m.previous_overlay_url} alt="Baseline" className="rounded-lg h-24 w-full object-cover bg-slate-900" />
                  <img src={m.current_overlay_url} alt="Follow-up" className="rounded-lg h-24 w-full object-cover bg-slate-900" />
                  <img src={m.difference_mask_url} alt="Difference" className="rounded-lg h-24 w-full object-cover bg-slate-900" />
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-slate-400">{new Date(m.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => downloadMonitoringReport(m.monitoring_id)}
                    className="text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Doctor Summary (PDF)
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No change tracking comparisons saved for this profile yet.
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientDetails;

