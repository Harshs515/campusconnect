import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Send, Search, Plus, User, MessageCircle, ArrowLeft, Pencil, Trash2,
  Check, CheckCheck, X, Mic, Video, VideoOff, PhoneOff, Phone, MicOff,
  Square, Monitor, ScreenShare, ScreenShareOff, Volume2, VolumeX,
  Maximize2, Minimize2, RotateCcw, Wifi, WifiOff, Settings
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  content: string;
  read: boolean;
  edited?: boolean;
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
}

type CallState = 'idle' | 'calling' | 'incoming' | 'connecting' | 'in-call' | 'reconnecting';
type CallQuality = 'excellent' | 'good' | 'poor' | 'unknown';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// ── Voice Message Player ──────────────────────────────────────
const VoiceMessagePlayer: React.FC<{ src: string; isMe: boolean }> = ({ src, isMe }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const updateProgress = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTime(a.currentTime);
    setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    if (!a.paused) animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => { setIsPlaying(true); animFrameRef.current = requestAnimationFrame(updateProgress); };
    const onPause = () => { setIsPlaying(false); if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    const onEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
    const onLoaded = () => setDuration(a.duration);
    a.addEventListener('play', onPlay); a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded); a.addEventListener('loadedmetadata', onLoaded);
    return () => {
      a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded); a.removeEventListener('loadedmetadata', onLoaded);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [src]);

  const bars = [3,5,8,6,10,7,4,9,6,8,5,7,10,4,6,8,5,9,7,6,4,8,10,5,7];

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[220px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={() => audioRef.current?.[isPlaying ? 'pause' : 'play']()}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 shadow-sm ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        {isPlaying
          ? <Square className="h-3.5 w-3.5 fill-current" />
          : <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current ml-0.5"><polygon points="5,3 19,12 5,21" /></svg>}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-[2px] h-8 cursor-pointer relative"
          onClick={e => {
            const a = audioRef.current; if (!a?.duration) return;
            const r = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
          }}>
          {bars.map((h, i) => (
            <div key={i} className={`flex-1 rounded-full transition-colors duration-100 ${(i / bars.length) * 100 <= progress ? (isMe ? 'bg-white' : 'bg-blue-500') : (isMe ? 'bg-white/35' : 'bg-gray-300')}`}
              style={{ height: `${(h / 10) * 100}%`, minHeight: '3px' }} />
          ))}
        </div>
        <p className={`text-[11px] font-medium tabular-nums ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
          {isPlaying ? fmt(currentTime) : fmt(duration || 0)}
        </p>
      </div>
    </div>
  );
};

// ── Voice Recorder UI ─────────────────────────────────────────
const VoiceRecorderUI: React.FC<{ isRecording: boolean; seconds: number; onCancel: () => void; onStop: () => void }> = ({ isRecording, seconds, onCancel, onStop }) => {
  if (!isRecording) return null;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl mb-2">
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30" />
        <div className="relative w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <Mic className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-[3px] h-6 flex-1">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="flex-1 bg-red-400 rounded-full"
            style={{ height: `${20 + Math.sin(i * 0.8) * 60}%`, minHeight: '3px',
              animation: `wave-bar ${0.5 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
              animationDelay: `${i * 30}ms` }} />
        ))}
      </div>
      <span className="text-sm font-semibold text-red-600 tabular-nums flex-shrink-0">{fmt(seconds)}</span>
      <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"><X className="h-4 w-4" /></button>
      <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0 active:scale-95">
        <Send className="h-3.5 w-3.5" />Send
      </button>
      <style>{`@keyframes wave-bar { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }`}</style>
    </div>
  );
};

// ── Call Quality Indicator ────────────────────────────────────
const CallQualityBadge: React.FC<{ quality: CallQuality }> = ({ quality }) => {
  const cfg = {
    excellent: { color: 'text-emerald-400', label: 'HD', icon: <Wifi className="h-3 w-3" /> },
    good:      { color: 'text-yellow-400',  label: 'Good', icon: <Wifi className="h-3 w-3" /> },
    poor:      { color: 'text-red-400',     label: 'Poor', icon: <WifiOff className="h-3 w-3" /> },
    unknown:   { color: 'text-gray-400',    label: '',     icon: null },
  }[quality];
  if (!cfg.icon) return null;
  return (
    <div className={`flex items-center gap-1 ${cfg.color}`}>
      {cfg.icon}
      <span className="text-xs font-medium">{cfg.label}</span>
    </div>
  );
};

// ── Main Messages Component ───────────────────────────────────
const Messages: React.FC = () => {
  const { user } = useAuth();

  // Chat state
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  // ── Enhanced Video Call State ─────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callerIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const callStartTimeRef = useRef<number>(0);

  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLocalPiP, setIsLocalPiP] = useState(false); // swap local/remote
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callQuality, setCallQuality] = useState<CallQuality>('unknown');
  const [showCallControls, setShowCallControls] = useState(true);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [callRejected, setCallRejected] = useState(false);
  const [callFailed, setCallFailed] = useState<string | null>(null);

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('campusconnect_token');
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // ── Socket Setup ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join', user.id));

    socket.on('incoming-call', ({ from, fromName }: { from: string; fromName: string }) => {
      callerIdRef.current = from;
      setIncomingCall({ from, fromName });
      setCallState('incoming');
      setCallRejected(false);
      setCallFailed(null);
    });

    socket.on('call-offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        setCallState('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        const pc = createPeerConnection(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call-answer', { to: callerIdRef.current, answer });
      } catch (err) {
        console.error('offer error', err);
        endCallCleanup();
      }
    });

    socket.on('call-answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('connecting');
      } catch {}
    });

    socket.on('ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    socket.on('call-ended', () => endCallCleanup());
    socket.on('call-rejected', () => {
      setCallRejected(true);
      endCallCleanup();
      setTimeout(() => setCallRejected(false), 3000);
    });
    socket.on('call-failed', ({ reason }: { reason: string }) => {
      setCallFailed(reason);
      endCallCleanup();
      setTimeout(() => setCallFailed(null), 4000);
    });

    return () => { socket.disconnect(); };
  }, [user?.id]);

  // ── Call Duration Timer ───────────────────────────────────
  const startCallTimer = () => {
    setCallDuration(0);
    callStartTimeRef.current = Date.now();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
  };

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };

  // ── Quality Monitor ───────────────────────────────────────
  const startQualityMonitor = (pc: RTCPeerConnection) => {
    if (qualityTimerRef.current) clearInterval(qualityTimerRef.current);
    qualityTimerRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') return;
      try {
        const stats = await pc.getStats();
        let rtt = 0; let packetLoss = 0; let count = 0;
        stats.forEach(s => {
          if (s.type === 'remote-inbound-rtp') {
            rtt += (s.roundTripTime || 0) * 1000;
            packetLoss += s.fractionLost || 0;
            count++;
          }
        });
        if (count > 0) {
          const avgRtt = rtt / count;
          const avgLoss = packetLoss / count;
          if (avgRtt < 100 && avgLoss < 0.02) setCallQuality('excellent');
          else if (avgRtt < 300 && avgLoss < 0.05) setCallQuality('good');
          else setCallQuality('poor');
        }
      } catch {}
    }, 3000);
  };

  // ── Controls Auto-hide ────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowCallControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowCallControls(false), 4000);
  }, []);

  // ── Create Peer Connection ────────────────────────────────
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    });
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        const targetId = callerIdRef.current || selectedPartnerId;
        socketRef.current.emit('ice-candidate', { to: targetId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setRemoteVideoActive(true);
        // Check if remote has video tracks
        const hasVideo = e.streams[0].getVideoTracks().length > 0;
        setRemoteVideoActive(hasVideo);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('PeerConnection state:', state);
      if (state === 'connected') {
        setCallState('in-call');
        startCallTimer();
        startQualityMonitor(pc);
        reconnectAttemptsRef.current = 0;
        resetControlsTimer();
      }
      if (state === 'disconnected' || state === 'failed') {
        if (reconnectAttemptsRef.current < 3) {
          setCallState('reconnecting');
          reconnectAttemptsRef.current++;
          setTimeout(() => pc.restartIce?.(), 2000);
        } else {
          endCallCleanup();
        }
      }
      if (state === 'closed') endCallCleanup();
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        console.log('ICE gathering complete');
      }
    };

    return pc;
  };

  // ── Start Call ────────────────────────────────────────────
  const startCall = async () => {
    if (!selectedPartnerId || callState !== 'idle') return;
    setCallFailed(null);
    setCallRejected(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('initiate-call', { to: selectedPartnerId, fromName: user?.name });
      socketRef.current?.emit('call-offer', { to: selectedPartnerId, offer });
      setCallState('calling');
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied. Please allow access and try again.'
        : 'Could not start call. Please check your camera and microphone.';
      alert(msg);
      endCallCleanup();
    }
  };

  // ── Answer Call ───────────────────────────────────────────
  const answerCall = () => {
    setCallState('connecting');
    setIncomingCall(null);
  };

  // ── Decline Call ──────────────────────────────────────────
  const declineCall = () => {
    const targetId = callerIdRef.current;
    if (targetId) socketRef.current?.emit('reject-call', { to: targetId });
    endCallCleanup();
  };

  // ── End Call ──────────────────────────────────────────────
  const endCall = () => {
    const targetId = callerIdRef.current || selectedPartnerId;
    if (targetId) socketRef.current?.emit('end-call', { to: targetId });
    endCallCleanup();
  };

  // ── Cleanup ───────────────────────────────────────────────
  const endCallCleanup = () => {
    [callTimerRef, qualityTimerRef, controlsTimerRef].forEach(r => {
      if (r.current) { clearInterval(r.current as any); r.current = null; }
    });
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop()); screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    callerIdRef.current = null;
    setCallState('idle'); setIncomingCall(null); setCallDuration(0);
    setIsMuted(false); setIsCameraOff(false); setIsSpeakerOff(false);
    setIsScreenSharing(false); setIsLocalPiP(false); setIsFullscreen(false);
    setCallQuality('unknown'); setShowCallControls(true);
    setRemoteVideoActive(false); reconnectAttemptsRef.current = 0;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  // ── Toggle Controls ───────────────────────────────────────
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(p => !p);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
    setIsCameraOff(p => !p);
  };

  const toggleSpeaker = () => {
    const video = remoteVideoRef.current as any;
    if (video) video.muted = !isSpeakerOff;
    setIsSpeakerOff(p => !p);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share, revert to camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack && pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack);
      }
      if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch {}
    }
  };

  const toggleFullscreen = async () => {
    if (!callContainerRef.current) return;
    if (!document.fullscreenElement) {
      await callContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen state with browser
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────
  const fetchChats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/messages/chats`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized = data.map((c: any) => ({
          partner_id: c.partner_id || '',
          partner_name: c.partner_name || c.name || 'Unknown',
          partner_avatar: c.partner_avatar || null,
          last_content: c.last_content || '',
          last_time: c.last_time || c.created_at || '',
          unread_count: c.unread_count || 0,
        })).filter((c: Chat) => c.partner_id !== '');
        setChats(normalized);
      }
    } catch {}
  }, [token]);

  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/messages/${partnerId}`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      setChats(prev => prev.map(c => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c));
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

  // ── Chat ops ──────────────────────────────────────────────
  const openChat = async (pid: string, pname: string, pavatar?: string) => {
    setSelectedPartnerId(pid); setSelectedPartnerName(pname);
    setSelectedPartnerAvatar(pavatar || null); setMessages([]);
    setLoading(true); setView('chat'); setEditingMessageId(null); setContextMenu(null);
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

  const startNewChat = (id: string, name: string) => {
    setShowNewChat(false); setNewChatSearch('');
    if (!chats.find(c => c.partner_id === id))
      setChats(prev => [{ partner_id: id, partner_name: name, last_content: '', last_time: new Date().toISOString(), unread_count: 0 }, ...prev]);
    openChat(id, name);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartnerId || sending) return;
    const content = newMessage.trim();
    setNewMessage(''); setSending(true);
    const tempId = `temp-${Date.now()}`;
    const opt: Message = { id: tempId, sender_id: user?.id || '', receiver_id: selectedPartnerId, sender_name: user?.name || '', content, read: false, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, opt]);
    setChats(prev => prev.map(c => c.partner_id === selectedPartnerId ? { ...c, last_content: content, last_time: new Date().toISOString() } : c));
    try {
      const res = await fetch(`${API}/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ receiver_id: selectedPartnerId, content }) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, sender_name: user?.name || '' } : m));
    } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); setNewMessage(content); }
    finally { setSending(false); }
  };

  const sendVoiceMessage = async (b64: string) => {
    if (!selectedPartnerId || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, sender_id: user?.id || '', receiver_id: selectedPartnerId, sender_name: user?.name || '', content: b64, read: false, created_at: new Date().toISOString() }]);
    try {
      const res = await fetch(`${API}/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ receiver_id: selectedPartnerId, content: b64 }) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setMessages(prev => prev.map(m => m.id === tempId ? { ...saved, sender_name: user?.name || '' } : m));
    } catch { setMessages(prev => prev.filter(m => m.id !== tempId)); }
    finally { setSending(false); }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        recordingStreamRef.current?.getTracks().forEach(t => t.stop()); recordingStreamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size > 1_000_000) { alert('Voice message too long. Max ~45s.'); return; }
        const reader = new FileReader();
        reader.onloadend = () => { const b64 = reader.result as string; if (b64?.startsWith('data:audio')) sendVoiceMessage(b64); };
        reader.readAsDataURL(blob);
      };
      mr.start(100); setIsRecording(true); setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(p => { if (p >= 59) { stopRecording(); return p; } return p + 1; }), 1000);
    } catch { alert('Microphone access required for voice messages.'); }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setIsRecording(false); setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current!.ondataavailable = null; mediaRecorderRef.current!.onstop = null;
      mediaRecorderRef.current?.stop();
    }
    recordingStreamRef.current?.getTracks().forEach(t => t.stop()); recordingStreamRef.current = null;
    audioChunksRef.current = []; setIsRecording(false); setRecordingSeconds(0);
  };

  useEffect(() => () => { if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); recordingStreamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const handleDeleteMessage = async (id: string) => {
    if (id.startsWith('temp-')) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    try { await fetch(`${API}/messages/${id}`, { method: 'DELETE', headers: authHeaders }); fetchChats(); } catch { if (selectedPartnerId) fetchMessages(selectedPartnerId); }
  };

  const startEdit = (msg: Message) => { setEditingMessageId(msg.id); setEditContent(msg.content); setContextMenu(null); };
  const cancelEdit = () => { setEditingMessageId(null); setEditContent(''); };
  const submitEdit = async (id: string) => {
    const t = editContent.trim(); if (!t) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: t, edited: true } : m));
    setEditingMessageId(null); setEditContent('');
    try {
      const res = await fetch(`${API}/messages/${id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ content: t }) });
      if (!res.ok) throw new Error();
      const u = await res.json();
      setMessages(prev => prev.map(m => m.id === id ? { ...u, sender_name: user?.name || '' } : m));
      fetchChats();
    } catch { if (selectedPartnerId) fetchMessages(selectedPartnerId); }
  };

  const handleRightClick = (e: React.MouseEvent, msg: Message) => {
    if (msg.sender_id !== user?.id || msg.id.startsWith('temp-')) return;
    e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
  };

  const fmtTime = (d: string) => {
    if (!d) return ''; const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`;
    const h = Math.floor(diff / 3600000); if (h < 24) return `${h}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };
  const fmtFull = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => { const h = () => setContextMenu(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, []);
  useEffect(() => { if (editingMessageId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); } }, [editingMessageId]);

  const filteredChats = chats.filter(c => (c.partner_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(newChatSearch.toLowerCase()));
  const totalUnread = chats.reduce((s, c) => s + (c.unread_count || 0), 0);

  const ReadReceipt = ({ msg }: { msg: Message }) => {
    if (msg.id.startsWith('temp-')) return <Check className="h-3 w-3 text-white/50 inline ml-1" />;
    if (msg.read) return <span className="inline-flex items-center ml-1"><CheckCheck className="h-3.5 w-3.5 text-blue-300" /></span>;
    return <span className="inline-flex items-center ml-1"><Check className="h-3 w-3 text-white/60" /></span>;
  };

  // ══════════════════════════════════════════════════════════
  // CHAT VIEW
  // ══════════════════════════════════════════════════════════
  if (view === 'chat' && selectedPartnerId) {
    const ctxMsg = contextMenu ? messages.find(m => m.id === contextMenu.msgId) : null;

    return (
      <div
        style={{ height: 'calc(100vh - 96px)' }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative"
        onClick={() => setContextMenu(null)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setSelectedPartnerId(null); setMessages([]); setEditingMessageId(null); }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
              {selectedPartnerAvatar ? <img src={selectedPartnerAvatar} alt={selectedPartnerName} className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-white" />}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selectedPartnerName}</p>
              {callState === 'in-call' && <p className="text-xs text-green-500 font-medium">● Live · {fmtDuration(callDuration)}</p>}
              {callState === 'reconnecting' && <p className="text-xs text-yellow-500 font-medium">● Reconnecting…</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Call rejected/failed toasts */}
            {callRejected && <span className="text-xs text-red-500 font-medium mr-2">Call declined</span>}
            {callFailed && <span className="text-xs text-red-500 font-medium mr-2">{callFailed}</span>}
            <button onClick={startCall} disabled={callState !== 'idle'}
              className={`p-2 rounded-lg transition-colors ${callState !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
              title="Video call">
              <Video className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center"><MessageCircle className="h-10 w-10 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No messages yet. Say hello!</p></div>
            </div>
          ) : messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            const isTemp = msg.id.startsWith('temp-');
            const isEditing = editingMessageId === msg.id;
            const isAudio = msg.content?.startsWith('data:audio');
            const prev = messages[idx - 1];
            const showTime = !prev || new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
            return (
              <div key={msg.id}>
                {showTime && <div className="text-center my-2"><span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">{fmtTime(msg.created_at)}</span></div>}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {!isMe && <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0"><User className="h-3.5 w-3.5 text-white" /></div>}
                  <div className="max-w-xs lg:max-w-md group">
                    {isEditing ? (
                      <div className="flex items-center gap-2 bg-white border-2 border-blue-400 rounded-2xl px-3 py-2 shadow-sm">
                        <input ref={editInputRef} type="text" value={editContent} onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') submitEdit(msg.id); if (e.key === 'Escape') cancelEdit(); }}
                          className="flex-1 text-sm text-gray-800 bg-transparent outline-none min-w-0" />
                        <button onClick={() => submitEdit(msg.id)} disabled={!editContent.trim()} className="p-1 text-blue-600 disabled:opacity-40"><Check className="h-4 w-4" /></button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div onContextMenu={e => handleRightClick(e, msg)}
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed select-none ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'} ${isTemp ? 'opacity-60' : ''}`}>
                        {isAudio ? <VoiceMessagePlayer src={msg.content} isMe={isMe} /> : (<>{msg.content}{msg.edited && <span className={`text-xs ml-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>(edited)</span>}</>)}
                      </div>
                    )}
                    {!isEditing && (
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <p className="text-xs text-gray-400">{fmtFull(msg.created_at)}</p>
                        {isMe && <ReadReceipt msg={msg} />}
                      </div>
                    )}
                    {isMe && !isTemp && !isEditing && (
                      <div className="flex gap-1 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isAudio && <button onClick={e => { e.stopPropagation(); startEdit(msg); }} className="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 shadow-sm transition-colors"><Pencil className="h-3 w-3" /></button>}
                        <button onClick={e => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-red-500 shadow-sm transition-colors"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <VoiceRecorderUI isRecording={isRecording} seconds={recordingSeconds} onCancel={cancelRecording} onStop={stopRecording} />
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
              placeholder="Type a message…" disabled={isRecording}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm disabled:opacity-50"
              rows={1} style={{ minHeight: '44px', maxHeight: '120px' }} />
            <button type="button" onClick={() => isRecording ? stopRecording() : startRecording()}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${isRecording ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </button>
            <button type="submit" disabled={!newMessage.trim() || sending || isRecording}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Context menu */}
        {contextMenu && ctxMsg && (
          <div className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px]"
            style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
            <button onClick={() => startEdit(ctxMsg)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <Pencil className="h-4 w-4 text-blue-500" />Edit message
            </button>
            <div className="h-px bg-gray-100 mx-2" />
            <button onClick={() => { handleDeleteMessage(contextMenu.msgId); setContextMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />Delete message
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            INCOMING CALL MODAL — premium design
        ═══════════════════════════════════════════════════ */}
        {callState === 'incoming' && incomingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}>
            <div className="relative w-80 mx-4 rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
              {/* Ambient glow rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
                <div className="absolute w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', animation: 'pulse-ring 2s ease-in-out infinite 0.5s' }} />
              </div>

              <div className="relative z-10 p-8 text-center">
                {/* Avatar */}
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="absolute inset-[-8px] rounded-full" style={{ background: 'conic-gradient(from 0deg, #22c55e, #3b82f6, #22c55e)', animation: 'spin 3s linear infinite' }} />
                  <div className="absolute inset-[-6px] rounded-full bg-[#16213e]" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                    {incomingCall.fromName?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>

                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Incoming video call</p>
                <p className="text-white text-2xl font-bold mb-1">{incomingCall.fromName}</p>
                <div className="flex items-center justify-center gap-1.5 mb-8">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-green-400 text-sm">Ringing…</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-8 justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={declineCall}
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
                      <PhoneOff className="h-7 w-7 text-white" />
                    </button>
                    <span className="text-white/60 text-xs">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={answerCall}
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.4)' }}>
                      <Phone className="h-7 w-7 text-white" />
                    </button>
                    <span className="text-white/60 text-xs">Accept</span>
                  </div>
                </div>
              </div>
            </div>
            <style>{`
              @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.6} }
              @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            ACTIVE VIDEO CALL — full premium overlay
        ═══════════════════════════════════════════════════ */}
        {(callState === 'calling' || callState === 'connecting' || callState === 'in-call' || callState === 'reconnecting') && (
          <div
            ref={callContainerRef}
            className="fixed inset-0 z-50 bg-black flex flex-col select-none"
            onMouseMove={resetControlsTimer}
            onTouchStart={resetControlsTimer}
            style={{ cursor: showCallControls ? 'default' : 'none' }}
          >
            {/* ── Remote video (main) ───────────────────── */}
            <video
              ref={remoteVideoRef}
              autoPlay playsInline
              muted={isSpeakerOff}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: callState === 'in-call' && remoteVideoActive ? 1 : 0 }}
            />

            {/* ── Waiting / Calling background ─────────── */}
            {(callState !== 'in-call' || !remoteVideoActive) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6"
                style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
                {/* Animated rings */}
                <div className="relative">
                  {[0,1,2].map(i => (
                    <div key={i} className="absolute rounded-full border border-white/10"
                      style={{
                        inset: `-${(i+1)*24}px`,
                        animation: `ripple 2.5s ease-out infinite ${i*0.6}s`,
                      }} />
                  ))}
                  <div className="relative w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                    {selectedPartnerName?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white text-2xl font-bold">{selectedPartnerName}</p>
                  <p className="text-white/60 text-sm mt-1">
                    {callState === 'calling' ? 'Calling…' : callState === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
                  </p>
                  {callState === 'calling' && (
                    <div className="flex gap-1.5 justify-center mt-3">
                      {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                    </div>
                  )}
                  {callState === 'reconnecting' && (
                    <div className="flex items-center gap-2 justify-center mt-3">
                      <RotateCcw className="h-4 w-4 text-yellow-400 animate-spin" />
                      <span className="text-yellow-400 text-sm">Reconnecting…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Top bar ───────────────────────────────── */}
            <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${showCallControls ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)', padding: '20px 24px 40px' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-lg">{selectedPartnerName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {callState === 'in-call' && (
                      <>
                        <span className="text-green-400 text-sm font-medium">● {fmtDuration(callDuration)}</span>
                        <CallQualityBadge quality={callQuality} />
                      </>
                    )}
                    {callState === 'calling' && <span className="text-white/60 text-sm">Ringing…</span>}
                    {callState === 'connecting' && <span className="text-yellow-400 text-sm">Connecting…</span>}
                    {callState === 'reconnecting' && <span className="text-yellow-400 text-sm">Reconnecting…</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Screen share indicator */}
                  {isScreenSharing && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/30 border border-blue-400/50">
                      <Monitor className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-blue-400 text-xs font-medium">Sharing screen</span>
                    </div>
                  )}
                  {/* Fullscreen toggle */}
                  <button onClick={toggleFullscreen}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur">
                    {isFullscreen ? <Minimize2 className="h-4 w-4 text-white" /> : <Maximize2 className="h-4 w-4 text-white" />}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Local video (PiP) ─────────────────────── */}
            <div
              className={`absolute z-20 transition-all duration-300 ${showCallControls ? 'opacity-100' : 'opacity-70'}`}
              style={{ top: '88px', right: '16px', cursor: 'pointer' }}
              onClick={() => setIsLocalPiP(p => !p)}
              title="Swap views"
            >
              <div className="relative w-32 h-24 rounded-2xl overflow-hidden shadow-2xl"
                style={{ border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-1">
                    <VideoOff className="h-6 w-6 text-white/40" />
                    <span className="text-white/40 text-xs">Camera off</span>
                  </div>
                )}
                {/* Swap hint */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <RotateCcw className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            {/* ── Bottom controls ───────────────────────── */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showCallControls ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', padding: '40px 24px 32px' }}
            >
              {/* Control buttons row */}
              <div className="flex items-center justify-center gap-4">

                {/* Mute */}
                <ControlBtn
                  onClick={toggleMute} active={isMuted}
                  icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  label={isMuted ? 'Unmute' : 'Mute'}
                />

                {/* Camera */}
                <ControlBtn
                  onClick={toggleCamera} active={isCameraOff}
                  icon={isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  label={isCameraOff ? 'Start cam' : 'Stop cam'}
                />

                {/* END CALL — center, bigger */}
                <button onClick={endCall}
                  className="flex flex-col items-center gap-1.5 group"
                  title="End call">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.5)' }}>
                    <PhoneOff className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-white/60 text-xs">End</span>
                </button>

                {/* Speaker */}
                <ControlBtn
                  onClick={toggleSpeaker} active={isSpeakerOff}
                  icon={isSpeakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  label={isSpeakerOff ? 'Unmute' : 'Speaker'}
                />

                {/* Screen share */}
                <ControlBtn
                  onClick={toggleScreenShare} active={isScreenSharing}
                  icon={isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
                  label={isScreenSharing ? 'Stop share' : 'Share'}
                  activeColor="bg-blue-500/80"
                />
              </div>
            </div>

            <style>{`
              @keyframes ripple {
                0%   { transform: scale(0.8); opacity: 0.6; }
                100% { transform: scale(2.2); opacity: 0; }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // CHAT LIST VIEW
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ height: 'calc(100vh - 96px)' }} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            {totalUnread > 0 && <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{totalUnread}</span>}
          </div>
          <button onClick={() => { setShowNewChat(!showNewChat); setNewChatSearch(''); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {showNewChat && (
          <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">Start new conversation</p>
            <input type="text" placeholder="Search people by name..." value={newChatSearch} onChange={e => setNewChatSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" autoFocus />
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {newChatSearch
                ? filteredUsers.length > 0
                  ? filteredUsers.map(u => (
                    <button key={u.id} onClick={() => startNewChat(u.id, u.name)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-100 rounded-lg transition-colors text-left">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0"><User className="h-4 w-4 text-white" /></div>
                      <div><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div>
                    </button>
                  ))
                  : <p className="text-xs text-gray-400 text-center py-2">No users found</p>
                : <p className="text-xs text-gray-400 text-center py-2">Type a name to search</p>}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length > 0 ? filteredChats.map(chat => (
          <button key={chat.partner_id} onClick={() => openChat(chat.partner_id, chat.partner_name, chat.partner_avatar)}
            className="w-full flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {chat.partner_avatar ? <img src={chat.partner_avatar} alt={chat.partner_name} className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{chat.partner_name}</p>
                <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{fmtTime(chat.last_time)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 truncate">{chat.last_content?.startsWith('data:audio') ? '🎤 Voice message' : (chat.last_content || 'Tap to open')}</p>
                {chat.unread_count > 0 && <span className="flex-shrink-0 ml-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{chat.unread_count}</span>}
              </div>
            </div>
          </button>
        )) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4"><MessageCircle className="h-8 w-8 text-blue-400" /></div>
            <p className="text-gray-600 font-medium mb-1">No conversations yet</p>
            <p className="text-gray-400 text-sm">Click + to start a new conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Reusable control button ───────────────────────────────────
const ControlBtn: React.FC<{
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  activeColor?: string;
}> = ({ onClick, active, icon, label, activeColor = 'bg-red-500/80' }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 group" title={label}>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 backdrop-blur ${active ? activeColor : 'bg-white/15 hover:bg-white/25'}`}
      style={{ boxShadow: active ? '0 4px 16px rgba(0,0,0,0.3)' : 'none' }}>
      <span className="text-white">{icon}</span>
    </div>
    <span className="text-white/60 text-xs group-hover:text-white/80 transition-colors">{label}</span>
  </button>
);

export default Messages;