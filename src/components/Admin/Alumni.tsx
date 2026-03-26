import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Search, Filter, User, Building2, TrendingUp, Award, Download } from 'lucide-react';
import { useAlumni, type AlumniRecord } from '../../hooks/useAlumni';
import { useSocial } from '../../contexts/SocialContext';
import { useNotification } from '../../contexts/NotificationContext';

interface FormState extends Partial<AlumniRecord> {
  salary_lpa?: string;
}

const emptyForm: FormState = {
  placement_type: 'Full-time',
  status: 'active',
  package_currency: 'INR',
  salary_lpa: '',
  company: '',
  designation: '',
  location: '',
  placement_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function Alumni() {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdown, setStudentDropdown] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { fetchAlumni, createAlumni, updateAlumni, deleteAlumni, getAlumniStatistics, loading } = useAlumni();
  const { userProfiles } = useSocial();
  const { addNotification } = useNotification();

  const students = userProfiles.filter(p => p.role === 'student');

  useEffect(() => {
    loadData();
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStudentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadData = async () => {
    try {
      const [data, statsData] = await Promise.all([fetchAlumni(), getAlumniStatistics()]);
      setAlumni(data);
      setStats(statsData);
    } catch (e) {
      console.error('Error loading alumni data:', e);
    }
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setSelectedStudentName('');
    setStudentSearch('');
    setEditingId(null);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (record: any) => {
    setFormData({
      ...record,
      salary_lpa: record.salary ? (record.salary / 100000).toString() : '',
    });
    setSelectedStudentName(record.profiles?.name || '');
    setEditingId(record.id);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
    setSelectedStudentName('');
    setStudentSearch('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.student_id && !editingId) {
      setFormError('Please select a student');
      return;
    }
    if (!formData.company?.trim()) {
      setFormError('Company name is required');
      return;
    }
    if (!formData.placement_date) {
      setFormError('Placement date is required');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('campusconnect_user') || '{}');
    const payload = {
      student_id: formData.student_id || '',
      job_id: formData.job_id || null,
      application_id: formData.application_id || null,
      placement_date: formData.placement_date || '',
      salary: formData.salary_lpa ? parseFloat(formData.salary_lpa) * 100000 : null,
      package_currency: formData.package_currency || 'INR',
      company: formData.company || '',
      designation: formData.designation || null,
      location: formData.location || null,
      placement_type: formData.placement_type as AlumniRecord['placement_type'],
      status: formData.status as AlumniRecord['status'],
      notes: formData.notes || null,
      created_by: currentUser.id || 'demo-admin-001',
    };

    try {
      if (editingId) {
        await updateAlumni(editingId, payload);
        addNotification({ title: 'Record Updated', message: 'Alumni record updated successfully', type: 'success' });
      } else {
        await createAlumni(payload as any);
        addNotification({ title: 'Record Added', message: `${selectedStudentName} added to alumni records`, type: 'success' });
      }
      closeModal();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save record');
    }
  };

  const handleDelete = async (id: string, studentName: string) => {
    if (!confirm(`Delete alumni record for ${studentName}? This cannot be undone.`)) return;
    try {
      await deleteAlumni(id);
      addNotification({ title: 'Record Deleted', message: `Alumni record removed`, type: 'info' });
      await loadData();
    } catch (err: any) {
      addNotification({ title: 'Delete Failed', message: err.message, type: 'error' });
    }
  };

  const filteredAlumni = alumni.filter((r: any) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || (r.profiles?.name || '').toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q) || (r.designation || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchType = filterType === 'all' || r.placement_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    resigned: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-100 text-gray-600',
  };

  const typeColors: Record<string, string> = {
    'Full-time': 'bg-blue-100 text-blue-700',
    'Internship': 'bg-purple-100 text-purple-700',
    'Placement': 'bg-amber-100 text-amber-700',
  };

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumni Management</h1>
          <p className="text-gray-500 mt-1">Track and manage formally placed students</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Placed Student
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Alumni', value: stats.totalAlumni, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active', value: stats.activeAlumni, icon: User, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Avg. Package', value: stats.averageSalary ? `₹${(stats.averageSalary / 100000).toFixed(1)}L` : 'N/A', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Companies', value: stats.topCompanies.length, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, designation..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="resigned">Resigned</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Types</option>
          <option value="Full-time">Full-time</option>
          <option value="Internship">Internship</option>
          <option value="Placement">Placement</option>
        </select>
        <button className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Student', 'Company & Role', 'Salary', 'Placement Date', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </td></tr>
              ) : filteredAlumni.length > 0 ? filteredAlumni.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{record.profiles?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{record.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 text-sm">{record.company}</p>
                    <p className="text-xs text-gray-500">{record.designation || '—'}</p>
                    {record.location && <p className="text-xs text-gray-400">{record.location}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 text-sm">
                      {record.salary ? `₹${(record.salary / 100000).toFixed(1)}L` : '—'}
                    </p>
                    {record.salary && <p className="text-xs text-gray-400">{record.package_currency}/yr</p>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {new Date(record.placement_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeColors[record.placement_type] || 'bg-gray-100 text-gray-600'}`}>
                      {record.placement_type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[record.status] || 'bg-gray-100 text-gray-600'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(record.id, record.profiles?.name || 'this student')} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-5 py-12 text-center">
                  <Award className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">No alumni records found</p>
                  <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or add a new record</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredAlumni.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">Showing {filteredAlumni.length} of {alumni.length} records</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Alumni Record' : 'Add Placed Student'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingId ? 'Update placement information' : 'Record a new placement'}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              <form id="alumni-form" onSubmit={handleSubmit} className="p-6 space-y-5">
                {formError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{formError}</p>
                  </div>
                )}

                {/* Student selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Student <span className="text-red-500">*</span>
                  </label>
                  {editingId ? (
                    <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
                      {selectedStudentName}
                    </div>
                  ) : (
                    <div className="relative" ref={dropdownRef}>
                      {formData.student_id ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm font-medium text-green-800">{selectedStudentName}</span>
                          </div>
                          <button type="button" onClick={() => { setFormData(p => ({ ...p, student_id: '' })); setSelectedStudentName(''); setStudentSearch(''); }} className="px-3 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search student by name or email..."
                            value={studentSearch}
                            onChange={e => { setStudentSearch(e.target.value); setStudentDropdown(true); }}
                            onFocus={() => setStudentDropdown(true)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          {studentDropdown && studentSearch && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                              {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                <button key={s.id} type="button" onClick={() => {
                                  setFormData(p => ({ ...p, student_id: s.id }));
                                  setSelectedStudentName(s.name);
                                  setStudentDropdown(false);
                                  setStudentSearch('');
                                }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left">
                                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="h-3.5 w-3.5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                                    <p className="text-xs text-gray-400">{s.email}</p>
                                  </div>
                                </button>
                              )) : (
                                <div className="px-4 py-3 text-sm text-gray-400 text-center">No students found</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Company & Role */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company <span className="text-red-500">*</span></label>
                    <input className={inputClass} value={formData.company || ''} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} placeholder="e.g., Google, Microsoft" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Designation</label>
                    <input className={inputClass} value={formData.designation || ''} onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))} placeholder="e.g., Software Engineer" />
                  </div>
                </div>

                {/* Dates & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Placement Date <span className="text-red-500">*</span></label>
                    <input type="date" className={inputClass} value={formData.placement_date || ''} onChange={e => setFormData(p => ({ ...p, placement_date: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Placement Type <span className="text-red-500">*</span></label>
                    <select className={inputClass} value={formData.placement_type || 'Full-time'} onChange={e => setFormData(p => ({ ...p, placement_type: e.target.value as any }))}>
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                      <option value="Placement">Placement</option>
                    </select>
                  </div>
                </div>

                {/* Salary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Salary (LPA)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                      <input type="number" step="0.1" min="0" className={`${inputClass} pl-7`} value={formData.salary_lpa || ''} onChange={e => setFormData(p => ({ ...p, salary_lpa: e.target.value }))} placeholder="e.g., 8.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Currency</label>
                    <select className={inputClass} value={formData.package_currency || 'INR'} onChange={e => setFormData(p => ({ ...p, package_currency: e.target.value }))}>
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Location & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
                    <input className={inputClass} value={formData.location || ''} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Bangalore, India" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                    <select className={inputClass} value={formData.status || 'active'} onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="resigned">Resigned</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
                  <textarea className={`${inputClass} resize-none`} rows={2} value={formData.notes || ''} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-white transition-colors">
                Cancel
              </button>
              <button type="submit" form="alumni-form" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? 'Saving...' : editingId ? 'Update Record' : 'Add Alumni'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
