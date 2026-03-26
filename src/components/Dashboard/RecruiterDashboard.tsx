import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Briefcase, Users, FileText, TrendingUp,
  Plus, Eye, Zap, WifiOff, RefreshCw
} from 'lucide-react';
import { usePollInterval } from '../../utils/performance';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const POLL_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  status: 'active' | 'closed' | 'pending';
  applicants_count: number;
}

interface RecruiterStats {
  activeJobs: number;
  totalApps: number;
  shortlisted: number;
  hired: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  };
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

const SkeletonCard = () => (
  <div className="h-20 rounded-2xl bg-gray-50 animate-pulse border border-gray-100" />
);

// ─── RecruiterDashboard ───────────────────────────────────────────────────────
const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<RecruiterStats>({ activeJobs: 0, totalApps: 0, shortlisted: 0, hired: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
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
      const res = await fetch(`${API}/jobs`, { headers: getHeaders() });
      const jobs: Job[] = res.ok ? await res.json() : [];
      const myJobs = Array.isArray(jobs) ? jobs : [];

      setStats({
        activeJobs: myJobs.filter(j => j.status === 'active').length,
        totalApps:  myJobs.reduce((s, j) => s + (j.applicants_count || 0), 0),
        shortlisted: 0,
        hired: 0,
      });
      setRecentJobs(myJobs.slice(0, 4));
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

  return (
    <div className="font-sans space-y-8 pb-12 w-full max-w-7xl mx-auto">

      {/* Banner */}
      <div className="bg-[#062817] rounded-[32px] p-8 sm:p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center shadow-lg">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 w-full md:w-2/3 mb-8 md:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-emerald-300 font-bold uppercase tracking-wider text-sm">Recruiter Portal</p>
            <LiveBadge isRefreshing={isRefreshing} lastUpdatedAt={lastUpdatedAt} error={error} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Hello, {user?.name?.split(' ')[0]}!<br />
            <span className="text-emerald-100/90 font-medium text-3xl">Find your next top talent.</span>
          </h1>
          <div className="flex items-center gap-4 mt-8">
            <Link to="/post-job" className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg border border-green-500">
              <Plus className="h-4 w-4" /> Create New Posting
            </Link>
            <Link to="/my-jobs" className="flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/20">
              View All Jobs
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
                <p className="text-2xl font-extrabold text-white leading-none">{stats.totalApps}</p>
                <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-widest mt-1">Total Applicants</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-emerald-200 uppercase font-bold tracking-wider mb-1">
                <span>New</span>
                <span className="text-white">+12 This Week</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {(
          [
            { label: 'Active Jobs',  value: stats.activeJobs,  icon: Briefcase,    dot: 'bg-amber-500' },
            { label: 'Total Apps',   value: stats.totalApps,   icon: FileText,     dot: 'bg-blue-500' },
            { label: 'Shortlisted',  value: stats.shortlisted, icon: Users,        dot: 'bg-emerald-500' },
            { label: 'Hired',        value: stats.hired,       icon: TrendingUp,   dot: 'bg-purple-500' },
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

      {/* Active Postings */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Active Postings</h2>
          <Link to="/my-jobs" className="text-sm font-bold text-[#166534] hover:text-[#14532d] hover:bg-green-50 px-4 py-2 rounded-full transition-colors">View all</Link>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
          ) : recentJobs.length === 0 ? (
            <div className="py-8 text-center text-sm font-bold text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <Briefcase className="w-6 h-6 text-gray-300" />
              </div>
              <p className="mb-4">No active postings yet.</p>
              <Link to="/post-job" className="text-xs font-bold text-white bg-gray-900 px-6 py-2.5 rounded-full shadow-md">Post First Job</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentJobs.map(job => (
                <div key={job.id} className="flex items-center gap-4 p-5 rounded-3xl bg-gray-50 hover:bg-gray-100/80 transition-colors border border-gray-100 group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold bg-white text-gray-900 shadow-sm border border-gray-200 group-hover:bg-[#14532d] group-hover:text-white group-hover:border-[#14532d] transition-all">
                    {job.company?.[0] || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate tracking-tight mb-1">{job.title}</p>
                    <p className="text-xs font-bold text-gray-500 truncate">{job.applicants_count || 0} Applicants &bull; {job.location}</p>
                  </div>
                  <Link to={`/jobs/${job.id}`} className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white text-gray-500 border border-gray-200 hover:text-[#166534] hover:border-[#166534] transition-colors shadow-sm">
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {(
          [
            { to: '/my-jobs',   icon: Briefcase, label: 'Manage Jobs' },
            { to: '/post-job',  icon: Plus,      label: 'Post Opening' },
            { to: '/messages',  icon: Zap,       label: 'Inbox' },
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

export default RecruiterDashboard;