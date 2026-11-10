import React from 'react';
import { Activity } from 'lucide-react';

const LoadingSpinner = ({ message = 'Processing dermoscopic image with AI models...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="w-6 h-6 text-brand-600 animate-pulse" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">Deep Learning Inference</h3>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
      <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
        <span>U-Net (256x256) & EfficientNetB0 (3-Class)</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;

