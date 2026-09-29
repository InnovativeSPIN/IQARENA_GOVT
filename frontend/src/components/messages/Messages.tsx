import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlus, Inbox, Send, X, Mail, MailOpen } from 'lucide-react';
import { toast } from 'sonner';

export interface Message {
  id: number;
  direction: 'to_faculty' | 'to_admin';
  subject: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  schoolId: number | null;
  schoolName: string | null;
  senderId: number;
  senderName: string;
  isRead: boolean;
}

const API = import.meta.env.VITE_API_URL || '';
// Uploaded files are served by the backend next to /api
export const fileUrl = (p: string | null) => (p ? `${API.replace(/\/api\/?$/, '')}${p}` : '');
const fmt = (v: string) => new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/** Compose form. `extra` renders above the subject (e.g. the admin's school picker). */
export function MessageComposer({
  endpoint, extraFields, extra, canSend = true, onSent,
}: {
  endpoint: string;
  extraFields?: () => Record<string, string>;
  extra?: React.ReactNode;
  canSend?: boolean;
  onSent?: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) { setPreview(null); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const pickImage = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be 5 MB or smaller'); return; }
    setImage(f);
  };

  const send = async () => {
    if (!subject.trim() || !body.trim()) { toast.error('Subject and message are required'); return; }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('subject', subject.trim());
      fd.append('body', body.trim());
      Object.entries(extraFields?.() || {}).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);
      // apiFetch would force a JSON content type; FormData needs the browser to set the multipart boundary
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not send message');
      toast.success('Message sent');
      setSubject(''); setBody(''); setImage(null);
      if (fileRef.current) fileRef.current.value = '';
      onSent?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {extra}
      <Input placeholder="Subject / பொருள்" value={subject} onChange={e => setSubject(e.target.value)} maxLength={255} lang="ta" />
      <Textarea
        placeholder="Type your message in English or தமிழ்..."
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={5}
        maxLength={5000}
        lang="ta"
        className="font-[inherit] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="w-4 h-4 mr-1" /> {image ? 'Change image' : 'Attach image proof'}
        </Button>
        {preview && (
          <div className="relative">
            <img src={preview} alt="Attachment preview" className="h-16 w-16 object-cover rounded-md border" />
            <button type="button" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5" aria-label="Remove image">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <span className="text-xs text-muted-foreground">{body.length}/5000</span>
        <Button type="button" className="ml-auto" onClick={send} disabled={sending || !canSend}>
          <Send className="w-4 h-4 mr-1" /> {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

/** Inbox / sent list with a reader dialog. Opening an unread inbox message marks it read. */
export function MessageList({
  messages, loading, readEndpoint, showSchool, emptyText, onRead,
}: {
  messages: Message[];
  loading: boolean;
  readEndpoint?: (id: number) => string;
  showSchool?: boolean;
  emptyText: string;
  onRead?: (id: number) => void;
}) {
  const [open, setOpen] = useState<Message | null>(null);

  const openMessage = (m: Message) => {
    setOpen(m);
    if (!m.isRead && readEndpoint) {
      apiFetch(readEndpoint(m.id), { method: 'PATCH' }).catch(() => {});
      onRead?.(m.id);
    }
  };

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading messages...</p>;
  if (messages.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y">
        {messages.map(m => (
          <li key={m.id}>
            <button type="button" onClick={() => openMessage(m)} className={`w-full text-left px-4 py-3 hover:bg-muted/40 flex gap-3 ${!m.isRead && readEndpoint ? 'bg-primary/5' : ''}`}>
              <span className="mt-0.5 text-primary">{!m.isRead && readEndpoint ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4 text-muted-foreground" />}</span>
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`truncate ${!m.isRead && readEndpoint ? 'font-bold' : 'font-medium'}`}>{m.subject}</span>
                  {m.imageUrl && <Badge variant="outline" className="text-[10px]">Image</Badge>}
                  {showSchool && <Badge variant="secondary" className="text-[10px]">{m.schoolName || 'All schools'}</Badge>}
                </span>
                <span className="block text-sm text-muted-foreground truncate">{m.body}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{m.senderName} • {fmt(m.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!open} onOpenChange={o => { if (!o) setOpen(null); }}>
        <DialogContent className="w-[94vw] max-w-2xl sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="leading-snug">{open.subject}</DialogTitle>
                <DialogDescription>
                  From {open.senderName}{open.schoolName ? ` • ${open.schoolName}` : open.direction === 'to_faculty' ? ' • All schools' : ''} • {fmt(open.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{open.body}</p>
              {open.imageUrl && (
                <a href={fileUrl(open.imageUrl)} target="_blank" rel="noreferrer" className="block">
                  <img src={fileUrl(open.imageUrl)} alt="Attached proof" className="max-h-[50vh] w-auto rounded-lg border mx-auto" />
                  <span className="block text-center text-xs text-primary mt-1">Open full image</span>
                </a>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
