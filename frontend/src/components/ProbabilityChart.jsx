import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, HelpCircle } from 'lucide-react';

const COLORS = {
  'Cancerous': '#e11d48',               // Red
  'Precancerous / in situ': '#d97706',   // Amber
  'Benign': '#10b981'                   // Green
};

const EXPLANATIONS = {
  'Cancerous': 'Patterns matching melanoma or skin cancer',
  'Precancerous / in situ': 'Patterns matching early spot changes before cancer',
  'Benign': 'Patterns matching normal, harmless moles or spots'
};

const ProbabilityChart = ({ probabilities = [] }) => {
  const canonicalOrder = ['Cancerous', 'Precancerous / in situ', 'Benign'];
  const orderedData = canonicalOrder.map(name => {
    const found = probabilities.find(p => p.class_name === name);
    return {
      class_name: name,
      percentage: found ? found.percentage : 0,
      probability: found ? found.probability : 0,
      description: EXPLANATIONS[name] || ''
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          Likelihood Across All 3 Categories
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          How closely your photo matches each of the three skin spot types:
        </p>
      </div>

      {/* Everyday User Friendly Progress Bars */}
      <div className="space-y-4 my-2">
        {orderedData.map((item) => {
          const color = COLORS[item.class_name] || '#64748b';
          return (
            <div key={item.class_name} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                    <span>{item.class_name}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{item.description}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    width: `${Math.max(item.percentage, 2)}%`, 
                    backgroundColor: color 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-slate-500">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>All 3 scores sum to 100%. The highest percentage is the AI's top match for your spot.</span>
      </div>
    </div>
  );
};

export default ProbabilityChart;
