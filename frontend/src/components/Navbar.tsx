import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Sparkles, X } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Derive page title
  const getPageTitle = () => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/transactions': return 'Transactions';
      case '/budgets': return 'Budgets';
      case '/subscriptions': return 'Subscriptions';
      case '/settings': return 'Settings';
      default: return 'ClearPaisa';
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-[#e8e8ed] flex items-center justify-between px-8 sticky top-0 z-40 shrink-0">
      <h1 className="text-xl font-bold tracking-tight">{getPageTitle()}</h1>

      <div className="flex items-center gap-4 relative">
        {/* Notification Bell */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 text-apple-gray-300 hover:text-black rounded-full hover:bg-[#f5f5f7] transition-all relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-12 w-80 bg-white border border-[#e8e8ed] rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b border-[#e8e8ed] flex items-center justify-between">
              <span className="font-bold text-sm">Notifications</span>
              <button 
                onClick={() => setShowDropdown(false)}
                className="p-1 hover:bg-[#f5f5f7] rounded-full"
              >
                <X className="w-4 h-4 text-apple-gray-300" />
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto divide-y divide-[#e8e8ed]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-apple-gray-300">No alerts found.</div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`p-4 transition-all ${n.isRead ? 'opacity-60' : 'bg-emerald-50/40'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-semibold">{n.title}</p>
                      {!n.isRead && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="text-[10px] text-emerald-600 hover:underline shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-apple-gray-300 mt-1">{n.message}</p>
                    <p className="text-[9px] text-apple-gray-300 mt-2">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
