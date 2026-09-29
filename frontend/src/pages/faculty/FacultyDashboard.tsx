import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ClipboardList, CheckCircle2, TrendingUp, School, ArrowRight, Radio, CalendarClock, AlertCircle } from 'lucide-react';
import { SchoolOverview, formatDateTime, percentTone } from '@/types/facultySchool';

export default function FacultyDashboard() {
  const { faculty } = useFacultyAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<SchoolOverview & { success: boolean; message?: string }>('/faculty/school/overview');
        if (res?.success) setData(res);
        else setError(res?.message || 'Could not load your school dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your school dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;

  if (error || !data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-6 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="font-semibold">School dashboard unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { school, stats } = data;
  const cards = [
    { label: 'Students', value: stats.totalStudents, sub: `${stats.studentsWithLogin} with login`, icon: Users, tile: 'bg-amber-100 border-amber-200', iconTone: 'text-amber-600', onClick: () => navigate('/faculty/students') },
    { label: 'Published tests', value: stats.publishedTests, sub: `${stats.liveTests} live now`, icon: ClipboardList, tile: 'bg-sky-100 border-sky-200', iconTone: 'text-sky-600', onClick: () => navigate('/faculty/reports') },
    { label: 'Completed attempts', value: stats.completedAttempts, sub: 'by your students', icon: CheckCircle2, tile: 'bg-emerald-100 border-emerald-200', iconTone: 'text-emerald-600', onClick: () => navigate('/faculty/reports') },
    { label: 'Average score', value: `${stats.averagePercent}%`, sub: `${stats.passRate}% passed`, icon: TrendingUp, tile: 'bg-violet-100 border-violet-200', iconTone: 'text-violet-600', onClick: () => navigate('/faculty/reports') },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(214,84%,42%)] via-[hsl(210,85%,50%)] to-[hsl(200,90%,60%)] p-6 md:p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="p-4 rounded-2xl bg-white/15 backdrop-blur w-fit"><School className="w-9 h-9" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/85">வணக்கம், {faculty?.name || 'Faculty'} 👋</p>
            <h1 className="text-2xl md:text-3xl font-extrabold truncate">{school.schoolName}</h1>
            <p className="text-xs md:text-sm text-white/80 mt-1">
              {[school.district, school.udiseCode && `UDISE ${school.udiseCode}`].filter(Boolean).join(' • ') || 'Your school'} • Monitor your students' tests and results
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-white text-primary hover:bg-white/90 rounded-full" onClick={() => navigate('/faculty/reports')}>
              Test reports <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" className="rounded-full border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/faculty/students')}>
              Students
            </Button>
          </div>
        </div>
      </div>

      {/* Quick access tiles */}
      <div>
        <h2 className="text-lg font-bold text-center mb-1">Quick Access</h2>
        <p className="text-xs text-muted-foreground text-center mb-4">Everything about your school's progress in one place</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {cards.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className={`group rounded-2xl p-4 md:p-5 text-center border shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all ${c.tile}`}
            >
              <span className={`mx-auto mb-2 flex w-11 h-11 items-center justify-center rounded-full bg-white/80 shadow-sm ${c.iconTone}`}>
                <c.icon className="w-5 h-5" />
              </span>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-800">{c.value}</p>
              <p className="text-sm font-semibold text-slate-700">{c.label}</p>
              <p className="text-[11px] text-slate-600">{c.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes */}
        <Card className="lg:col-span-2 rounded-2xl shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Classes</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.classes.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No students are registered for your school yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-6 py-2">Class</th>
                      <th className="text-right font-medium px-3 py-2">Students</th>
                      <th className="text-right font-medium px-3 py-2">With login</th>
                      <th className="text-right font-medium px-3 py-2">Attempts</th>
                      <th className="text-right font-medium px-6 py-2">Avg score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.classes.map(c => (
                      <tr key={c.standard} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/faculty/students?standard=${encodeURIComponent(c.standard)}`)}>
                        <td className="px-6 py-2.5 font-medium">Class {c.standard}</td>
                        <td className="px-3 py-2.5 text-right">{c.students}</td>
                        <td className="px-3 py-2.5 text-right">{c.withLogin}</td>
                        <td className="px-3 py-2.5 text-right">{c.attempts}</td>
                        <td className={`px-6 py-2.5 text-right font-semibold ${percentTone(c.averagePercent)}`}>{c.averagePercent != null ? `${c.averagePercent}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live & upcoming tests */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Tests for your school</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: 'Live now', icon: Radio, items: data.liveTests, tone: 'text-green-600' },
              { title: 'Upcoming', icon: CalendarClock, items: data.upcomingTests, tone: 'text-amber-600' },
            ].map(group => (
              <div key={group.title}>
                <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${group.tone}`}>
                  <group.icon className="w-3.5 h-3.5" /> {group.title}
                </p>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">None</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {group.items.map(t => (
                      <li key={t.id}>
                        <button type="button" className="w-full text-left rounded-md border p-2.5 hover:bg-muted/40" onClick={() => navigate(`/faculty/reports/${t.id}`)}>
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.startTime ? formatDateTime(t.startTime) : 'Open anytime'}{t.standard ? ` • Class ${t.standard}` : ''}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent attempts */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent results</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/reports')}>All reports</Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentAttempts.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No completed attempts from your students yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-6 py-2">Student</th>
                    <th className="text-left font-medium px-3 py-2">Class</th>
                    <th className="text-left font-medium px-3 py-2">Test</th>
                    <th className="text-right font-medium px-3 py-2">Score</th>
                    <th className="text-right font-medium px-6 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentAttempts.map(a => (
                    <tr key={a.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/faculty/reports/${a.testId}`)}>
                      <td className="px-6 py-2.5 font-medium">{a.studentName}</td>
                      <td className="px-3 py-2.5">{a.standard}</td>
                      <td className="px-3 py-2.5 truncate max-w-[220px]">{a.testTitle}</td>
                      <td className="px-3 py-2.5 text-right">
                        {a.score}/{a.totalMarks} <Badge variant="outline" className={`ml-1 ${percentTone(a.percent)}`}>{a.percent}%</Badge>
                      </td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground">{formatDateTime(a.completedAt)}</td>
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
