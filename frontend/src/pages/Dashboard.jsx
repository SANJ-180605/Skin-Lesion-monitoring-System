import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Sparkles, 
  GitCompare, 
  ArrowUpRight, 
  Calendar,
  AlertCircle,
  FileText,
  Camera,
  Heart
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getDashboardStats } from '../services/api';
import HistoryTable from '../components/HistoryTable';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = {
  'Cancerous': '#e11d48',
  'Precancerous / in situ': '#d97706',
  'Benign': '#10b981'
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner message="Loading your skin health dashboard..." />;

  const chartData = stats?.class_distribution ? [
    { name: 'Cancerous', value: stats.class_distribution['Cancerous'] || 0 },
    { name: 'Precancerous / in situ', value: stats.class_distribution['Precancerous / in situ'] || 0 },
    { name: 'Benign', value: stats.class_distribution['Benign'] || 0 },
  ] : [];

  const totalPredictions = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Skin Health Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Keep track of all your checked spots, mole measurements, and photo comparisons.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/analysis"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Check a Spot</span>
          </Link>
          <Link
            to="/monitoring"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare Photos</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Family & Profiles</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats?.total_patients ?? 0}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spots Checked</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats?.total_analyses ?? 0}</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Change Comparisons</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats?.total_monitoring_sessions ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Middle Row: Results Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Your Checked Spot Types</h3>
            <p className="text-xs text-slate-500">Summary of all spot assessments so far</p>
          </div>

          <div className="h-56 mt-2 relative flex items-center justify-center">
            {totalPredictions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => [val, 'Spots']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 text-slate-400 text-xs space-y-1">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="font-semibold text-slate-600">No spots checked yet!</p>
                <p className="text-slate-400">Upload a photo to see your first spot assessment.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Cancerous</span>
              <p className="font-black text-rose-600">{stats?.class_distribution?.['Cancerous'] || 0}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Precancerous</span>
              <p className="font-black text-amber-600">{stats?.class_distribution?.['Precancerous / in situ'] || 0}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Benign (Safe)</span>
              <p className="font-black text-emerald-600">{stats?.class_distribution?.['Benign'] || 0}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Spot Checks</h3>
              <p className="text-xs text-slate-500">Your latest photo scans</p>
            </div>
            <Link to="/history" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center">
              View All History <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="flex-1">
            <HistoryTable analyses={stats?.recent_analyses || []} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
