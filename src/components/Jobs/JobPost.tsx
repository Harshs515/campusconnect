import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Briefcase, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const JobPost: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', company: user?.role === 'recruiter' ? '' : '',
    description: '', location: '', salary: '',
    job_type: 'Full-time', department: '',
    min_cgpa: '6.0', deadline: '',
    eligible_branches: [] as string[],
    requirements: [''],
    skills: [''],
  });

  const branches = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Mathematics', 'Statistics', 'Design'];

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  const toggleBranch = (branch: string) => {
    setForm(p => ({
      ...p,
      eligible_branches: p.eligible_branches.includes(branch)
        ? p.eligible_branches.filter(b => b !== branch)
        : [...p.eligible_branches, branch],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.company || !form.description || !form.location || !form.salary || !form.deadline) {
      addNotification({ title: 'Missing fields', message: 'Please fill in all required fields.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: form.title,
          company: form.company,
          description: form.description,
          location: form.location,
          salary: form.salary,
          job_type: form.job_type,
          department: form.department,
          min_cgpa: parseFloat(form.min_cgpa) || 0,
          eligible_branches: form.eligible_branches,
          deadline: form.deadline,
          requirements: form.requirements.filter(Boolean),
          skills: form.skills.filter(Boolean),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to post job');
      }
      addNotification({ title: 'Job posted!', message: `${form.title} has been posted successfully.`, type: 'success' });
      navigate('/my-jobs');
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-blue-600" /> Post a New Job
        </h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details to post a job opening</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="e.g. Software Engineer" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Company *</label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className={inputCls} placeholder="Company name" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className={inputCls} placeholder="e.g. Bangalore, India" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Salary *</label>
              <input value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} className={inputCls} placeholder="e.g. ₹8-12 LPA" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Type</label>
              <select value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))} className={inputCls}>
                <option>Full-time</option><option>Part-time</option><option>Internship</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
              <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className={inputCls} placeholder="e.g. Engineering" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Min CGPA</label>
              <input type="number" step="0.1" min="0" max="10" value={form.min_cgpa} onChange={e => setForm(p => ({ ...p, min_cgpa: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Application Deadline *</label>
              <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} className={`${inputCls} resize-none`} placeholder="Describe the role, responsibilities, and work environment..." /></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Eligibility</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Eligible Branches</label>
            <div className="flex flex-wrap gap-2">
              {branches.map(b => (
                <button key={b} type="button" onClick={() => toggleBranch(b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.eligible_branches.includes(b) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Requirements</label>
            {form.requirements.map((req, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={req} onChange={e => setForm(p => ({ ...p, requirements: p.requirements.map((r, idx) => idx === i ? e.target.value : r) }))}
                  className={inputCls} placeholder={`Requirement ${i + 1}`} />
                {form.requirements.length > 1 && <button type="button" onClick={() => setForm(p => ({ ...p, requirements: p.requirements.filter((_, idx) => idx !== i) }))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="h-4 w-4" /></button>}
              </div>
            ))}
            <button type="button" onClick={() => setForm(p => ({ ...p, requirements: [...p.requirements, ''] }))}
              className="flex items-center gap-1 text-sm text-blue-600 font-medium"><Plus className="h-4 w-4" />Add Requirement</button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Required Skills</label>
            {form.skills.map((skill, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={skill} onChange={e => setForm(p => ({ ...p, skills: p.skills.map((s, idx) => idx === i ? e.target.value : s) }))}
                  className={inputCls} placeholder={`Skill ${i + 1}`} />
                {form.skills.length > 1 && <button type="button" onClick={() => setForm(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><X className="h-4 w-4" /></button>}
              </div>
            ))}
            <button type="button" onClick={() => setForm(p => ({ ...p, skills: [...p.skills, ''] }))}
              className="flex items-center gap-1 text-sm text-blue-600 font-medium"><Plus className="h-4 w-4" />Add Skill</button>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/my-jobs')}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {submitting ? 'Posting...' : 'Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobPost;