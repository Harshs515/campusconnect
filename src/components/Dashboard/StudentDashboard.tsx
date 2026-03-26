import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, Calendar, FileText, TrendingUp, ArrowRight, CheckCircle, Award, Zap } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ applied: 0, shortlisted: 0, hired: 0, activeJobs: 0, events: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const [jobsRes, appsRes, eventsRes] = await Promise.all([
          fetch(`${API}/jobs`, { headers: getHeaders() }),
          fetch(`${API}/applications`, { headers: getHeaders() }),
          fetch(`${API}/events`, { headers: getHeaders() }),
        ]);
        const jobs = jobsRes.ok ? await jobsRes.json() : [];
        const apps = appsRes.ok ? await appsRes.json() : [];
        const events = eventsRes.ok ? await eventsRes.json() : [];
        const activeJobs = Array.isArray(jobs) ? jobs.filter((j: any) => j.status === 'active') : [];
        const myApps = Array.isArray(apps) ? apps : [];
        setStats({
          applied: myApps.length,
          shortlisted: myApps.filter((a: any) => a.status === 'shortlisted').length,
          hired: myApps.filter((a: any) => a.status === 'hired').length,
          activeJobs: activeJobs.length,
          events: Array.isArray(events) ? events.filter((e: any) => e.is_rsvped).length : 0,
        });
        setRecentJobs(activeJobs.slice(0, 3));
        setRecentApps(myApps.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const statusStyle: Record<string, string> = {
    applied: 'bg-[#f8fafc] text-gray-600 border border-gray-200',
    shortlisted: 'bg-green-50 text-green-700 border border-green-200',
    hired: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-50 text-red-600 border border-red-200',
  };

  return (
    <div className="font-sans space-y-8 pb-12 w-full max-w-7xl mx-auto">
      
      {/* Donezo Main Banner */}
      <div className="bg-[#062817] rounded-[32px] p-8 sm:p-10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center shadow-lg">
        {/* Abstract background graphics */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10 w-full md:w-2/3 mb-8 md:mb-0">
          <p className="text-emerald-300 font-bold uppercase tracking-wider text-sm mb-2">Welcome Back</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Hi, {user?.name?.split(' ')[0]}!<br/>
            <span className="text-emerald-100/90 font-medium text-3xl">Ready for your next step?</span>
          </h1>
          <div className="flex items-center gap-4 mt-8">
            <Link to="/jobs" className="flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg border border-green-500">
              <Briefcase className="h-4 w-4" /> Browse Opportunities
            </Link>
            <Link to="/applications" className="flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-bold text-white bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/20">
              View Applications
            </Link>
          </div>
        </div>

        {/* Floating Stat Element inside Banner */}
        <div className="relative z-10 hidden lg:block">
           <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500 w-64">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300">
                    <TrendingUp className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-2xl font-extrabold text-white leading-none">{stats.applied}</p>
                    <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-widest mt-1">Total Apps</p>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 w-3/4 rounded-full"></div>
                 </div>
                 <p className="text-[10px] text-emerald-200 uppercase font-bold text-right tracking-wider">75% Profile Setup</p>
              </div>
           </div>
        </div>
      </div>

      {/* Stats Row - Clean Donezo Minimal Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Applications', value: stats.applied, icon: FileText, color: 'text-blue-600', dot: 'bg-blue-500' },
          { label: 'Shortlisted', value: stats.shortlisted, icon: CheckCircle, color: 'text-emerald-600', dot: 'bg-emerald-500' },
          { label: 'Hired', value: stats.hired, icon: Award, color: 'text-purple-600', dot: 'bg-purple-500' },
          { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-amber-600', dot: 'bg-amber-500' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                 <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                 <Icon className={`w-5 h-5 text-gray-300`} />
              </div>
              <div className="flex items-end items-center gap-3">
                 <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">{loading ? '—' : stat.value}</h3>
                 <div className={`w-2.5 h-2.5 rounded-full ${stat.dot} shadow-sm mb-1`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Split Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Suggested Jobs */}
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Suggested Jobs</h2>
            <Link to="/jobs" className="text-sm font-bold text-[#166534] hover:text-[#14532d] hover:bg-green-50 px-4 py-2 rounded-full transition-colors">
              View all
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
               <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-50 animate-pulse border border-gray-100" />)}</div>
            ) : recentJobs.length === 0 ? (
               <div className="py-8 text-center text-sm font-bold text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">No active jobs found</div>
            ) : (
               recentJobs.map((job: any) => (
                 <Link to={`/jobs/${job.id}`} key={job.id} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                   <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold bg-white text-gray-900 shadow-sm border border-gray-200 group-hover:bg-[#14532d] group-hover:text-white group-hover:border-[#14532d] transition-all">
                     {job.company?.[0] || 'C'}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-base font-bold text-gray-900 truncate tracking-tight mb-1">{job.title}</p>
                     <p className="text-xs font-bold text-gray-500 truncate">{job.company}</p>
                   </div>
                   <div className="flex-shrink-0">
                      <span className="px-4 py-2 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200 group-hover:bg-white transition-colors">
                        {job.salary || 'Competitive'}
                      </span>
                   </div>
                 </Link>
               ))
            )}
          </div>
        </div>

        {/* Application Journey */}
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Recent Applications</h2>
            <Link to="/applications" className="text-sm font-bold text-[#166534] hover:text-[#14532d] hover:bg-green-50 px-4 py-2 rounded-full transition-colors">
              View history
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
               <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-50 animate-pulse border border-gray-100" />)}</div>
            ) : recentApps.length === 0 ? (
               <div className="py-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
                     <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 mb-4">You haven't applied yet.</p>
                  <Link to="/jobs" className="text-xs font-bold text-white bg-gray-900 px-6 py-2.5 rounded-full shadow-md">Find Jobs</Link>
               </div>
            ) : (
               recentApps.map((app: any) => (
                 <div key={app.id} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                   <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold bg-white text-gray-900 shadow-sm border border-gray-200">
                     {app.company?.[0] || 'C'}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-base font-bold text-gray-900 truncate tracking-tight mb-1">{app.job_title}</p>
                     <p className="text-xs font-bold text-gray-500 truncate">{app.company}</p>
                   </div>
                   <div className="flex-shrink-0">
                      <span className={`px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${statusStyle[app.status] || statusStyle.applied}`}>
                        {app.status}
                      </span>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>

      </div>

      {/* Quick Access Area */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { to: '/events', icon: Calendar, label: 'Campus Events' },
          { to: '/connections', icon: TrendingUp, label: 'My Network' },
          { to: '/alumni-list', icon: Award, label: 'Alumni Access' },
          { to: '/messages', icon: Zap, label: 'Messages' },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to}
            className="group flex flex-col items-center justify-center p-6 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200 mb-4 group-hover:bg-[#166534] group-hover:border-[#166534] transition-colors`}>
              <Icon className={`h-6 w-6 text-gray-500 group-hover:text-white transition-colors`} />
            </div>
            <span className="text-sm font-extrabold text-gray-700 tracking-tight">{label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
};

export default StudentDashboard;