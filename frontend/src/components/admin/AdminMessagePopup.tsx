import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Message } from '@/components/messages/Messages';

export default function AdminMessagePopup() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    apiFetch<{ success: boolean; messages: Message[]; unread: number }>('/admin/messages?box=inbox')
      .then(res => {
        if (res?.success && res.messages) {
          const lastId = parseInt(localStorage.getItem('admin_last_msg_id') || '0', 10);
          const newUnread = res.messages.filter(m => !m.isRead && m.id > lastId);
          
          if (newUnread.length > 0) {
            // Sort by newest first just in case
            newUnread.sort((a, b) => b.id - a.id);
            setMessages(newUnread);
            setOpen(true);
            localStorage.setItem('admin_last_msg_id', newUnread[0].id.toString());
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[94vw] max-w-lg sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center">
            {messages.length === 1 ? 'New Message from Faculty' : `${messages.length} New Messages from Faculty`}
          </DialogTitle>
          <DialogDescription className="text-center">
            You have received new messages from school faculty members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {messages.map(m => (
            <div key={m.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{m.subject}</p>
                  <p className="text-xs text-muted-foreground">{m.schoolName || 'Unknown School'} • {m.senderName}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700 line-clamp-2">{m.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Dismiss</Button>
          <Button onClick={() => { setOpen(false); navigate('/admin/messages'); }}>View Messages</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
