import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { UserPlus, Users, User, Check, Search, X, Clock } from 'lucide-react';

interface Connection {
  id: string;          // connection row id
  user_id: string;
  connected_user_id: string;
  status: string;
  // joined from profiles
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatar?: string;
}

interface PendingRequest {
  id: string;          // connection row id
  user_id: string;     // who sent the request
  connected_user_id: string;
  status: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatar?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatar?: string;
  branch?: string;
  company?: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Connections: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [tab, setTab] = useState<'connections' | 'pending' | 'discover'>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  }), []);

  // Fetch accepted connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch(`${API}/connections`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchConnections error:', err);
    }
  }, [getHeaders]);

  // Fetch pending incoming requests (people who sent ME a request)
  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${API}/connections/pending`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchPending error:', err);
    }
  }, [getHeaders]);

  // Fetch all users + already-sent requests to mark "Request Sent"
  const fetchUsers = useCallback(async () => {
    try {
      const [usersRes, sentRes] = await Promise.all([
        fetch(`${API}/users`, { headers: getHeaders() }),
        fetch(`${API}/connections/sent`, { headers: getHeaders() }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(Array.isArray(data) ? data.filter((u: any) => u.id !== user?.id) : []);
      }

      if (sentRes.ok) {
        const sentData = await sentRes.json();
        // sentData is array of connections where current user is sender
        const ids = new Set<string>(
          Array.isArray(sentData) ? sentData.map((c: any) => c.connected_user_id) : []
        );
        setSentRequestIds(ids);
      }
    } catch (err) {
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, user?.id]);

  useEffect(() => {
    fetchConnections();
    fetchPending();
    fetchUsers();
  }, [fetchConnections, fetchPending, fetchUsers]);

  // Send connection request
  const sendRequest = async (userId: string, userName: string) => {
    setRequesting(userId);
    try {
      const res = await fetch(`${API}/connections/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ connected_user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send request');
      }
      setSentRequestIds(prev => new Set([...prev, userId]));
      addNotification({ title: 'Request sent!', message: `Connection request sent to ${userName}.`, type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setRequesting(null);
    }
  };

  // Accept incoming request
  const acceptRequest = async (connectionId: string, senderName: string) => {
    try {
      const res = await fetch(`${API}/connections/${connectionId}/accept`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to accept');
      // Move from pending to connections
      const accepted = pendingRequests.find(r => r.id === connectionId);
      if (accepted) {
        setConnections(prev => [...prev, { ...accepted, status: 'accepted' }]);
        setPendingRequests(prev => prev.filter(r => r.id !== connectionId));
      }
      addNotification({ title: 'Connected!', message: `You are now connected with ${senderName}.`, type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  // Decline / remove request
  const declineRequest = async (connectionId: string) => {
    try {
      const res = await fetch(`${API}/connections/${connectionId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to decline');
      setPendingRequests(prev => prev.filter(r => r.id !== connectionId));
      addNotification({ title: 'Request declined', message: '', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  // FIX: connected user ids derived correctly from connection data
  const connectedUserIds = new Set(
    connections.map(c =>
      c.user_id === user?.id ? c.connected_user_id : c.user_id
    )
  );

  const filteredUsers = allUsers.filter(u =>
    !connectedUserIds.has(u.id) &&
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (u.branch && u.branch.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (u.company && u.company.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const getRoleColor = (role: string) => {
    if (role === 'recruiter') return 'bg-green-100 text-green-700';
    if (role === 'admin') return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  const tabs = [
    { key: 'connections', label: `My Connections (${connections.length})`, icon: Users },
    { key: 'pending', label: `Requests (${pendingRequests.length})`, icon: Clock },
    { key: 'discover', label: 'Discover', icon: UserPlus },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
        <p className="text-gray-500 text-sm mt-0.5">Grow your professional network</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              tab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            <Icon className="h-4 w-4" />
            {label}
            {/* Red dot badge for pending */}
            {key === 'pending' && pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'connections' ? (
        connections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No connections yet</p>
            <p className="text-gray-400 text-sm mt-1">Go to Discover to find and connect with people</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map(c => {
              // Show the other person's info
              const displayName = c.name;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {c.avatar ? <img src={c.avatar} alt={displayName} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{displayName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(c.role)}`}>{c.role}</span>
                    </div>
                  </div>
                  {c.bio && <p className="text-sm text-gray-500 line-clamp-2">{c.bio}</p>}
                  <p className="text-xs text-gray-400 mt-2">{c.email}</p>
                </div>
              );
            })}
          </div>
        )

      ) : tab === 'pending' ? (
        // ── Pending Requests Tab ──
        pendingRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No pending requests</p>
            <p className="text-gray-400 text-sm mt-1">When someone sends you a request, it will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.avatar ? <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(r.role)}`}>{r.role}</span>
                  </div>
                </div>
                {r.bio && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{r.bio}</p>}
                <p className="text-xs text-gray-400 mb-3">{r.email}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(r.id, r.name)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <Check className="h-4 w-4" /> Accept
                  </button>
                  <button
                    onClick={() => declineRequest(r.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-4 w-4" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )

      ) : (
        // ── Discover Tab ──
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by name, role, branch, company..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <UserPlus className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No users to discover</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(u => {
                const isRequested = sentRequestIds.has(u.id);
                return (
                  <div key={u.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : <User className="h-6 w-6 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(u.role)}`}>{u.role}</span>
                      </div>
                    </div>
                    {u.bio && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{u.bio}</p>}
                    {(u.branch || u.company) && (
                      <p className="text-xs text-gray-400 mb-3">{u.branch || u.company}</p>
                    )}
                    <button
                      onClick={() => sendRequest(u.id, u.name)}
                      disabled={isRequested || requesting === u.id}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        isRequested
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                      }`}>
                      {isRequested
                        ? <><Check className="h-4 w-4" />Request Sent</>
                        : requesting === u.id
                          ? 'Sending...'
                          : <><UserPlus className="h-4 w-4" />Connect</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Connections;