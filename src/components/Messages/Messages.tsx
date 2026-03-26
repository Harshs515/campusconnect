import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Search, Plus, User, MessageCircle, ArrowLeft, Pencil, Trash2, Check, CheckCheck, X, Mic, Video, VideoOff, PhoneOff, Phone, MicOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

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

  // Edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Video call state ────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callerIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'in-call'>('idle');
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('campusconnect_token');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ── Socket.io setup ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('join', user.id);
    });

    socket.on('incoming-call', ({ from, fromName }: { from: string; fromName: string }) => {
      callerIdRef.current = from;
      setIncomingCall({ from, fromName });
      setCallState('incoming');
    });

    socket.on('call-offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = createPeerConnection(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call-answer', { to: callerIdRef.current, answer });
        setCallState('in-call');
        startCallTimer();
      } catch (err) {
        console.error('Error handling offer:', err);
        endCall();
      }
    });

    socket.on('call-answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('in-call');
        startCallTimer();
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    socket.on('ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('call-ended', () => {
      endCallCleanup();
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  // ── Call timer ───────────────────────────────────────────────
  const startCallTimer = () => {
    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── WebRTC helpers ───────────────────────────────────────────
  const createPeerConnection = (stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
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
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCallCleanup();
      }
    };

    return pc;
  };

  const startCall = async () => {
    if (!selectedPartnerId || callState !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('initiate-call', { to: selectedPartnerId, fromName: user?.name });
      socketRef.current?.emit('call-offer', { to: selectedPartnerId, offer });
      setCallState('calling');
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Could not access camera/microphone. Please check permissions.');
      endCallCleanup();
    }
  };

  const answerCall = async () => {
    // The actual media + peer connection is set up in the 'call-offer' handler
    // This button just signals readiness visually; actual answer happens on offer receipt
    setCallState('in-call');
  };

  const endCall = () => {
    const targetId = callerIdRef.current || selectedPartnerId;
    if (targetId) {
      socketRef.current?.emit('end-call', { to: targetId });
    }
    endCallCleanup();
  };

  const endCallCleanup = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    callerIdRef.current = null;
    setCallState('idle');
    setIncomingCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(track => {
      track.enabled = isMuted;
    });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(track => {
      track.enabled = isCameraOff;
    });
    setIsCameraOff(!isCameraOff);
  };

  // ── Close context menu on outside click ──────────────────────
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // ── Focus edit input when editing starts ─────────────────────
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingMessageId]);

  // ── Fetch chats ───────────────────────────────────────────────
  const fetchChats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/messages/chats`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized = data.map((c: any) => ({
          partner_id: c.partner_id || c.chat_partner_id || c.partnerId || '',
          partner_name: c.partner_name || c.partner_email || c.name || 'Unknown',
          partner_avatar: c.partner_avatar || null,
          last_content: c.last_content || c.lastMessage || c.content || '',
          last_time: c.last_time || c.lastMessageTime || c.created_at || '',
          unread_count: c.unread_count || c.unreadCount || 0,
        })).filter(c => c.partner_id !== '');
        setChats(normalized);
      }
    } catch (err) {
      console.error('fetchChats error:', err);
    }
  }, [token]);

  // ── Fetch messages ────────────────────────────────────────────
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/messages/${partnerId}`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      setChats(prev => prev.map(c =>
        c.partner_id === partnerId ? { ...c, unread_count: 0 } : c
      ));
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  }, [token]);

  // ── Fetch users ───────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/users`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data.filter((u: any) => u.id !== user?.id) : []);
    } catch (err) {
      console.error('fetchUsers error:', err);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchChats();
    fetchUsers();
  }, []);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchChats();
      if (selectedPartnerId) fetchMessages(selectedPartnerId);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedPartnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Open chat ─────────────────────────────────────────────────
  const openChat = async (partnerId: string, partnerName: string, partnerAvatar?: string) => {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerName(partnerName);
    setSelectedPartnerAvatar(partnerAvatar || null);
    setMessages([]);
    setLoading(true);
    setView('chat');
    setEditingMessageId(null);
    setContextMenu(null);
    try {
      const res = await fetch(`${API}/messages/${partnerId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setChats(prev => prev.map(c =>
          c.partner_id === partnerId ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (err) {
      console.error('openChat error:', err);
    }
    setLoading(false);
  };

  const startNewChat = (profileId: string, profileName: string) => {
    setShowNewChat(false);
    setNewChatSearch('');
    const existing = chats.find(c => c.partner_id === profileId);
    if (!existing) {
      setChats(prev => [{
        partner_id: profileId,
        partner_name: profileName,
        last_content: '',
        last_time: new Date().toISOString(),
        unread_count: 0,
      }, ...prev]);
    }
    openChat(profileId, profileName);
  };

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartnerId || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: user?.id || '',
      receiver_id: selectedPartnerId,
      sender_name: user?.name || '',
      content,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setChats(prev => prev.map(c =>
      c.partner_id === selectedPartnerId
        ? { ...c, last_content: content, last_time: new Date().toISOString() }
        : c
    ));

    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ receiver_id: selectedPartnerId, content }),
      });
      if (!res.ok) throw new Error('Send failed');
      const saved = await res.json();
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...saved, sender_name: user?.name || '' } : m
      ));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  // ── Send voice message ────────────────────────────────────────
  const sendVoiceMessage = async (audioBase64: string) => {
    if (!selectedPartnerId || sending) return;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: user?.id || '',
      receiver_id: selectedPartnerId,
      sender_name: user?.name || '',
      content: audioBase64,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setChats(prev => prev.map(c =>
      c.partner_id === selectedPartnerId
        ? { ...c, last_content: audioBase64, last_time: new Date().toISOString() }
        : c
    ));

    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ receiver_id: selectedPartnerId, content: audioBase64 }),
      });
      if (!res.ok) throw new Error('Send failed');
      const saved = await res.json();
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...saved, sender_name: user?.name || '' } : m
      ));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ── Voice recording ───────────────────────────────────────────
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const chunks = audioChunksRef.current;
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        if (blob.size > 750_000) {
          alert('Voice message is too long. Please keep it under ~30 seconds.');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (base64 && base64.startsWith('data:audio')) {
            sendVoiceMessage(base64);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required for voice messages. Please allow microphone permission and try again.');
    }
  };

  // ── Delete message ────────────────────────────────────────────
  const handleDeleteMessage = async (msgId: string) => {
    if (msgId.startsWith('temp-')) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await fetch(`${API}/messages/${msgId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      fetchChats();
    } catch {
      if (selectedPartnerId) fetchMessages(selectedPartnerId);
    }
  };

  // ── Edit message ──────────────────────────────────────────────
  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setContextMenu(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const submitEdit = async (msgId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, content: trimmed, edited: true } : m
    ));
    setEditingMessageId(null);
    setEditContent('');
    try {
      const res = await fetch(`${API}/messages/${msgId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error('Edit failed');
      const updated = await res.json();
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...updated, sender_name: user?.name || '' } : m
      ));
      fetchChats();
    } catch {
      if (selectedPartnerId) fetchMessages(selectedPartnerId);
    }
  };

  // ── Right-click context menu ──────────────────────────────────
  const handleMessageRightClick = (e: React.MouseEvent, msg: Message) => {
    if (msg.sender_id !== user?.id) return;
    if (msg.id.startsWith('temp-')) return;
    e.preventDefault();
    setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, msgId: string) => {
    if (e.key === 'Enter') submitEdit(msgId);
    if (e.key === 'Escape') cancelEdit();
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const formatFullTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const filteredChats = chats.filter(c =>
    (c.partner_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // ── Read receipt icon ─────────────────────────────────────────
  const ReadReceipt = ({ msg }: { msg: Message }) => {
    const isTemp = msg.id.startsWith('temp-');
    if (isTemp) return <Check className="h-3 w-3 text-white/50 inline ml-1" />;
    if (msg.read) {
      return (
        <span className="inline-flex items-center ml-1" title="Seen">
          <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center ml-1" title="Delivered">
        <Check className="h-3 w-3 text-white/60" />
      </span>
    );
  };

  // ── CHAT VIEW ─────────────────────────────────────────────────
  if (view === 'chat' && selectedPartnerId) {
    const contextMsg = contextMenu ? messages.find(m => m.id === contextMenu.msgId) : null;

    return (
      <div
        style={{ height: 'calc(100vh - 96px)' }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative"
        onClick={() => setContextMenu(null)}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('list'); setSelectedPartnerId(null); setMessages([]); setEditingMessageId(null); }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
              {selectedPartnerAvatar
                ? <img src={selectedPartnerAvatar} alt={selectedPartnerName} className="w-full h-full object-cover" />
                : <User className="h-4 w-4 text-white" />}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selectedPartnerName}</p>
              {callState === 'in-call' && (
                <p className="text-xs text-green-500 font-medium">● In call · {formatCallDuration(callDuration)}</p>
              )}
            </div>
          </div>

          {/* Video call button */}
          <button
            onClick={startCall}
            disabled={callState !== 'idle'}
            className={`p-2 rounded-lg transition-colors ${
              callState !== 'idle'
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
            title="Start video call"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              const isTemp = msg.id.startsWith('temp-');
              const isEditing = editingMessageId === msg.id;
              const isAudio = msg.content?.startsWith('data:audio');
              const prevMsg = messages[idx - 1];
              const showTime = !prevMsg ||
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000;

              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="text-center my-2">
                      <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                        {formatTime(msg.created_at)}
                      </span>
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
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => handleEditKeyDown(e, msg.id)}
                            className="flex-1 text-sm text-gray-800 bg-transparent outline-none min-w-0"
                          />
                          <button
                            onClick={() => submitEdit(msg.id)}
                            disabled={!editContent.trim()}
                            className="p-1 text-blue-600 hover:text-blue-700 disabled:opacity-40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onContextMenu={e => handleMessageRightClick(e, msg)}
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed select-none ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'
                          } ${isTemp ? 'opacity-60' : ''}`}
                        >
                          {isAudio ? (
                            <audio controls className="max-w-[220px] h-10">
                              <source src={msg.content} type="audio/webm" />
                              Your browser does not support audio.
                            </audio>
                          ) : (
                            <>
                              {msg.content}
                              {msg.edited && (
                                <span className={`text-xs ml-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                  (edited)
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {!isEditing && (
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-xs text-gray-400">{formatFullTime(msg.created_at)}</p>
                          {isMe && <ReadReceipt msg={msg} />}
                        </div>
                      )}

                      {isMe && !isTemp && !isEditing && !isAudio && (
                        <div className="flex gap-1 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); startEdit(msg); }}
                            className="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
                            title="Edit message"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                            className="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {isMe && !isTemp && !isEditing && isAudio && (
                        <div className="flex gap-1 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                            className="p-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          {isRecording && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 font-medium">Recording... tap mic to send</span>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white scale-110 shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Click to stop & send' : 'Click to record voice message'}
            >
              <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </button>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Right-click context menu */}
        {contextMenu && contextMsg && (
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => startEdit(contextMsg)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-4 w-4 text-blue-500" />
              Edit message
            </button>
            <div className="h-px bg-gray-100 mx-2" />
            <button
              onClick={() => { handleDeleteMessage(contextMenu.msgId); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete message
            </button>
          </div>
        )}

        {/* ── INCOMING CALL MODAL ─────────────────────────────────── */}
        {callState === 'incoming' && incomingCall && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl w-80 mx-4 animate-in fade-in zoom-in duration-200">
              {/* Animated ring */}
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-60" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <Video className="h-9 w-9 text-white" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-1">{incomingCall.fromName}</p>
              <p className="text-sm text-gray-500 mb-8">Incoming video call...</p>
              <div className="flex gap-6 justify-center">
                {/* Decline */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={endCall}
                    className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-gray-500">Decline</span>
                </div>
                {/* Accept */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={answerCall}
                    className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
                  >
                    <Phone className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-gray-500">Accept</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE / CALLING VIDEO OVERLAY ─────────────────────── */}
        {(callState === 'calling' || callState === 'in-call') && (
          <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            {/* Remote video (full screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark overlay when calling (waiting for answer) */}
            {callState === 'calling' && (
              <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                  <User className="h-10 w-10 text-white" />
                </div>
                <p className="text-white text-xl font-semibold">{selectedPartnerName}</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-white/70 text-sm">Calling...</p>
                </div>
              </div>
            )}

            {/* Header bar */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4">
              <div>
                <p className="text-white font-semibold text-lg drop-shadow">{selectedPartnerName}</p>
                {callState === 'in-call' && (
                  <p className="text-green-400 text-sm font-medium">● {formatCallDuration(callDuration)}</p>
                )}
              </div>
            </div>

            {/* Local video (picture-in-picture) */}
            <div className="absolute top-20 right-4 z-20">
              <div className="relative w-28 h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <VideoOff className="h-6 w-6 text-white/60" />
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 pb-10 pt-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-6">
                {/* Mute */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 ${
                      isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur'
                    }`}
                  >
                    {isMuted
                      ? <MicOff className="h-6 w-6 text-white" />
                      : <Mic className="h-6 w-6 text-white" />}
                  </button>
                  <span className="text-white/70 text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>

                {/* End call */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={endCall}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
                  >
                    <PhoneOff className="h-7 w-7" />
                  </button>
                  <span className="text-white/70 text-xs">End call</span>
                </div>

                {/* Camera toggle */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 ${
                      isCameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur'
                    }`}
                  >
                    {isCameraOff
                      ? <VideoOff className="h-6 w-6 text-white" />
                      : <Video className="h-6 w-6 text-white" />}
                  </button>
                  <span className="text-white/70 text-xs">{isCameraOff ? 'Show cam' : 'Hide cam'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CHAT LIST VIEW ────────────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 96px)' }} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            {totalUnread > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => { setShowNewChat(!showNewChat); setNewChatSearch(''); }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="New message"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {showNewChat && (
          <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">Start new conversation</p>
            <input
              type="text"
              placeholder="Search people by name..."
              value={newChatSearch}
              onChange={e => setNewChatSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              autoFocus
            />
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {newChatSearch ? (
                filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startNewChat(u.id, u.name)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-100 rounded-lg transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                    </div>
                  </button>
                )) : (
                  <p className="text-xs text-gray-400 text-center py-2">No users found</p>
                )
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Type a name to search</p>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map(chat => (
            <button
              key={chat.partner_id}
              onClick={() => openChat(chat.partner_id, chat.partner_name, chat.partner_avatar)}
              className="w-full flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {chat.partner_avatar
                  ? <img src={chat.partner_avatar} alt={chat.partner_name} className="w-full h-full object-cover" />
                  : <User className="h-5 w-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{chat.partner_name}</p>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(chat.last_time)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">
                    {chat.last_content?.startsWith('data:audio')
                      ? '🎤 Voice message'
                      : (chat.last_content || 'Tap to open')}
                  </p>
                  {chat.unread_count > 0 && (
                    <span className="flex-shrink-0 ml-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
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