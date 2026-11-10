import React from 'react';
import { Table, TrendingUp, TrendingDown, CheckCircle, Info, HelpCircle } from 'lucide-react';

const FEATURE_NAMES = {
  'Lesion Area (px)': 'Overall Spot Size (Area)',
  'Perimeter (px)': 'Outer Border Length',
  'Bounding Box Width (px)': 'Horizontal Width',
  'Bounding Box Height (px)': 'Vertical Height',
  'Circularity Index': 'Roundness / Border Symmetry'
};

const MeasurementTable = ({ comparisonTable = [] }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Table className="w-5 h-5 text-brand-600" />
          Photo-to-Photo Measurement Comparison
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          See how your spot's dimensions changed between your earlier photo and your recent photo.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
              <th className="py-3 px-4">Measurement</th>
              <th className="py-3 px-4">Past Photo</th>
              <th className="py-3 px-4">Recent Photo</th>
              <th className="py-3 px-4">Change (% Difference)</th>
              <th className="py-3 px-4 text-center">Summary Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparisonTable.map((row, idx) => {
              const pct = row.percentage_change;
              const hasPct = pct !== null && pct !== undefined && !isNaN(pct);

              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
              let statusText = 'Stable';
              let TrendIcon = CheckCircle;

              if (hasPct) {
                if (pct > 15) {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  statusText = 'Larger in photo';
                  TrendIcon = TrendingUp;
                } else if (pct < -15) {
                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  statusText = 'Smaller in photo';
                  TrendIcon = TrendingDown;
                } else if (Math.abs(pct) <= 5) {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  statusText = 'Essentially Unchanged';
                  TrendIcon = CheckCircle;
                } else {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  statusText = pct > 0 ? 'Slightly Larger' : 'Slightly Smaller';
                  TrendIcon = pct > 0 ? TrendingUp : TrendingDown;
                }
              }

              const friendlyName = FEATURE_NAMES[row.metric] || row.metric;

              return (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {friendlyName}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {typeof row.previous_value === 'number' ? row.previous_value.toLocaleString() : (row.previous_value ?? 'N/A')}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-900 font-bold">
                    {typeof row.current_value === 'number' ? row.current_value.toLocaleString() : (row.current_value ?? 'N/A')}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-xs">
                    {hasPct ? (
                      <span className={pct > 0 ? 'text-rose-600' : pct < 0 ? 'text-blue-600' : 'text-slate-600'}>
                        {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      <span>{statusText}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start space-x-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">How to interpret these numbers:</p>
          <p className="leading-relaxed">
            Small percentage differences (around 5–10%) often happen naturally due to camera distance, tilt, or lighting.
            However, if a mole is clearly expanding, changing color, or bleeding, you should have it evaluated in person by a dermatologist.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeasurementTable;
