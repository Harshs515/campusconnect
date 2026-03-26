import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, Briefcase, FileText, Award,
  Shield, TrendingUp, WifiOff, RefreshCw
} from 'lucide-react';
import { usePollInterval } from '../../utils/performance';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const POLL_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface RoleCount  { role: string;   count: string }
interface StatusCount { status: string; count: string }

interface AnalyticsOverview {
  users:        RoleCount[];
  jobs:         StatusCount[];
  applications: StatusCount[];
  alumniCount:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  };
}

function getCount(arr: (RoleCount | StatusCount)[], key: string): number {
  return parseInt(
    (arr as any[])?.find((i: any) => i.role === key || i.status === key)?.count || '0'
  );
}

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── LiveBadge ────────────────────────────────────────────────────────────────
const LiveBadge: React.FC<{ isRefreshing: boolean; lastUpdatedAt: Date | null; error: string | null }> = ({
  isRefreshing, lastUpdatedAt, error,
}) => (
  <div className="flex items-center gap-2">
    {error ? (
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
        <WifiOff className="w-3 h-3" /> Offline
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
        {isRefreshing
          ? <RefreshCw className="w-3 h-3 animate-spin" />
          : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />}
        {isRefreshing ? 'Updating…' : lastUpdatedAt ? `Updated ${fmt(lastUpdatedAt)}` : 'Live'}
      </span>
    )}
  </div>
);

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    const isFirst = isFirstLoad.current;
    if (!isFirst) setIsRefreshing(true);

    try {
      const res = await fetch(`${API}/analytics/overview`, { headers: getHeaders() });
      const json: AnalyticsOverview = res.ok ? await res.json() : null;
      setData(json);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      if (isFirst) { setLoading(false); isFirstLoad.current = false; }
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  usePollInterval(fetchAll, {
    intervalMs: POLL_MS,
    pauseOnHidden: true,
    enabled: !!user?.id,
  });

  const totalUsers = data?.users?.reduce((s, u) => s + parseInt(u.count), 0) ?? 0;
  const totalJobs  = data?.jobs?.reduce((s, j) => s + parseInt(j.count), 0) ?? 0;
  const totalApps  = data?.applications?.reduce((s, a) => s + parseInt(a.count), 0) ?? 0;

  return (
    <div className="font-sans space-y-8 pb-12 w-full max-w-7xl mx-auto">

      {/* Banner */}
      <div className="bg-[#062817] rounded-[32px] p-8 sm:p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center shadow-lg">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 w-full md:w-2/3 mb-8 md:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-emerald-300 font-bold uppercase tracking-wider text-sm">Admin Console</p>
            <LiveBadge isRefreshing={isRefreshing} lastUpdatedAt={lastUpdatedAt} error={error} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Platform Overview<br />
            <span className="text-emerald-100/90 font-medium text-3xl">System Operating Nominally.</span>
          </h1>
          <div className="flex items-center gap-4 mt-8">
            <Link to="/analytics" className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg border border-green-500">
              <TrendingUp className="h-4 w-4" /> View Full Reports
            </Link>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500 w-64">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white leading-none">{totalUsers}</p>
                <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-widest mt-1">Total Network</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-11/12 rounded-full" />
              </div>
              <p className="text-[10px] text-emerald-200 uppercase font-bold text-right tracking-wider">+14% Growth</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {(
          [
            { label: 'Total Users',    value: totalUsers,              icon: Users,    dot: 'bg-blue-500' },
            { label: 'Active Jobs',    value: getCount(data?.jobs ?? [], 'active'), icon: Briefcase, dot: 'bg-emerald-500' },
            { label: 'Applications',  value: totalApps,               icon: FileText, dot: 'bg-purple-500' },
            { label: 'Alumni Placed', value: data?.alumniCount ?? 0,  icon: Award,    dot: 'bg-amber-500' },
          ] as const
        ).map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                <Icon className="w-5 h-5 text-gray-300" />
              </div>
              <div className="flex items-center gap-3">
                <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
                  {loading ? '—' : stat.value}
                </h3>
                <div className={`w-2.5 h-2.5 rounded-full ${stat.dot} shadow-sm ${isRefreshing ? 'animate-pulse' : ''}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
        {(
          [
            { to: '/user-management', icon: Users,    label: 'Manage Users' },
            { to: '/analytics',       icon: FileText, label: 'Analytics Hub' },
            { to: '/alumni',          icon: Award,    label: 'Alumni Network' },
            { to: '/messages',        icon: Shield,   label: 'Security & Access' },
          ] as const
        ).map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}
            className="group flex flex-col items-center justify-center p-6 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200 mb-4 group-hover:bg-[#166534] group-hover:border-[#166534] transition-colors">
              <Icon className="h-6 w-6 text-gray-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-sm font-extrabold text-gray-700 tracking-tight">{label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
};

export default AdminDashboard;