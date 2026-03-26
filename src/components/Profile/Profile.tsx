import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getRoleColor } from '../../utils/helpers';
import { User, Mail, Phone, MapPin, Save, Edit2, Upload, Plus, X, GraduationCap, Briefcase, Github, Linkedin, Globe, Award, FileText, Trash2, Loader } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ProfileData {
  name: string; phone: string; location: string; bio: string;
  branch: string; passingYear: string; cgpa: string;
  github: string; linkedin: string; portfolio: string;
  company: string; position: string; website: string;
  skills: string[];
}

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { addNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<{ name: string; url: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ProfileData>({
    name: user?.name || '', phone: '', location: '', bio: '',
    branch: '', passingYear: '', cgpa: '', github: '', linkedin: '', portfolio: '',
    company: '', position: '', website: '', skills: [''],
  });

  const token = localStorage.getItem('campusconnect_token');
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  // Load profile from API
  useEffect(() => {
    if (!user?.id || !token) return;
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const p = await res.json();
        setData({
          name: p.name || user.name || '',
          phone: p.phone || '',
          location: p.location || '',
          bio: p.bio || '',
          branch: p.branch || '',
          passingYear: p.passing_year || '',
          cgpa: p.cgpa ? String(p.cgpa) : '',
          github: p.github || '',
          linkedin: p.linkedin || '',
          portfolio: p.portfolio || '',
          company: p.company || '',
          position: p.position || '',
          website: p.website || '',
          skills: p.skills?.length ? p.skills : [''],
        });
        if (p.resume_url) {
          setResumeFile({ name: 'Resume', url: p.resume_url });
        }
      } catch {
        // Fallback to localStorage if API is unavailable
        try {
          const saved = localStorage.getItem(`cc_profile_${user.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            setData(prev => ({ ...prev, ...parsed, name: user.name }));
          }
        } catch {}
      }
    };
    loadProfile();
  }, [user?.id]);

  // Upload avatar to API
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 5 * 1024 * 1024) {
      addNotification({ title: 'File too large', message: 'Avatar must be under 5MB.', type: 'error' });
      return;
    }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API}/upload/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const result = await res.json();
      updateProfile({ avatar: result.url });
      addNotification({ title: 'Avatar updated!', message: 'Your profile photo has been changed.', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Upload failed', message: err.message || 'Could not upload avatar.', type: 'error' });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Upload resume to API
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 10 * 1024 * 1024) {
      addNotification({ title: 'File too large', message: 'Resume must be under 10MB.', type: 'error' });
      return;
    }
    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await fetch(`${API}/upload/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const result = await res.json();
      setResumeFile({ name: result.originalName || file.name, url: result.url });
      addNotification({ title: 'Resume uploaded!', message: `${result.originalName || file.name} has been saved.`, type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Upload failed', message: err.message || 'Could not upload resume.', type: 'error' });
    } finally {
      setResumeUploading(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  // Save profile to API
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const body: Record<string, any> = {
        name: data.name,
        bio: data.bio || null,
        phone: data.phone || null,
        location: data.location || null,
        avatar: user?.avatar || null,
        profileComplete: true,
      };

      if (user?.role === 'student') {
        body.branch = data.branch || null;
        body.passingYear = data.passingYear || null;
        body.cgpa = data.cgpa ? parseFloat(data.cgpa) : null;
        body.github = data.github || null;
        body.linkedin = data.linkedin || null;
        body.portfolio = data.portfolio || null;
        body.skills = data.skills.filter(Boolean);
      } else if (user?.role === 'recruiter') {
        body.company = data.company || null;
        body.position = data.position || null;
        body.website = data.website || null;
      }

      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save profile');
      }

      await updateProfile({ name: data.name, profileComplete: true });
      // Also cache locally as fallback
      localStorage.setItem(`cc_profile_${user?.id}`, JSON.stringify(data));
      addNotification({ title: 'Profile Updated', message: 'Your profile has been saved to the database.', type: 'success' });
      setIsEditing(false);
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message || 'Failed to update profile. Try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => setData(p => ({ ...p, skills: [...p.skills, ''] }));
  const removeSkill = (i: number) => setData(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }));
  const updateSkill = (i: number, v: string) => setData(p => ({ ...p, skills: p.skills.map((s, idx) => idx === i ? v : s) }));

  const inputClass = `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors ${isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white' : 'border-transparent bg-gray-50 text-gray-700 cursor-default'}`;

  const completionFields = ['phone', 'bio', 'location', ...(user?.role === 'student' ? ['branch', 'passingYear', 'cgpa', 'github'] : ['company', 'position'])];
  const filled = completionFields.filter(f => data[f as keyof ProfileData] && data[f as keyof ProfileData] !== '').length;
  const completion = Math.round((filled / completionFields.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" />
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <User className="h-9 w-9 text-white" />}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow border-2 border-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {avatarUploading
                    ? <Loader className="h-3.5 w-3.5 text-white animate-spin" />
                    : <Upload className="h-3.5 w-3.5 text-white" />}
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <button
              onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isEditing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
            >
              <Edit2 className="h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{data.name || user?.name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getRoleColor(user?.role || '')}`}>{user?.role}</span>
              {user?.profileComplete && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Verified</span>}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
            {data.bio && <p className="text-gray-600 text-sm mt-2">{data.bio}</p>}
          </div>

          {/* Completion bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Profile Completion</span>
              <span className="text-xs font-bold text-blue-600">{completion}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${completion >= 80 ? 'bg-green-500' : completion >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${completion}%` }} />
            </div>
            {completion < 80 && <p className="text-xs text-gray-400 mt-1">Complete your profile to improve job recommendations</p>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><User className="h-4 w-4 text-blue-600" /> Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
              <input className={inputClass} value={data.name} onChange={e => setData(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" disabled={!isEditing} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input className={`${inputClass} bg-gray-50 cursor-not-allowed`} value={user?.email || ''} disabled placeholder="Email address" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input className={inputClass} value={data.phone} onChange={e => setData(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" disabled={!isEditing} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
              <input className={inputClass} value={data.location} onChange={e => setData(p => ({ ...p, location: e.target.value }))} placeholder="City, State" disabled={!isEditing} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bio</label>
              <textarea className={`${inputClass} resize-none`} value={data.bio} onChange={e => setData(p => ({ ...p, bio: e.target.value }))} placeholder="Tell recruiters about yourself..." rows={3} disabled={!isEditing} />
            </div>
          </div>
        </div>

        {/* Role-specific */}
        {user?.role === 'student' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600" /> Academic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Branch / Department</label>
                <input className={inputClass} value={data.branch} onChange={e => setData(p => ({ ...p, branch: e.target.value }))} placeholder="e.g., Computer Science" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Passing Year</label>
                <input className={inputClass} value={data.passingYear} onChange={e => setData(p => ({ ...p, passingYear: e.target.value }))} placeholder="e.g., 2025" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">CGPA</label>
                <input className={inputClass} value={data.cgpa} onChange={e => setData(p => ({ ...p, cgpa: e.target.value }))} placeholder="e.g., 8.5" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Github className="h-3.5 w-3.5" /> GitHub</label>
                <input className={inputClass} value={data.github} onChange={e => setData(p => ({ ...p, github: e.target.value }))} placeholder="github.com/username" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</label>
                <input className={inputClass} value={data.linkedin} onChange={e => setData(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/username" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Portfolio</label>
                <input className={inputClass} value={data.portfolio} onChange={e => setData(p => ({ ...p, portfolio: e.target.value }))} placeholder="yourportfolio.com" disabled={!isEditing} />
              </div>
            </div>

            {/* Skills */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Skills</label>
              {isEditing ? (
                <div className="space-y-2">
                  {data.skills.map((skill, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={skill} onChange={e => updateSkill(i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="e.g., React, Python, Java" />
                      {data.skills.length > 1 && <button type="button" onClick={() => removeSkill(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="h-4 w-4" /></button>}
                    </div>
                  ))}
                  <button type="button" onClick={addSkill} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"><Plus className="h-4 w-4" /> Add Skill</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.skills.filter(Boolean).map(s => <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium">{s}</span>)}
                  {!data.skills.filter(Boolean).length && <span className="text-gray-400 text-sm">No skills added yet</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {user?.role === 'recruiter' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-600" /> Professional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company Name</label>
                <input className={inputClass} value={data.company} onChange={e => setData(p => ({ ...p, company: e.target.value }))} placeholder="e.g., TechCorp" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Position / Title</label>
                <input className={inputClass} value={data.position} onChange={e => setData(p => ({ ...p, position: e.target.value }))} placeholder="e.g., HR Manager" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website</label>
                <input className={inputClass} value={data.website} onChange={e => setData(p => ({ ...p, website: e.target.value }))} placeholder="company.com" disabled={!isEditing} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">LinkedIn</label>
                <input className={inputClass} value={data.linkedin} onChange={e => setData(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/username" disabled={!isEditing} />
              </div>
            </div>
          </div>
        )}

        {/* Resume upload — students only */}
        {user?.role === 'student' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Resume</h2>
            {resumeFile ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <FileText className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{resumeFile.name}</p>
                  <a href={resumeFile.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View Resume</a>
                </div>
                {isEditing && (
                  <button type="button" onClick={() => resumeInputRef.current?.click()} disabled={resumeUploading}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50">
                    {resumeUploading ? 'Uploading...' : 'Replace'}
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`border-2 border-dashed border-gray-200 rounded-xl p-6 text-center transition-colors ${isEditing ? 'hover:border-blue-300 cursor-pointer' : ''}`}
                onClick={() => isEditing && resumeInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Upload your resume</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX • Max 10MB</p>
                {isEditing && (
                  <button type="button" disabled={resumeUploading}
                    className="mt-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50">
                    {resumeUploading ? 'Uploading...' : 'Choose File'}
                  </button>
                )}
              </div>
            )}
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Save button */}
        {isEditing && (
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;