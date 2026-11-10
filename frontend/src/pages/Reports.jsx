import React, { useState, useEffect } from 'react';
import { FileText, Download, Sparkles, GitCompare, Calendar, CheckCircle, Stethoscope, Printer, ArrowRight } from 'lucide-react';
import { getAllHistory, downloadAnalysisReport, downloadMonitoringReport } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Reports = () => {
  const [data, setData] = useState({ analyses: [], monitoring: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await getAllHistory();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load history for reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  if (loading) return <LoadingSpinner message="Loading your printable doctor reports..." />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Doctor Visit & Health Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Download or print easy-to-read PDF summaries showing your mole photos, AI findings, and size changes to share with your dermatologist.
        </p>
      </div>

      {/* Helpful banner for users */}
      <div className="p-5 rounded-2xl bg-brand-50/70 border border-brand-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <Stethoscope className="w-6 h-6 text-brand-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-900 text-sm">Going to see a doctor or dermatologist?</p>
            <p className="text-slate-600 leading-relaxed">
              Print out your spot report below! Dermatologists appreciate seeing clear baseline photos and how the spot has changed over time.
            </p>
          </div>
        </div>
      </div>

      {/* Single Spot Checks */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Spot Check Summaries ({data.analyses.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-photo checks with traced outline, AI category match, and confidence percentage.
          </p>
        </div>

        {data.analyses.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.analyses.map((a) => (
              <div key={a.analysis_id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/60 p-3 rounded-2xl transition-colors gap-3">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    <img src={a.overlay_image_url} alt="Spot photo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {a.predicted_class}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {a.confidence_score?.toFixed(1)}% match
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Profile: <span className="font-semibold text-slate-700">{a.patient_id || 'General Check'}</span> • Checked on {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => downloadAnalysisReport(a.analysis_id)}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF for Doctor</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">No spot check reports generated yet.</p>
        )}
      </div>

      {/* Monitoring Reports */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Photo Change Comparison Reports ({data.monitoring.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-photo side-by-side comparisons showing growth, shrinkage, or shape evolution.
          </p>
        </div>

        {data.monitoring.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.monitoring.map((m) => (
              <div key={m.monitoring_id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/60 p-3 rounded-2xl transition-colors gap-3">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    <img src={m.difference_mask_url} alt="Change map" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">Comparison #{m.monitoring_id}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {m.registration_status === 'confirmed' ? 'Aligned' : 'Resized'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Profile: <span className="font-semibold text-slate-700">{m.patient_id || 'General Check'}</span> • Compared on {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => downloadMonitoringReport(m.monitoring_id)}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Comparison PDF</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">No photo change reports generated yet.</p>
        )}
      </div>
    </div>
  );
};

export default Reports;
