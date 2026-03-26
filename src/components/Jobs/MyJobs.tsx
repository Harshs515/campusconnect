import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Briefcase, Users, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Application {
  id: string;
  student_name: string;
  student_email: string;
  branch?: string;
  cgpa?: number;
  cover_letter?: string;
  status: string;
  created_at: string;
  resume_url?: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  job_type: string;
  status: string;
  applicants_count: number;
  deadline: string;
  created_at: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const MyJobs: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applications, setApplications] = useState<Record<string, Application[]>>({});
  const [loadingApps, setLoadingApps] = useState<string | null>(null);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/jobs`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchJobs error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchJobs(); }, [user?.id]);

  const loadApplications = async (jobId: string) => {
    if (applications[jobId]) return;
    setLoadingApps(jobId);
    try {
      const res = await fetch(`${API}/applications/job/${jobId}`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setApplications(prev => ({ ...prev, [jobId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error('loadApplications error:', err);
    } finally {
      setLoadingApps(null);
    }
  };

  const toggleJob = (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      loadApplications(jobId);
    }
  };

  const updateStatus = async (appId: string, jobId: string, status: string) => {
    setUpdatingApp(appId);
    try {
      const res = await fetch(`${API}/applications/${appId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setApplications(prev => ({
        ...prev,
        [jobId]: (prev[jobId] || []).map(a => a.id === appId ? { ...a, status } : a),
      }));
      addNotification({ title: 'Status updated!', message: `Application marked as ${status}.`, type: 'success' });
    } catch {
      addNotification({ title: 'Error', message: 'Could not update status.', type: 'error' });
    } finally {
      setUpdatingApp(null);
    }
  };

  const toggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      const res = await fetch(`${API}/jobs/${jobId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      addNotification({ title: 'Job updated', message: `Job is now ${newStatus}.`, type: 'success' });
    } catch {
      addNotification({ title: 'Error', message: 'Could not update job.', type: 'error' });
    }
  };

  const statusColor = (status: string) => {
    if (status === 'shortlisted') return 'bg-blue-100 text-blue-700';
    if (status === 'hired') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Job Postings</h1>
          <p className="text-gray-500 text-sm mt-0.5">{jobs.length} jobs posted</p>
        </div>
        <Link to="/post-job" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          + Post New Job
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No jobs posted yet</p>
          <Link to="/post-job" className="mt-3 inline-block text-blue-600 text-sm font-medium">Post your first job →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const isExpanded = expandedJob === job.id;
            const jobApps = applications[job.id] || [];
            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {job.status}
                        </span>
                        <span className="text-xs text-gray-400">{job.job_type}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-500">{job.company} • {job.location} • {job.salary}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleJobStatus(job.id, job.status)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title={job.status === 'active' ? 'Close job' : 'Reopen job'}>
                        {job.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Users className="h-4 w-4" />{job.applicants_count} applicants
                    </div>
                    <span className="text-sm text-gray-500">Deadline: {formatDate(job.deadline)}</span>
                  </div>

                  <button onClick={() => toggleJob(job.id)}
                    className="mt-3 flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline">
                    {isExpanded ? <><ChevronUp className="h-4 w-4" />Hide Applications</> : <><ChevronDown className="h-4 w-4" />View Applications ({job.applicants_count})</>}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {loadingApps === job.id ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : jobApps.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 text-sm">No applications yet</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {jobApps.map(app => (
                          <div key={app.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{app.student_name}</p>
                                  <p className="text-xs text-gray-500">{app.student_email}{app.branch ? ` • ${app.branch}` : ''}{app.cgpa ? ` • CGPA: ${app.cgpa}` : ''}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(app.status)}`}>{app.status}</span>
                            </div>

                            {app.cover_letter && (
                              <p className="mt-2 text-xs text-gray-600 bg-white rounded-lg p-2 border border-gray-200">{app.cover_letter}</p>
                            )}

                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              {app.resume_url && (
                                <a href={app.resume_url} target="_blank" rel="noreferrer"
                                  className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-200">View Resume</a>
                              )}
                              {['shortlisted', 'hired', 'rejected'].map(s => (
                                <button key={s} onClick={() => updateStatus(app.id, job.id, s)}
                                  disabled={app.status === s || updatingApp === app.id}
                                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors disabled:opacity-40 ${
                                    s === 'shortlisted' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                    s === 'hired' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                    'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
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

export default MyJobs;