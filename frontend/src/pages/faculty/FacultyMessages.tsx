import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MessageComposer, MessageList, Message } from '@/components/messages/Messages';

export default function FacultyMessages() {
  const [box, setBox] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ success: boolean; messages: Message[]; unread: number }>(`/faculty/messages?box=${box}`)
      .then(res => { if (res?.success) { setMessages(res.messages); setUnread(res.unread); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [box]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Messages between you and the admin. English and தமிழ் are both supported.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-4 h-fit">
          <h2 className="font-semibold mb-3">Message the admin</h2>
          <MessageComposer endpoint="/faculty/messages" onSent={() => { if (box === 'sent') load(); else setBox('sent'); }} />
        </div>

        <div className="lg:col-span-3 rounded-2xl border bg-card overflow-hidden">
          <div className="flex gap-2 p-3 border-b">
            <Button size="sm" variant={box === 'inbox' ? 'default' : 'outline'} onClick={() => setBox('inbox')}>
              From admin{unread > 0 ? ` (${unread})` : ''}
            </Button>
            <Button size="sm" variant={box === 'sent' ? 'default' : 'outline'} onClick={() => setBox('sent')}>Sent</Button>
          </div>
          <MessageList
            messages={messages}
            loading={loading}
            readEndpoint={box === 'inbox' ? id => `/faculty/messages/${id}/read` : undefined}
            onRead={id => { setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m))); setUnread(u => Math.max(0, u - 1)); }}
            emptyText={box === 'inbox' ? 'No messages from the admin yet.' : 'You have not sent any messages yet.'}
          />
        </div>
      </div>
    </div>
  );
}
