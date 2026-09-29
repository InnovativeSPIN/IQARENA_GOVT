import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, Download, Printer, Search } from 'lucide-react';
import {
  FacultySchool, SchoolTestRow, SchoolTestReport, formatDateTime, formatDuration, percentTone,
} from '@/types/facultySchool';

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="p-6 flex gap-3"><AlertCircle className="w-5 h-5 text-destructive" /><p className="text-sm">{message}</p></CardContent>
    </Card>
  );
}

// ---------- List of tests for the faculty's school ----------
function ReportList() {
  const navigate = useNavigate();
  const [school, setSchool] = useState<FacultySchool | null>(null);
  const [tests, setTests] = useState<SchoolTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; message?: string; school: FacultySchool; tests: SchoolTestRow[] }>('/faculty/school/tests')
      .then(res => {
        if (!res?.success) { setError(res?.message || 'Could not load tests'); return; }
        setSchool(res.school);
        setTests(res.tests);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load tests'))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorCard message={error} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Test reports</h1>
        <p className="text-sm text-muted-foreground">{school ? `${school.schoolName} • ` : ''}Results of your school's students only</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading tests...</p>
          ) : tests.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No published tests are assigned to your school yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Test</th>
                    <th className="text-left font-medium px-3 py-2">Classes</th>
                    <th className="text-left font-medium px-3 py-2">Schedule</th>
                    <th className="text-right font-medium px-3 py-2">Attempted</th>
                    <th className="text-right font-medium px-3 py-2">Average</th>
                    <th className="text-right font-medium px-3 py-2">Passed</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tests.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/faculty/reports/${t.id}`)}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{[t.examName, t.subjectName].filter(Boolean).join(' • ')} • {t.questions} Q • {t.totalMarks} marks</p>
                      </td>
                      <td className="px-3 py-2.5">{t.classes.length ? t.classes.join(', ') : 'All'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{t.startTime ? formatDateTime(t.startTime) : 'Open anytime'}</td>
                      <td className="px-3 py-2.5 text-right">{t.attempted}/{t.eligibleStudents}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${percentTone(t.averagePercent)}`}>{t.averagePercent != null ? `${t.averagePercent}%` : '—'}</td>
                      <td className="px-3 py-2.5 text-right">{t.attempted ? `${t.passCount}/${t.attempted}` : '—'}</td>
                      <td className="px-4 py-2.5 text-right"><Button size="sm" variant="outline">View report</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- One test's report for the faculty's school ----------
function downloadCsv(report: SchoolTestReport) {
  const header = ['Rank', 'Name', 'EMIS', 'Class', 'Status', 'Score', 'Total', 'Percent', 'Correct', 'Wrong', 'Time taken', 'Submitted'];
  const rows = report.students.map(s => [
    s.rank ?? '', s.name, s.emisNo, `${s.standard}${s.section ? '-' + s.section : ''}`,
    s.status === 'completed' ? 'Completed' : s.status === 'in_progress' ? 'In progress' : 'Not attempted',
    s.score ?? '', report.test.totalMarks, s.percent ?? '', s.correct ?? '', s.wrong ?? '',
    s.timeTaken ? formatDuration(s.timeTaken) : '', s.completedAt ? formatDateTime(s.completedAt) : '',
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.test.title} - ${report.school.schoolName}.csv`.replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}

function ReportDetail({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const [report, setReport] = useState<SchoolTestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'students' | 'questions'>('students');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'not_attempted'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<SchoolTestReport & { success: boolean; message?: string }>(`/faculty/school/tests/${testId}/report`)
      .then(res => {
        if (!res?.success) { setError(res?.message || 'Could not load report'); return; }
        setReport(res);
        // open on the students who took the test; the full roster is one click away
        if (res.summary.attempted > 0) setStatusFilter('completed');
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load report'));
  }, [testId]);

  const students = useMemo(() => {
    if (!report) return [];
    const term = search.trim().toLowerCase();
    return report.students.filter(s =>
      (statusFilter === 'all' || (statusFilter === 'completed' ? s.status === 'completed' : s.status !== 'completed')) &&
      (!term || s.name.toLowerCase().includes(term) || s.emisNo.includes(term)));
  }, [report, statusFilter, search]);

  if (error) return <ErrorCard message={error} />;
  if (!report) return <p className="p-6 text-muted-foreground">Loading report...</p>;

  const { test, summary } = report;
  const maxBand = Math.max(1, ...summary.bands.map(b => b.count));

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <Button variant="ghost" size="sm" className="w-fit print:hidden" onClick={() => navigate('/faculty/reports')}><ArrowLeft className="w-4 h-4 mr-1" /> All reports</Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{test.title}</h1>
          <p className="text-sm text-muted-foreground">
            {report.school.schoolName} • {[test.examName, test.subjectName].filter(Boolean).join(' • ')} • {test.totalMarks} marks • {test.classes.length ? `Class ${test.classes.join(', ')}` : 'All classes'}
            {test.startTime ? ` • ${formatDateTime(test.startTime)}` : ''}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => downloadCsv(report)}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Attempted', value: `${summary.attempted}/${summary.eligible}` },
          { label: 'Not attempted', value: summary.notAttempted },
          { label: 'Average', value: summary.averagePercent != null ? `${summary.averagePercent}%` : '—', tone: percentTone(summary.averagePercent) },
          { label: 'Highest / Lowest', value: summary.highestPercent != null ? `${summary.highestPercent}% / ${summary.lowestPercent}%` : '—' },
          { label: `Passed (≥${summary.passPercent}%)`, value: summary.attempted ? `${summary.passCount}/${summary.attempted}` : '—' },
        ].map(c => (
          <div key={c.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-xl font-bold mt-1 ${c.tone || ''}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Score distribution */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Score distribution</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.bands.map(b => (
            <div key={b.label} className="flex items-center gap-3 text-sm">
              <span className="w-20 text-muted-foreground">{b.label}</span>
              <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(b.count / maxBand) * 100}%` }} />
              </div>
              <span className="w-10 text-right font-medium">{b.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b print:hidden">
        {(['students', 'questions'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'students' ? `Students (${report.students.length})` : `Question analysis (${report.questions.length})`}
          </button>
        ))}
      </div>

      {tab === 'students' ? (
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 print:hidden">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student" className="pl-9" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">All students</option>
              <option value="completed">Completed</option>
              <option value="not_attempted">Not attempted</option>
            </select>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Rank</th>
                    <th className="text-left font-medium px-3 py-2">Student</th>
                    <th className="text-left font-medium px-3 py-2">Class</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-right font-medium px-3 py-2">Score</th>
                    <th className="text-right font-medium px-3 py-2">Correct / Wrong</th>
                    <th className="text-right font-medium px-3 py-2">Time</th>
                    <th className="text-right font-medium px-4 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No students match.</td></tr>
                  ) : students.map(s => (
                    <tr key={s.schoolStudentId}>
                      <td className="px-4 py-2 font-semibold">{s.rank ?? '—'}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.emisNo}</p>
                      </td>
                      <td className="px-3 py-2">{s.standard}{s.section ? `-${s.section}` : ''}</td>
                      <td className="px-3 py-2">
                        {s.status === 'completed' ? <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>
                          : s.status === 'in_progress' ? <Badge variant="outline" className="text-amber-600 border-amber-300">In progress</Badge>
                          : <Badge variant="outline">{s.hasLogin ? 'Not attempted' : 'No login'}</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right">{s.score != null ? <>{s.score}/{test.totalMarks} <span className={`font-semibold ${percentTone(s.percent)}`}>({s.percent}%)</span></> : '—'}</td>
                      <td className="px-3 py-2 text-right">{s.correct != null ? `${s.correct} / ${s.wrong}` : '—'}</td>
                      <td className="px-3 py-2 text-right">{formatDuration(s.timeTaken)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{s.completedAt ? formatDateTime(s.completedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {report.questions.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Question analysis appears once students from your school complete the test.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">#</th>
                    <th className="text-left font-medium px-3 py-2">Question</th>
                    <th className="text-center font-medium px-3 py-2">Answer</th>
                    <th className="text-center font-medium px-3 py-2">A / B / C / D picked</th>
                    <th className="text-right font-medium px-3 py-2">Correct</th>
                    <th className="text-right font-medium px-3 py-2">Wrong</th>
                    <th className="text-right font-medium px-3 py-2">Skipped</th>
                    <th className="text-right font-medium px-4 py-2">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.questions.map((q, i) => (
                    <tr key={q.id}>
                      <td className="px-4 py-2">{i + 1}</td>
                      <td className="px-3 py-2 max-w-[380px]">
                        <p className="truncate" title={q.text}>{q.text}</p>
                        {q.topic && <p className="text-xs text-muted-foreground">{q.topic}</p>}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{q.correctAnswer}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {(['A', 'B', 'C', 'D'] as const).map(o => (
                          <span key={o} className={`inline-block min-w-[26px] mx-0.5 rounded border px-1 ${o === q.correctAnswer ? 'border-green-600 text-green-700' : ''}`}>{q.options[o]}</span>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">{q.correct}</td>
                      <td className="px-3 py-2 text-right text-red-600">{q.wrong}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{q.skipped}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded bg-muted overflow-hidden"><div className={`h-full ${q.accuracy >= 75 ? 'bg-green-600' : q.accuracy >= 33 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${q.accuracy}%` }} /></div>
                          <span className={`font-semibold ${percentTone(q.accuracy)}`}>{q.accuracy}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FacultyReports() {
  const { testId } = useParams();
  return testId ? <ReportDetail testId={testId} /> : <ReportList />;
}
