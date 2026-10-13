import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export interface FacultySidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
  hideCollapseButton?: boolean;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty', exact: true },
  { icon: Users, label: 'Students', path: '/faculty/students', exact: false },
  { icon: BarChart3, label: 'Reports', path: '/faculty/reports', exact: false },
  { icon: TrendingUp, label: 'Performance', path: '/faculty/performance', exact: false },
  { icon: MessageSquare, label: 'Messages', path: '/faculty/messages', exact: false },
  { icon: Bell, label: 'Notifications', path: '/faculty/notifications', exact: false },
  { icon: User, label: 'Profile', path: '/faculty/profile', exact: false },
];

export function FacultySidebar({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  onItemClick,
  hideCollapseButton = false,
}: FacultySidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const appName = import.meta.env.VITE_APP_NAME || 'IQARENA';

  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleLogout = () => {
    onItemClick?.();
    logout();
    navigate('/login', { replace: true });
  };

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen h-[100dvh] transition-all duration-300 flex flex-col',
        'bg-sidebar border-r border-sidebar-border',
        collapsed ? 'w-20' : 'w-64'
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white shrink-0">
              <img src="/iqlogo.jpeg" alt="IQARENA" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-sidebar-foreground truncate leading-tight">
                {appName}
              </span>
              <span className="text-[10px] text-sidebar-foreground/70 font-medium tracking-wider uppercase">
                {t('School Portal')}
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto overflow-hidden bg-white">
            <img src="/iqlogo.jpeg" alt="IQARENA" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 scrollbar-hide">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const label = t(item.label);
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  onClick={onItemClick}
                  className={cn(
                    'sidebar-link',
                    isActive && 'active',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary-foreground')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            );
          })}

          {/* Logout Button directly below Profile */}
          <li className="pt-2 mt-2 border-t border-sidebar-border/50">
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'sidebar-link w-full text-left text-destructive/90 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? t('Logout') : undefined}
            >
              <LogOut className="w-5 h-5 shrink-0 text-destructive" />
              {!collapsed && <span className="truncate font-semibold">{t('Logout')}</span>}
            </button>
          </li>
        </ul>
      </nav>

      {/* Collapse Button */}
      {!hideCollapseButton && (
        <button
          onClick={handleToggle}
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-110 transition-transform"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}
    </aside>
  );
}

export default FacultySidebar;
