import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface Post {
  id: string; authorId: string; authorName: string; authorRole: string; authorAvatar?: string;
  content: string; images?: string[]; type: 'text' | 'image' | 'job' | 'project' | 'achievement' | 'meme';
  tags: string[]; likes: string[]; comments: Comment[]; shares: string[]; bookmarks: string[];
  createdAt: Date; updatedAt: Date; visibility: 'public' | 'connections' | 'branch';
}
export interface Comment {
  id: string; authorId: string; authorName: string; authorAvatar?: string;
  content: string; likes: string[]; createdAt: Date; replies?: Comment[];
}
export interface Connection {
  id: string; userId: string; connectedUserId: string; status: 'pending' | 'accepted' | 'blocked'; createdAt: Date;
}
export interface UserProfile {
  id: string; name: string; email: string; role: string; avatar?: string; bio?: string;
  branch?: string; company?: string; followers: string[]; following: string[]; posts: number;
}

interface SocialContextType {
  posts: Post[]; connections: Connection[]; userProfiles: UserProfile[];
  createPost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'comments' | 'shares' | 'bookmarks'>) => void;
  likePost: (postId: string) => void;
  commentOnPost: (postId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'replies'>) => void;
  sharePost: (postId: string) => void;
  bookmarkPost: (postId: string) => void;
  sendConnectionRequest: (userId: string) => void;
  acceptConnectionRequest: (connectionId: string) => void;
  rejectConnectionRequest: (connectionId: string) => void;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  getFeedPosts: () => Post[];
  getUserPosts: (userId: string) => Post[];
  getConnections: (userId: string) => Connection[];
  getPendingRequests: () => Connection[];
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);
export const useSocial = () => { const c = useContext(SocialContext); if (!c) throw new Error('useSocial must be within SocialProvider'); return c; };

const INITIAL_PROFILES: UserProfile[] = [
  { id: 'demo-student-001', name: 'Alex Kumar', email: 'student@demo.com', role: 'student', bio: 'Final year CSE student | Full Stack Developer | Open Source Contributor', branch: 'Computer Science', followers: ['demo-recruiter-001', 'profile-3'], following: ['demo-recruiter-001', 'profile-4'], posts: 8 },
  { id: 'demo-recruiter-001', name: 'Priya Sharma', email: 'recruiter@demo.com', role: 'recruiter', bio: 'HR Manager at TechCorp | Passionate about connecting talent with opportunities', company: 'TechCorp Solutions', followers: ['demo-student-001', 'profile-2', 'profile-5'], following: ['demo-student-001', 'profile-2'], posts: 15 },
  { id: 'demo-admin-001', name: 'Rahul Verma', email: 'admin@demo.com', role: 'admin', bio: 'Placement Coordinator | Helping students build their careers', followers: ['demo-student-001'], following: [], posts: 5 },
  { id: 'profile-2', name: 'Sneha Patel', email: 'sneha@student.edu', role: 'student', bio: 'Data Science enthusiast | ML researcher | Kaggle competitor', branch: 'Information Technology', followers: ['demo-student-001', 'demo-recruiter-001'], following: ['demo-recruiter-001', 'profile-4'], posts: 12 },
  { id: 'profile-3', name: 'Arjun Mehta', email: 'arjun@student.edu', role: 'student', bio: 'Mobile app developer | Flutter & React Native | Building the future', branch: 'Computer Science', followers: ['demo-student-001', 'profile-2'], following: ['demo-student-001'], posts: 6 },
  { id: 'profile-4', name: 'Ananya Singh', email: 'ananya@student.edu', role: 'student', bio: 'UI/UX Designer | Making interfaces that people love to use', branch: 'Computer Science', followers: ['profile-2', 'profile-3'], following: ['demo-student-001', 'demo-recruiter-001'], posts: 9 },
  { id: 'profile-5', name: 'Vikram Nair', email: 'vikram@techstartup.com', role: 'recruiter', bio: 'CTO & Co-founder at StartupNest | Looking for passionate builders', company: 'StartupNest', followers: ['demo-student-001', 'profile-2', 'profile-3'], following: ['demo-recruiter-001'], posts: 20 },
  { id: 'profile-6', name: 'Kavya Reddy', email: 'kavya@student.edu', role: 'student', bio: 'Backend developer | Python/Django | PostgreSQL | DevOps enthusiast', branch: 'Information Technology', followers: ['demo-student-001'], following: ['profile-5', 'demo-recruiter-001'], posts: 4 },
  { id: 'profile-7', name: 'Rohan Gupta', email: 'rohan@student.edu', role: 'student', bio: 'Competitive programmer | ACM ICPC | LeetCode 2000+', branch: 'Computer Science', followers: ['profile-3', 'profile-2'], following: ['demo-student-001', 'profile-3'], posts: 3 },
  { id: 'profile-8', name: 'Meera Krishnan', email: 'meera@ai-innovations.com', role: 'recruiter', bio: 'Talent Acquisition at AI Innovations | Looking for ML engineers', company: 'AI Innovations Ltd', followers: ['profile-2', 'profile-6'], following: ['demo-recruiter-001'], posts: 11 },
];

const INITIAL_POSTS: Post[] = [
  { id: 'post-1', authorId: 'demo-student-001', authorName: 'Alex Kumar', authorRole: 'student', content: '🚀 Just completed my full-stack placement portal project! Built with React, Node.js, and PostgreSQL. The project handles job postings, applications, and real-time messaging. Excited to showcase this to recruiters! Check it out on GitHub.\n\n#React #NodeJS #FullStack #WebDevelopment #OpenToWork', type: 'project', tags: ['react', 'nodejs', 'fullstack', 'webdevelopment'], likes: ['demo-recruiter-001', 'profile-2', 'profile-3'], comments: [{ id: 'c1', authorId: 'demo-recruiter-001', authorName: 'Priya Sharma', content: 'Impressive work Alex! This is exactly the kind of project we look for. Would love to discuss opportunities at TechCorp! 🎉', likes: ['demo-student-001'], createdAt: new Date('2024-12-10T11:00:00') }, { id: 'c2', authorId: 'profile-2', authorName: 'Sneha Patel', content: 'Amazing! Can you share the GitHub link? Would love to contribute!', likes: [], createdAt: new Date('2024-12-10T12:30:00') }], shares: ['profile-3'], bookmarks: ['demo-recruiter-001', 'profile-2'], createdAt: new Date('2024-12-10T09:00:00'), updatedAt: new Date('2024-12-10T09:00:00'), visibility: 'public' },
  { id: 'post-2', authorId: 'demo-recruiter-001', authorName: 'Priya Sharma', authorRole: 'recruiter', content: '📢 Exciting news! TechCorp Solutions is hiring Software Engineers for our Bangalore office!\n\n✅ Role: Software Engineer\n💰 Salary: ₹8-12 LPA\n📍 Location: Bangalore\n🎓 Eligibility: CSE/IT graduates with 7.0+ CGPA\n\nApply through CampusConnect or DM me directly. We have multiple openings!\n\n#Hiring #SoftwareEngineer #TechCorp #CampusPlacement #Bangalore', type: 'job', tags: ['hiring', 'softwareengineer', 'campusplacement', 'bangalore'], likes: ['demo-student-001', 'profile-2', 'profile-3', 'profile-6', 'profile-7'], comments: [{ id: 'c3', authorId: 'demo-student-001', authorName: 'Alex Kumar', content: 'Just applied! Really excited about this opportunity 🙌', likes: ['demo-recruiter-001'], createdAt: new Date('2024-12-09T15:30:00') }], shares: ['demo-student-001', 'profile-2', 'profile-3'], bookmarks: ['demo-student-001', 'profile-3', 'profile-6'], createdAt: new Date('2024-12-09T14:00:00'), updatedAt: new Date('2024-12-09T14:00:00'), visibility: 'public' },
  { id: 'post-3', authorId: 'profile-2', authorName: 'Sneha Patel', authorRole: 'student', content: '🎉 Thrilled to announce that I cleared the ML Engineer interview at AI Innovations Ltd! 4 rounds, 2 months of preparation, countless LeetCode problems... but it was all worth it!\n\nThank you to everyone who supported me through this journey. Dreams do come true! 🌟\n\n#Achievement #MLEngineer #Placement #GratefulHeart #NeverGiveUp', type: 'achievement', tags: ['achievement', 'placement', 'ml', 'mlengineer'], likes: ['demo-student-001', 'demo-recruiter-001', 'profile-3', 'profile-4', 'demo-admin-001'], comments: [{ id: 'c4', authorId: 'demo-student-001', authorName: 'Alex Kumar', content: 'Congratulations Sneha!! So well deserved! You\'re going to crush it there! 🎊', likes: ['profile-2'], createdAt: new Date('2024-12-08T10:00:00') }, { id: 'c5', authorId: 'profile-8', authorName: 'Meera Krishnan', content: 'Welcome to the AI Innovations family, Sneha! We\'re so excited to have you! 🤗', likes: ['profile-2', 'demo-student-001'], createdAt: new Date('2024-12-08T11:30:00') }], shares: ['profile-3', 'profile-4'], bookmarks: ['demo-student-001'], createdAt: new Date('2024-12-08T09:00:00'), updatedAt: new Date('2024-12-08T09:00:00'), visibility: 'public' },
  { id: 'post-4', authorId: 'profile-3', authorName: 'Arjun Mehta', authorRole: 'student', content: 'Real talk: How I went from 0 to landing a Flutter developer role in 8 months 🧵\n\n1. Started with Dart basics (2 weeks)\n2. Built 5 personal projects\n3. Contributed to open-source Flutter packages\n4. Networked on LinkedIn daily\n5. Applied to 30+ companies, got 8 interviews\n\nThe key? Consistency over intensity. You don\'t need to code 12 hours/day. Just code every day.\n\n#Flutter #MobileDev #CareerAdvice #PlacementTips', type: 'text', tags: ['flutter', 'mobiledev', 'careeradvice', 'placementtips'], likes: ['demo-student-001', 'profile-2', 'profile-4', 'profile-6', 'profile-7'], comments: [], shares: ['demo-student-001', 'profile-4'], bookmarks: ['demo-student-001', 'profile-4', 'profile-6', 'profile-7'], createdAt: new Date('2024-12-07T16:00:00'), updatedAt: new Date('2024-12-07T16:00:00'), visibility: 'public' },
  { id: 'post-5', authorId: 'profile-5', authorName: 'Vikram Nair', authorRole: 'recruiter', content: '🔥 StartupNest is looking for Backend Developer Interns!\n\n6-month paid internship | ₹20,000/month | Pune\n\nWhat you\'ll work on:\n• Scalable microservices architecture\n• Real payment integrations\n• Production code that millions will use\n\nWe don\'t care about your GPA. We care about your passion and what you\'ve built.\n\nDM me your GitHub profile!\n\n#Internship #BackendDev #StartupLife #Python #Django', type: 'job', tags: ['internship', 'backenddev', 'startuplife', 'python'], likes: ['demo-student-001', 'profile-2', 'profile-3', 'profile-6'], comments: [{ id: 'c6', authorId: 'profile-6', authorName: 'Kavya Reddy', content: 'This is exactly what I was looking for! Sending my GitHub right now 🚀', likes: ['profile-5'], createdAt: new Date('2024-12-06T18:00:00') }], shares: ['demo-student-001'], bookmarks: ['profile-3', 'profile-6', 'profile-7'], createdAt: new Date('2024-12-06T14:00:00'), updatedAt: new Date('2024-12-06T14:00:00'), visibility: 'public' },
];

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'conn-1', userId: 'demo-student-001', connectedUserId: 'demo-recruiter-001', status: 'accepted', createdAt: new Date('2024-11-15') },
  { id: 'conn-2', userId: 'profile-2', connectedUserId: 'demo-student-001', status: 'accepted', createdAt: new Date('2024-11-20') },
  { id: 'conn-3', userId: 'profile-5', connectedUserId: 'demo-student-001', status: 'pending', createdAt: new Date('2024-12-10') },
];

function loadSocial<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw).map((item: any) => {
      const r: any = { ...item };
      for (const k of Object.keys(r)) { if (typeof r[k] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r[k])) r[k] = new Date(r[k]); }
      if (r.comments) r.comments = r.comments.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }));
      return r;
    });
  } catch { return fallback; }
}

export const SocialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => loadSocial('cc_posts', INITIAL_POSTS));
  const [connections, setConnections] = useState<Connection[]>(() => loadSocial('cc_connections', INITIAL_CONNECTIONS));
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => loadSocial('cc_profiles', INITIAL_PROFILES));

  useEffect(() => { try { localStorage.setItem('cc_posts', JSON.stringify(posts)); } catch {} }, [posts]);
  useEffect(() => { try { localStorage.setItem('cc_connections', JSON.stringify(connections)); } catch {} }, [connections]);
  useEffect(() => { try { localStorage.setItem('cc_profiles', JSON.stringify(userProfiles)); } catch {} }, [userProfiles]);

  // Sync logged-in user's profile into userProfiles
  useEffect(() => {
    if (!user) return;
    setUserProfiles(prev => {
      const exists = prev.find(p => p.id === user.id);
      if (exists) return prev;
      return [...prev, { id: user.id, name: user.name, email: user.email, role: user.role, followers: [], following: [], posts: 0 }];
    });
  }, [user]);

  const createPost = (postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'comments' | 'shares' | 'bookmarks'>) => {
    const np: Post = { ...postData, id: `post-${Date.now()}`, likes: [], comments: [], shares: [], bookmarks: [], createdAt: new Date(), updatedAt: new Date() };
    setPosts(prev => [np, ...prev]);
    setUserProfiles(prev => prev.map(p => p.id === postData.authorId ? { ...p, posts: p.posts + 1 } : p));
  };

  const likePost = (postId: string) => {
    if (!user) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes.includes(user.id) ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id] } : p));
  };

  const commentOnPost = (postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'replies'>) => {
    const nc: Comment = { ...commentData, id: `c-${Date.now()}`, likes: [], createdAt: new Date() };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, nc] } : p));
  };

  const sharePost = (postId: string) => {
    if (!user) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares: p.shares.includes(user.id) ? p.shares.filter(id => id !== user.id) : [...p.shares, user.id] } : p));
  };

  const bookmarkPost = (postId: string) => {
    if (!user) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, bookmarks: p.bookmarks.includes(user.id) ? p.bookmarks.filter(id => id !== user.id) : [...p.bookmarks, user.id] } : p));
  };

  const sendConnectionRequest = (userId: string) => {
    if (!user) return;
    if (connections.find(c => (c.userId === user.id && c.connectedUserId === userId) || (c.userId === userId && c.connectedUserId === user.id))) return;
    setConnections(prev => [...prev, { id: `conn-${Date.now()}`, userId: user.id, connectedUserId: userId, status: 'pending', createdAt: new Date() }]);
  };

  const acceptConnectionRequest = (connectionId: string) => {
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, status: 'accepted' as const } : c));
  };

  const rejectConnectionRequest = (connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  const followUser = (userId: string) => {
    if (!user) return;
    setUserProfiles(prev => prev.map(p => {
      if (p.id === userId) return { ...p, followers: [...p.followers, user.id] };
      if (p.id === user.id) return { ...p, following: [...p.following, userId] };
      return p;
    }));
  };

  const unfollowUser = (userId: string) => {
    if (!user) return;
    setUserProfiles(prev => prev.map(p => {
      if (p.id === userId) return { ...p, followers: p.followers.filter(id => id !== user.id) };
      if (p.id === user.id) return { ...p, following: p.following.filter(id => id !== userId) };
      return p;
    }));
  };

  const getFeedPosts = () => posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const getUserPosts = (userId: string) => posts.filter(p => p.authorId === userId);
  const getConnections = (userId: string) => connections.filter(c => (c.userId === userId || c.connectedUserId === userId) && c.status === 'accepted');
  const getPendingRequests = () => { if (!user) return []; return connections.filter(c => c.connectedUserId === user.id && c.status === 'pending'); };

  return (
    <SocialContext.Provider value={{ posts, connections, userProfiles, createPost, likePost, commentOnPost, sharePost, bookmarkPost, sendConnectionRequest, acceptConnectionRequest, rejectConnectionRequest, followUser, unfollowUser, getFeedPosts, getUserPosts, getConnections, getPendingRequests }}>
      {children}
    </SocialContext.Provider>
  );
};
