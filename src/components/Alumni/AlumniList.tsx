import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, TrendingUp, User, Award } from 'lucide-react';
import { useAlumni, type AlumniRecord } from '../../hooks/useAlumni';

const AlumniList: React.FC = () => {
  const { fetchAlumni, loading } = useAlumni();
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAlumni().then(data => setAlumni(data));
  }, []);

  const filtered = alumni.filter(a => {
    const name = (a.student_name || '').toLowerCase();
    const company = (a.company || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || name.includes(term) || company.includes(term);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchType = filterType === 'all' || a.placement_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const formatSalary = (salary?: number | null) => {
    if (!salary) return 'N/A';
    return `₹${(salary / 100000).toFixed(1)} LPA`;
  };

  const statusColor = (status: string): string => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'resigned') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const typeColor = (type: string): string => {
    if (type === 'Full-time') return 'bg-blue-100 text-blue-700';
    if (type === 'Internship') return 'bg-yellow-100 text-yellow-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Alumni', value: alumni.length, icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: alumni.filter(a => a.status === 'active').length, icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Companies', value: new Set(alumni.map(a => a.company)).size, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Avg Package', value: alumni.filter(a => a.salary).length > 0 ? `₹${(alumni.filter(a => a.salary).reduce((s, a) => s + (a.salary || 0), 0) / alumni.filter(a => a.salary).length / 100000).toFixed(1)}L` : 'N/A', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by name or company..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="resigned">Resigned</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Placement">Placement</option>
          </select>
        </div>
      </div>

      {/* Alumni cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No alumni found</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm ? 'Try a different search term' : 'Alumni records will appear here once added by admin'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{a.student_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 truncate">{a.student_email || ''}</p>
                  {a.branch && <p className="text-xs text-blue-600 mt-0.5">{a.branch}</p>}
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.company}</p>
                    {a.designation && <p className="text-xs text-gray-500 truncate">{a.designation}</p>}
                  </div>
                </div>
                {a.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600 truncate">{a.location}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-600">{formatSalary(a.salary)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColor(a.placement_type as string)}`}>
                  {a.placement_type}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(a.status as string)}`}>
                  {a.status}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(a.placement_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlumniList;