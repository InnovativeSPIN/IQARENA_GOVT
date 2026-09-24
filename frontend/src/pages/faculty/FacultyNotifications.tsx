import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FacultyNotification } from '@/types/faculty';
import {
  Bell,
  Megaphone,
  BookOpen,
  FileText,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mockNotifications: FacultyNotification[] = [
  {
    id: '1',
    type: 'announcement',
    title: 'New Academic Calendar Released',
    message: 'The academic calendar for the next semester has been published. Please review the exam schedule and plan accordingly.',
    isRead: false,
    createdAt: '2024-03-10T10:30:00'
  },
  {
    id: '2',
    type: 'test_alert',
    title: 'Test Proposal Approved',
    message: 'Your test proposal for Physics Unit Test has been approved by the admin. You can now add questions to the test.',
    isRead: false,
    createdAt: '2024-03-09T14:20:00'
  },
  {
    id: '3',
    type: 'subject_update',
    title: 'New Topic Added - Electromagnetism',
    message: 'A new topic "Advanced Electromagnetism" has been added to Physics (JEE) by the admin.',
    isRead: true,
    createdAt: '2024-03-08T09:15:00'
  },
  {
    id: '4',
    type: 'syllabus',
    title: 'Syllabus Update for NEET 2024',
    message: 'The NEET 2024 syllabus has been updated. Please review the changes in the Chemistry section.',
    isRead: true,
    createdAt: '2024-03-07T16:45:00'
  },
  {
    id: '5',
    type: 'announcement',
    title: 'Faculty Meeting Scheduled',
    message: 'A mandatory faculty meeting is scheduled for March 15th at 3:00 PM. Please confirm your attendance.',
    isRead: false,
    createdAt: '2024-03-06T11:00:00'
  },
];

export default function FacultyNotifications() {
  const [notifications, setNotifications] = useState<FacultyNotification[]>(mockNotifications);
  const [filter, setFilter] = useState<string>('all');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread' 
      ? notifications.filter(n => !n.isRead)
      : notifications.filter(n => n.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-5 w-5" />;
      case 'subject_update':
        return <BookOpen className="h-5 w-5" />;
      case 'test_alert':
        return <AlertCircle className="h-5 w-5" />;
      case 'syllabus':
        return <FileText className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-primary/10 text-primary';
      case 'subject_update':
        return 'bg-chart-2/10 text-chart-2';
      case 'test_alert':
        return 'bg-chart-4/10 text-chart-4';
      case 'syllabus':
        return 'bg-chart-3/10 text-chart-3';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'announcement', label: 'Announcements' },
          { value: 'test_alert', label: 'Test Alerts' },
          { value: 'subject_update', label: 'Subject Updates' },
          { value: 'syllabus', label: 'Syllabus' },
        ].map((item) => (
          <Button
            key={item.value}
            variant={filter === item.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={cn(
              'border-0 shadow-sm transition-colors cursor-pointer',
              !notification.isRead && 'bg-primary/5 border-l-4 border-l-primary'
            )}
            onClick={() => markAsRead(notification.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-full ${getTypeColor(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {notification.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Notifications</h3>
            <p className="text-muted-foreground">
              {filter === 'unread' ? 'You have read all notifications' : 'No notifications to display'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
