import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, AlertCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  FacultySchool, SchoolStudentRow, SchoolStudentHistory, formatDateTime, formatDuration, percentTone,
} from '@/types/facultySchool';

type SortKey = 'name' | 'avg' | 'attempts';

export default function FacultyStudents() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const standard = params.get('standard') || '';
  const [search, setSearch] = useState('');
  const [school, setSchool] = useState<FacultySchool | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<SchoolStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('name');
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'none' | 'nologin'>('all');

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ student: SchoolStudentRow & { phone?: string | null }; history: SchoolStudentHistory[] } | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (standard) q.set('standard', standard);
    apiFetch<{ success: boolean; message?: string; school: FacultySchool; classes: string[]; students: SchoolStudentRow[] }>(`/faculty/school/students?${q}`)
      .then(res => {
        if (!res?.success) { setError(res?.message || 'Could not load students'); return; }
        setSchool(res.school);
        setClasses(res.classes);
        setStudents(res.students);
        setError(null);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load students'))
      .finally(() => setLoading(false));
  }, [standard]);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetting, setResetting] = useState(false);

  const resetPin = async () => {
    if (detailId == null) return;
    setResetting(true);
    try {
      const res = await apiFetch<{ success: boolean; message?: string }>(`/faculty/school/students/${detailId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPin }),
      });
      if (!res?.success) throw new Error(res?.message || 'Could not reset PIN');
      toast.success(res.message || 'PIN reset');
      setNewPin(''); setConfirmPin('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset PIN');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    setNewPin(''); setConfirmPin('');
    if (detailId == null) { setDetail(null); return; }
    apiFetch<{ success: boolean; student: SchoolStudentRow; history: SchoolStudentHistory[] }>(`/faculty/school/students/${detailId}`)
      .then(res => { if (res?.success) setDetail({ student: res.student, history: res.history }); })
      .catch(() => setDetail(null));
  }, [detailId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = students.filter(s => !term || s.name.toLowerCase().includes(term) || s.emisNo.includes(term));
    if (attemptFilter === 'attempted') list = list.filter(s => s.attempts > 0);
    if (attemptFilter === 'none') list = list.filter(s => s.hasLogin && s.attempts === 0);
    if (attemptFilter === 'nologin') list = list.filter(s => !s.hasLogin);
    const sorted = [...list];
    if (sort === 'avg') sorted.sort((a, b) => (b.avgPercent ?? -1) - (a.avgPercent ?? -1));
    if (sort === 'attempts') sorted.sort((a, b) => b.attempts - a.attempts);
    return sorted;
  }, [students, search, sort, attemptFilter]);

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-6 flex gap-3"><AlertCircle className="w-5 h-5 text-destructive" /><p className="text-sm">{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Students</h1>
        <p className="text-sm text-muted-foreground">{school ? `${school.schoolName} • ` : ''}{students.length} students{standard ? ` in class ${standard}` : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or EMIS number" className="pl-9" />
        </div>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={standard} onChange={e => { const v = e.target.value; setParams(v ? { standard: v } : {}); }}>
          <option value="">All classes</option>
          {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={attemptFilter} onChange={e => setAttemptFilter(e.target.value as typeof attemptFilter)}>
          <option value="all">All students</option>
          <option value="attempted">Took a test</option>
          <option value="none">Has login, no attempts</option>
          <option value="nologin">No login yet</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
          <option value="name">Sort: Name</option>
          <option value="avg">Sort: Average score</option>
          <option value="attempts">Sort: Attempts</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading students...</p>
          ) : visible.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No students match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Student</th>
                    <th className="text-left font-medium px-3 py-2">EMIS</th>
                    <th className="text-left font-medium px-3 py-2">Class</th>
                    <th className="text-right font-medium px-3 py-2">Attempts</th>
                    <th className="text-right font-medium px-3 py-2">Average</th>
                    <th className="text-right font-medium px-3 py-2">Best</th>
                    <th className="text-right font-medium px-4 py-2">Last test</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(s.id)}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{s.name}</span>
                        {!s.hasLogin && <Badge variant="outline" className="ml-2 text-[10px]">No login</Badge>}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{s.emisNo}</td>
                      <td className="px-3 py-2.5">{s.standard}{s.section ? `-${s.section}` : ''}</td>
                      <td className="px-3 py-2.5 text-right">{s.attempts}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${percentTone(s.avgPercent)}`}>{s.avgPercent != null ? `${s.avgPercent}%` : '—'}</td>
                      <td className="px-3 py-2.5 text-right">{s.bestPercent != null ? `${s.bestPercent}%` : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatDateTime(s.lastAttemptAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student detail */}
      <Dialog open={detailId != null} onOpenChange={open => { if (!open) setDetailId(null); }}>
        <DialogContent className="w-[96vw] max-w-[900px] sm:max-w-[900px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.student.name || 'Student'}</DialogTitle>
            <DialogDescription>
              {detail ? `EMIS ${detail.student.emisNo} • Class ${detail.student.standard}${detail.student.section ? `-${detail.student.section}` : ''}${detail.student.hasLogin ? '' : ' • No login account yet'}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            detail.history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{detail.student.hasLogin ? 'This student has not completed any test yet.' : 'This student cannot take tests until a login account is created.'}</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Test</th>
                      <th className="text-right font-medium px-3 py-2">Score</th>
                      <th className="text-right font-medium px-3 py-2">Correct / Wrong</th>
                      <th className="text-right font-medium px-3 py-2">Time</th>
                      <th className="text-right font-medium px-3 py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.history.map(h => (
                      <tr key={h.attemptId}>
                        <td className="px-3 py-2">
                          <button type="button" className="text-primary hover:underline text-left" onClick={() => navigate(`/faculty/reports/${h.testId}`)}>{h.title}</button>
                        </td>
                        <td className="px-3 py-2 text-right">{h.score}/{h.totalMarks} <span className={`font-semibold ${percentTone(h.percent)}`}>({h.percent}%)</span></td>
                        <td className="px-3 py-2 text-right">{h.correct} / {h.wrong} <span className="text-muted-foreground">of {h.questions}</span></td>
                        <td className="px-3 py-2 text-right">{formatDuration(h.timeTaken)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatDateTime(h.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {/* Reset the student's 6-digit login PIN */}
          {detail && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-primary" /> Reset login PIN</p>
              {detail.student.hasLogin ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input inputMode="numeric" maxLength={6} placeholder="New 6-digit PIN" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
                    <Input inputMode="numeric" maxLength={6} placeholder="Confirm PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} />
                    <Button onClick={resetPin} disabled={resetting || newPin.length !== 6 || newPin !== confirmPin}>
                      {resetting ? 'Saving...' : 'Reset PIN'}
                    </Button>
                  </div>
                  {confirmPin.length === 6 && newPin !== confirmPin && <p className="text-xs text-destructive">PINs do not match</p>}
                  <p className="text-xs text-muted-foreground">Share the new PIN with the student. They log in with their EMIS number ({detail.student.emisNo}) and this PIN.</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">This student has no login account yet, so there is no PIN to reset. Ask the admin to create their account.</p>
              )}
            </div>
          )}
          <div className="flex justify-end"><Button variant="outline" onClick={() => setDetailId(null)}>Close</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
