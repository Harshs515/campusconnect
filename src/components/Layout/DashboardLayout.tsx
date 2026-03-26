import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { X } from 'lucide-react';

const FULL_HEIGHT_PAGES = ['/messages'];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <>{children}</>;

  const isFullHeight = FULL_HEIGHT_PAGES.includes(location.pathname);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans p-2 sm:p-4 lg:p-6 overflow-hidden">
      {/* The massive App Box */}
      <div className="flex w-full h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] max-w-[1600px] bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden border border-gray-200 relative">
        
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`absolute lg:static top-0 left-0 h-full z-50 lg:z-auto transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} bg-white flex-shrink-0 border-r border-gray-100 shadow-2xl lg:shadow-none w-64`}>
          <div className="h-full overflow-y-auto hide-scrollbar flex flex-col">
            {sidebarOpen && (
              <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <Sidebar />
          </div>
        </div>

        {/* Right side wrapper (Navbar + Main Content) */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-gray-50/50">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto hide-scrollbar">
            {isFullHeight ? (
              <div className="h-full w-full">{children}</div>
            ) : (
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full">{children}</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;