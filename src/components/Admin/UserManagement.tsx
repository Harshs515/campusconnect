import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Users, Search, User, Shield, Briefcase, GraduationCap, Trash2, Lock, Unlock, X, AlertCircle, Activity } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_complete: boolean;
  bio?: string;
  avatar?: string;
  branch?: string;
  passing_year?: string;
  cgpa?: number;
  company?: string;
  position?: string;
  created_at: string;
  is_blocked?: boolean;
  last_login?: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; userId?: string }>({ open: false, action: '', userId: undefined });

  // FIX 1: memoize getHeaders so it's stable across renders
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  }), []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/users`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // FIX 2: depend on fetchUsers (stable callback), not user?.id
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  }), [users, searchTerm, filterRole]);

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return Shield;
    if (role === 'recruiter') return Briefcase;
    return GraduationCap;
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-700';
    if (role === 'recruiter') return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-700';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        addNotification({ title: 'User deleted', message: 'The user has been successfully deleted', type: 'success' });
        setSelectedUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        addNotification({ title: 'Delete failed', message: 'Server rejected the request', type: 'error' });
      }
    } catch (err) {
      console.error('deleteUser error:', err);
      addNotification({ title: 'Delete failed', message: 'Failed to delete user', type: 'error' });
    }
  }, [getHeaders, addNotification]);

  const handleToggleBlock = useCallback(async (userId: string, isBlocked: boolean) => {
    try {
      const res = await fetch(`${API}/users/${userId}/block`, {
        method: isBlocked ? 'DELETE' : 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, is_blocked: !isBlocked } : u)
        );
        // Also sync selectedUser modal state if open
        setSelectedUser(prev =>
          prev?.id === userId ? { ...prev, is_blocked: !isBlocked } : prev
        );
        addNotification({
          title: isBlocked ? 'User unblocked' : 'User blocked',
          message: isBlocked ? 'User access has been restored' : 'User has been blocked',
          type: 'success',
        });
      } else {
        addNotification({ title: 'Update failed', message: 'Server rejected the request', type: 'error' });
      }
    } catch (err) {
      console.error('toggleBlock error:', err);
      addNotification({ title: 'Update failed', message: 'Failed to update user status', type: 'error' });
    }
  }, [getHeaders, addNotification]);

  const handleUpdateRole = useCallback(async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: data.role ?? newRole } : u));
        addNotification({ title: 'Role updated', message: 'User role has been updated', type: 'success' });
      } else {
        addNotification({ title: 'Update failed', message: 'Server rejected the role change', type: 'error' });
      }
    } catch (err) {
      console.error('updateRole error:', err);
      addNotification({ title: 'Update failed', message: 'Failed to update role', type: 'error' });
    }
  }, [getHeaders, addNotification]);

  const handleBulkDelete = () => setConfirmDialog({ open: true, action: 'bulkDelete' });
  const handleBulkBlock = () => setConfirmDialog({ open: true, action: 'bulkBlock' });

  // FIX 3: handle single-user delete (action === 'delete' with a userId)
  const executeBulkAction = async () => {
    try {
      if (confirmDialog.action === 'delete' && confirmDialog.userId) {
        await handleDeleteUser(confirmDialog.userId);
      } else if (confirmDialog.action === 'bulkDelete' && selectedUsers.size > 0) {
        await Promise.all(Array.from(selectedUsers).map(id => handleDeleteUser(id)));
        addNotification({ title: 'Bulk delete complete', message: `${selectedUsers.size} user(s) deleted`, type: 'success' });
        setSelectedUsers(new Set());
      } else if (confirmDialog.action === 'bulkBlock' && selectedUsers.size > 0) {
        await Promise.all(Array.from(selectedUsers).map(id => {
          const u = users.find(x => x.id === id);
          return handleToggleBlock(id, u?.is_blocked || false);
        }));
        // FIX 4: fixed typo "blocked/blocked" → correct message
        addNotification({ title: 'Bulk block complete', message: `${selectedUsers.size} user(s) block status toggled`, type: 'success' });
        setSelectedUsers(new Set());
      }
    } catch (err) {
      console.error('bulkAction error:', err);
    } finally {
      setConfirmDialog({ open: false, action: '', userId: undefined });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // FIX 5: select-all derived from filtered list to stay in sync
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selectedUsers.has(u.id));
  const someFilteredSelected = filtered.some(u => selectedUsers.has(u.id)) && !allFilteredSelected;

  const counts = {
    all: users.length,
    student: users.filter(u => u.role === 'student').length,
    recruiter: users.filter(u => u.role === 'recruiter').length,
    admin: users.filter(u => u.role === 'admin').length,
    blocked: users.filter(u => u.is_blocked).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {users.length} registered users {counts.blocked > 0 && `• ${counts.blocked} blocked`}
          </p>
        </div>
        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-700">{selectedUsers.size} selected</span>
            <button onClick={handleBulkBlock} className="p-1.5 hover:bg-blue-100 rounded text-blue-700" title="Block selected">
              <Lock className="h-4 w-4" />
            </button>
            <button onClick={handleBulkDelete} className="p-1.5 hover:bg-red-100 rounded text-red-700" title="Delete selected">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={() => setSelectedUsers(new Set())} className="p-1.5 hover:bg-blue-100 rounded text-blue-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', count: counts.all, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Students', count: counts.student, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Recruiters', count: counts.recruiter, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Admins', count: counts.admin, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Blocked', count: counts.blocked, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-gray-100`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Roles ({counts.all})</option>
          <option value="student">Students ({counts.student})</option>
          <option value="recruiter">Recruiters ({counts.recruiter})</option>
          <option value="admin">Admins ({counts.admin})</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">
                    {/* FIX 5: use allFilteredSelected + indeterminate for partial selection */}
                    <input
                      type="checkbox"
                      ref={el => { if (el) el.indeterminate = someFilteredSelected; }}
                      checked={allFilteredSelected}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedUsers(prev => {
                            const next = new Set(prev);
                            filtered.forEach(u => next.add(u.id));
                            return next;
                          });
                        } else {
                          setSelectedUsers(prev => {
                            const next = new Set(prev);
                            filtered.forEach(u => next.delete(u.id));
                            return next;
                          });
                        }
                      }}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => {
                  const RoleIcon = getRoleIcon(u.role);
                  const isSelected = selectedUsers.has(u.id);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.is_blocked ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" onChange={() => toggleSelect(u.id)} checked={isSelected} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {u.avatar
                              ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                              : <User className="h-4 w-4 text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                            {u.last_login && <p className="text-xs text-gray-400">Last: {formatDate(u.last_login)}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit capitalize ${getRoleColor(u.role)}`}>
                            <RoleIcon className="h-3 w-3" />{u.role}
                          </span>
                          <select
                            value={u.role}
                            onChange={e => handleUpdateRole(u.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-blue-300 cursor-pointer"
                          >
                            <option value="student">Student</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.branch && <p>Branch: {u.branch}</p>}
                        {u.cgpa && <p>CGPA: {u.cgpa}</p>}
                        {u.company && <p>Company: {u.company}</p>}
                        {u.position && <p>Position: {u.position}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.profile_complete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {u.profile_complete ? 'Complete' : 'Incomplete'}
                          </span>
                          {u.is_blocked && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Blocked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedUser(u); setShowModal(true); }}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                            title="View details"
                          >
                            <Activity className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleBlock(u.id, u.is_blocked || false)}
                            className={`p-1.5 rounded ${u.is_blocked ? 'hover:bg-green-100 text-green-600' : 'hover:bg-orange-100 text-orange-600'}`}
                            title={u.is_blocked ? 'Unblock' : 'Block'}
                          >
                            {u.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setConfirmDialog({ open: true, action: 'delete', userId: u.id })}
                            className="p-1.5 hover:bg-red-100 rounded text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 flex justify-between items-center">
            <span>Showing {filtered.length} of {users.length} users</span>
            {selectedUsers.size > 0 && (
              <span className="text-blue-600 font-medium">{selectedUsers.size} selected</span>
            )}
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar
                    ? <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                    : <User className="h-8 w-8 text-white" />}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Profile:</span>
                  <span className={selectedUser.profile_complete ? 'text-green-600' : 'text-gray-600'}>
                    {selectedUser.profile_complete ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={selectedUser.is_blocked ? 'text-red-600' : 'text-green-600'}>
                    {selectedUser.is_blocked ? 'Blocked' : 'Active'}
                  </span>
                </div>
                {selectedUser.branch && <div className="flex justify-between"><span className="text-gray-500">Branch:</span><span>{selectedUser.branch}</span></div>}
                {selectedUser.cgpa && <div className="flex justify-between"><span className="text-gray-500">CGPA:</span><span>{selectedUser.cgpa}</span></div>}
                {selectedUser.company && <div className="flex justify-between"><span className="text-gray-500">Company:</span><span>{selectedUser.company}</span></div>}
                {selectedUser.position && <div className="flex justify-between"><span className="text-gray-500">Position:</span><span>{selectedUser.position}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Joined:</span><span>{formatDate(selectedUser.created_at)}</span></div>
                {selectedUser.last_login && <div className="flex justify-between"><span className="text-gray-500">Last login:</span><span>{formatDate(selectedUser.last_login)}</span></div>}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { handleToggleBlock(selectedUser.id, selectedUser.is_blocked || false); setShowModal(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${selectedUser.is_blocked ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                >
                  {selectedUser.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {selectedUser.is_blocked ? 'Unblock User' : 'Block User'}
                </button>
                <button
                  onClick={() => { setConfirmDialog({ open: true, action: 'delete', userId: selectedUser.id }); setShowModal(false); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {confirmDialog.action === 'delete' ? 'Delete User?' :
                 confirmDialog.action === 'bulkDelete' ? 'Delete Selected Users?' :
                 confirmDialog.action === 'bulkBlock' ? 'Toggle Block Selected Users?' : 'Confirm'}
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {confirmDialog.action === 'delete'
                ? 'This action cannot be undone. The user will be permanently deleted.'
                : confirmDialog.action === 'bulkDelete'
                  ? `${selectedUsers.size} user(s) will be permanently deleted.`
                  : confirmDialog.action === 'bulkBlock'
                    ? `${selectedUsers.size} user(s) block status will be toggled.`
                    : 'Are you sure?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog({ open: false, action: '', userId: undefined })}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;