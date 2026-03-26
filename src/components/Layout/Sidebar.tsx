import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Briefcase, Calendar, MessageSquare, User, Users,
  Settings, BarChart3, FileText, Award, Heart,
  UserPlus, GraduationCap, Shield, LogOut
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout?.();
  };

  const baseItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Social Feed', icon: Heart, path: '/feed' },
    { name: 'Connections', icon: UserPlus, path: '/connections' },
    { name: 'Messages', icon: MessageSquare, path: '/messages' },
    { name: 'Events', icon: Calendar, path: '/events' },
  ];

  const studentItems = [
    { name: 'Browse Jobs', icon: Briefcase, path: '/jobs' },
    { name: 'My Applications', icon: FileText, path: '/applications' },
    { name: 'Alumni Network', icon: Award, path: '/alumni-list' },
  ];

  const recruiterItems = [
    { name: 'Post a Job', icon: Briefcase, path: '/post-job' },
    { name: 'My Jobs', icon: FileText, path: '/my-jobs' },
    { name: 'Browse Alumni', icon: Award, path: '/alumni-list' },
  ];

  const adminItems = [
    { name: 'User Management', icon: Users, path: '/user-management' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics' },
    { name: 'Alumni Management', icon: GraduationCap, path: '/alumni' },
    { name: 'System Settings', icon: Settings, path: '/system-settings' },
  ];

  const roleItems = user?.role === 'student' ? studentItems : user?.role === 'recruiter' ? recruiterItems : adminItems;
  const allItems = [...baseItems, ...roleItems];

  return (
    <aside className="w-64 h-full bg-white flex flex-col pt-8 pb-6 px-4">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#166534] text-[#166534]">
          <GraduationCap className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">
          CampusConnect
        </span>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">
        <nav className="space-y-8 flex-1">
          {/* MENU section */}
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Menu</p>
            <ul className="space-y-1">
              {allItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all ${
                        isActive ? 'text-gray-900 font-bold bg-gray-50' : 'text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-colors ${
                          isActive ? 'bg-[#14532d] text-white shadow-md shadow-green-900/20' : 'text-gray-400 group-hover:text-gray-600'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[15px]">{item.name}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* GENERAL section */}
          <div>
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">General</p>
            <ul className="space-y-1">
              <li>
                <Link to="/profile" className="w-full group flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-gray-900 font-medium rounded-2xl hover:bg-gray-50/50 transition-all">
                  <div className="p-2 rounded-xl text-gray-400 group-hover:text-gray-600">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[15px]">Profile</span>
                </Link>
              </li>
              <li>
                <button 
                  onClick={handleLogout}
                  className="w-full group flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-red-600 font-medium rounded-2xl hover:bg-red-50/50 transition-all"
                >
                   <div className="p-2 rounded-xl text-gray-400 group-hover:text-red-500">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="text-[15px]">Logout</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>


      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </aside>
  );
};

export default Sidebar;