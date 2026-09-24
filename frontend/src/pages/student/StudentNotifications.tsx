import { useState } from 'react';
import { Bell, Calendar, Trophy, Megaphone, Check, CheckCheck } from 'lucide-react';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StudentNotification } from '@/types/student';

const mockNotifications: StudentNotification[] = [
  {
    id: '1',
    title: 'Exam Reminder',
    message: 'Your Physics Full Test - Mechanics starts in 1 hour. Make sure you are prepared!',
    type: 'exam_reminder',
    isRead: false,
    createdAt: '2024-12-07 09:00 AM',
  },
  {
    id: '2',
    title: 'Result Published',
    message: 'Results for "Mathematics - Calculus" test have been released. Check your performance now!',
    type: 'result_alert',
    isRead: false,
    createdAt: '2024-12-06 03:30 PM',
  },
  {
    id: '3',
    title: 'New Test Assigned',
    message: 'A new test "Chemistry - Organic Reactions" has been assigned to your batch. Available from Dec 9.',
    type: 'announcement',
    isRead: false,
    createdAt: '2024-12-06 10:00 AM',
  },
  {
    id: '4',
    title: 'Exam Reminder',
    message: 'Don\'t forget! Your Biology test is scheduled for tomorrow at 11:00 AM.',
    type: 'exam_reminder',
    isRead: true,
    createdAt: '2024-12-05 06:00 PM',
  },
  {
    id: '5',
    title: 'System Update',
    message: 'The exam platform will undergo maintenance on Dec 8, 2024 from 2 AM to 4 AM. Please plan accordingly.',
    type: 'announcement',
    isRead: true,
    createdAt: '2024-12-04 11:00 AM',
  },
  {
    id: '6',
    title: 'Result Published',
    message: 'Results for "Full Mock Test - NEET Pattern" are now available. You secured Rank #25!',
    type: 'result_alert',
    isRead: true,
    createdAt: '2024-12-03 05:00 PM',
  },
];

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
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
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
          {notifications.length === 0 ? (
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
