import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Sparkles, 
  GitCompare, 
  Users, 
  History, 
  FileText,
  Heart,
  Info
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Check a Skin Spot', path: '/analysis', icon: Sparkles },
  { name: 'Track Changes Over Time', path: '/monitoring', icon: GitCompare },
  { name: 'Family & Profiles', path: '/patients', icon: Users },
  { name: 'Past Checks & History', path: '/history', icon: History },
  { name: 'Doctor Visit Reports', path: '/reports', icon: FileText },
];

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-40
        transform transition-transform duration-200 ease-in-out flex flex-col justify-between
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Navigation Items */}
        <div className="p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-2">
            Skin Health Tools
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isActive 
                    ? 'bg-brand-50 text-brand-700 font-bold shadow-sm shadow-brand-500/10' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'}
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Health Advice Card */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="p-3.5 bg-brand-50/70 rounded-xl border border-brand-200/80 text-brand-900 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-xs">
              <Heart className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span>Skin Health Tip</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Check spots every month. Any mole that changes size, shape, color, or bleeds should be examined by a dermatologist.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
