import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetQuestion {
  id: number;
  text: string;
  textTa?: string | null;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: string;
  selectedOption: string | null;
  status: 'correct' | 'wrong' | 'skipped';
  marks: number;
  topic: string | null;
}
interface Sheet {
  student: { name: string; emisNo: string; standard: string; section: string | null; schoolName?: string };
  attempt: { score: number; totalMarks: number; completedAt: string | null };
  questions: SheetQuestion[];
}

/** A student's answers for one test: chosen option (right/wrong) next to the correct option, per question. */
export default function AnswerSheetDialog({ endpoint, onClose }: { endpoint: string | null; onClose: () => void }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');

  useEffect(() => {
    setSheet(null); setError(null); setFilter('all');
    if (!endpoint) return;
    apiFetch<Sheet & { success: boolean; message?: string }>(endpoint)
      .then(res => { if (res?.success) setSheet(res); else setError(res?.message || 'Could not load answers'); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load answers'));
  }, [endpoint]);

  const counts = {
    correct: sheet?.questions.filter(q => q.status === 'correct').length || 0,
    wrong: sheet?.questions.filter(q => q.status === 'wrong').length || 0,
    skipped: sheet?.questions.filter(q => q.status === 'skipped').length || 0,
  };
  const list = (sheet?.questions || []).filter(q => filter === 'all' || q.status === filter);

  return (
    <Dialog open={!!endpoint} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sheet ? `${sheet.student.name} — answer sheet` : 'Answer sheet'}</DialogTitle>
          <DialogDescription>
            {sheet
              ? `EMIS ${sheet.student.emisNo} • Class ${sheet.student.standard}${sheet.student.section ? '-' + sheet.student.section : ''}${sheet.student.schoolName ? ' • ' + sheet.student.schoolName : ''} • Score ${sheet.attempt.score}/${sheet.attempt.totalMarks}`
              : error || 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {sheet && (
          <>
            <div className="flex flex-wrap gap-2">
              {([
                ['all', `All (${sheet.questions.length})`],
                ['correct', `Correct (${counts.correct})`],
                ['wrong', `Wrong (${counts.wrong})`],
                ['skipped', `Skipped (${counts.skipped})`],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={cn('px-3 py-1 rounded-full text-xs font-semibold border', filter === k ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {list.map((q) => {
                const n = sheet.questions.indexOf(q) + 1;
                return (
                  <div key={q.id} className={cn(
                    'rounded-lg border p-3',
                    q.status === 'correct' && 'border-success/40 bg-success/5',
                    q.status === 'wrong' && 'border-destructive/40 bg-destructive/5',
                  )}>
                    <div className="flex items-start gap-2">
                      {q.status === 'correct' ? <CheckCircle className="h-5 w-5 text-success shrink-0" />
                        : q.status === 'wrong' ? <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        : <MinusCircle className="h-5 w-5 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Q{n}</Badge>
                          {q.topic && <span className="text-xs text-muted-foreground">{q.topic}</span>}
                          <span className="ml-auto text-xs text-muted-foreground">{q.marks} marks</span>
                        </div>
                        <p className="text-sm mt-1">{q.text}</p>
                        {q.textTa && q.textTa !== q.text && <p className="text-sm text-muted-foreground">{q.textTa}</p>}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(['A', 'B', 'C', 'D'] as const).map(o => {
                        const isCorrect = q.correctAnswer === o;
                        const isSelected = q.selectedOption === o;
                        return (
                          <div key={o} className={cn(
                            'flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm',
                            isCorrect && 'border-success bg-success/10',
                            isSelected && !isCorrect && 'border-destructive bg-destructive/10',
                          )}>
                            <span className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              isCorrect ? 'bg-success text-success-foreground' : isSelected ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                            )}>{o}</span>
                            <span className="flex-1 min-w-0 break-words">{q[`option${o}` as const]}</span>
                            {isSelected && (
                              <span className={cn('text-[10px] font-semibold rounded-full px-1.5 py-0.5 shrink-0', isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground')}>
                                Picked
                              </span>
                            )}
                            {isCorrect && !isSelected && <span className="text-[10px] font-semibold text-success shrink-0">Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.status === 'skipped' && <p className="text-xs text-muted-foreground mt-1.5">Not answered • Correct answer: {q.correctAnswer}</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
