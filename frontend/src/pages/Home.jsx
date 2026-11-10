import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  GitCompare, 
  ShieldCheck, 
  Layers, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  HeartPulse,
  Eye,
  Camera,
  CalendarCheck,
  Stethoscope,
  Info
} from 'lucide-react';

const Home = () => {
  return (
    <div className="space-y-16 py-4">
      {/* Friendly Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950 text-white p-8 sm:p-12 lg:p-16 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <HeartPulse className="w-4 h-4 text-brand-400" />
            <span>AI-Powered Personal Skin Health Assistant</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Check & Monitor Your Skin Spots <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-teal-400">With Confidence</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Wondering about a new mole or changing skin spot? Take a photo to see the AI outline its exact edges,
            check its risk likelihood (Benign, Precancerous, or Cancerous), and track changes between visits over time.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/analysis"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.02]"
            >
              <Camera className="w-4 h-4" />
              <span>Check a Skin Spot Now</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/monitoring"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-bold text-sm transition-all"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare 2 Photos Over Time</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
      </section>

      {/* How it Works: 3 Simple Steps */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            How It Works in 3 Easy Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            No confusing medical jargon. Straightforward results you can understand and share with your doctor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">1</span>
            <h3 className="font-bold text-slate-900 text-base">Upload a Close-Up Photo</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Snap a clear photo of the mole, freckle, or skin spot on your phone or camera in good lighting.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <span className="w-8 h-8 rounded-full bg-brand-600 text-white font-black text-xs flex items-center justify-center">2</span>
            <h3 className="font-bold text-slate-900 text-base">Instant AI Analysis</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The AI automatically traces the outline of your spot and estimates whether it looks Benign, Precancerous, or Cancerous.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">3</span>
            <h3 className="font-bold text-slate-900 text-base">Track Changes & Share</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Take another photo months later to see if it grew. Download a doctor-ready PDF summary to bring to your visit.
            </p>
          </div>
        </div>
      </section>

      {/* The ABCDE Skin Spot Checklist */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wider block mb-1">Dermatologist Guide</span>
          <h3 className="text-xl font-bold text-slate-900">
            The "ABCDE" Rule for Checking Your Moles
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Doctors recommend checking your skin regularly. Watch out for these 5 warning signs:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">A</div>
            <h4 className="font-bold text-slate-900">Asymmetry</h4>
            <p className="text-slate-500 leading-relaxed">One half of the mole does not match the other half.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">B</div>
            <h4 className="font-bold text-slate-900">Border</h4>
            <p className="text-slate-500 leading-relaxed">The edges are ragged, notched, blurred, or irregular.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">C</div>
            <h4 className="font-bold text-slate-900">Color</h4>
            <p className="text-slate-500 leading-relaxed">Uneven color with shades of tan, brown, black, or pink.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">D</div>
            <h4 className="font-bold text-slate-900">Diameter</h4>
            <p className="text-slate-500 leading-relaxed">The spot is larger than 6 millimeters (pencil eraser size).</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold text-xs flex items-center justify-center">E</div>
            <h4 className="font-bold text-slate-900">Evolving</h4>
            <p className="text-slate-500 leading-relaxed">The mole is visibly changing in size, shape, color, or elevation.</p>
          </div>
        </div>
      </section>

      {/* Reassurance & Disclaimer Banner */}
      <section className="p-6 rounded-2xl bg-brand-50/70 border border-brand-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <Stethoscope className="w-6 h-6 text-brand-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-0.5">
            <p className="font-bold text-slate-900">Preparing for a Doctor’s Appointment?</p>
            <p className="text-slate-600 leading-relaxed">
              Use our "Download PDF Report" feature to print a neat summary of your photos and changes to show your dermatologist.
            </p>
          </div>
        </div>

        <Link
          to="/analysis"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm whitespace-nowrap"
        >
          Check a Spot Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 SkinGuard AI. Educational and personal skin spot monitoring assistant.</p>
        <div className="flex items-center space-x-4">
          <Link to="/reports" className="hover:text-slate-900">Doctor Reports</Link>
          <Link to="/history" className="hover:text-slate-900">My Past Checks</Link>
          <Link to="/dashboard" className="hover:text-slate-900">Dashboard</Link>
        </div>
      </footer>
    </div>
  );
};

export default Home;
