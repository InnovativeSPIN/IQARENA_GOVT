import { Clock, Trophy, Target, TrendingUp, Calendar, ArrowRight, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

// Types matching backend payload
interface StudentStats {
  testsAttempted: number;
  highestScorePercentage: number;
  averageScorePercentage: number;
}

interface UpcomingTest {
  id: number | string;
  title: string;
  examType: 'NEET' | 'JEE' | string;
  duration: number;
  totalMarks: number;
  startTime: string | null;
  endTime?: string | null;
  status: string;
  isLive: boolean;
  isPublished?: boolean;
  rawStatus?: string; // 'draft' | 'published' | 'unpublished'
  isAlreadyAttempted?: boolean;
}

interface RecentTest {
  id: number | string;
  testId?: number | string;
  attemptId?: number | string;
  title: string;
  examType: 'NEET' | 'JEE' | string;
  score?: number;
  totalMarks?: number;
  percentage?: number | null;
  completedAt?: string;
  status?: string;
  markPublish?: boolean; // This is the key flag
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StudentStats | null>(null);
  const [upcomingTests, setUpcomingTests] = useState<UpcomingTest[]>([]);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/admin/dashboard/student/stats');
        if (res.success) {
          setStats(res.stats || null);

          // Sort upcoming tests: soonest first
          const upcoming = (res.upcomingTests || []).slice().sort((a: UpcomingTest, b: UpcomingTest) => {
            const ta = a.startTime ? new Date(a.startTime).getTime() : Infinity;
            const tb = b.startTime ? new Date(b.startTime).getTime() : Infinity;
            return ta - tb;
          });

          // Sort recent tests: most recent first
          const recent = (res.recentTests || []).slice().sort((a: RecentTest, b: RecentTest) => {
            const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return tb - ta;
          });

          setUpcomingTests(upcoming);
          setRecentTests(recent);
        } else {
          console.error('Failed to load student dashboard stats:', res.message);
        }
      } catch (err) {
        console.error('Error loading student dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Quick stats cards
  const quickStats = [
    {
      label: 'Tests Attempted',
      value: stats ? String(stats.testsAttempted) : '0',
      icon: Target,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Highest Score',
      value: stats ? `${stats.highestScorePercentage.toFixed(1)}%` : '0%',
      icon: Trophy,
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Average Score',
      value: stats ? `${stats.averageScorePercentage.toFixed(1)}%` : '0%',
      icon: TrendingUp,
      color: 'bg-info/10 text-info',
    },
  ];

  const liveTestsCount = upcomingTests.filter((t) => t.isLive).length;

  // Updated renderResultAction — only show results when markPublish is explicitly true
  const renderResultAction = (test: RecentTest) => {
    // For completed attempts, accept both 'submitted' and 'published' status
    const isSubmitted = test.status === 'submitted' || test.status === 'published';
    const hasScore = typeof test.score !== 'undefined' && test.score !== null;
    const published = test.markPublish === true; // Only show results when markPublish is explicitly true

    if (isSubmitted && published) {
      return (
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            {hasScore && test.totalMarks && test.totalMarks > 0 ? (
              <>
                <p className="text-sm font-semibold">
                  Score: {Number(test.score).toFixed(2)} / {test.totalMarks}
                </p>
                <p className="text-xs text-muted-foreground">
                  {test.percentage != null ? `${test.percentage.toFixed(1)}%` : '—'}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold">
                Score: {hasScore ? Number(test.score).toFixed(2) : '—'}
              </p>
            )}
          </div>
          <Link to={`/student/results/${test.testId ?? test.id}`}>
            <Button variant="outline" size="sm">View Result</Button>
          </Link>
        </div>
      );
    }

    if (isSubmitted && !published) {
      return (
        <div className="flex flex-col items-end">
          <Badge variant="outline" className="mb-1">Marks Not Published</Badge>
          <p className="text-xs text-muted-foreground text-right max-w-[160px]">
            Marks will be published by the faculty soon.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="relative z-10">
            <Badge variant="secondary" className="mb-3 bg-primary-foreground/20 text-primary-foreground border-0">
              Student
            </Badge>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-foreground/80">
              {loading
                ? 'Loading your dashboard...'
                : `You have ${liveTestsCount} live test${liveTestsCount === 1 ? '' : 's'} available`}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-primary-foreground/10 rounded-full translate-y-1/2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {quickStats.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2.5 rounded-xl ${stat.color} mb-2`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Tests */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Upcoming Tests</CardTitle>
            <Link to="/student/tests">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading upcoming tests...</div>
            ) : upcomingTests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No upcoming tests assigned to you.</div>
            ) : (
              upcomingTests.map((test) => {
                const now = new Date();
                const start = test.startTime ? new Date(test.startTime) : null;
                const end = test.endTime ? new Date(test.endTime) : null;
                const inWindow = (!start || now >= start) && (!end || now <= end);

                return (
                  <div
                    key={test.id}
                    className="p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge
                            variant="outline"
                            className={
                              test.examType === 'NEET'
                                ? 'bg-success/10 text-success border-success/30'
                                : 'bg-info/10 text-info border-info/30'
                            }
                          >
                            {test.examType}
                          </Badge>
                          {test.isLive && (
                            <Badge variant="destructive" className="animate-pulse">
                              <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full mr-1.5" />
                              LIVE
                            </Badge>
                          )}
                          {test.rawStatus && test.rawStatus !== 'published' && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {test.rawStatus === 'draft' ? 'Draft' : 'Unpublished'}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground truncate">{test.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {test.duration} min
                          </span>
                          <span>{test.totalMarks} marks</span>
                        </div>
                        {test.startTime && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(test.startTime).toLocaleString()}
                          </div>
                        )}
                        {test.rawStatus === 'published' && !inWindow && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {start && now < start && `Available from ${start.toLocaleString()}`}
                            {end && now > end && `Available until ${end.toLocaleString()}`}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        disabled={test.rawStatus !== 'published' || test.isAlreadyAttempted || !inWindow}
                        onClick={() => {
                          if (test.rawStatus === 'published' && !test.isAlreadyAttempted && inWindow) {
                            navigate(`/student/exam/${test.id}`);
                          }
                        }}
                      >
                        <Play className="h-4 w-4" />
                        {test.isAlreadyAttempted
                          ? 'Completed'
                          : test.rawStatus === 'published' && inWindow
                          ? 'Attend'
                          : 'Not Available'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Recent Results</CardTitle>
            <Link to="/student/results">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading recent results...</div>
            ) : recentTests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent results found.</div>
            ) : (
              recentTests.map((test) => (
                <div
                  key={test.id}
                  className="p-4 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            test.examType === 'NEET'
                              ? 'bg-success/10 text-success border-success/30'
                              : 'bg-info/10 text-info border-info/30'
                          }
                        >
                          {test.examType}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{test.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center">
                      {renderResultAction(test)}
                    </div>
                  </div>
                  <Progress value={test.percentage ?? 0} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}