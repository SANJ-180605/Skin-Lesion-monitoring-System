import React from 'react';
import { GitCompare, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';

const MonitoringComparison = ({ monitoringData }) => {
  if (!monitoringData) return null;

  const isConfirmed = monitoringData.registration_status === 'confirmed';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-brand-600" />
            Visual Change Comparison
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The AI automatically aligned your photos to compensate for slight camera tilt and angle differences.
          </p>
        </div>

        {/* Alignment Status */}
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isConfirmed 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isConfirmed ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isConfirmed ? 'Photos Aligned Successfully' : 'Basic Resize (Different Angles)'}</span>
          </span>
        </div>
      </div>

      {/* Reassuring note if angles differed */}
      {!isConfirmed && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <b>Note on Photo Angles:</b> The two photos were taken from noticeably different angles or lighting. The AI resized them to match, but visual comparisons are most accurate when you take photos from the exact same distance.
          </p>
        </div>
      )}

      {/* 3-Image Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Baseline Image */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex flex-col shadow-inner">
          <div className="px-3.5 py-2.5 bg-slate-900 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between items-center">
            <span>1. Earlier Photo</span>
            <span className="text-[10px] text-slate-400">Baseline Visit</span>
          </div>
          <div className="p-3 flex-1 flex items-center justify-center min-h-[220px]">
            <img 
              src={monitoringData.previous_overlay_url || monitoringData.previous_image_url} 
              alt="Baseline visit" 
              className="max-h-56 object-contain rounded-xl" 
            />
          </div>
        </div>

        {/* Aligned Follow-up Image */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex flex-col shadow-inner">
          <div className="px-3.5 py-2.5 bg-slate-900 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between items-center">
            <span>2. Recent Photo (Aligned)</span>
            <span className="text-[10px] text-brand-400 font-semibold">Matched Angle</span>
          </div>
          <div className="p-3 flex-1 flex items-center justify-center min-h-[220px]">
            <img 
              src={monitoringData.current_overlay_url || monitoringData.aligned_current_url} 
              alt="Recent visit aligned" 
              className="max-h-56 object-contain rounded-xl" 
            />
          </div>
        </div>

        {/* Mask Difference Visualization */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex flex-col shadow-inner">
          <div className="px-3.5 py-2.5 bg-slate-900 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between items-center">
            <span>3. Color Change Map</span>
            <span className="text-[10px] text-amber-400 font-semibold">Evolution</span>
          </div>
          <div className="p-3 flex-1 flex items-center justify-center min-h-[220px]">
            <img 
              src={monitoringData.difference_mask_url} 
              alt="Color change map" 
              className="max-h-56 object-contain rounded-xl" 
            />
          </div>
        </div>
      </div>

      {/* Easy Color Key */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
          How to read the Color Change Map (Image 3):
        </span>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-md bg-[#f0c828] border border-amber-400"></span>
            <span><b>Yellow:</b> Unchanged spot area (stable overlap)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-md bg-[#eb3232] border border-red-500"></span>
            <span><b>Red:</b> New or expanded area</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-3.5 rounded-md bg-[#2878f0] border border-blue-500"></span>
            <span><b>Blue:</b> Area no longer visible</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringComparison;
