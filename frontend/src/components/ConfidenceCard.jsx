import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Info, Stethoscope, HelpCircle } from 'lucide-react';

const ConfidenceCard = ({ predictedClass, confidenceScore, modelName, modelVersion }) => {
  const getTheme = () => {
    switch (predictedClass) {
      case 'Cancerous':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-900',
          badgeBg: 'bg-rose-100',
          badgeText: 'text-rose-800',
          badgeBorder: 'border-rose-300',
          icon: AlertCircle,
          label: 'Needs Medical Attention (Cancerous Risk Detected)',
          summary: 'The AI identified visual patterns that resemble skin cancer (such as melanoma or basal cell carcinoma).',
          recommendation: 'We strongly recommend scheduling an appointment with a dermatologist or doctor promptly for a professional in-person check and dermoscopy.',
          badgeColor: 'text-rose-600',
        };
      case 'Precancerous / in situ':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-900',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-800',
          badgeBorder: 'border-amber-300',
          icon: AlertTriangle,
          label: 'Precancerous / Early Changes Detected',
          summary: 'The AI detected patterns often seen in actinic keratoses or early cell changes that are not yet cancer, but can become problematic if ignored.',
          recommendation: 'Consult a dermatologist for a routine check-up. Early detection allows quick, simple preventive care.',
          badgeColor: 'text-amber-600',
        };
      case 'Benign':
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-900',
          badgeBg: 'bg-emerald-100',
          badgeText: 'text-emerald-800',
          badgeBorder: 'border-emerald-300',
          icon: CheckCircle2,
          label: 'Likely Benign (Harmless Spot or Mole)',
          summary: 'The AI found visual features consistent with common, safe skin spots, such as normal moles, age spots (keratoses), or benign growths.',
          recommendation: 'Keep an eye on this spot over time. If you notice it changing size, shape, or color, re-check it or see a doctor.',
          badgeColor: 'text-emerald-600',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className={`rounded-2xl border p-6 ${theme.bg} ${theme.border} transition-all shadow-sm space-y-5`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-brand-600" />
            AI Spot Check Assessment
          </span>
          <div className="flex items-center space-x-2 pt-1">
            <span className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-base sm:text-lg font-extrabold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{predictedClass}</span>
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            {theme.label}
          </p>
        </div>

        {/* Confidence metric */}
        <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 sm:text-right min-w-[140px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            AI Pattern Match
          </span>
          <span className="text-3xl font-black text-slate-900">
            {confidenceScore?.toFixed(1)}%
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Confidence Score</p>
        </div>
      </div>

      {/* Plain English explanation */}
      <div className="p-4 bg-white/90 rounded-xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
        <p className="leading-relaxed">
          <b>What this means:</b> {theme.summary}
        </p>
        <p className="leading-relaxed text-slate-600">
          <b>Recommended next step:</b> {theme.recommendation}
        </p>
      </div>

      {/* Safety Note */}
      <div className="pt-2 flex items-start space-x-2 text-[11px] text-slate-500">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="leading-normal">
          <b>Friendly Reminder:</b> This AI assessment is an informational guide to help you monitor your skin. It is not an official medical diagnosis. When in doubt, always have a doctor take a look in person!
        </p>
      </div>
    </div>
  );
};

export default ConfidenceCard;
