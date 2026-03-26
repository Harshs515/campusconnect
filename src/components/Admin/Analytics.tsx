import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Briefcase, FileText, Calendar, TrendingUp, Award } from 'lucide-react';

interface AnalyticsData {
  users: { role: string; count: string }[];
  jobs: { status: string; count: string }[];
  applications: { status: string; count: string }[];
  eventCount: number;
  alumniCount: number;
  avgSalary: number;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/analytics/overview`, { headers: getHeaders() });
      if (!res.ok) return;
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('fetchAnalytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchAnalytics(); }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-8 text-gray-500">Failed to load analytics</div>;

  const getCount = (arr: { role?: string; status?: string; count: string }[], key: string) =>
    parseInt(arr.find(i => i.role === key || i.status === key)?.count || '0');

  const totalUsers = data.users.reduce((s, u) => s + parseInt(u.count), 0);
  const totalJobs = data.jobs.reduce((s, j) => s + parseInt(j.count), 0);
  const totalApps = data.applications.reduce((s, a) => s + parseInt(a.count), 0);

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${getCount(data.users, 'student')} students` },
    { label: 'Active Jobs', value: getCount(data.jobs, 'active'), icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50', sub: `${totalJobs} total` },
    { label: 'Applications', value: totalApps, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', sub: `${getCount(data.applications, 'hired')} hired` },
    { label: 'Events', value: data.eventCount, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', sub: 'Total events' },
    { label: 'Alumni', value: data.alumniCount, icon: Award, color: 'text-pink-600', bg: 'bg-pink-50', sub: 'Placed students' },
    { label: 'Avg Package', value: data.avgSalary ? `₹${(data.avgSalary / 100000).toFixed(1)}L` : 'N/A', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50', sub: 'Per annum' },
  ];

  const appStatusData = [
    { label: 'Applied', count: getCount(data.applications, 'applied'), color: 'bg-yellow-400' },
    { label: 'Shortlisted', count: getCount(data.applications, 'shortlisted'), color: 'bg-blue-400' },
    { label: 'Hired', count: getCount(data.applications, 'hired'), color: 'bg-green-400' },
    { label: 'Rejected', count: getCount(data.applications, 'rejected'), color: 'bg-red-400' },
  ];

  const userRoleData = [
    { label: 'Students', count: getCount(data.users, 'student'), color: 'bg-blue-500' },
    { label: 'Recruiters', count: getCount(data.users, 'recruiter'), color: 'bg-green-500' },
    { label: 'Admins', count: getCount(data.users, 'admin'), color: 'bg-purple-500' },
  ];

  const maxAppCount = Math.max(...appStatusData.map(d => d.count), 1);
  const maxUserCount = Math.max(...userRoleData.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">Real-time platform statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Application Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Application Status Breakdown</h2>
          <div className="space-y-3">
            {appStatusData.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(item.count / maxAppCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Roles */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">User Distribution</h2>
          <div className="space-y-3">
            {userRoleData.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(item.count / maxUserCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total users</span>
              <span className="font-bold text-gray-900">{totalUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Job Posting Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          {data.jobs.map(j => (
            <div key={j.status} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{j.count}</p>
              <p className="text-sm text-gray-500 capitalize mt-1">{j.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;