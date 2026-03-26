import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  User, MapPin, Phone, Mail, Github, Linkedin, Globe,
  Briefcase, GraduationCap, Award, ArrowLeft, MessageCircle,
  UserPlus, Check, Heart, MessageCircle as CommentIcon, Hash, ChevronDown, ChevronUp
} from 'lucide-react';

interface UserProfile {
  id: string; name: string; email: string; role: string;
  avatar?: string; bio?: string; phone?: string; location?: string;
  profile_complete: boolean;
  branch?: string; passing_year?: string; cgpa?: number;
  github?: string; linkedin?: string; portfolio?: string;
  skills?: string[]; resume_url?: string;
  company?: string; position?: string; website?: string;
}

interface Post {
  id: string; author_id: string; author_name: string;
  author_role: string; author_avatar?: string;
  content: string; post_type: string; tags: string[];
  images: string[]; like_count: number; comment_count: number;
  is_liked: boolean; created_at: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const typeColor = (type: string) => {
  if (type === 'project') return 'text-blue-600';
  if (type === 'achievement') return 'text-yellow-600';
  if (type === 'job') return 'text-green-600';
  return 'text-gray-500';
};

const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  useEffect(() => {
    if (!userId) return;

    // Fetch profile
    fetch(`${API}/users/${userId}`, { headers: getHeaders() })
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.json(); })
      .then(data => setProfile(data))
      .catch(() => { addNotification({ title: 'Error', message: 'Could not load profile.', type: 'error' }); navigate(-1); })
      .finally(() => setLoadingProfile(false));

    // Fetch user's posts
    fetch(`${API}/posts/user/${userId}`, { headers: getHeaders() })
      .then(res => { if (!res.ok) return []; return res.json(); })
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setPosts(arr);
        setLikedPosts(new Set(arr.filter((p: Post) => p.is_liked).map((p: Post) => p.id)));
      })
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [userId]);

  const handleLike = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const s = new Set(prev);
      isLiked ? s.delete(postId) : s.add(postId);
      return s;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, like_count: isLiked ? p.like_count - 1 : p.like_count + 1 } : p
    ));
    try {
      await fetch(`${API}/posts/${postId}/like`, { method: 'POST', headers: getHeaders() });
    } catch {}
  };

  const handleConnect = async () => {
    if (!profile) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API}/connections/request`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ connected_user_id: profile.id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setConnected(true);
      addNotification({ title: 'Request sent!', message: `Connection request sent to ${profile.name}.`, type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  const getRoleColor = (role: string) => {
    if (role === 'recruiter') return 'bg-green-100 text-green-700';
    if (role === 'admin') return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (loadingProfile) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return null;
  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700" />
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {profile.avatar
                ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                : <User className="h-9 w-9 text-white" />}
            </div>
            <div className="flex gap-2 mt-14">
              {!isOwnProfile ? (
                <>
                  <button onClick={() => navigate('/messages')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                    <MessageCircle className="h-4 w-4" /> Message
                  </button>
                  <button onClick={handleConnect} disabled={connected || connecting}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      connected ? 'bg-green-100 text-green-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                    }`}>
                    {connected ? <><Check className="h-4 w-4" />Requested</> :
                      connecting ? 'Sending...' : <><UserPlus className="h-4 w-4" />Connect</>}
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('/profile')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getRoleColor(profile.role)}`}>{profile.role}</span>
            {profile.profile_complete && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Verified</span>}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-gray-500"><span className="font-bold text-gray-900">{posts.length}</span> posts</span>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Mail className="h-4 w-4 text-gray-400" />{profile.email}</div>
            {profile.location && <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin className="h-4 w-4 text-gray-400" />{profile.location}</div>}
            {profile.phone && <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="h-4 w-4 text-gray-400" />{profile.phone}</div>}
          </div>
          {profile.bio && <p className="mt-3 text-sm text-gray-600 leading-relaxed">{profile.bio}</p>}
        </div>
      </div>

      {/* Student Info */}
      {profile.role === 'student' && (profile.branch || profile.cgpa || profile.passing_year) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <GraduationCap className="h-4 w-4 text-blue-600" />Academic Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {profile.branch && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Branch</p><p className="text-sm font-semibold text-gray-900">{profile.branch}</p></div>}
            {profile.passing_year && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Batch</p><p className="text-sm font-semibold text-gray-900">{profile.passing_year}</p></div>}
            {profile.cgpa && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">CGPA</p><p className="text-sm font-semibold text-gray-900">{profile.cgpa} / 10</p></div>}
          </div>
          {(profile.github || profile.linkedin || profile.portfolio || profile.resume_url) && (
            <div className="flex flex-wrap gap-3 mt-4">
              {profile.github && <a href={profile.github.startsWith('http') ? profile.github : `https://${profile.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700"><Github className="h-3.5 w-3.5" />GitHub</a>}
              {profile.linkedin && <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium hover:bg-blue-800"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
              {profile.portfolio && <a href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700"><Globe className="h-3.5 w-3.5" />Portfolio</a>}
              {profile.resume_url && <a href={profile.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">View Resume</a>}
            </div>
          )}
          {profile.skills && profile.skills.filter(Boolean).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1"><Award className="h-3.5 w-3.5" />Skills</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.filter(Boolean).map(skill => (
                  <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recruiter Info */}
      {profile.role === 'recruiter' && (profile.company || profile.position) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Briefcase className="h-4 w-4 text-blue-600" />Professional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.company && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Company</p><p className="text-sm font-semibold text-gray-900">{profile.company}</p></div>}
            {profile.position && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Position</p><p className="text-sm font-semibold text-gray-900">{profile.position}</p></div>}
          </div>
          {profile.website && <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"><Globe className="h-3.5 w-3.5" />Visit Website</a>}
        </div>
      )}

      {/* Posts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Posts</h2>
          <span className="text-sm text-gray-400">{posts.length} posts</span>
        </div>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <Hash className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No posts yet</p>
          </div>
        ) : posts.map(post => {
          const isExpanded = expandedPost === post.id;
          const isLong = post.content.length > 250;
          const isLiked = likedPosts.has(post.id);
          return (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              {/* Post header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profile.avatar
                    ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    : <User className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">{formatTime(post.created_at)}</p>
                    <span className={`text-xs font-medium capitalize ${typeColor(post.post_type)}`}>{post.post_type}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {isLong && !isExpanded ? post.content.slice(0, 250) + '...' : post.content}
              </p>
              {isLong && (
                <button onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  className="flex items-center gap-1 text-blue-600 text-xs font-medium mt-1 hover:underline">
                  {isExpanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />Read more</>}
                </button>
              )}

              {/* Image */}
              {post.images?.length > 0 && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                  <img src={post.images[0]} alt="Post" className="w-full max-h-72 object-cover" />
                </div>
              )}

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-lg">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {post.like_count > 0 && <span>{post.like_count}</span>}
                  <span>Like</span>
                </button>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CommentIcon className="h-4 w-4" />
                  {post.comment_count > 0 && <span>{post.comment_count}</span>}
                  <span>Comments</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PublicProfile;