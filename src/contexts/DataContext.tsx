import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface Job {
  id: string; title: string; company: string; description: string; requirements: string[];
  location: string; salary: string; type: 'Full-time' | 'Part-time' | 'Internship';
  department: string; eligibility: { minCGPA: number; branches: string[] };
  deadline: Date; recruiterId: string; recruiterName: string; postedAt: Date;
  status: 'active' | 'closed' | 'pending'; applicants: number; skills: string[];
}
export interface Application {
  id: string; jobId: string; studentId: string; studentName: string; studentEmail: string;
  resume: string; coverLetter: string; status: 'applied' | 'shortlisted' | 'rejected' | 'hired'; appliedAt: Date;
}
export interface Event {
  id: string; title: string; description: string; date: Date; time: string; location: string;
  type: 'Placement Drive' | 'Workshop' | 'Seminar' | 'Interview'; organizer: string;
  maxAttendees?: number; rsvps: string[]; createdAt: Date;
}
export interface Message {
  id: string; senderId: string; senderName: string; receiverId: string; content: string; timestamp: Date; read: boolean;
}
export interface Chat {
  id: string; participants: string[]; participantNames: string[]; lastMessage: string; lastMessageTime: Date; unreadCount: number;
}

interface DataContextType {
  jobs: Job[]; applications: Application[]; events: Event[]; chats: Chat[]; messages: Message[];
  addJob: (job: Omit<Job, 'id' | 'postedAt' | 'applicants'>) => void;
  applyToJob: (jobId: string, application: Omit<Application, 'id' | 'appliedAt'>) => void;
  updateApplicationStatus: (applicationId: string, status: Application['status']) => void;
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'rsvps'>) => void;
  rsvpToEvent: (eventId: string, userId: string) => void;
  sendMessage: (senderId: string, senderName: string, receiverId: string, receiverName: string, content: string) => void;
  startChat: (otherUserId: string, otherUserName: string) => string;
  getJobApplications: (jobId: string) => Application[];
  getUserApplications: (userId: string) => Application[];
  getChatMessages: (chatId: string) => Message[];
  markMessagesAsRead: (chatId: string, userId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
export const useData = () => { const c = useContext(DataContext); if (!c) throw new Error('useData must be within DataProvider'); return c; };

const MOCK_JOBS: Job[] = [
  { id: 'job-1', title: 'Software Engineer', company: 'TechCorp Solutions', description: 'We are looking for a passionate Software Engineer to join our growing team. You will work on cutting-edge projects using modern technologies.', requirements: ["Bachelor's in CS or related field", '2+ years experience', 'Strong problem-solving skills'], location: 'Bangalore, India', salary: '₹8-12 LPA', type: 'Full-time', department: 'Engineering', eligibility: { minCGPA: 7.0, branches: ['CSE', 'IT', 'ECE'] }, deadline: new Date('2025-03-30'), recruiterId: 'demo-recruiter-001', recruiterName: 'Priya Sharma', postedAt: new Date('2024-12-01'), status: 'active', applicants: 45, skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'] },
  { id: 'job-2', title: 'Data Analyst', company: 'DataFlow Analytics', description: 'Join our data team to analyze complex datasets and provide actionable insights to drive business decisions.', requirements: ['Strong analytical skills', 'Proficiency in SQL and Python', 'Experience with data visualization'], location: 'Mumbai, India', salary: '₹6-10 LPA', type: 'Full-time', department: 'Data Science', eligibility: { minCGPA: 7.5, branches: ['CSE', 'IT', 'Mathematics'] }, deadline: new Date('2025-02-28'), recruiterId: 'demo-recruiter-001', recruiterName: 'Priya Sharma', postedAt: new Date('2024-12-05'), status: 'active', applicants: 32, skills: ['Python', 'SQL', 'Tableau', 'Excel'] },
  { id: 'job-3', title: 'UI/UX Designer', company: 'Creative Digital Studio', description: 'Design intuitive and beautiful user interfaces for web and mobile applications. Collaborate with product and engineering teams.', requirements: ['Portfolio of design work', 'Proficiency in Figma', 'Understanding of design principles'], location: 'Hyderabad, India', salary: '₹5-8 LPA', type: 'Full-time', department: 'Design', eligibility: { minCGPA: 6.5, branches: ['CSE', 'IT', 'Design'] }, deadline: new Date('2025-03-15'), recruiterId: 'demo-recruiter-001', recruiterName: 'Priya Sharma', postedAt: new Date('2024-12-08'), status: 'active', applicants: 28, skills: ['Figma', 'Adobe XD', 'Sketch', 'CSS'] },
  { id: 'job-4', title: 'Backend Developer Intern', company: 'StartupNest', description: '6-month internship working on scalable backend systems. Great opportunity to learn and grow with a fast-paced startup.', requirements: ['Knowledge of any backend language', 'Understanding of REST APIs', 'Eagerness to learn'], location: 'Pune, India', salary: '₹15,000-25,000/month', type: 'Internship', department: 'Engineering', eligibility: { minCGPA: 6.0, branches: ['CSE', 'IT', 'ECE', 'EEE'] }, deadline: new Date('2025-02-15'), recruiterId: 'demo-recruiter-001', recruiterName: 'Priya Sharma', postedAt: new Date('2024-12-10'), status: 'active', applicants: 67, skills: ['Python', 'Django', 'PostgreSQL', 'Docker'] },
  { id: 'job-5', title: 'Machine Learning Engineer', company: 'AI Innovations Ltd', description: 'Work on cutting-edge ML models and deploy them to production. You will be part of a world-class AI research team.', requirements: ['Strong Python skills', 'Knowledge of ML frameworks', 'Mathematics background'], location: 'Bangalore, India', salary: '₹12-18 LPA', type: 'Full-time', department: 'AI/ML', eligibility: { minCGPA: 8.0, branches: ['CSE', 'IT'] }, deadline: new Date('2025-04-01'), recruiterId: 'demo-recruiter-001', recruiterName: 'Priya Sharma', postedAt: new Date('2024-12-12'), status: 'active', applicants: 19, skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn'] },
];

const MOCK_EVENTS: Event[] = [
  { id: 'event-1', title: 'Google Campus Placement Drive', description: 'Google is visiting our campus for placement. Students from CSE, IT branches are eligible. Bring your resume and be ready for technical interviews.', date: new Date('2025-01-20'), time: '10:00 AM', location: 'Main Auditorium', type: 'Placement Drive', organizer: 'Placement Cell', maxAttendees: 200, rsvps: ['demo-student-001'], createdAt: new Date('2024-12-01') },
  { id: 'event-2', title: 'Resume Building Workshop', description: 'Learn how to craft a perfect resume that stands out to recruiters. Industry experts will share tips and review resumes.', date: new Date('2025-01-15'), time: '2:00 PM', location: 'Seminar Hall B', type: 'Workshop', organizer: 'Career Services', maxAttendees: 100, rsvps: [], createdAt: new Date('2024-12-05') },
  { id: 'event-3', title: 'Microsoft Technical Interview Prep', description: 'Mock interview sessions and preparation for Microsoft recruitment. Cover DSA, system design, and behavioral questions.', date: new Date('2025-01-25'), time: '11:00 AM', location: 'Lab Complex 2', type: 'Interview', organizer: 'Training & Placement', maxAttendees: 50, rsvps: ['demo-student-001'], createdAt: new Date('2024-12-08') },
  { id: 'event-4', title: 'AI & ML Industry Seminar', description: 'Industry leaders from top tech companies discuss the future of AI and career opportunities in the field.', date: new Date('2025-02-05'), time: '3:00 PM', location: 'Conference Hall', type: 'Seminar', organizer: 'CS Department', maxAttendees: 300, rsvps: [], createdAt: new Date('2024-12-10') },
  { id: 'event-5', title: 'Amazon Web Services Workshop', description: 'Hands-on workshop on cloud computing with AWS. Learn EC2, S3, Lambda and get AWS certified.', date: new Date('2025-02-12'), time: '9:00 AM', location: 'Computer Lab 1', type: 'Workshop', organizer: 'AWS Campus Club', maxAttendees: 60, rsvps: [], createdAt: new Date('2024-12-12') },
];

const MOCK_APPLICATIONS: Application[] = [
  { id: 'app-1', jobId: 'job-1', studentId: 'demo-student-001', studentName: 'Alex Kumar', studentEmail: 'student@demo.com', resume: 'resume.pdf', coverLetter: 'I am passionate about software development and would love to join TechCorp.', status: 'shortlisted', appliedAt: new Date('2024-12-05') },
  { id: 'app-2', jobId: 'job-3', studentId: 'demo-student-001', studentName: 'Alex Kumar', studentEmail: 'student@demo.com', resume: 'resume.pdf', coverLetter: 'UI/UX design is my passion and I have worked on several projects.', status: 'applied', appliedAt: new Date('2024-12-10') },
];

const MOCK_CHATS: Chat[] = [
  { id: 'demo-student-001_demo-recruiter-001', participants: ['demo-student-001', 'demo-recruiter-001'], participantNames: ['Alex Kumar', 'Priya Sharma'], lastMessage: 'Thanks for your application! We\'d like to schedule an interview.', lastMessageTime: new Date('2024-12-10T10:30:00'), unreadCount: 1 },
  { id: 'demo-admin-001_demo-student-001', participants: ['demo-admin-001', 'demo-student-001'], participantNames: ['Rahul Verma', 'Alex Kumar'], lastMessage: 'Please complete your profile for better job recommendations.', lastMessageTime: new Date('2024-12-09T15:00:00'), unreadCount: 0 },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'msg-1', senderId: 'demo-recruiter-001', senderName: 'Priya Sharma', receiverId: 'demo-student-001', content: 'Hi Alex! We reviewed your application for the Software Engineer position.', timestamp: new Date('2024-12-10T10:00:00'), read: true },
  { id: 'msg-2', senderId: 'demo-recruiter-001', senderName: 'Priya Sharma', receiverId: 'demo-student-001', content: 'Thanks for your application! We\'d like to schedule an interview.', timestamp: new Date('2024-12-10T10:30:00'), read: false },
  { id: 'msg-3', senderId: 'demo-admin-001', senderName: 'Rahul Verma', receiverId: 'demo-student-001', content: 'Please complete your profile for better job recommendations.', timestamp: new Date('2024-12-09T15:00:00'), read: true },
];

const LS_KEYS = { jobs: 'cc_jobs', apps: 'cc_apps', events: 'cc_events', chats: 'cc_chats', messages: 'cc_messages' };

function loadFromLS<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Revive Date objects
    return parsed.map((item: any) => {
      const revived: any = { ...item };
      for (const k of Object.keys(revived)) {
        if (typeof revived[k] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(revived[k])) revived[k] = new Date(revived[k]);
        if (revived[k] && typeof revived[k] === 'object' && !Array.isArray(revived[k]) && !(revived[k] instanceof Date)) {
          for (const k2 of Object.keys(revived[k])) {
            if (typeof revived[k][k2] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(revived[k][k2])) revived[k][k2] = new Date(revived[k][k2]);
          }
        }
      }
      return revived;
    });
  } catch { return fallback; }
}

function saveToLS(key: string, data: any[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>(() => loadFromLS(LS_KEYS.jobs, MOCK_JOBS));
  const [applications, setApplications] = useState<Application[]>(() => loadFromLS(LS_KEYS.apps, MOCK_APPLICATIONS));
  const [events, setEvents] = useState<Event[]>(() => loadFromLS(LS_KEYS.events, MOCK_EVENTS));
  const [chats, setChats] = useState<Chat[]>(() => loadFromLS(LS_KEYS.chats, MOCK_CHATS));
  const [messages, setMessages] = useState<Message[]>(() => loadFromLS(LS_KEYS.messages, MOCK_MESSAGES));

  // Persist to localStorage whenever state changes
  useEffect(() => { saveToLS(LS_KEYS.jobs, jobs); }, [jobs]);
  useEffect(() => { saveToLS(LS_KEYS.apps, applications); }, [applications]);
  useEffect(() => { saveToLS(LS_KEYS.events, events); }, [events]);
  useEffect(() => { saveToLS(LS_KEYS.chats, chats); }, [chats]);
  useEffect(() => { saveToLS(LS_KEYS.messages, messages); }, [messages]);

  const addJob = (jobData: Omit<Job, 'id' | 'postedAt' | 'applicants'>) => {
    const newJob: Job = { ...jobData, id: `job-${Date.now()}`, postedAt: new Date(), applicants: 0 };
    setJobs(prev => [newJob, ...prev]);
  };

  const applyToJob = (jobId: string, applicationData: Omit<Application, 'id' | 'appliedAt'>) => {
    if (applications.find(a => a.jobId === jobId && a.studentId === applicationData.studentId)) return;
    const newApp: Application = { ...applicationData, id: `app-${Date.now()}`, appliedAt: new Date() };
    setApplications(prev => [...prev, newApp]);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applicants: j.applicants + 1 } : j));
  };

  const updateApplicationStatus = (applicationId: string, status: Application['status']) => {
    setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a));
  };

  const addEvent = (eventData: Omit<Event, 'id' | 'createdAt' | 'rsvps'>) => {
    const newEvent: Event = { ...eventData, id: `event-${Date.now()}`, createdAt: new Date(), rsvps: [] };
    setEvents(prev => [newEvent, ...prev]);
  };

  const rsvpToEvent = (eventId: string, userId: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const isRsvped = e.rsvps.includes(userId);
      return { ...e, rsvps: isRsvped ? e.rsvps.filter(id => id !== userId) : [...e.rsvps, userId] };
    }));
  };

  const startChat = (otherUserId: string, otherUserName: string): string => {
    if (!user) return '';
    const ids = [user.id, otherUserId].sort();
    const chatId = ids.join('_');
    const existing = chats.find(c => c.id === chatId);
    if (!existing) {
      const newChat: Chat = { id: chatId, participants: [user.id, otherUserId], participantNames: [user.name, otherUserName], lastMessage: '', lastMessageTime: new Date(), unreadCount: 0 };
      setChats(prev => [newChat, ...prev]);
    }
    return chatId;
  };

  const sendMessage = (senderId: string, senderName: string, receiverId: string, receiverName: string, content: string) => {
    const newMsg: Message = { id: `msg-${Date.now()}`, senderId, senderName, receiverId, content, timestamp: new Date(), read: false };
    setMessages(prev => [...prev, newMsg]);

    const ids = [senderId, receiverId].sort();
    const chatId = ids.join('_');
    setChats(prev => {
      const existing = prev.find(c => c.id === chatId);
      if (existing) {
        return prev.map(c => c.id === chatId ? { ...c, lastMessage: content, lastMessageTime: new Date(), unreadCount: c.participants[1] === senderId ? c.unreadCount + 1 : c.unreadCount } : c);
      }
      return [{ id: chatId, participants: [senderId, receiverId], participantNames: [senderName, receiverName], lastMessage: content, lastMessageTime: new Date(), unreadCount: 1 }, ...prev];
    });
  };

  const getChatMessages = (chatId: string) => {
    const [user1, user2] = chatId.split('_');
    return messages.filter(m => (m.senderId === user1 && m.receiverId === user2) || (m.senderId === user2 && m.receiverId === user1))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const markMessagesAsRead = (chatId: string, userId: string) => {
    const [user1, user2] = chatId.split('_');
    setMessages(prev => prev.map(m => {
      if (((m.senderId === user1 && m.receiverId === user2) || (m.senderId === user2 && m.receiverId === user1)) && m.receiverId === userId)
        return { ...m, read: true };
      return m;
    }));
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
  };

  const getJobApplications = (jobId: string) => applications.filter(a => a.jobId === jobId);
  const getUserApplications = (userId: string) => applications.filter(a => a.studentId === userId);

  return (
    <DataContext.Provider value={{ jobs, applications, events, chats, messages, addJob, applyToJob, updateApplicationStatus, addEvent, rsvpToEvent, sendMessage, startChat, getJobApplications, getUserApplications, getChatMessages, markMessagesAsRead }}>
      {children}
    </DataContext.Provider>
  );
};
