import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, ClipboardList } from 'lucide-react';
import { apiFetch } from '@/lib/api';

// "New test" alerts sent to this faculty's school students (read = how many students opened it)
interface SchoolNotification {
  testId: number;
  title: string;
  message: string;
  sentAt: string;
  recipients: number;
  readCount: number;
  classes: string | null;
}

export default function FacultyNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SchoolNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; notifications: SchoolNotification[]; message?: string }>('/faculty/school/notifications')
      .then(res => { if (res?.success) setItems(res.notifications); else setError(res?.message || 'Could not load notifications'); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load notifications'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Test alerts sent to your school's students</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground">No notifications yet</p>
            <p className="text-sm mt-1">You'll see an entry here each time a test is published for your students.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(n => (
            <Card key={n.testId} className="rounded-2xl cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/faculty/reports/${n.testId}`)}>
              <CardContent className="p-4 flex gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary h-fit"><ClipboardList className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {n.classes && <Badge variant="outline">Class {n.classes}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sent to {n.recipients} students • {n.readCount} read • {new Date(n.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
