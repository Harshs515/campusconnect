import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Search, MapPin, Briefcase, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location: string;
  salary: string;
  job_type: string;
  department: string;
  min_cgpa: number;
  eligible_branches: string[];
  deadline: string;
  skills: string[];
  applicants_count: number;
  recruiter_name: string;
  status: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const JobSearch: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetter, setShowCoverLetter] = useState<string | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/jobs`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(Array.isArray(data) ? data.filter((j: Job) => j.status === 'active') : []);
    } catch (err) {
      console.error('fetchJobs error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/applications`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const applied = new Set<string>(data.map((a: any) => a.job_id));
      setAppliedJobs(applied);
    } catch (err) {
      console.error('fetchApplications error:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, [user?.id]);

  const handleApply = async (jobId: string) => {
    setApplyingTo(jobId);
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to apply');
      }
      setAppliedJobs(prev => new Set([...prev, jobId]));
      setShowCoverLetter(null);
      setCoverLetter('');
      addNotification({ title: 'Application submitted!', message: 'Your application has been sent successfully.', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setApplyingTo(null);
    }
  };

  const filtered = jobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || j.job_type === filterType;
    return matchSearch && matchType;
  });

  const typeColor = (type: string) => {
    if (type === 'Full-time') return 'bg-blue-100 text-blue-700';
    if (type === 'Internship') return 'bg-yellow-100 text-yellow-700';
    return 'bg-purple-100 text-purple-700';
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const isExpired = (dateStr: string) => new Date(dateStr) < new Date();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse Jobs</h1>
        <p className="text-gray-500 text-sm mt-0.5">{filtered.length} jobs available</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search by title, company, location..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Internship">Internship</option>
        </select>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(job => {
            const isApplied = appliedJobs.has(job.id);
            const expired = isExpired(job.deadline);
            const isExpanded = expandedJob === job.id;
            return (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(job.job_type)}`}>{job.job_type}</span>
                      {expired && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Expired</span>}
                      {isApplied && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Applied ✓</span>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                    <p className="text-blue-600 font-medium text-sm">{job.company}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-600 font-bold text-sm">{job.salary}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{job.applicants_count} applicants</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />{job.location}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />Deadline: {formatDate(job.deadline)}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
                    {job.requirements?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Requirements</p>
                        <ul className="space-y-1">
                          {job.requirements.map((r, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-1 flex-shrink-0">•</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {job.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map(s => (
                          <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Min CGPA: {job.min_cgpa}</span>
                      {job.eligible_branches?.length > 0 && <span>Branches: {job.eligible_branches.join(', ')}</span>}
                    </div>

                    {/* Cover letter input */}
                    {showCoverLetter === job.id && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cover Letter (optional)</label>
                        <textarea value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                          placeholder="Write a brief cover letter..." />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                    {isExpanded ? <><ChevronUp className="h-4 w-4" />Less</> : <><ChevronDown className="h-4 w-4" />Details</>}
                  </button>
                  {!expired && user?.role === 'student' && (
                    isApplied ? (
                      <span className="text-sm text-green-600 font-semibold">Application Submitted</span>
                    ) : showCoverLetter === job.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => setShowCoverLetter(null)}
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        <button onClick={() => handleApply(job.id)} disabled={applyingTo === job.id}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                          <Send className="h-3.5 w-3.5" />{applyingTo === job.id ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setShowCoverLetter(job.id); setExpandedJob(job.id); }}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                        <Send className="h-3.5 w-3.5" />Apply Now
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobSearch;