import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SocialProvider } from './contexts/SocialContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Auth
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ForgotPassword from './components/Auth/ForgotPassword';

// Layout
import DashboardLayout from './components/Layout/DashboardLayout';

// Dashboards
import StudentDashboard from './components/Dashboard/StudentDashboard';
import RecruiterDashboard from './components/Dashboard/RecruiterDashboard';
import AdminDashboard from './components/Dashboard/AdminDashboard';

// Jobs
import JobSearch from './components/Jobs/JobSearch';
import JobPost from './components/Jobs/JobPost';
import MyJobs from './components/Jobs/MyJobs';
import Applications from './components/Jobs/Applications';

// Other features
import Messages from './components/Messages/Messages';
import Events from './components/Events/Events';
import Profile from './components/Profile/Profile';
import PublicProfile from './components/Profile/PublicProfile';
import Feed from './components/Social/Feed';
import Connections from './components/Social/Connections';

// Admin
import UserManagement from './components/Admin/UserManagement';
import Analytics from './components/Admin/Analytics';
import Alumni from './components/Admin/Alumni';
import AlumniList from './components/Alumni/AlumniList';

// Settings placeholder
const Settings: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-500 text-sm mb-6">Manage your account preferences</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Account</p>
              <p className="text-xs text-gray-500">{user?.email} • {user?.role}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">Email and in-app notification preferences</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Privacy</p>
              <p className="text-xs text-gray-500">Control who can see your profile</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">App Version</p>
              <p className="text-xs text-gray-500">CampusConnect v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner fullScreen size="lg" text="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner fullScreen size="lg" text="Loading CampusConnect..." />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        {/* Dashboard - role-based */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {user.role === 'student' ? <StudentDashboard /> : user.role === 'recruiter' ? <RecruiterDashboard /> : <AdminDashboard />}
          </ProtectedRoute>
        } />

        {/* Student routes */}
        <Route path="/jobs" element={<ProtectedRoute allowedRoles={['student']}><JobSearch /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute allowedRoles={['student']}><Applications /></ProtectedRoute>} />

        {/* Recruiter routes */}
        <Route path="/post-job" element={<ProtectedRoute allowedRoles={['recruiter']}><JobPost /></ProtectedRoute>} />
        <Route path="/my-jobs" element={<ProtectedRoute allowedRoles={['recruiter']}><MyJobs /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />
        <Route path="/alumni" element={<ProtectedRoute allowedRoles={['admin']}><Alumni /></ProtectedRoute>} />

        {/* Shared routes - all authenticated users */}
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
        <Route path="/alumni-list" element={<ProtectedRoute><AlumniList /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/system-settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          <SocialProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <AppRoutes />
              </div>
            </Router>
          </SocialProvider>
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;