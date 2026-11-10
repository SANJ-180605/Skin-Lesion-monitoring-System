import React, { useState } from 'react';
import { Eye, Layers, HelpCircle, Check, Info } from 'lucide-react';

const SegmentationViewer = ({ 
  originalUrl, 
  maskUrl, 
  overlayUrl, 
  metrics 
}) => {
  const [activeTab, setActiveTab] = useState('all');

  const getCircularityLabel = (val) => {
    if (!val) return 'Calculating...';
    if (val >= 0.75) return 'Smooth & Round';
    if (val >= 0.50) return 'Slightly Irregular';
    return 'Irregular Border';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            AI Spot Boundary & Shape Outline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The AI automatically traces the edges of your skin spot so you can inspect its shape and borders.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
          >
            Show All 3
          </button>
          <button
            onClick={() => setActiveTab('overlay')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'overlay' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
          >
            Highlighted Border
          </button>
          <button
            onClick={() => setActiveTab('mask')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'mask' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
          >
            Silhouette
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'original' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
          >
            Original Photo
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div>
        {activeTab === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Original */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex flex-col shadow-inner">
              <div className="px-3.5 py-2.5 bg-slate-900 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between items-center">
                <span>1. Your Uploaded Photo</span>
                <span className="text-[10px] text-slate-400 font-normal">Original</span>
              </div>
              <div className="p-3 flex-1 flex items-center justify-center min-h-[200px]">
                <img src={originalUrl} alt="Original spot" className="max-h-56 object-contain rounded-xl" />
              </div>
            </div>

            {/* 2. Mask */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex flex-col shadow-inner">
              <div className="px-3.5 py-2.5 bg-slate-900 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between items-center">
                <span>2. AI Spot Silhouette</span>
                <span className="text-[10px] text-slate-400 font-normal">Traced Area</span>
              </div>
              <div className="p-3 flex-1 flex items-center justify-center min-h-[200px]">
                <img src={maskUrl} alt="AI silhouette" className="max-h-56 object-contain rounded-xl" />
              </div>
            </div>

            {/* 3. Overlay */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 flex flex-col shadow-inner">
              <div className="px-3.5 py-2.5 bg-slate-900 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between items-center">
                <span>3. Outlined Boundary</span>
                <span className="text-[10px] text-brand-400 font-semibold">Red Border</span>
              </div>
              <div className="p-3 flex-1 flex items-center justify-center min-h-[200px]">
                <img src={overlayUrl} alt="Highlighted boundary" className="max-h-56 object-contain rounded-xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 p-4 flex items-center justify-center">
            <img 
              src={activeTab === 'overlay' ? overlayUrl : activeTab === 'mask' ? maskUrl : originalUrl} 
              alt="Selected view" 
              className="max-h-80 object-contain rounded-xl" 
            />
          </div>
        )}
      </div>

      {/* User-Friendly Measurements */}
      {metrics && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Spot Size & Border Checklist
            </span>
            <span className="text-[11px] text-slate-400">ABCDE Mole Rule Reference</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-xs text-slate-500 font-medium">Spot Area in Photo</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {metrics.area_px?.toLocaleString()} <span className="text-xs text-slate-500 font-normal">pixels ({metrics.coverage_percentage}% of photo)</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Gives a baseline to compare in future photos</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-xs text-slate-500 font-medium">Border & Edge Shape</span>
              <p className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <span>{getCircularityLabel(metrics.circularity)}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Even round edges are generally more reassuring</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-xs text-slate-500 font-medium">AI Edge Confidence</span>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                High Precision Trace
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Standard U-Net segmentation model</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentationViewer;
