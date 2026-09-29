import { ReactNode, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  BarChart3, 
  User, 
  Bell, 
  HelpCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StudentLayoutProps {
  children: ReactNode;
}

// Main and secondary navigation groups for clearer organization
const mainNav = [
  { icon: Home, label: 'Dashboard', path: '/student' },
  { icon: FileText, label: 'Tests', path: '/student/tests' },
  { icon: BarChart3, label: 'Results', path: '/student/results' },
  { icon: Bell, label: 'Notifications', path: '/student/notifications' },
];

const secondaryNav = [
  { icon: User, label: 'Profile', path: '/student/profile' },
  { icon: HelpCircle, label: 'Help', path: '/student/help' },
];

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const appName = import.meta.env.VITE_APP_NAME || 'IQARENA';

  // Unread notification count for the sidebar badge (refreshed on navigation, e.g. after reading them)
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    apiFetch<{ success: boolean; notifications: Array<{ isRead: boolean }> }>('/student/notifications')
      .then(res => { if (res?.success) setUnreadCount(res.notifications.filter(n => !n.isRead).length); })
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => {
    if (path === '/student') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen ">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white ring-2 ring-primary/20 overflow-hidden flex items-center justify-center shadow-md">
                <img src="/iqlogo.png" alt="IQARENA logo" className="h-full w-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  {appName}
                </h1>
                <p className="text-xs text-orange-500 -mt-0.5">Student Portal</p>
              </div>
            </div>
          </div>

           
            <Link to="/student/profile">
              <div className="flex items-center gap-3 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md">
                  <span className="text-sm font-bold text-white">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-semibold text-gray-700">{user?.name}</span>
              </div>
            </Link>
          </div>
        
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="lg:flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] h-[calc(100dvh-4rem)] w-72 bg-sidebar text-white border-r border-sidebar-border shadow-lg transform transition-transform duration-300 lg:static lg:shadow-none lg:sticky lg:top-16",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="h-full flex flex-col overflow-hidden">
            <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
              {mainNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                    isActive(item.path)
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"
                      : "text-white/90 hover:bg-white hover:text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.path === '/student/notifications' && unreadCount > 0 && (
                    <Badge 
                      variant={isActive(item.path) ? "secondary" : "destructive"} 
                      className={cn(
                        "h-5 px-2 rounded-full text-xs font-semibold",
                        isActive(item.path) && "bg-white text-orange-600"
                      )}
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              ))}

              <hr className="my-2 border-white/20" />

              <div className="px-3 mt-1 text-xs text-white/80 font-semibold">Account</div> 

              {secondaryNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                    isActive(item.path)
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"
                      : "text-white/90 hover:bg-white hover:text-primary"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              ))} 
            </nav>
            
            <div className="flex-shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-sidebar-border bg-sidebar">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white/90 hover:text-orange-700 hover:bg-white hover:bg-opacity-10 font-medium"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
