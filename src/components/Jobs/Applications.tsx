import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, ChevronDown, ChevronUp, Briefcase, MapPin, Clock } from 'lucide-react';

interface Application {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  salary: string;
  job_type: string;
  status: string;
  cover_letter?: string;
  resume_url?: string;
  created_at: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Applications: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/applications`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchApplications error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchApplications(); }, [user?.id]);

  const filtered = applications.filter(a =>
    filterStatus === 'all' || a.status === filterStatus
  );

  const statusColor = (status: string) => {
    if (status === 'shortlisted') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status === 'hired') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const statusCounts = {
    all: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    hired: applications.filter(a => a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-500 text-sm mt-0.5">{applications.length} total applications</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button key={status} onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filterStatus === status ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {status} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No applications found</p>
          <p className="text-gray-400 text-sm mt-1">Start applying to jobs from the Browse Jobs page</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const isExpanded = expandedApp === app.id;
            return (
              <div key={app.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                app.status === 'hired' ? 'border-green-200' :
                app.status === 'shortlisted' ? 'border-blue-200' :
                app.status === 'rejected' ? 'border-red-200' : 'border-gray-200'
              }`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusColor(app.status)}`}>
                          {app.status}
                        </span>
                        <span className="text-xs text-gray-400">{app.job_type}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{app.job_title}</h3>
                      <p className="text-blue-600 font-medium text-sm">{app.company}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-600 font-semibold text-sm">{app.salary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {app.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />{app.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />Applied {formatDate(app.created_at)}
                    </div>
                  </div>

                  {(app.cover_letter || app.resume_url) && (
                    <button onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                      className="mt-3 flex items-center gap-1 text-sm text-blue-600 font-medium">
                      {isExpanded ? <><ChevronUp className="h-4 w-4" />Hide Details</> : <><ChevronDown className="h-4 w-4" />View Details</>}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-3 bg-gray-50">
                    {app.resume_url && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Resume</p>
                        <a href={app.resume_url} target="_blank" rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline font-medium">View Resume →</a>
                      </div>
                    )}
                    {app.cover_letter && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Cover Letter</p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{app.cover_letter}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Applications;