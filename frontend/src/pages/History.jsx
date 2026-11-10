import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Sparkles, GitCompare, Search, FileText } from 'lucide-react';
import { getAllHistory, downloadMonitoringReport } from '../services/api';
import HistoryTable from '../components/HistoryTable';
import LoadingSpinner from '../components/LoadingSpinner';

const History = () => {
  const [data, setData] = useState({ analyses: [], monitoring: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analyses'); // 'analyses' or 'monitoring'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getAllHistory();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner message="Loading past spot records..." />;

  const filteredAnalyses = data.analyses.filter(a => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      a.analysis_id.toLowerCase().includes(s) ||
      (a.patient_id && a.patient_id.toLowerCase().includes(s)) ||
      a.predicted_class.toLowerCase().includes(s)
    );
  });

  const filteredMonitoring = data.monitoring.filter(m => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      m.monitoring_id.toLowerCase().includes(s) ||
      (m.patient_id && m.patient_id.toLowerCase().includes(s)) ||
      m.registration_method.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Past Spot Checks & Change History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Browse previous skin spot analyses, AI pattern assessments, and photo change comparisons over time.
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('analyses')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
              activeTab === 'analyses' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Single Spot Checks ({data.analyses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
              activeTab === 'monitoring' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <GitCompare className="w-4 h-4 text-blue-600" />
            <span>Change Comparisons ({data.monitoring.length})</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Tab 1: Analyses */}
      {activeTab === 'analyses' && (
        <section>
          <HistoryTable analyses={filteredAnalyses} />
        </section>
      )}

      {/* Tab 2: Monitoring Sessions */}
      {activeTab === 'monitoring' && (
        <section>
          {filteredMonitoring.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMonitoring.map(m => (
                <div key={m.monitoring_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900">{m.monitoring_id}</span>
                      <span className="text-xs text-slate-400 ml-2">Profile: {m.patient_id || 'Quick Check (No profile)'}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.registration_status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {m.registration_status === 'confirmed' ? 'ALIGNED (ACCURATE)' : 'ROUGH FIT'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <img src={m.previous_overlay_url} alt="Baseline" className="rounded-lg h-24 w-full object-cover bg-slate-900" />
                    <img src={m.current_overlay_url} alt="Follow-up" className="rounded-lg h-24 w-full object-cover bg-slate-900" />
                    <img src={m.difference_mask_url} alt="Difference" className="rounded-lg h-24 w-full object-cover bg-slate-900" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
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
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No spot change tracking records found.
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default History;

