export const APP_NAME = 'CampusConnect';
export const APP_VERSION = '1.0.0';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const STORAGE_KEYS = {
  USER: 'campusconnect_user',
  TOKEN: 'campusconnect_token',
  JOBS: 'cc_jobs',
  APPS: 'cc_apps',
  EVENTS: 'cc_events',
  CHATS: 'cc_chats',
  MESSAGES: 'cc_messages',
  ALUMNI: 'cc_alumni',
  POSTS: 'cc_posts',
  CONNECTIONS: 'cc_connections',
  PROFILES: 'cc_profiles',
} as const;

export const ROUTES = {
  LOGIN: '/login', SIGNUP: '/signup', FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard', PROFILE: '/profile', JOBS: '/jobs',
  APPLICATIONS: '/applications', EVENTS: '/events', MESSAGES: '/messages',
  FEED: '/feed', CONNECTIONS: '/connections', POST_JOB: '/post-job',
  MY_JOBS: '/my-jobs', USER_MANAGEMENT: '/user-management',
  ANALYTICS: '/analytics', ALUMNI: '/alumni', ALUMNI_LIST: '/alumni-list',
} as const;

export const USER_ROLES = { STUDENT: 'student', RECRUITER: 'recruiter', ADMIN: 'admin' } as const;

export const APPLICATION_STATUS = {
  APPLIED: 'applied', SHORTLISTED: 'shortlisted', REJECTED: 'rejected', HIRED: 'hired',
} as const;

export const JOB_STATUS = { ACTIVE: 'active', CLOSED: 'closed', PENDING: 'pending' } as const;

export const EVENT_TYPES = {
  PLACEMENT_DRIVE: 'Placement Drive', WORKSHOP: 'Workshop', SEMINAR: 'Seminar', INTERVIEW: 'Interview',
} as const;

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 50,
  MAX_BIO_LENGTH: 500,
} as const;
