import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  PieChart, 
  Calendar, 
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Subscriptions', path: '/subscriptions', icon: Calendar },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#e8e8ed] flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-[#e8e8ed] flex items-center gap-2">
        <div className="bg-black text-white p-2 rounded-xl">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-xl font-bold tracking-tight">ClearPaisa</span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-black text-white' 
                  : 'text-apple-gray-300 hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#e8e8ed] space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'User Profile'}</p>
            <p className="text-xs text-apple-gray-300 truncate">{user?.email || ''}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
