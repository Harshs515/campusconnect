import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Calendar, MapPin, Users, Clock, Plus, X, Search, Filter } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  event_type: string;
  organizer_name: string;
  organizer_id: string;
  max_attendees?: number;
  rsvp_count: number;
  is_rsvped: boolean;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const EVENT_TYPES = ['Placement Drive', 'Workshop', 'Seminar', 'Interview'];

const Events: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', event_time: '',
    location: '', event_type: 'Workshop', max_attendees: '',
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/events`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchEvents error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchEvents(); }, [user?.id]);

  const handleRSVP = async (eventId: string, isRsvped: boolean) => {
    // Optimistic update
    setEvents(prev => prev.map(e =>
      e.id === eventId
        ? { ...e, is_rsvped: !isRsvped, rsvp_count: isRsvped ? e.rsvp_count - 1 : e.rsvp_count + 1 }
        : e
    ));
    try {
      const res = await fetch(`${API}/events/${eventId}/rsvp`, {
        method: 'POST', headers: getHeaders(),
      });
      if (!res.ok) throw new Error('RSVP failed');
      const data = await res.json();
      addNotification({
        title: data.rsvped ? 'RSVP confirmed!' : 'RSVP cancelled',
        message: data.rsvped ? 'You have registered for this event.' : 'Your RSVP has been cancelled.',
        type: data.rsvped ? 'success' : 'info',
      });
    } catch {
      // Revert on error
      setEvents(prev => prev.map(e =>
        e.id === eventId
          ? { ...e, is_rsvped: isRsvped, rsvp_count: isRsvped ? e.rsvp_count + 1 : e.rsvp_count - 1 }
          : e
      ));
      addNotification({ title: 'Error', message: 'Could not update RSVP.', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date || !form.event_time || !form.location) {
      addNotification({ title: 'Missing fields', message: 'Please fill in all required fields.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...form,
          max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      addNotification({ title: 'Event created!', message: `${form.title} has been created.`, type: 'success' });
      setShowForm(false);
      setForm({ title: '', description: '', event_date: '', event_time: '', location: '', event_type: 'Workshop', max_attendees: '' });
      fetchEvents();
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message || 'Failed to create event.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || e.event_type === filterType;
    return matchSearch && matchType;
  });

  const typeColor = (type: string) => {
    if (type === 'Placement Drive') return 'bg-blue-100 text-blue-700';
    if (type === 'Workshop') return 'bg-green-100 text-green-700';
    if (type === 'Seminar') return 'bg-purple-100 text-purple-700';
    if (type === 'Interview') return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isUpcoming = (dateStr: string) => new Date(dateStr) >= new Date();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} events found</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'recruiter') && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Create Event
          </button>
        )}
      </div>

      {/* Create Event Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Create New Event</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Event title" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" placeholder="Event description" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label>
              <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time *</label>
              <input type="time" value={form.event_time} onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Venue or online link" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
              <select value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max Attendees</label>
              <input type="number" value={form.max_attendees} onChange={e => setForm(p => ({ ...p, max_attendees: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Leave blank for unlimited" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search events..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">All Types</option>
          {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No events found</p>
          <p className="text-gray-400 text-sm mt-1">Check back later for upcoming events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(event => {
            const upcoming = isUpcoming(event.event_date);
            return (
              <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(event.event_type)}`}>{event.event_type}</span>
                      {!upcoming && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Past</span>}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 truncate">{event.title}</h3>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                )}

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{formatDate(event.event_date)} at {event.event_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{event.rsvp_count} attending{event.max_attendees ? ` / ${event.max_attendees} max` : ''}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">By {event.organizer_name}</p>
                  {upcoming && (
                    <button
                      onClick={() => handleRSVP(event.id, event.is_rsvped)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        event.is_rsvped
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                      {event.is_rsvped ? 'Registered ✓' : 'Register'}
                    </button>
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

export default Events;