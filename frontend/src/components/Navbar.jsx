import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHealth, getModelStatus } from '../services/api';
import { 
  ShieldCheck, 
  Database, 
  Cpu, 
  User, 
  LogOut, 
  Menu, 
  Sparkles,
  HeartPulse
} from 'lucide-react';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [modelStatus, setModelStatus] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [healthRes, modelsRes] = await Promise.all([getHealth(), getModelStatus()]);
        setDbStatus(healthRes.data.database);
        setModelStatus(modelsRes.data);
      } catch (err) {
        setDbStatus('offline');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const unetReady = modelStatus?.unet_segmentation?.is_ready;
  const effReady = modelStatus?.efficientnet_classification?.is_ready;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Brand */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  SkinGuard <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-bold">AI Spot Check</span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium -mt-0.5 hidden sm:block">Personal Skin & Mole Health Assistant</p>
              </div>
            </Link>
          </div>

          {/* Center Friendly Status Indicator */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border ${unetReady && effReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-semibold">{unetReady && effReady ? 'AI Models Active' : 'Setting Up Models'}</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium">Secure History Active</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">{user?.name}</span>
                  <span className="text-[10px] text-slate-400">Personal Account</span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
