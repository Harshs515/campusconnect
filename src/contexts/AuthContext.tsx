import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'student' | 'recruiter' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileComplete: boolean;
  avatar?: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User> & Record<string, any>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const DEMO_USERS: Record<string, User & { password: string }> = {
  'student@demo.com': { id: 'demo-student-001', email: 'student@demo.com', name: 'Alex Kumar', role: 'student', profileComplete: true, createdAt: new Date('2024-01-15'), password: 'password' },
  'recruiter@demo.com': { id: 'demo-recruiter-001', email: 'recruiter@demo.com', name: 'Priya Sharma', role: 'recruiter', profileComplete: true, createdAt: new Date('2024-02-20'), password: 'password' },
  'admin@demo.com': { id: 'demo-admin-001', email: 'admin@demo.com', name: 'Rahul Verma', role: 'admin', profileComplete: true, createdAt: new Date('2024-01-01'), password: 'password' },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function tryApi(endpoint: string, body: object): Promise<User | null> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.user) return null;
    localStorage.setItem('campusconnect_token', data.token || 'api-token');
    return { id: data.user.id, email: data.user.email, name: data.user.name, role: data.user.role, profileComplete: data.user.profile_complete ?? false, avatar: data.user.avatar, createdAt: new Date(data.user.created_at) };
  } catch { return null; }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('campusconnect_user');
      if (stored) { const p = JSON.parse(stored); p.createdAt = new Date(p.createdAt); setUser(p); }
    } catch { localStorage.removeItem('campusconnect_user'); } finally { setIsLoading(false); }
  }, []);

  const persist = (u: User) => { setUser(u); localStorage.setItem('campusconnect_user', JSON.stringify(u)); };

  const login = async (email: string, password: string) => {
    setIsLoading(true); setError(null);
    try {
      const apiUser = await tryApi('/auth/login', { email, password });
      if (apiUser) {
        persist(apiUser);
        // Fetch fresh profile to get latest avatar
        try {
          const token = localStorage.getItem('campusconnect_token');
          const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
          const res = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const fresh = await res.json();
            persist({
              ...apiUser,
              avatar: fresh.avatar || apiUser.avatar,
              name: fresh.name || apiUser.name,
            });
          }
        } catch {}
        return;
      }
      const demo = DEMO_USERS[email.toLowerCase()];
      if (demo && demo.password === password) { const { password: _, ...u } = demo; localStorage.setItem('campusconnect_token', 'demo'); persist(u); return; }
      const reg = JSON.parse(localStorage.getItem('cc_users') || '[]') as any[];
      const found = reg.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (found && found.password === password) { const { password: _, ...u } = found; u.createdAt = new Date(u.createdAt); localStorage.setItem('campusconnect_token', 'local'); persist(u); return; }
      throw new Error('Invalid email or password');
    } catch (e: any) { setError(e.message); throw e; } finally { setIsLoading(false); }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true); setError(null);
    try {
      const apiUser = await tryApi('/auth/signup', { email, password, name, role });
      if (apiUser) { persist(apiUser); return; }
      const reg = JSON.parse(localStorage.getItem('cc_users') || '[]') as any[];
      if (reg.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('User already exists');
      const newUser: User = { id: `local-${Date.now()}`, email, name, role, profileComplete: false, createdAt: new Date() };
      reg.push({ ...newUser, password });
      localStorage.setItem('cc_users', JSON.stringify(reg));
      localStorage.setItem('campusconnect_token', 'local');
      persist(newUser);
    } catch (e: any) { setError(e.message); throw e; } finally { setIsLoading(false); }
  };

  const logout = async () => {
    setUser(null); localStorage.removeItem('campusconnect_user'); localStorage.removeItem('campusconnect_token');
  };

  const updateProfile = async (data: Partial<User> & Record<string, any>) => {
    if (!user) throw new Error('Not logged in');
    persist({ ...user, ...data });
  };

  return <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, isLoading, error }}>{children}</AuthContext.Provider>;
};