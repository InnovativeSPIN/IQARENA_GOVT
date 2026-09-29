import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, BarChart3 } from 'lucide-react';

interface Filters {
  schools: Array<{ id: number; name: string }>;
  classes: Array<{ schoolId: number; standard: string }>;
  tests: Array<{ id: number; title: string; startTime: string | null; examName: string; schoolIds: number[]; classes: string[] }>;
}
interface OverviewRow {
  testId: number; testTitle: string; examName: string; startTime: string | null; schoolId: number; schoolName: string;
  classes: string; totalMarks: number; eligible: number; attempted: number; averagePercent: number | null; highestPercent: number | null; passCount: number;
}
interface StudentRow {
  schoolStudentId: number; emisNo: string; name: string; standard: string; section: string | null; schoolName: string; hasLogin: boolean;
  status: 'completed' | 'in_progress' | 'not_attempted'; score: number | null; percent: number | null; correct: number | null; wrong: number | null;
  timeTaken: number | null; completedAt: string | null; rank: number | null;
}
interface TestReport {
  test: { id: number; title: string; examName: string; subjectName: string | null; startTime: string | null; totalMarks: number; classes: string[] };
  summary: { eligible: number; attempted: number; notAttempted: number; averagePercent: number | null; highestPercent: number | null; lowestPercent: number | null; passCount: number; passPercent: number };
  students: StudentRow[];
}

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const tone = (p: number | null) => (p == null ? 'text-muted-foreground' : p >= 75 ? 'text-green-600' : p >= 33 ? 'text-amber-600' : 'text-red-600');
const duration = (s: number | null) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—');

function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  // BOM so Excel opens Tamil names correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [testId, setTestId] = useState('');
  const [standard, setStandard] = useState('');
  const [overview, setOverview] = useState<OverviewRow[]>([]);
  const [report, setReport] = useState<TestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'not_attempted'>('completed');

  useEffect(() => {
    apiFetch<Filters & { success: boolean }>('/admin/reports/filters')
      .then(res => { if (res?.success) setFilters(res); })
      .catch(() => setError('Could not load filters'));
  }, []);

  // Options narrow each other: tests for the chosen school, classes for the chosen school/test
  const testOptions = useMemo(() => (filters?.tests || []).filter(t => !schoolId || t.schoolIds.length === 0 || t.schoolIds.includes(Number(schoolId))), [filters, schoolId]);
  const classOptions = useMemo(() => {
    let list = (filters?.classes || []).filter(c => !schoolId || c.schoolId === Number(schoolId)).map(c => c.standard);
    const t = filters?.tests.find(x => x.id === Number(testId));
    if (t && t.classes.length) list = list.filter(c => t.classes.includes(c));
    return [...new Set(list)].sort();
  }, [filters, schoolId, testId]);

  useEffect(() => { if (testId && !testOptions.some(t => t.id === Number(testId))) setTestId(''); }, [testOptions, testId]);
  useEffect(() => { if (standard && !classOptions.includes(standard)) setStandard(''); }, [classOptions, standard]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (schoolId) q.set('schoolId', schoolId);
    if (testId) q.set('testId', testId);
    if (standard) q.set('standard', standard);
    apiFetch<{ success: boolean; mode: 'overview' | 'test'; rows?: OverviewRow[]; message?: string } & Partial<TestReport>>(`/admin/reports?${q}`)
      .then(res => {
        if (!res?.success) { setError(res?.message || 'Could not load report'); return; }
        if (res.mode === 'test') {
          setReport({ test: res.test!, summary: res.summary!, students: res.students! });
          setStatusFilter(res.summary!.attempted > 0 ? 'completed' : 'all');
        } else {
          setReport(null);
          setOverview(res.rows || []);
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load report'))
      .finally(() => setLoading(false));
  }, [schoolId, testId, standard]);

  const schoolName = filters?.schools.find(s => s.id === Number(schoolId))?.name;
  const visibleStudents = (report?.students || []).filter(s => statusFilter === 'all' || (statusFilter === 'completed' ? s.status === 'completed' : s.status !== 'completed'));

  const exportCsv = () => {
    const suffix = [schoolName || 'All schools', standard ? `Class ${standard}` : ''].filter(Boolean).join(' - ');
    if (report) {
      downloadCsv(`${report.test.title} - ${suffix}.csv`,
        ['Rank', 'Name', 'EMIS', 'School', 'Class', 'Status', 'Score', 'Total', 'Percent', 'Correct', 'Wrong', 'Time', 'Submitted'],
        report.students.map(s => [s.rank, s.name, s.emisNo, s.schoolName, `${s.standard}${s.section ? '-' + s.section : ''}`,
          s.status === 'completed' ? 'Completed' : s.status === 'in_progress' ? 'In progress' : 'Not attempted',
          s.score, report.test.totalMarks, s.percent, s.correct, s.wrong, s.timeTaken ? duration(s.timeTaken) : '', s.completedAt ? fmt(s.completedAt) : '']));
    } else {
      downloadCsv(`Test reports - ${suffix}.csv`,
        ['Test', 'Exam', 'School', 'Classes', 'Date', 'Eligible', 'Attempted', 'Average %', 'Highest %', 'Passed'],
        overview.map(r => [r.testTitle, r.examName, r.schoolName, r.classes, r.startTime ? fmt(r.startTime) : '', r.eligible, r.attempted, r.averagePercent, r.highestPercent, r.passCount]));
    }
  };

  const select = 'h-10 rounded-md border bg-background px-3 text-sm min-w-[160px]';

  return (
    <AdminLayout>
      <div className="space-y-5 print:space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm">Test results by school, test and class</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={exportCsv} disabled={loading || (!report && overview.length === 0)}><Download className="w-4 h-4 mr-1" /> Download CSV</Button>
            <Button variant="outline" onClick={() => window.print()} disabled={loading}><Printer className="w-4 h-4 mr-1" /> Print / PDF</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 rounded-xl border bg-card print:hidden">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">School
            <select className={select} value={schoolId} onChange={e => setSchoolId(e.target.value)}>
              <option value="">All schools</option>
              {filters?.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Test
            <select className={select} value={testId} onChange={e => setTestId(e.target.value)}>
              <option value="">All tests (summary)</option>
              {testOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Class
            <select className={select} value={standard} onChange={e => setStandard(e.target.value)}>
              <option value="">All classes</option>
              {classOptions.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </label>
          {(schoolId || testId || standard) && (
            <Button variant="ghost" className="self-end" onClick={() => { setSchoolId(''); setTestId(''); setStandard(''); }}>Clear</Button>
          )}
        </div>

        {/* Print header */}
        <p className="hidden print:block text-sm">
          {report ? report.test.title : 'Test summary'} • {schoolName || 'All schools'}{standard ? ` • Class ${standard}` : ''} • Printed {fmt(new Date().toISOString())}
        </p>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : loading ? (
          <p className="text-muted-foreground text-sm">Loading report...</p>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Attempted', value: `${report.summary.attempted}/${report.summary.eligible}` },
                { label: 'Not attempted', value: report.summary.notAttempted },
                { label: 'Average', value: report.summary.averagePercent != null ? `${report.summary.averagePercent}%` : '—', cls: tone(report.summary.averagePercent) },
                { label: 'Highest / Lowest', value: report.summary.highestPercent != null ? `${report.summary.highestPercent}% / ${report.summary.lowestPercent}%` : '—' },
                { label: `Passed (≥${report.summary.passPercent}%)`, value: report.summary.attempted ? `${report.summary.passCount}/${report.summary.attempted}` : '—' },
              ].map(c => (
                <div key={c.label} className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className={`text-xl font-bold mt-1 ${c.cls || ''}`}>{c.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <span className="text-sm text-muted-foreground">Show:</span>
              {(['completed', 'not_attempted', 'all'] as const).map(f => (
                <Button key={f} size="sm" variant={statusFilter === f ? 'default' : 'outline'} onClick={() => setStatusFilter(f)}>
                  {f === 'completed' ? 'Completed' : f === 'not_attempted' ? 'Not attempted' : 'All students'}
                </Button>
              ))}
            </div>

            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Rank</th>
                    <th className="text-left font-medium px-3 py-2">Student</th>
                    <th className="text-left font-medium px-3 py-2">School</th>
                    <th className="text-left font-medium px-3 py-2">Class</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-right font-medium px-3 py-2">Score</th>
                    <th className="text-right font-medium px-3 py-2">Correct / Wrong</th>
                    <th className="text-right font-medium px-3 py-2">Time</th>
                    <th className="text-right font-medium px-3 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleStudents.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No students for these filters.</td></tr>
                  ) : visibleStudents.map(s => (
                    <tr key={s.schoolStudentId}>
                      <td className="px-3 py-2 font-semibold">{s.rank ?? '—'}</td>
                      <td className="px-3 py-2"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground font-mono">{s.emisNo}</p></td>
                      <td className="px-3 py-2">{s.schoolName}</td>
                      <td className="px-3 py-2">{s.standard}{s.section ? `-${s.section}` : ''}</td>
                      <td className="px-3 py-2">
                        {s.status === 'completed' ? <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>
                          : s.status === 'in_progress' ? <Badge variant="outline">In progress</Badge>
                          : <Badge variant="outline">{s.hasLogin ? 'Not attempted' : 'No login'}</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right">{s.score != null ? <>{s.score}/{report.test.totalMarks} <span className={`font-semibold ${tone(s.percent)}`}>({s.percent}%)</span></> : '—'}</td>
                      <td className="px-3 py-2 text-right">{s.correct != null ? `${s.correct} / ${s.wrong}` : '—'}</td>
                      <td className="px-3 py-2 text-right">{duration(s.timeTaken)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{s.completedAt ? fmt(s.completedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : overview.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No published tests match these filters.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Test</th>
                  <th className="text-left font-medium px-3 py-2">School</th>
                  <th className="text-left font-medium px-3 py-2">Classes</th>
                  <th className="text-right font-medium px-3 py-2">Attempted</th>
                  <th className="text-right font-medium px-3 py-2">Average</th>
                  <th className="text-right font-medium px-3 py-2">Highest</th>
                  <th className="text-right font-medium px-3 py-2">Passed</th>
                  <th className="px-3 py-2 print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {overview.map(r => (
                  <tr key={`${r.testId}-${r.schoolId}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2"><p className="font-medium">{r.testTitle}</p><p className="text-xs text-muted-foreground">{r.examName} • {r.startTime ? fmt(r.startTime) : 'Open anytime'} • {r.totalMarks} marks</p></td>
                    <td className="px-3 py-2">{r.schoolName}</td>
                    <td className="px-3 py-2">{r.classes}</td>
                    <td className="px-3 py-2 text-right">{r.attempted}/{r.eligible}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${tone(r.averagePercent)}`}>{r.averagePercent != null ? `${r.averagePercent}%` : '—'}</td>
                    <td className="px-3 py-2 text-right">{r.highestPercent != null ? `${r.highestPercent}%` : '—'}</td>
                    <td className="px-3 py-2 text-right">{r.attempted ? `${r.passCount}/${r.attempted}` : '—'}</td>
                    <td className="px-3 py-2 text-right print:hidden">
                      <Button size="sm" variant="outline" onClick={() => { setSchoolId(String(r.schoolId)); setTestId(String(r.testId)); }}>Students</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
