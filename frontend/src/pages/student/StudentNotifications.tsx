import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Bell, Calendar, Trophy, Megaphone, Check, CheckCheck } from 'lucide-react';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StudentNotification } from '@/types/student';


const getNotificationIcon = (type: StudentNotification['type']) => {
  switch (type) {
    case 'exam_reminder':
      return Calendar;
    case 'result_alert':
      return Trophy;
    case 'announcement':
      return Megaphone;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: StudentNotification['type']) => {
  switch (type) {
    case 'exam_reminder':
      return 'bg-warning/10 text-warning';
    case 'result_alert':
      return 'bg-success/10 text-success';
    case 'announcement':
      return 'bg-info/10 text-info';
    default:
      return 'bg-primary/10 text-primary';
  }
};

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ success: boolean; notifications: Array<StudentNotification & { createdAt: string }> }>('/student/notifications');
        if (data?.success) {
          setNotifications(data.notifications.map(n => ({
            ...n,
            id: String(n.id),
            createdAt: new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          })));
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    apiFetch(`/student/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    apiFetch('/student/notifications/read-all', { method: 'PATCH' }).catch(() => {});
  };

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2 w-full sm:w-auto">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No notifications</h3>
                <p className="text-muted-foreground mt-1">
                  You're all caught up! Check back later.
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);
              
              return (
                <Card
                  key={notification.id}
                  className={cn(
                    "border-0 shadow-sm overflow-hidden cursor-pointer transition-all",
                    !notification.isRead && "bg-accent/30 border-l-4 border-l-primary"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3 sm:gap-4">
                      <div className={cn("p-2 sm:p-2.5 rounded-xl shrink-0 h-fit", colorClass)}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={cn(
                              "font-semibold text-sm sm:text-base text-foreground",
                              !notification.isRead && "font-bold"
                            )}>
                              {notification.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {notification.createdAt}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
