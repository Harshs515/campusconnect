import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Bell, LogOut, User, Settings, Menu, Search, Mail, CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Navbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { notifications, markAsRead, removeNotification, clearAll } = useNotification();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotifOpen = () => {
    setNotifOpen(prev => !prev);
    setProfileOpen(false);
  };

  const typeIcon = (type: string) => {
    if (type === 'success') return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
    if (type === 'error')   return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    if (type === 'warning') return <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  };

  const timeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <nav className="h-24 flex items-center justify-between px-6 lg:px-8 flex-shrink-0 z-30 font-sans w-full bg-white border-b border-gray-100">
      {/* Left - Search Bar */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <button onClick={onMenuClick} className="lg:hidden p-2.5 rounded-2xl text-gray-500 bg-gray-50 hover:text-gray-900 transition-colors">
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex flex-1 items-center bg-gray-50 rounded-full px-5 py-3 border border-gray-100/50 focus-within:ring-2 focus-within:ring-green-600/20 focus-within:border-green-600/30 transition-all">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search task"
            className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-gray-700 placeholder:text-gray-400"
          />
          <div className="text-gray-500 text-[11px] font-bold bg-white px-2 py-1 rounded shadow-sm border border-gray-200 ml-2">⌘F</div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-3">
          {/* Mail */}
          <button className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
            <Mail className="w-5 h-5 text-gray-500" />
          </button>

          {/* Bell — connected to real notifications */}
          <div className="relative">
            <button
              onClick={handleNotifOpen}
              className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 z-20 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Bell className="h-8 w-8 text-gray-200 mb-2" />
                        <p className="text-sm font-medium text-gray-400">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                        >
                          <div className="mt-0.5">{typeIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm text-gray-900 ${!n.read ? 'font-bold' : 'font-semibold'}`}>{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.timestamp)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {!n.read && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="w-2 h-2 rounded-full bg-blue-500 hover:bg-blue-700 transition-colors"
                                title="Mark as read"
                              />
                            )}
                            <button
                              onClick={() => removeNotification(n.id)}
                              className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile */}
        <div className="relative border-l border-gray-100 pl-4 lg:pl-6">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-3 transition-opacity hover:opacity-80 text-left"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#14532d] text-white font-bold text-sm shadow-md">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col">
              <p className="text-[15px] font-extrabold text-gray-900 leading-tight tracking-tight">{user?.name}</p>
              <p className="text-[12px] font-medium text-gray-500 leading-tight mt-0.5">{user?.email}</p>
            </div>
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-4 w-64 bg-white rounded-[24px] p-2 z-20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100">
                <div className="px-4 py-4 mb-2 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl mx-1 mt-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-[#14532d] text-white font-bold text-xl mb-3 shadow-md">
                    {user?.avatar
                      ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      : user?.name?.charAt(0) || 'U'}
                  </div>
                  <p className="text-base font-extrabold text-gray-900 tracking-tight">{user?.name}</p>
                  <p className="text-[12px] font-semibold text-gray-500 mt-1 capitalize">{user?.role}</p>
                </div>
                {[
                  { to: '/profile', icon: User, label: 'My Profile' },
                  { to: '/settings', icon: Settings, label: 'Settings' },
                ].map(({ to, icon: Icon, label }) => (
                  <Link key={to} to={to} onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 mx-1 rounded-2xl text-[14px] font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                    <Icon className="h-4 w-4 text-gray-400" />{label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 mx-3 my-2" />
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3.5 mx-1 rounded-2xl text-[14px] font-bold w-[calc(100%-8px)] transition-colors hover:bg-red-50 text-red-600 mb-1">
                  <LogOut className="h-4 w-4 text-red-500" />Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;