import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  UserCheck,
  HelpCircle,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Layers,
  Building,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: Building, label: 'School Management', path: '/admin/schools' },
  { icon: BookOpen, label: 'Exam Management', path: '/admin/exams' },
  { icon: Layers, label: 'Subject Management', path: '/admin/subjects' },
  { icon: FileText, label: 'Topic Management', path: '/admin/topics' },
  { icon: HelpCircle, label: 'Question Bank', path: '/admin/questions' },
  { icon: ClipboardList, label: 'Test Management', path: '/admin/tests' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
  { icon: MessageSquare, label: 'Messages', path: '/admin/messages' },
  { icon: Bell, label: 'Notification Logs', path: '/admin/notifications' },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const appName = import.meta.env.VITE_APP_NAME || 'IQARENA';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={cn(
        // 100dvh = visible height on phones too, so the Logout button never sits under the browser bar
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white">
              <img src="/iqlogo.jpeg" alt="IQARENA" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-bold text-sidebar-foreground">
              {appName}
            </span>
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
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={cn(
                    'sidebar-link',
                    isActive && 'active',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary-foreground')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="shrink-0 border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'justify-center px-2' : 'justify-start'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-110 transition-transform"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
