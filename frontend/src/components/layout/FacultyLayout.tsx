import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FacultySidebar } from './FacultySidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { apiFetch } from '@/lib/api';

interface FacultyLayoutProps {
  children: ReactNode;
}

export function FacultyLayout({ children }: FacultyLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    apiFetch<{ success: boolean; notifications: any[] }>('/faculty/school/notifications')
      .then((res) => {
        if (res?.success && Array.isArray(res.notifications)) {
          setNotificationCount(res.notifications.length);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initialLetter = (user?.name?.charAt(0) || 'S').toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <FacultySidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SheetTitle className="sr-only">School Menu</SheetTitle>
          <FacultySidebar
            collapsed={false}
            hideCollapseButton={true}
            onItemClick={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div
        className={cn(
          'min-h-screen flex flex-col transition-all duration-300',
          collapsed ? 'md:ml-20' : 'md:ml-64'
        )}
      >
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-full items-center justify-between px-4 md:px-6">
            {/* Left: Mobile hamburger toggle & School Branding */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="flex flex-col">
                <span className="text-base font-bold text-foreground leading-tight truncate max-w-[220px] sm:max-w-md">
                  {user?.name || t('School Portal')}
                </span>
                {user?.userid && (
                  <span className="text-xs text-muted-foreground font-medium">
                    UDISE: {user.userid}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Language, Notifications & Profile with Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />

              {/* Notifications shortcut */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/faculty/notifications')}
                className="relative"
                title={t('Notifications')}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </Button>

              {/* Profile Dropdown (Houses Logout) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                      <span className="text-sm font-semibold text-primary-foreground">
                        {initialLetter}
                      </span>
                    </div>
                    <span className="hidden md:inline text-sm font-medium max-w-[140px] truncate">
                      {user?.name || t('School')}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none truncate">{user?.name || 'School'}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user?.email || (user?.userid ? `UDISE: ${user.userid}` : 'School Account')}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/faculty/profile')}
                    className="cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {t('Profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/faculty/notifications')}
                    className="cursor-pointer"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {t('Notifications')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('Logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default FacultyLayout;
