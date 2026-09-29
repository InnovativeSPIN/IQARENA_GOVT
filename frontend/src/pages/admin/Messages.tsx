import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MessageComposer, MessageList, Message } from '@/components/messages/Messages';

export default function AdminMessages() {
  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [box, setBox] = useState<'inbox' | 'sent'>('inbox');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  // Recipients: every school, or the ticked ones
  const [toAll, setToAll] = useState(true);
  const [targets, setTargets] = useState<number[]>([]);

  useEffect(() => {
    apiFetch<{ success: boolean; schools: Array<{ id: number; name: string }> }>('/admin/reports/filters')
      .then(res => { if (res?.success) setSchools(res.schools); })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ box });
    if (schoolFilter) q.set('schoolId', schoolFilter);
    apiFetch<{ success: boolean; messages: Message[]; unread: number }>(`/admin/messages?${q}`)
      .then(res => { if (res?.success) { setMessages(res.messages); setUnread(res.unread); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [box, schoolFilter]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: number) => setTargets(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm">Send messages to school faculty and read their replies. English and தமிழ் are both supported.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* Compose */}
          <div className="xl:col-span-2 rounded-xl border bg-card p-4 h-fit">
            <h2 className="font-semibold mb-3">New message to faculty</h2>
            <MessageComposer
              endpoint="/admin/messages"
              canSend={toAll || targets.length > 0}
              extraFields={() => ({ schoolIds: toAll ? 'all' : targets.join(',') })}
              onSent={() => { if (box === 'sent') load(); else setBox('sent'); }}
              extra={
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Send to</p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={toAll} onChange={() => setToAll(true)} /> Faculty of all schools
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!toAll} onChange={() => setToAll(false)} /> Selected schools
                  </label>
                  {!toAll && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                      {schools.map(s => (
                        <label key={s.id} className={`flex items-center gap-2 text-sm p-1.5 rounded border cursor-pointer ${targets.includes(s.id) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}>
                          <input type="checkbox" checked={targets.includes(s.id)} onChange={() => toggle(s.id)} /> {s.name}
                        </label>
                      ))}
                      {targets.length === 0 && <p className="text-xs text-destructive col-span-full">Tick at least one school</p>}
                    </div>
                  )}
                </div>
              }
            />
          </div>

          {/* Inbox / Sent */}
          <div className="xl:col-span-3 rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 p-3 border-b">
              <Button size="sm" variant={box === 'inbox' ? 'default' : 'outline'} onClick={() => setBox('inbox')}>
                Inbox{unread > 0 ? ` (${unread})` : ''}
              </Button>
              <Button size="sm" variant={box === 'sent' ? 'default' : 'outline'} onClick={() => setBox('sent')}>Sent</Button>
              <select className="ml-auto h-9 rounded-md border bg-background px-2 text-sm" value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
                <option value="">All schools</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <MessageList
              messages={messages}
              loading={loading}
              showSchool
              readEndpoint={box === 'inbox' ? id => `/admin/messages/${id}/read` : undefined}
              onRead={id => { setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m))); setUnread(u => Math.max(0, u - 1)); }}
              emptyText={box === 'inbox' ? 'No messages from faculty yet.' : 'You have not sent any messages yet.'}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
