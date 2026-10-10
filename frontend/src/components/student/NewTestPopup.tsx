import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { BellRing, Clock, FileQuestion, CalendarClock, Play } from 'lucide-react';

interface PendingTest {
  notificationId: number;
  testId: number;
  title: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  examName: string;
  subjectName: string | null;
  questions: number;
}

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null);

/**
 * Shows newly assigned tests once, the first time the student opens the dashboard after the test is published.
 * The server records that the popup was shown, so it does not come back on later logins or other devices.
 */
export default function NewTestPopup() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tests, setTests] = useState<PendingTest[]>([]);
  const [open, setOpen] = useState(false);
  const marked = useRef(false);

  useEffect(() => {
    apiFetch<{ success: boolean; tests: PendingTest[] }>('/student/notifications/test-popups')
      .then(res => {
        if (res?.success && res.tests.length > 0) {
          setTests(res.tests);
          setOpen(true);
        }
      })
      .catch(() => { /* popup is optional */ });
  }, []);

  // Record as shown as soon as it is displayed, so a refresh doesn't show it again
  useEffect(() => {
    if (!open || marked.current || tests.length === 0) return;
    marked.current = true;
    apiFetch('/student/notifications/test-popups/seen', {
      method: 'PATCH',
      body: JSON.stringify({ notificationIds: tests.map(t => t.notificationId) }),
    }).catch(() => {});
  }, [open, tests]);

  const now = Date.now();
  const isOpenNow = (t: PendingTest) => !t.startTime || new Date(t.startTime).getTime() <= now;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[94vw] max-w-lg sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <BellRing className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center">
            {tests.length === 1 ? t('A new test has been assigned to you') : `${tests.length} ${t('new tests have been assigned to you')}`}
          </DialogTitle>
          <DialogDescription className="text-center">{t('Check the schedule and be ready on time.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {tests.map(testItem => {
            const live = isOpenNow(testItem);
            return (
              <div key={testItem.notificationId} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{testItem.title}</p>
                    <p className="text-xs text-muted-foreground">{[testItem.examName, testItem.subjectName].filter(Boolean).join(' • ')}</p>
                  </div>
                  <Badge className={live ? 'bg-green-600 hover:bg-green-600' : ''} variant={live ? 'default' : 'outline'}>
                    {live ? t('Open now') : t('Upcoming')}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {testItem.duration} min</span>
                  <span className="flex items-center gap-1"><FileQuestion className="w-3.5 h-3.5" /> {testItem.questions} {t('questions')}</span>
                  {testItem.startTime && <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> {t('Starts')} {fmt(testItem.startTime)}</span>}
                  {testItem.endTime && <span>{t('Ends')} {fmt(testItem.endTime)}</span>}
                </div>
                {live && (
                  <Button size="sm" className="mt-3 w-full" onClick={() => { setOpen(false); navigate(`/student/exam/${testItem.testId}`); }}>
                    <Play className="w-4 h-4 mr-1" /> {t('Start test')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>{t('Later')}</Button>
          <Button onClick={() => { setOpen(false); navigate('/student/tests'); }}>{t('View my tests')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
