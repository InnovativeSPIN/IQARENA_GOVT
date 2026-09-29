import { useEffect, useMemo, useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

// One row per test: the in-app "new test" notification sent to matching students when it was published
interface NotificationLogRow {
  testId: number;
  title: string;
  message: string;
  sentAt: string;
  recipients: number;
  readCount: number;
  schools: string | null;
}

export default function NotificationLogs() {
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    apiFetch<{ success: boolean; logs: NotificationLogRow[]; message?: string }>('/admin/tests/notification-logs')
      .then(res => { if (res?.success) setLogs(res.logs); else setError(res?.message || 'Could not load notification logs'); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load notification logs'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter(l => !q || l.title.toLowerCase().includes(q) || (l.schools || '').toLowerCase().includes(q));
  }, [logs, searchQuery]);

  const totals = useMemo(() => ({
    sent: logs.reduce((s, l) => s + l.recipients, 0),
    read: logs.reduce((s, l) => s + l.readCount, 0),
  }), [logs]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Logs</h1>
          <p className="text-muted-foreground">In-app notifications sent to students when a test is published</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Tests announced', value: logs.length },
            { label: 'Notifications sent', value: totals.sent },
            { label: 'Read by students', value: totals.sent ? `${totals.read} (${Math.round((totals.read / totals.sent) * 100)}%)` : '0' },
          ].map(c => (
            <div key={c.label} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by test or school..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">No notifications sent yet</p>
              <p className="text-sm mt-1">Students are notified automatically when you publish a test for their school and class.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Notification</th>
                  <th className="text-left font-medium px-3 py-2.5">Schools</th>
                  <th className="text-right font-medium px-3 py-2.5">Sent to</th>
                  <th className="text-right font-medium px-3 py-2.5">Read</th>
                  <th className="text-right font-medium px-4 py-2.5">Sent at</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(l => (
                  <tr key={l.testId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{l.message}</p>
                    </td>
                    <td className="px-3 py-3">{l.schools || '—'}</td>
                    <td className="px-3 py-3 text-right">{l.recipients} students</td>
                    <td className="px-3 py-3 text-right">
                      <Badge variant="outline">{l.readCount}/{l.recipients}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {new Date(l.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
