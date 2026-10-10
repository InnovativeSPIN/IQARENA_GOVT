import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, BarChart3, Bell, User, LogOut, ChevronDown, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

interface FacultyLayoutProps {
  children: React.ReactNode;
}

// Faculty only monitors their school's students and results; test creation lives in the admin portal
const navItems = [
  { path: '/faculty', icon: LayoutDashboard, label: 'Dashboard', short: 'Home', exact: true },
  { path: '/faculty/students', icon: Users, label: 'Students', short: 'Students' },
  { path: '/faculty/reports', icon: BarChart3, label: 'Test Reports', short: 'Reports' },
  { path: '/faculty/messages', icon: MessageSquare, label: 'Messages', short: 'Messages' },
  { path: '/faculty/notifications', icon: Bell, label: 'Notifications', short: 'Alerts' },
];

export default function FacultyLayout({ children }: FacultyLayoutProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const appName = import.meta.env.VITE_APP_NAME || 'IQARENA';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.name || 'FC').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isActive = (item: typeof navItems[number]) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-gradient-to-r from-[hsl(214,84%,42%)] to-[hsl(206,90%,52%)] text-white shadow-md">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <button type="button" className="flex items-center gap-2.5" onClick={() => navigate('/faculty')}>
            <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm">
              <img src="/iqlogo.png" alt="IQARENA logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left leading-tight">
              <p className="font-extrabold tracking-wide">{appName}</p>
              <p className="text-[11px] text-white/80">{t('School Portal')}</p>
            </div>
          </button>

          {/* Desktop links, like the reference site's top menu */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isActive(item) ? 'bg-white text-primary shadow-sm' : 'text-white/90 hover:bg-white/15'
                )}
              >
                {t(item.label)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="light" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 text-white hover:bg-white/15 hover:text-white">
                  <Avatar className="h-8 w-8 border-2 border-white/70">
                    <AvatarFallback className="bg-white text-primary text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-sm font-semibold">{user?.name}</p>
                    <p className="text-[11px] text-white/80">{t('School')}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate('/faculty/profile')}>
                  <User className="mr-2 h-4 w-4" /> {t('Profile')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> {t('Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="pt-16 pb-20 md:pb-8 min-h-screen">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-5">
          {navItems.map(item => {
            const active = isActive(item);
            return (
              <NavLink key={item.path} to={item.path} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                <span className={cn('p-1.5 rounded-full', active && 'bg-primary/10')}>
                  <item.icon className="h-5 w-5" />
                </span>
                {t(item.label)}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
