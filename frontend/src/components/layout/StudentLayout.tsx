import { ReactNode, useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BookMarked,
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
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StudentLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number | string;
}

// Main and secondary navigation groups for clearer organization
const mainNav: NavItem[] = [
  { icon: Home, label: 'Dashboard', path: '/student' },
  { icon: BookMarked, label: 'E-Book', path: '/student/ebooks' },
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
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const appName = import.meta.env.VITE_APP_NAME || 'IQARENA';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Close on route change
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location.pathname]);

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
                <p className="text-xs text-orange-500 -mt-0.5">{t('Student Portal')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* User Profile Pill & Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 bg-white rounded-full px-3 py-1.5 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-sm focus:outline-none"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <span className="text-sm font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-bold text-slate-800 tracking-tight">
                  {user?.name || 'PANDEESWARAN C'}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Name & Subtitle */}
                  <div className="px-3 pt-2 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {user?.name || 'PANDEESWARAN C'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">
                      {t('Student Portal')}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  {/* Profile */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/student/profile');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <User className="w-4 h-4 text-blue-500 group-hover:scale-105 transition-transform" />
                    <span>{t('Profile')}</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50/70 rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <LogOut className="w-4 h-4 text-red-500 group-hover:scale-105 transition-transform" />
                    <span>{t('Logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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
                  <span className="flex-1">{t(item.label)}</span>
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

              <div className="px-3 mt-1 text-xs text-white/80 font-semibold">{t('Profile')}</div> 

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
                  <span className="flex-1">{t(item.label)}</span>
                </Link>
              ))} 

              {/* Logout button placed in line under Profile / Help */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-left text-white/90 hover:bg-white hover:text-primary cursor-pointer"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{t('Logout')}</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Main Content (pb-20 on mobile so bottom bar does not overlap content) ── */}
        <main className="flex-1 min-w-0 p-4 pb-20 sm:p-6 sm:pb-6 lg:p-7 max-w-[1360px]">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar (Thumb-friendly & Accessible) ────────── */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around select-none"
      >
        {mainNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
                active
                  ? 'text-teal-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform',
                    active ? 'scale-110 text-teal-600 stroke-[2.25]' : 'stroke-[1.75]'
                  )}
                />
                {/* Badge if available or unread notifications */}
                {(() => {
                  const itemBadge = item.path === '/student/notifications' && unreadCount > 0 ? unreadCount : item.badge;
                  return itemBadge ? (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                      {itemBadge}
                    </span>
                  ) : null;
                })()}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none">
                {t(item.label)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
