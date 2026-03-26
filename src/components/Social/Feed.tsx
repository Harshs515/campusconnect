import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Link } from 'react-router-dom';
import {
  Heart, MessageCircle,
  User, Send, Image, Briefcase, Code, Trophy, Hash, X, ChevronDown
} from 'lucide-react';

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar?: string;
  content: string;
  post_type: string;
  tags: string[];
  images: string[];
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const POST_TYPES = [
  { value: 'text',        label: 'Update',      icon: Hash,      color: 'text-gray-600' },
  { value: 'project',     label: 'Project',     icon: Code,      color: 'text-blue-600' },
  { value: 'achievement', label: 'Achievement', icon: Trophy,    color: 'text-yellow-600' },
  { value: 'job',         label: 'Job',         icon: Briefcase, color: 'text-green-600' },
];

const Feed: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('text');
  const [postTags, setPostTags] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('campusconnect_token')}`,
  });

  // ── Fetch posts ───────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    const currentToken = localStorage.getItem('campusconnect_token');
    if (!currentToken) return;
    try {
      const res = await fetch(`${API}/posts`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
    } catch (err) {
      console.error('fetchPosts error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('campusconnect_token');
    if (!token) return;
    setLoading(true);
    const timer = setTimeout(() => fetchPosts(), 100);
    return () => clearTimeout(timer);
  }, [user?.id]);

  // ── Create post ───────────────────────────────────────────────
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || posting) return;

    setPosting(true);
    try {
      const tags = postTags.split(',').map(t => t.trim().replace('#', '')).filter(Boolean);
      const images = imagePreview ? [imagePreview] : [];

      const res = await fetch(`${API}/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          content: postContent.trim(),
          post_type: postType,
          tags,
          images,
          visibility: 'public',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to post');
      }

      const newPost = await res.json();
      setPosts(prev => [{
        ...newPost,
        author_name: user?.name || '',
        author_role: user?.role || '',
        author_avatar: user?.avatar,
        like_count: 0,
        comment_count: 0,
        is_liked: false,
        is_bookmarked: false,
      }, ...prev]);

      setPostContent('');
      setPostTags('');
      setImagePreview(null);
      setPostType('text');
      addNotification({ title: 'Post published!', message: 'Your post is now visible to everyone.', type: 'success' });
      fetchPosts();
    } catch (err: any) {
      addNotification({ title: 'Failed to post', message: err.message, type: 'error' });
    } finally {
      setPosting(false);
    }
  };

  // ── Delete post ───────────────────────────────────────────────
  // Admins can delete any post. Users can only delete their own.
  const handleDeletePost = async (postId: string, authorId: string) => {
    const isAuthor = user?.id === authorId;
    const isAdmin  = user?.role === 'admin';

    // Guard in case the button somehow appears for an unauthorised user
    if (!isAuthor && !isAdmin) return;

    if (!window.confirm(
      isAdmin && !isAuthor
        ? 'Delete this post as admin? The author will lose this post.'
        : 'Delete your post? This cannot be undone.'
    )) return;

    try {
      const res = await fetch(`${API}/posts/${postId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      setPosts(prev => prev.filter(p => p.id !== postId));
      addNotification({
        title: 'Post deleted',
        message: isAdmin && !isAuthor ? 'Post removed by admin.' : 'Your post has been removed.',
        type: 'success',
      });
    } catch (err: any) {
      addNotification({ title: 'Delete failed', message: err.message, type: 'error' });
    }
  };

  // ── Like post ─────────────────────────────────────────────────
  const handleLike = async (postId: string) => {
    if (!localStorage.getItem('campusconnect_token')) return;
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ));
    try {
      await fetch(`${API}/posts/${postId}/like`, { method: 'POST', headers: getHeaders() });
    } catch {
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
          : p
      ));
    }
  };

  // ── Comments ──────────────────────────────────────────────────
  const loadComments = async (postId: string) => {
    if (comments[postId]) return;
    try {
      const res = await fetch(`${API}/posts/${postId}/comments`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setComments(prev => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error('loadComments error:', err);
    }
  };

  const toggleComments = (postId: string) => {
    if (showComments === postId) {
      setShowComments(null);
    } else {
      setShowComments(postId);
      loadComments(postId);
    }
  };

  const handleComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    setCommentText(prev => ({ ...prev, [postId]: '' }));

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      author_id: user?.id || '',
      author_name: user?.name || '',
      content,
      created_at: new Date().toISOString(),
    };
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), tempComment] }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));

    try {
      const res = await fetch(`${API}/posts/${postId}/comment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Comment failed');
      const saved = await res.json();
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === tempComment.id ? saved : c),
      }));
    } catch {
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== tempComment.id),
      }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count - 1 } : p));
      setCommentText(prev => ({ ...prev, [postId]: content }));
    }
  };

  // ── Image handler ─────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addNotification({ title: 'File too large', message: 'Image must be under 5MB', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getRoleColor = (role: string) => {
    if (role === 'recruiter') return 'bg-green-100 text-green-700';
    if (role === 'admin') return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getTypeIcon = (type: string) => POST_TYPES.find(t => t.value === type) ?? POST_TYPES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Create Post */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form onSubmit={handlePost}>
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                : <User className="h-5 w-5 text-white" />}
            </div>
            <textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
            />
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            {POST_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button key={type.value} type="button"
                  onClick={() => setPostType(type.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${postType === type.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon className="h-3.5 w-3.5" />{type.label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={postTags}
            onChange={e => setPostTags(e.target.value)}
            placeholder="Tags (comma separated, e.g. react, nodejs)"
            className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {imagePreview && (
            <div className="relative mb-3">
              <img src={imagePreview} alt="Preview" className="w-full max-h-60 object-cover rounded-xl border border-gray-200" />
              <button type="button"
                onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer text-sm transition-colors">
              <Image className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Photo</span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <button type="submit" disabled={!postContent.trim() || posting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {posting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Posting...</>
                : <><Send className="h-4 w-4" />Post</>}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Hash className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No posts yet</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to share something!</p>
        </div>
      ) : posts.map(post => {
        const isExpanded  = expandedPosts.has(post.id);
        const isLong      = post.content.length > 300;
        const displayContent = isLong && !isExpanded ? post.content.slice(0, 300) + '...' : post.content;
        const typeInfo    = getTypeIcon(post.post_type);
        const TypeIcon    = typeInfo.icon;

        // Show delete button only to the post author OR an admin
        const canDelete = user?.id === post.author_id || user?.role === 'admin';

        return (
          <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            {/* Post header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {post.author_avatar
                    ? <img src={post.author_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    : <User className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${post.author_id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                      {post.author_name}
                    </Link>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleColor(post.author_role)}`}>
                      {post.author_role}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${typeInfo.color}`}>
                      <TypeIcon className="h-3 w-3" />{typeInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{formatTime(post.created_at)}</p>
                </div>
              </div>

              {/* Delete button — visible to author and admin only */}
              {canDelete && (
                <button
                  onClick={() => handleDeletePost(post.id, post.author_id)}
                  className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  title={user?.role === 'admin' && user?.id !== post.author_id ? 'Delete post (Admin)' : 'Delete your post'}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Content */}
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">{displayContent}</p>
            {isLong && (
              <button
                onClick={() => setExpandedPosts(prev => {
                  const s = new Set(prev);
                  s.has(post.id) ? s.delete(post.id) : s.add(post.id);
                  return s;
                })}
                className="flex items-center gap-1 text-blue-600 text-xs font-medium mb-3 hover:underline">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}

            {/* Images */}
            {post.images?.length > 0 && (
              <div className="mb-3 rounded-xl overflow-hidden border border-gray-200">
                <img src={post.images[0]} alt="Post" className="w-full max-h-80 object-cover" />
              </div>
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg font-medium">#{tag}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
              <button onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                {post.like_count > 0 && <span>{post.like_count}</span>}
                <span className="hidden sm:inline">Like</span>
              </button>
              <button onClick={() => toggleComments(post.id)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${showComments === post.id ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
                <MessageCircle className="h-4 w-4" />
                {post.comment_count > 0 && <span>{post.comment_count}</span>}
                <span className="hidden sm:inline">Comment</span>
              </button>
            </div>

            {/* Comments section */}
            {showComments === post.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                {(comments[post.id] || []).map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-gray-900">{comment.author_name}</p>
                      <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 mt-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {user?.avatar
                      ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      : <User className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText[post.id] || ''}
                      onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button onClick={() => handleComment(post.id)}
                      disabled={!commentText[post.id]?.trim()}
                      className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Feed;