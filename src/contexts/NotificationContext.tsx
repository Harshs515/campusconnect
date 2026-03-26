import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export interface Notification {
  id: string; title: string; message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date; read: boolean; duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export const useNotification = () => { const c = useContext(NotificationContext); if (!c) throw new Error('useNotification must be within NotificationProvider'); return c; };

const Toast: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ notification, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (notification.duration) {
      const t = setTimeout(() => { setExiting(true); setTimeout(() => onRemove(notification.id), 300); }, notification.duration);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => { setExiting(true); setTimeout(() => onRemove(notification.id), 300); };

  const icons = { success: <CheckCircle className="h-5 w-5 text-green-600" />, error: <XCircle className="h-5 w-5 text-red-600" />, warning: <AlertCircle className="h-5 w-5 text-yellow-600" />, info: <Info className="h-5 w-5 text-blue-600" /> };
  const colors = { success: 'bg-green-50 border-green-200', error: 'bg-red-50 border-red-200', warning: 'bg-yellow-50 border-yellow-200', info: 'bg-blue-50 border-blue-200' };

  return (
    <div className={`transform transition-all duration-300 ease-in-out mb-3 ${visible && !exiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={`max-w-sm w-full shadow-lg rounded-xl pointer-events-auto border ${colors[notification.type]}`}>
        <div className="p-4 flex items-start">
          <div className="flex-shrink-0 mt-0.5">{icons[notification.type]}</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
            <p className="mt-0.5 text-sm text-gray-600">{notification.message}</p>
          </div>
          <button onClick={handleClose} className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const n: Notification = { ...data, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: new Date(), read: false, duration: data.duration || 5000 };
    setNotifications(prev => [n, ...prev.slice(0, 4)]);
  };

  const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearAll = () => setNotifications([]);

  const toasts = notifications.filter(n => !n.read);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, removeNotification, clearAll }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] pointer-events-none" style={{ maxWidth: '380px', width: '100%' }}>
          <div className="pointer-events-auto">
            {toasts.slice(0, 4).map(n => <Toast key={n.id} notification={n} onRemove={removeNotification} />)}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
