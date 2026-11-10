import React from 'react';
import { FileText, ExternalLink, Calendar, User, Eye } from 'lucide-react';
import { downloadAnalysisReport } from '../services/api';

const HistoryTable = ({ analyses = [], onSelectAnalysis }) => {
  if (!analyses || analyses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        <p className="text-sm">No analysis history found.</p>
        <p className="text-xs text-slate-400 mt-1">Check a spot from the 'Check a Skin Spot' page to see records saved here.</p>
      </div>
    );
  }

  const getBadge = (predictedClass) => {
    switch (predictedClass) {
      case 'Cancerous':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Precancerous / in situ':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Benign':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
              <th className="py-3 px-4">Photo</th>
              <th className="py-3 px-4">Spot Name / ID</th>
              <th className="py-3 px-4">Family Profile</th>
              <th className="py-3 px-4">AI Pattern Match</th>
              <th className="py-3 px-4">Match Likelihood</th>
              <th className="py-3 px-4">Date / Time</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analyses.map((a) => {
              const dateStr = a.created_at ? new Date(a.created_at).toLocaleString() : 'N/A';
              return (
                <tr key={a.analysis_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4">
                    <img 
                      src={a.overlay_image_url || a.original_image_url} 
                      alt="Thumbnail" 
                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-slate-900" 
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-slate-900 text-xs">{a.spot_name || 'Skin Spot'}</div>
                    <div className="font-mono text-[10px] text-slate-400">{a.analysis_id}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {a.patient_id ? (
                      <span className="font-medium text-slate-900">{a.patient_id}</span>
                    ) : (
                      <span className="text-slate-400 italic">Quick Check (No profile)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadge(a.predicted_class)}`}>
                      {a.predicted_class}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                    {a.confidence_score?.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-500">
                    {dateStr}
                  </td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    {onSelectAnalysis && (
                      <button
                        onClick={() => onSelectAnalysis(a)}
                        title="View photo & details"
                        className="inline-flex items-center p-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => downloadAnalysisReport(a.analysis_id)}
                      title="Download Summary for Doctor (PDF)"
                      className="inline-flex items-center p-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;

