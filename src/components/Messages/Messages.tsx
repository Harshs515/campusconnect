import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Send, Search, Plus, User, MessageCircle, ArrowLeft,
  Pencil, Trash2, Check, CheckCheck, X, Settings,
  Mic, Square, Play, Pause, Video, VideoOff,
  PhoneOff, Volume2, Palette, Image as ImageIcon,
  Ban, ShieldCheck, ChevronRight, MicOff,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  content: string;
  read: boolean;
  edited?: boolean;
  type?: 'text' | 'voice';
  voice_url?: string;
  voice_duration?: number;
  created_at: string;
}

interface Chat {
  partner_id: string;
  partner_name: string;
  partner_avatar?: string;
  last_content: string;
  last_time: string;
  unread_count: number;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

// ── Theme & Wallpaper options ──────────────────────────────────
const THEMES = [
  { id: 'blue',   label: 'Ocean',    sent: 'bg-blue-600',    ring: 'ring-blue-500' },
  { id: 'green',  label: 'Forest',   sent: 'bg-emerald-600', ring: 'ring-emerald-500' },
  { id: 'purple', label: 'Lavender', sent: 'bg-purple-600',  ring: 'ring-purple-500' },
  { id: 'rose',   label: 'Rose',     sent: 'bg-rose-500',    ring: 'ring-rose-500' },
  { id: 'slate',  label: 'Midnight', sent: 'bg-slate-700',   ring: 'ring-slate-600' },
  { id: 'amber',  label: 'Sunset',   sent: 'bg-amber-500',   ring: 'ring-amber-500' },
];

const WALLPAPERS = [
  { id: 'none',     label: 'None',     bg: 'bg-gray-50',         style: undefined },
  { id: 'dots',     label: 'Dots',     bg: 'bg-gray-50',         style: { backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '18px 18px' } },
  { id: 'grid',     label: 'Grid',     bg: 'bg-white',           style: { backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' } },
  { id: 'diagonal', label: 'Lines',    bg: 'bg-white',           style: { backgroundImage: 'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 1px, transparent 0, transparent 12px)', backgroundSize: '12px 12px' } },
  { id: 'sky',      label: 'Sky',      bg: 'bg-sky-50',          style: { background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' } },
  { id: 'warm',     label: 'Warm',     bg: 'bg-orange-50',       style: { background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)' } },
];

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const WS_URL = (import.meta.env.VITE_WS_URL || 'http://localhost:5000') as string;

// ── localStorage helpers ───────────────────────────────────────
const getSettings = (pid: string) => {
  try { return JSON.parse(localStorage.getItem(`cc_chat_${pid}`) || '{}'); }
  catch { return {}; }
};
const saveSettings = (pid: string, s: object) =>
  localStorage.setItem(`cc_chat_${pid}`, JSON.stringify({ ...getSettings(pid), ...s }));

const getBlockList = (): string[] => {
  try { return JSON.parse(localStorage.getItem('cc_blocked') || '[]'); } catch { return []; }
};
const saveBlockList = (l: string[]) => localStorage.setItem('cc_blocked', JSON.stringify(l));

// ── Audio player ───────────────────────────────────────────────
const AudioPlayer: React.FC<{ url: string; duration?: number; isMe: boolean }> = ({ url, duration = 0, isMe }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(url);
    audioRef.current = a;
    a.ontimeupdate = () => setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    a.onended = () => { setPlaying(false); setProgress(0); };
    return () => { a.pause(); };
  }, [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[220px]">
      <button onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMe ? 'bg-white/25 hover:bg-white/35' : 'bg-gray-100 hover:bg-gray-200'}`}>
        {playing
          ? <Pause className={`h-4 w-4 ${isMe ? 'text-white' : 'text-gray-700'}`} />
          : <Play className={`h-4 w-4 ${isMe ? 'text-white' : 'text-gray-700'}`} />}
      </button>
      <div className="flex-1 space-y-1">
        <div className={`h-1.5 rounded-full ${isMe ? 'bg-white/30' : 'bg-gray-200'}`}>
          <div className={`h-full rounded-full transition-all ${isMe ? 'bg-white' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
        </div>
        <p className={`text-[10px] ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{fmt(duration)}</p>
      </div>
      <Volume2 className={`h-3.5 w-3.5 flex-shrink-0 ${isMe ? 'text-white/50' : 'text-gray-400'}`} />
    </div>
  );
};

// ── Video call overlay ─────────────────────────────────────────
const VideoCallOverlay: React.FC<{
  partnerName: string; isIncoming: boolean;
  onEnd: () => void; onAccept: () => void;
  socket: any; partnerId: string; userId: string;
}> = ({ partnerName, isIncoming, onEnd, onAccept, socket, partnerId }) => {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connected, setConnected] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setupPeer = async (initiator: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => {
      alert('Camera/microphone permission denied.');
      return null;
    });
    if (!stream) return;
    streamRef.current = stream;
    if (localRef.current) { localRef.current.srcObject = stream; localRef.current.muted = true; }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = e => {
      if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
      setConnected(true);
      timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
    };
    pc.onicecandidate = e => {
      if (e.candidate) socket?.emit('ice-candidate', { to: partnerId, candidate: e.candidate });
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('call-offer', { to: partnerId, offer });
    }

    socket?.on('call-answer', async ({ answer }: any) => {
      if (pc.signalingState !== 'closed') await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });
    socket?.on('call-offer', async ({ offer }: any) => {
      if (!initiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit('call-answer', { to: partnerId, answer });
      }
    });
    socket?.on('ice-candidate', async ({ candidate }: any) => {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
  };

  useEffect(() => {
    if (!isIncoming) setupPeer(true);
    return () => {
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAccept = () => { onAccept(); setupPeer(false); };
  const toggleMute = () => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setMuted(m => !m); };
  const toggleCam = () => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setCamOff(c => !c); };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center">
      <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
      <video ref={localRef} autoPlay playsInline muted
        className="absolute top-4 right-4 w-28 h-40 object-cover rounded-2xl border-2 border-white/20 shadow-2xl z-10" />
      <div className="relative z-10 text-center mb-12">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/20 shadow-2xl">
          <User className="h-12 w-12 text-white" />
        </div>
        <p className="text-white text-2xl font-bold tracking-tight">{partnerName}</p>
        <p className="text-white/60 text-sm mt-2">
          {isIncoming && !connected ? '📞 Incoming video call...' : connected ? `🎥 ${fmt(callTime)}` : 'Connecting...'}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-8">
        {isIncoming && !connected ? (
          <>
            <button onClick={handleAccept} className="w-16 h-16 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110">
              <Video className="h-7 w-7 text-white" />
            </button>
            <button onClick={onEnd} className="w-16 h-16 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110">
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${muted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
              {muted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
            </button>
            <button onClick={onEnd} className="w-16 h-16 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110">
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
            <button onClick={toggleCam} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${camOff ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
              {camOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Chat Settings Drawer ───────────────────────────────────────
const ChatSettingsDrawer: React.FC<{
  partnerId: string; partnerName: string;
  onClose: () => void;
  onSettingsChange: () => void;
}> = ({ partnerId, partnerName, onClose, onSettingsChange }) => {
  const s = getSettings(partnerId);
  const [theme, setTheme] = useState<string>(s.theme || 'blue');
  const [wallpaper, setWallpaper] = useState<string>(s.wallpaper || 'none');
  const blocked = getBlockList().includes(partnerId);

  const applyTheme = (id: string) => { setTheme(id); saveSettings(partnerId, { theme: id }); onSettingsChange(); };
  const applyWallpaper = (id: string) => { setWallpaper(id); saveSettings(partnerId, { wallpaper: id }); onSettingsChange(); };

  const toggleBlock = () => {
    const list = getBlockList();
    if (blocked) saveBlockList(list.filter(id => id !== partnerId));
    else saveBlockList([...list, partnerId]);
    onSettingsChange();
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-white z-30 flex flex-col rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <p className="font-bold text-gray-900 text-base">Chat Settings</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        {/* Who you're chatting with */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{partnerName}</p>
            <p className="text-xs text-gray-400">Changes only visible to you</p>
          </div>
        </div>

        {/* Theme */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-800">Chat Theme</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => applyTheme(t.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${theme === t.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${t.sent}`} />
                <span className="text-xs font-semibold text-gray-700 truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wallpaper */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-800">Chat Wallpaper</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {WALLPAPERS.map(w => (
              <button key={w.id} onClick={() => applyWallpaper(w.id)}
                className={`h-16 rounded-xl border-2 transition-all flex items-end justify-start p-1.5 ${wallpaper === w.id ? 'border-blue-500 shadow-sm' : 'border-gray-100 hover:border-gray-200'} ${w.bg}`}
                style={w.style as React.CSSProperties | undefined}>
                <span className="text-[10px] font-bold text-gray-600 bg-white/80 px-1.5 py-0.5 rounded-md">{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Block / Unblock */}
        <div>
          <p className="text-sm font-bold text-gray-800 mb-3">Privacy</p>
          <button onClick={toggleBlock}
            className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-all ${blocked ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'}`}>
            <div className="flex items-center gap-3">
              {blocked
                ? <ShieldCheck className="h-5 w-5 text-green-600" />
                : <Ban className="h-5 w-5 text-red-500" />}
              <div className="text-left">
                <p className={`font-bold text-sm ${blocked ? 'text-green-700' : 'text-red-600'}`}>
                  {blocked ? `Unblock ${partnerName}` : `Block ${partnerName}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {blocked ? 'Allow messages again' : 'Stop receiving messages'}
                </p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 ${blocked ? 'text-green-500' : 'text-red-400'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN MESSAGES COMPONENT
// ══════════════════════════════════════════════════════════════
const Messages: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  const [selectedPartnerAvatar, setSelectedPartnerAvatar] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [showSettings, setShowSettings] = useState(false);

  // Per-partner settings state (refreshed from localStorage)
  const [chatTheme, setChatTheme] = useState('blue');
  const [chatWallpaper, setChatWallpaper] = useState('none');
  const [isBlocked, setIsBlocked] = useState(false);

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);

  // Voice recorder
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Video call
  const [callState, setCallState] = useState<'idle' | 'outgoing' | 'incoming'>('idle');
  const [incomingName, setIncomingName] = useState('');
  const socketRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('campusconnect_token');

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const currentTheme = THEMES.find(t => t.id === chatTheme) || THEMES[0];
  const currentWallpaper = WALLPAPERS.find(w => w.id === chatWallpaper) || WALLPAPERS[0];

  // ── Refresh per-partner settings ──────────────────────────────
  const refreshSettings = useCallback(() => {
    if (!selectedPartnerId) return;
    const s = getSettings(selectedPartnerId);
    setChatTheme(s.theme || 'blue');
    setChatWallpaper(s.wallpaper || 'none');
    setIsBlocked(getBlockList().includes(selectedPartnerId));
  }, [selectedPartnerId]);

  // ── Socket init ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    import('socket.io-client').then(({ io }) => {
      const socket = io(WS_URL, { auth: { token }, transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('join', user.id));
      socket.on('incoming-call', ({ fromName }: { from: string; fromName: string }) => {
        setIncomingName(fromName);
        setCallState('incoming');
      });
      socket.on('call-ended', () => setCallState('idle'));
    }).catch(() => console.warn('socket.io-client not installed — run: npm install socket.io-client'));

    return () => socketRef.current?.disconnect();
  }, [user?.id]);

  useEffect(() => {
    const h = () => setContextMenu(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  useEffect(() => {
    if (editingMessageId) editInputRef.current?.focus();
  }, [editingMessageId]);

  useEffect(() => { refreshSettings(); }, [selectedPartnerId]);

  // ── Fetch helpers ─────────────────────────────────────────────
  const fetchChats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/messages/chats`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setChats(data.map((c: any) => ({
          partner_id: c.partner_id || c.partnerId || '',
          partner_name: c.partner_name || c.name || 'Unknown',
          partner_avatar: c.partner_avatar || null,
          last_content: c.last_content || c.content || '',
          last_time: c.last_time || c.created_at || '',
          unread_count: Number(c.unread_count) || 0,
        })).filter(c => c.partner_id));
      }
    } catch {}
  }, [token]);

  const fetchMessages = useCallback(async (pid: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/messages/${pid}`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      setChats(prev => prev.map(c => c.partner_id === pid ? { ...c, unread_count: 0 } : c));
    } catch {}
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/users`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data.filter((u: any) => u.id !== user?.id) : []);
    } catch {}
  }, [token, user?.id]);

  useEffect(() => { fetchChats(); fetchUsers(); }, []);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchChats();
      if (selectedPartnerId) fetchMessages(selectedPartnerId);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedPartnerId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Open chat ─────────────────────────────────────────────────
  const openChat = async (pid: string, pName: string, pAvatar?: string) => {
    setSelectedPartnerId(pid);
    setSelectedPartnerName(pName);
    setSelectedPartnerAvatar(pAvatar || null);
    setMessages([]);
    setLoading(true);
    setView('chat');
    setEditingMessageId(null);
    setContextMenu(null);
    setShowSettings(false);
    const s = getSettings(pid);
    setChatTheme(s.theme || 'blue');
    setChatWallpaper(s.wallpaper || 'none');
    setIsBlocked(getBlockList().includes(pid));
    try {
      const res = await fetch(`${API}/messages/${pid}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setChats(prev => prev.map(c => c.partner_id === pid ? { ...c, unread_count: 0 } : c));
      }
    } catch {}
    setLoading(false);
  };

  const startNewChat = (pid: string, pName: string) => {
    setShowNewChat(false); setNewChatSearch('');
    if (!chats.find(c => c.partner_id === pid)) {
      setChats(prev => [{ partner_id: pid, partner_name: pName, last_content: '', last_time: new Date().toISOString(), unread_count: 0 }, ...prev]);
    }
    openChat(pid, pName);
  };

  // ── Send text ─────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartnerId || sending || isBlocked) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, sender_id: user?.id || '', receiver_id: selectedPartnerId, sender_name: user?.name || '', content, read: false, type: 'text', created_at: new Date().toISOString() }]);
    setChats(prev => prev.map(c => c.partner_id === selectedPartnerId ? { ...c, last_content: content, last_time: new Date().toISOString() } : c));
    try {
      const res = await fetch(`${API}/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ receiver_id: selectedPartnerId, content }) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, sender_name: user?.name || '' } : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } finally { setSending(false); }
  };

  // ── Voice recording ───────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
        setVoiceBlob(blob);
        setVoicePreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert('Microphone permission denied.'); }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const cancelVoice = () => { setVoiceBlob(null); setVoicePreviewUrl(null); };

  const sendVoice = async () => {
    if (!voiceBlob || !selectedPartnerId || isBlocked) return;
    const dur = recSeconds;
    const blob = voiceBlob;
    setVoiceBlob(null); setVoicePreviewUrl(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const tempId = `temp-${Date.now()}`;
      setMessages(prev => [...prev, { id: tempId, sender_id: user?.id || '', receiver_id: selectedPartnerId, sender_name: user?.name || '', content: '[Voice Message]', type: 'voice', voice_url: base64, voice_duration: dur, read: false, created_at: new Date().toISOString() }]);
      try {
        const res = await fetch(`${API}/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ receiver_id: selectedPartnerId, content: base64, type: 'voice', voice_duration: dur }) });
        if (res.ok) {
          const saved = await res.json();
          setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, sender_name: user?.name || '', voice_url: base64, voice_duration: dur } : m));
        }
      } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
    };
    reader.readAsDataURL(blob);
  };

  // ── Edit / delete ─────────────────────────────────────────────
  const handleDeleteMessage = async (msgId: string) => {
    if (msgId.startsWith('temp-')) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try { await fetch(`${API}/messages/${msgId}`, { method: 'DELETE', headers: authHeaders }); fetchChats(); }
    catch { if (selectedPartnerId) fetchMessages(selectedPartnerId); }
  };

  const startEdit = (msg: Message) => { setEditingMessageId(msg.id); setEditContent(msg.content); setContextMenu(null); };
  const cancelEdit = () => { setEditingMessageId(null); setEditContent(''); };

  const submitEdit = async (msgId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: trimmed, edited: true } : m));
    setEditingMessageId(null); setEditContent('');
    try {
      const res = await fetch(`${API}/messages/${msgId}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ content: trimmed }) });
      if (res.ok) { const saved = await res.json(); setMessages(prev => prev.map(m => m.id === msgId ? { ...saved, sender_name: user?.name || '' } : m)); fetchChats(); }
    } catch { if (selectedPartnerId) fetchMessages(selectedPartnerId); }
  };

  const handleRightClick = (e: React.MouseEvent, msg: Message) => {
    if (msg.sender_id !== user?.id || msg.id.startsWith('temp-')) return;
    e.preventDefault();
    setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
  };

  // ── Video call ────────────────────────────────────────────────
  const startCall = () => {
    if (!socketRef.current) { alert('Install socket.io-client first: npm install socket.io-client'); return; }
    socketRef.current.emit('initiate-call', { to: selectedPartnerId, fromName: user?.name });
    setCallState('outgoing');
  };
  const endCall = () => { socketRef.current?.emit('end-call', { to: selectedPartnerId || '' }); setCallState('idle'); };

  // ── Formatters ────────────────────────────────────────────────
  const formatTime = (d: string) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now'; if (m < 60) return `${m}m`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };
  const formatFull = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const filteredChats = chats.filter(c => c.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(newChatSearch.toLowerCase()));
  const totalUnread = chats.reduce((s, c) => s + (c.unread_count || 0), 0);

  const ReadReceipt = ({ msg }: { msg: Message }) => {
    if (msg.id.startsWith('temp-')) return <Check className="h-3 w-3 text-white/40 inline ml-1" />;
    if (msg.read) return <CheckCheck className="h-3.5 w-3.5 text-blue-300 inline ml-1" />;
    return <Check className="h-3 w-3 text-white/60 inline ml-1" />;
  };

  // ══════════════════════════════════════════════════════════════
  // CHAT VIEW
  // ══════════════════════════════════════════════════════════════
  if (view === 'chat' && selectedPartnerId) {
    const contextMsg = contextMenu ? messages.find(m => m.id === contextMenu.msgId) : null;

    return (
      <div style={{ height: 'calc(100vh - 96px)' }} className="rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative bg-white"
        onClick={() => setContextMenu(null)}>

        {/* Video call overlay */}
        {(callState === 'outgoing' || callState === 'incoming') && (
          <VideoCallOverlay
            partnerName={callState === 'incoming' ? incomingName : selectedPartnerName}
            isIncoming={callState === 'incoming'}
            onEnd={endCall}
            onAccept={() => setCallState('outgoing')}
            socket={socketRef.current}
            partnerId={selectedPartnerId}
            userId={user?.id || ''}
          />
        )}

        {/* Settings drawer */}
        {showSettings && (
          <ChatSettingsDrawer
            partnerId={selectedPartnerId}
            partnerName={selectedPartnerName}
            onClose={() => { setShowSettings(false); refreshSettings(); }}
            onSettingsChange={refreshSettings}
          />
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <button onClick={() => { setView('list'); setSelectedPartnerId(null); setMessages([]); }}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {selectedPartnerAvatar
              ? <img src={selectedPartnerAvatar} alt={selectedPartnerName} className="w-full h-full object-cover" />
              : <User className="h-4 w-4 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{selectedPartnerName}</p>
            {isBlocked && <p className="text-xs text-red-500 font-medium">Blocked</p>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={startCall} title="Video call"
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Video className="h-5 w-5" />
            </button>
            <button onClick={() => setShowSettings(true)} title="Chat settings"
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
<div 
  style={currentWallpaper.style as React.CSSProperties | undefined}
  className={`flex-1 overflow-y-auto p-4 space-y-2 ${currentWallpaper.bg}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
              </div>
            </div>
          ) : messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            const isTemp = msg.id.startsWith('temp-');
            const isEditing = editingMessageId === msg.id;
            const isVoice = msg.type === 'voice';
            const showTime = !messages[idx - 1] || new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 300000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="text-center my-2">
                    <span className="text-xs text-gray-400 bg-white/80 px-3 py-1 rounded-full shadow-sm">{formatTime(msg.created_at)}</span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {!isMe && (
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div className="max-w-xs lg:max-w-md group">
                    {isEditing ? (
                      <div className="flex items-center gap-2 bg-white border-2 border-blue-400 rounded-2xl px-3 py-2 shadow-sm">
                        <input ref={editInputRef} type="text" value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') submitEdit(msg.id); if (e.key === 'Escape') cancelEdit(); }}
                          className="flex-1 text-sm bg-transparent outline-none min-w-0" />
                        <button onClick={() => submitEdit(msg.id)} disabled={!editContent.trim()} className="p-1 text-blue-600 disabled:opacity-40"><Check className="h-4 w-4" /></button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div onContextMenu={e => handleRightClick(e, msg)}
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed select-none ${isMe ? `${currentTheme.sent} text-white rounded-br-sm` : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'} ${isTemp ? 'opacity-60' : ''}`}>
                        {isVoice && msg.voice_url
                          ? <AudioPlayer url={msg.voice_url} duration={msg.voice_duration} isMe={isMe} />
                          : <>{msg.content}{msg.edited && <span className={`text-xs ml-1 ${isMe ? 'text-white/50' : 'text-gray-400'}`}>(edited)</span>}</>}
                      </div>
                    )}
                    {!isEditing && (
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <p className="text-xs text-gray-400">{formatFull(msg.created_at)}</p>
                        {isMe && <ReadReceipt msg={msg} />}
                      </div>
                    )}
                    {isMe && !isTemp && !isEditing && !isVoice && (
                      <div className="flex gap-1 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); startEdit(msg); }} className="p-1 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"><Pencil className="h-3 w-3" /></button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="p-1 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Blocked banner */}
        {isBlocked && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-200 flex items-center justify-between flex-shrink-0">
            <p className="text-sm text-red-600 font-medium flex items-center gap-2">
              <Ban className="h-4 w-4" /> You blocked {selectedPartnerName}
            </p>
            <button onClick={() => { saveBlockList(getBlockList().filter(id => id !== selectedPartnerId)); setIsBlocked(false); }}
              className="text-xs font-bold text-red-700 hover:underline">Unblock</button>
          </div>
        )}

        {/* Voice preview bar */}
        {voicePreviewUrl && !recording && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-3 flex-shrink-0">
            <p className="text-xs font-bold text-blue-700 mr-1">Preview</p>
            <div className="flex-1"><AudioPlayer url={voicePreviewUrl} duration={recSeconds} isMe={true} /></div>
            <button onClick={cancelVoice} className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors"><X className="h-4 w-4 text-gray-600" /></button>
            <button onClick={sendVoice} className={`p-2 rounded-xl text-white transition-colors ${currentTheme.sent} hover:opacity-90`}><Send className="h-4 w-4" /></button>
          </div>
        )}

        {/* Input */}
        {!isBlocked && (
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
            {recording ? (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-red-600 flex-1">Recording {fmtSecs(recSeconds)}</p>
                <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors" title="Stop recording">
                  <Square className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <button type="button" onClick={startRecording} title="Record voice message"
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
                  <Mic className="h-5 w-5" />
                </button>
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
                  rows={1} style={{ minHeight: '44px', maxHeight: '120px' }} />
                <button type="submit" disabled={!newMessage.trim() || sending}
                  className={`p-2.5 text-white rounded-xl disabled:opacity-40 transition-colors flex-shrink-0 ${currentTheme.sent} hover:opacity-90`}>
                  <Send className="h-5 w-5" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Context menu */}
        {contextMenu && contextMsg && (
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[150px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => startEdit(contextMsg)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Pencil className="h-4 w-4 text-blue-500" /> Edit message
            </button>
            <div className="h-px bg-gray-100 mx-2" />
            <button onClick={() => { handleDeleteMessage(contextMenu.msgId); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-4 w-4" /> Delete message
            </button>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // CHAT LIST VIEW
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ height: 'calc(100vh - 96px)' }} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            {totalUnread > 0 && <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{totalUnread}</span>}
          </div>
          <button onClick={() => { setShowNewChat(p => !p); setNewChatSearch(''); }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {showNewChat && (
          <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">Start new conversation</p>
            <input type="text" placeholder="Search people..." value={newChatSearch}
              onChange={e => setNewChatSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" autoFocus />
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {newChatSearch
                ? filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <button key={u.id} onClick={() => startNewChat(u.id, u.name)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-100 rounded-lg transition-colors text-left">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-white" />}
                    </div>
                    <div><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div>
                  </button>
                )) : <p className="text-xs text-gray-400 text-center py-2">No users found</p>
                : <p className="text-xs text-gray-400 text-center py-2">Type a name to search</p>}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search conversations..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length > 0 ? filteredChats.map(chat => (
          <button key={chat.partner_id}
            onClick={() => openChat(chat.partner_id, chat.partner_name, chat.partner_avatar)}
            className="w-full flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {chat.partner_avatar ? <img src={chat.partner_avatar} alt="" className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{chat.partner_name}</p>
                  {getBlockList().includes(chat.partner_id) && <Ban className="h-3 w-3 text-red-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(chat.last_time)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 truncate">{chat.last_content || 'Tap to open'}</p>
                {chat.unread_count > 0 && (
                  <span className="flex-shrink-0 ml-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{chat.unread_count}</span>
                )}
              </div>
            </div>
          </button>
        )) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No conversations yet</p>
            <p className="text-gray-400 text-sm">Click + to start a new conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;