import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Lock,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StudentLayout from '@/components/layout/StudentLayout';
import StudentMascot3D, { MascotMood } from '@/components/student/StudentMascot3D';
import MilestoneCard, { MilestoneItem } from '@/components/student/MilestoneCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import NewTestPopup from '@/components/student/NewTestPopup';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentStats {
  totalQuizzes?: number;
  completed?: number;
  testsAttempted: number;
  highestScorePercentage: number;
  averageScorePercentage: number;
  classRank?: number;
  totalStudentsInClass?: number;
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
  rawStatus?: string;
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
  markPublish?: boolean;
}

interface FullAttemptResult {
  id: string;
  testId: string;
  testTitle: string;
  examType: string;
  subject?: string;
  startedAt: string;
  submittedAt?: string;
  score: number;
  totalMarks: number;
  percentage: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns encouraging label + color for a subject given its average score.
 * Labels are intentionally positive — never use "weak", "poor", "failure".
 */
function getSubjectLabel(
  average: number,
  isStrongest: boolean,
  testCount: number
): { text: string; color: string } {
  if (testCount === 0) return { text: 'No tests yet', color: 'text-slate-400' };
  if (isStrongest && average >= 80) return { text: '🏆 Your strongest subject', color: 'text-amber-600' };
  if (average >= 80) return { text: 'Doing great', color: 'text-emerald-600' };
  if (average >= 70) return { text: 'Almost there', color: 'text-sky-600' };
  if (average >= 55) return { text: 'Keep building', color: 'text-slate-500' };
  if (average >= 1)  return { text: 'Keep practicing', color: 'text-slate-500' };
  return { text: 'Starting point', color: 'text-slate-400' };
}

/**
 * Returns a human-readable countdown for a future start time.
 */
function formatCountdown(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return 'Starting now';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  payload: {
    index: number;
    name: string;
    fullTitle: string;
    score: number;
    marks?: number;
    totalMarks?: number;
    subject?: string;
  };
}

function GraphTooltip({
  active,
  payload,
  allTests,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  allTests?: { score: number; name: string }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  // Calculate comparison to prior test in sequence if available
  let diffText = '';
  let isPositiveDiff = false;
  let isNegativeDiff = false;

  if (allTests && allTests.length > 1) {
    const idx = allTests.findIndex(t => t.name === d.name);
    if (idx > 0) {
      const prevScore = allTests[idx - 1].score;
      const diff = Number((d.score - prevScore).toFixed(1));
      if (diff > 0) {
        diffText = `+${diff}% vs previous`;
        isPositiveDiff = true;
      } else if (diff < 0) {
        diffText = `${diff}% vs previous`;
        isNegativeDiff = true;
      } else {
        diffText = 'Same as previous';
      }
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-2xl p-3.5 text-xs space-y-1.5 min-w-[170px] pointer-events-none">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
        <span className="font-semibold text-slate-800 truncate max-w-[130px]">{d.fullTitle}</span>
        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md shrink-0">
          {d.name}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-3 pt-0.5">
        <span className="text-slate-400 font-medium">Score</span>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{d.score}%</span>
      </div>

      {diffText && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Trend</span>
          <span
            className={`font-semibold tabular-nums ${
              isPositiveDiff
                ? 'text-emerald-600'
                : isNegativeDiff
                ? 'text-amber-500'
                : 'text-slate-500'
            }`}
          >
            {diffText}
          </span>
        </div>
      )}

      {d.marks != null && d.totalMarks != null && d.totalMarks > 0 && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-50">
          <span>Marks</span>
          <span>{Number(d.marks).toFixed(0)} / {d.totalMarks}</span>
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero skeleton */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex justify-between items-start gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-8 w-52 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-md" />
            <div className="flex gap-6 pt-2">
              <Skeleton className="h-12 w-20 rounded-xl" />
              <Skeleton className="h-12 w-20 rounded-xl" />
              <Skeleton className="h-12 w-20 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-32 w-32 rounded-full shrink-0 hidden sm:block" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      {/* Graph skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <Skeleton className="h-5 w-44 rounded-lg" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
      {/* Subject + Focus skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      {/* Milestones skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <Skeleton className="h-5 w-36 rounded-lg" />
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-32 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StudentStats | null>(null);
  const [upcomingTests, setUpcomingTests] = useState<UpcomingTest[]>([]);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [allResults, setAllResults] = useState<FullAttemptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphFilter, setGraphFilter] = useState<'last5' | 'all'>('last5');
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(true);
  const [transientMessage, setTransientMessage] = useState<string | null>(null);

  // ── Data Fetching ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [statsRes, resultsRes] = await Promise.allSettled([
          apiFetch('/admin/dashboard/student/stats'),
          apiFetch('/student/results')
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
          const res = statsRes.value;
          setStats(res.stats || null);

          const upcoming = (res.upcomingTests || []).slice().sort(
            (a: UpcomingTest, b: UpcomingTest) => {
              const ta = a.startTime ? new Date(a.startTime).getTime() : Infinity;
              const tb = b.startTime ? new Date(b.startTime).getTime() : Infinity;
              return ta - tb;
            }
          );

          const recent = (res.recentTests || []).slice().sort(
            (a: RecentTest, b: RecentTest) => {
              const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
              const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
              return tb - ta;
            }
          );

          setUpcomingTests(upcoming);
          setRecentTests(recent);
        }

        if (resultsRes.status === 'fulfilled' && resultsRes.value?.success) {
          const resList = resultsRes.value.data?.results || [];
          setAllResults(resList);
        }
      } catch (err) {
        console.error('Error loading student dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ── Derived Data ─────────────────────────────────────────────────────────────

  const studentFirstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const highestScorePercentage = stats?.highestScorePercentage ?? 0;
  const averageScore = stats?.averageScorePercentage ?? 0;

  // Chronological test sequence — primary source of truth for graph and metrics
  const chronologicalTests = useMemo(() => {
    if (allResults.length > 0) {
      return [...allResults]
        .sort((a, b) => {
          const ta = new Date(a.submittedAt || a.startedAt).getTime();
          const tb = new Date(b.submittedAt || b.startedAt).getTime();
          return ta - tb;
        })
        .map((t, idx) => ({
          index: idx + 1,
          name: `T${idx + 1}`,
          fullTitle: t.testTitle,
          score: t.percentage != null ? Number(t.percentage) : 0,
          marks: t.score,
          totalMarks: t.totalMarks,
          subject: t.subject || 'General',
        }));
    } else if (recentTests.length > 0) {
      return [...recentTests].reverse().map((t, idx) => ({
        index: idx + 1,
        name: `T${idx + 1}`,
        fullTitle: t.title,
        score: t.percentage != null ? Number(t.percentage) : 0,
        marks: t.score,
        totalMarks: t.totalMarks,
        subject: 'General',
      }));
    }
    return [];
  }, [allResults, recentTests]);

  /**
   * DATA CONSISTENCY FIX:
   * The stats API (completedQuizzes) and results API (chronologicalTests) both count
   * "completed" attempts, but may differ if one API call fails or returns stale data.
   * Use the maximum of the two as the true completed count so milestones and the footer
   * are always consistent with the actual test data visible in the graph.
   */
  const completedQuizzes = useMemo(() => {
    const fromStats = stats?.completed ?? stats?.testsAttempted ?? 0;
    return Math.max(fromStats, chronologicalTests.length);
  }, [stats, chronologicalTests.length]);

  // Total tests available — at least as many as completed (backend guarantees this too)
  const totalQuizzes = useMemo(() => {
    const fromStats = stats?.totalQuizzes ?? 0;
    return Math.max(fromStats, completedQuizzes);
  }, [stats, completedQuizzes]);

  // Chart data
  const chartData = useMemo(() => {
    if (graphFilter === 'last5') return chronologicalTests.slice(-5);
    return chronologicalTests;
  }, [chronologicalTests, graphFilter]);

  // Last-to-previous test comparison
  const comparison = useMemo(() => {
    if (chronologicalTests.length < 2) return null;
    const current = chronologicalTests[chronologicalTests.length - 1];
    const previous = chronologicalTests[chronologicalTests.length - 2];
    const diff = Number((current.score - previous.score).toFixed(1));
    return { current, previous, diff, isImproved: diff >= 0 };
  }, [chronologicalTests]);

  // Subject averages derived from allResults
  const subjectProgress = useMemo(() => {
    if (allResults.length === 0) return [];
    const map: Record<string, { totalScore: number; count: number }> = {};
    for (const r of allResults) {
      const subj =
        r.subject?.trim() && r.subject !== 'null' && r.subject !== 'General'
          ? r.subject.trim()
          : 'General';
      if (!map[subj]) map[subj] = { totalScore: 0, count: 0 };
      map[subj].totalScore += r.percentage || 0;
      map[subj].count += 1;
    }
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        average: Math.round(data.totalScore / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.average - a.average);
  }, [allResults]);

  const strongestSubject = subjectProgress[0] ?? null;

  // Focus = weakest subject (< 75%) or the last subject if all are strong
  const focusSubject = useMemo(() => {
    if (subjectProgress.length === 0) return null;
    const needsPractice = [...subjectProgress].reverse().find(s => s.average < 75);
    return needsPractice || subjectProgress[subjectProgress.length - 1];
  }, [subjectProgress]);

  // Personal Best score
  const personalBest = useMemo(() => {
    if (chronologicalTests.length === 0 && highestScorePercentage === 0) return null;
    const peak =
      highestScorePercentage ||
      (chronologicalTests.length > 0
        ? Math.max(...chronologicalTests.map(t => t.score))
        : 0);
    return peak > 0 ? Number(peak.toFixed(1)) : null;
  }, [chronologicalTests, highestScorePercentage]);

  // Current score = latest completed test
  const currentScore = useMemo(
    () =>
      chronologicalTests.length > 0
        ? chronologicalTests[chronologicalTests.length - 1].score
        : null,
    [chronologicalTests]
  );

  // XP & Level — derived from real completed quiz count + average score
  const gamificationXP = useMemo(() => {
    const totalXP = completedQuizzes * 100 + Math.round(averageScore * 2);
    let level = 1,
      title = 'Apprentice',
      nextLevelXP = 200,
      prevLevelXP = 0;
    if (totalXP >= 1400) {
      level = 5; title = 'Grandmaster'; nextLevelXP = 2000; prevLevelXP = 1400;
    } else if (totalXP >= 900) {
      level = 4; title = 'Scholar'; nextLevelXP = 1400; prevLevelXP = 900;
    } else if (totalXP >= 500) {
      level = 3; title = 'Achiever'; nextLevelXP = 900; prevLevelXP = 500;
    } else if (totalXP >= 200) {
      level = 2; title = 'Rising Star'; nextLevelXP = 500; prevLevelXP = 200;
    }
    const xpInLevel = Math.max(0, totalXP - prevLevelXP);
    const xpNeededForLevel = nextLevelXP - prevLevelXP;
    const levelPercentage = Math.min(
      100,
      Math.round((xpInLevel / xpNeededForLevel) * 100)
    );
    return {
      level,
      title,
      totalXP,
      xpInLevel,
      xpNeededForLevel,
      levelPercentage,
      xpToNext: Math.max(0, nextLevelXP - totalXP),
    };
  }, [completedQuizzes, averageScore]);

  // Streak — capped at 7 (based on completed tests as a proxy)
  const streakDays = useMemo(() => Math.min(completedQuizzes, 7), [completedQuizzes]);

  // Milestone definitions — all driven by real data
  const milestones: MilestoneItem[] = useMemo(
    () => [
      {
        id: 'first-test',
        title: 'First Test',
        desc: completedQuizzes >= 1 ? '1st Assessment Done' : 'Not started yet',
        requirement: 'Take and finish 1 test',
        category: 'starter',
        isEarned: completedQuizzes >= 1,
      },
      {
        id: 'rising-star',
        title: 'Rising Star',
        desc: comparison && comparison.diff > 0 ? `+${comparison.diff}% score boost` : 'Beat previous test score',
        requirement: 'Increase score vs last test',
        category: 'progress',
        isEarned: Boolean(comparison && comparison.diff > 0),
      },
      {
        id: 'personal-best',
        title: 'Personal Best',
        desc: personalBest ? `${personalBest}% all-time record` : 'Set a high score record',
        requirement: 'Establish highest score',
        category: 'mastery',
        // Earned as soon as there is a personal best (any score > 0)
        isEarned: personalBest !== null && personalBest > 0,
      },
      {
        id: 'streak',
        title: 'Learning Streak',
        desc: streakDays >= 3 ? `${streakDays} test habit active` : 'Build a regular habit',
        requirement: 'Complete 3+ tests',
        category: 'streak',
        isEarned: streakDays >= 3,
      },
      {
        id: 'subject-ace',
        title: 'Subject Ace',
        desc: strongestSubject && strongestSubject.average >= 80 ? `${strongestSubject.name} (${strongestSubject.average}%)` : 'Master any subject',
        requirement: 'Score 80%+ subject average',
        category: 'excellence',
        isEarned: Boolean(strongestSubject && strongestSubject.average >= 80),
      },
    ],
    [completedQuizzes, comparison, personalBest, streakDays, strongestSubject]
  );

  // Upcoming test (first unattempted one)
  const nextScheduledTest = useMemo(() => {
    if (upcomingTests.length === 0) return null;
    return upcomingTests.find(t => !t.isAlreadyAttempted) || null;
  }, [upcomingTests]);

  // Character companion state — fully data-driven, authentic student state mapping
  const mascotState = useMemo<{ mood: MascotMood; msg: string }>(() => {
    // 1. Initial journey state
    if (completedQuizzes === 0) {
      return { mood: 'welcome', msg: 'Your learning journey starts here! 🚀' };
    }

    // 2. Personal Best celebration
    const isCurrentPersonalBest =
      chronologicalTests.length > 1 &&
      chronologicalTests[chronologicalTests.length - 1].score > 0 &&
      highestScorePercentage > 0 &&
      chronologicalTests[chronologicalTests.length - 1].score >= highestScorePercentage;

    if (isCurrentPersonalBest) {
      return { mood: 'celebrating', msg: 'NEW PERSONAL BEST! 🏆' };
    }

    // 3. Significant achievement / milestone
    if (comparison && comparison.diff >= 10) {
      return { mood: 'excited', msg: 'This is amazing! 🔥' };
    }

    // 4. Positive score improvement
    if (comparison && comparison.diff > 0) {
      return { mood: 'happy', msg: 'Nice improvement! 📈' };
    }

    // 5. Subject requiring focus & thinking
    if (focusSubject && focusSubject.average < 70) {
      return { mood: 'thinking', msg: `Let's work on ${focusSubject.name} together.` };
    }

    // 6. Score dipped or student needs encouragement
    if (comparison && comparison.diff < 0) {
      return { mood: 'encouraging', msg: "Keep going. You've got this! 💪" };
    }

    // 7. Upcoming scheduled test
    if (nextScheduledTest) {
      return { mood: 'focused', msg: 'Ready for your next test? 🎯' };
    }

    // 8. Streak or consistent performance
    if (streakDays >= 3) {
      return { mood: 'happy', msg: "You're keeping the streak going! 🔥" };
    }

    // Default calm idle
    return { mood: 'idle', msg: 'Ready to learn?' };
  }, [
    completedQuizzes,
    chronologicalTests,
    highestScorePercentage,
    comparison,
    streakDays,
    focusSubject,
    nextScheduledTest,
  ]);

  // Active displayed message (interactive click message takes priority over default status message)
  const displayedMessage = transientMessage || mascotState.msg;

  // Handler for clicks, taps, and intentional hovers on the companion
  const handleCompanionMessage = (event: { message: string; durationMs?: number }) => {
    setTransientMessage(event.message);
    setSpeechBubbleVisible(true);
    const duration = event.durationMs || 3000;
    setTimeout(() => {
      setSpeechBubbleVisible(false);
      // Wait for fade-out transition before clearing text
      setTimeout(() => {
        setTransientMessage(null);
      }, 500);
    }, duration);
  };

  // Default speech bubble visibility: show on data load/status change, fade out after 5s
  useEffect(() => {
    setSpeechBubbleVisible(true);
    const timer = setTimeout(() => {
      setSpeechBubbleVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [mascotState.msg]);

  // Graph insight — one concise message below the chart
  const graphInsight = useMemo(() => {
    if (chronologicalTests.length === 1) {
      return {
        icon: '🚀',
        strong: 'Your journey has started!',
        detail: 'Complete another test to see your progress trend.',
      };
    }
    if (!comparison) return null;
    if (comparison.diff > 0) {
      return {
        icon: '📈',
        strong: 'You\'re improving!',
        detail: `Your score increased by ${comparison.diff}% compared with your previous test.`,
      };
    }
    if (comparison.diff < 0) {
      return {
        icon: '💪',
        strong: 'Keep going!',
        detail: 'This test was a little lower. You can improve in the next one.',
      };
    }
    return {
      icon: '🎯',
      strong: 'You\'re staying consistent!',
      detail: 'Keep going to reach your next milestone.',
    };
  }, [chronologicalTests.length, comparison]);

  // Latest chart data point name — for ReferenceDot highlight
  const latestChartPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <StudentLayout>
        <DashboardSkeleton />
      </StudentLayout>
    );
  }

  const hasNoTests = chronologicalTests.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <StudentLayout>
      <NewTestPopup />
      <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-10">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 · PERSONAL HERO
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          aria-label="Personal hero section"
        >
          <div className="p-5 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

              {/* ── Mobile Order 1 / Desktop Left: Greeting ── */}
              <div className="flex-1 min-w-0 flex flex-col space-y-5">
                {/* Greeting */}
                <div className="space-y-1 text-center md:text-left">
                  <p className="text-xs font-semibold text-teal-600 md:text-slate-400 uppercase tracking-widest">
                    My Learning Journey
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
                    Hey, {studentFirstName}! 👋
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto md:mx-0">
                    {hasNoTests
                      ? 'Complete your first test to see your progress here.'
                      : comparison && comparison.isImproved
                        ? "You're getting better with every test."
                        : 'Every test is a step forward. Keep going.'}
                  </p>
                </div>

                {/* ── Mobile-Only: Mascot placed prominently right below greeting ── */}
                <div className="md:hidden flex flex-col items-center justify-center my-1 py-1">
                  <StudentMascot3D
                    mood={mascotState.mood}
                    studentName={studentFirstName}
                    scoreImprovement={comparison ? comparison.diff : 0}
                    isPersonalBest={
                      chronologicalTests.length > 1 &&
                      chronologicalTests[chronologicalTests.length - 1].score > 0 &&
                      chronologicalTests[chronologicalTests.length - 1].score >=
                        highestScorePercentage
                    }
                    streakDays={streakDays}
                    hasUpcomingTest={upcomingTests.length > 0}
                    fallbackImage="/mascot-owl.png"
                    onCompanionMessage={handleCompanionMessage}
                  />

                  {/* Mobile speech bubble */}
                  <div
                    className={`relative mt-2 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl px-3.5 py-1.5 text-xs font-medium text-slate-700 text-center max-w-[200px] shadow-sm transition-all duration-500 ease-out select-none ${
                      speechBubbleVisible
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-1 pointer-events-none'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-200" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-white" />
                    <p className="leading-snug tracking-tight text-slate-800">{displayedMessage}</p>
                  </div>
                </div>

                {/* Primary Stats */}
                {hasNoTests ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                    <span className="text-xl mt-0.5">🚀</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Start Your Learning Journey
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Complete your first test to unlock your progress dashboard.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-around md:justify-start gap-4 sm:gap-10 pt-1 md:pt-0 border-t border-slate-100 md:border-t-0">
                    {/* Current Score */}
                    <div className="space-y-0.5 text-center md:text-left">
                      <p className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums leading-none">
                        {currentScore !== null ? `${currentScore}%` : '—'}
                      </p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Current Score
                      </p>
                    </div>

                    {/* Improvement — only show when ≥2 tests */}
                    {comparison && (
                      <div className="space-y-0.5 text-center md:text-left">
                        <p
                          className={`text-3xl sm:text-4xl font-bold tabular-nums leading-none flex items-center justify-center md:justify-start gap-1 ${
                            comparison.diff > 0
                              ? 'text-emerald-600'
                              : comparison.diff < 0
                              ? 'text-amber-500'
                              : 'text-slate-600'
                          }`}
                        >
                          {comparison.diff > 0 ? (
                            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                          ) : comparison.diff < 0 ? (
                            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                          ) : null}
                          {comparison.diff > 0 ? '+' : ''}
                          {comparison.diff}%
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Improvement
                        </p>
                      </div>
                    )}

                    {/* Personal Best */}
                    {personalBest && (
                      <div className="space-y-0.5 text-center md:text-left">
                        <p className="text-3xl sm:text-4xl font-bold text-amber-500 tabular-nums leading-none flex items-center justify-center md:justify-start gap-1">
                          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                          {personalBest}%
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Personal Best
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* XP / Level Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      Level {gamificationXP.level} · {gamificationXP.title}
                    </span>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="tabular-nums">
                        {gamificationXP.xpInLevel} / {gamificationXP.xpNeededForLevel} XP
                      </span>
                      {streakDays > 0 && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <Flame className="w-3.5 h-3.5 fill-amber-500" />
                          {streakDays} day{streakDays !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${gamificationXP.levelPercentage}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* ── Desktop-Only: Right 3D Learning Companion (Dedicated Visual Zone ~35–40%) ── */}
              <div className="hidden md:flex flex-col items-center gap-2 shrink-0 self-center md:w-[220px]">
                <StudentMascot3D
                  mood={mascotState.mood}
                  studentName={studentFirstName}
                  scoreImprovement={comparison ? comparison.diff : 0}
                  isPersonalBest={
                    chronologicalTests.length > 1 &&
                    chronologicalTests[chronologicalTests.length - 1].score > 0 &&
                    chronologicalTests[chronologicalTests.length - 1].score >=
                      highestScorePercentage
                  }
                  streakDays={streakDays}
                  hasUpcomingTest={upcomingTests.length > 0}
                  fallbackImage="/mascot-owl.png"
                  onCompanionMessage={handleCompanionMessage}
                />

                {/* Companion contextual speech bubble */}
                <div
                  className={`relative bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl px-3.5 py-1.5 text-xs font-medium text-slate-700 text-center max-w-[190px] shadow-sm transition-all duration-500 ease-out select-none ${
                    speechBubbleVisible
                      ? 'opacity-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 translate-y-1 pointer-events-none'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-200" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-white" />
                  <p className="leading-snug tracking-tight text-slate-800">{displayedMessage}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Upcoming Test — compact accent strip, hidden when no test */}
          {nextScheduledTest && (
            <div className="border-t border-slate-100 px-6 sm:px-8 py-3 flex items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
                    Next Test
                  </p>
                  <p className="text-sm font-medium text-slate-800 truncate leading-tight">
                    {nextScheduledTest.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {nextScheduledTest.startTime && (
                  <span className="text-xs text-slate-400 hidden sm:block tabular-nums">
                    Starts in {formatCountdown(nextScheduledTest.startTime)}
                  </span>
                )}
                {nextScheduledTest.isLive && (
                  <span className="bg-rose-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
                    LIVE
                  </span>
                )}
                <button
                  onClick={() =>
                    nextScheduledTest.isLive
                      ? navigate(`/student/exam/${nextScheduledTest.id}`)
                      : navigate('/student/tests')
                  }
                  className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-700 text-xs font-medium transition-colors"
                  aria-label={nextScheduledTest.isLive ? 'Start live test' : 'View test details'}
                >
                  {nextScheduledTest.isLive ? 'Start' : 'Details'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 · YOUR LEARNING JOURNEY
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5"
          aria-label="Learning journey graph"
        >
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Your Learning Journey
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                See how your performance is changing over time.
              </p>
            </div>

            {/* Filter toggle — only shown when there are tests */}
            {chronologicalTests.length > 1 && (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  id="graph-filter-last5"
                  onClick={() => setGraphFilter('last5')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    graphFilter === 'last5'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Last 5
                </button>
                <button
                  type="button"
                  id="graph-filter-all"
                  onClick={() => setGraphFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    graphFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All History
                </button>
              </div>
            )}
          </div>

          {/* Chart area */}
          {hasNoTests ? (
            <div className="h-48 flex flex-col items-center justify-center text-center gap-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <span className="text-3xl">📈</span>
              <div>
                <p className="font-medium text-slate-700 text-sm">Your graph will appear here</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                  Complete your first test to start tracking your progress over time.
                </p>
              </div>
              <Link
                to="/student/tests"
                className="text-xs font-medium text-teal-600 hover:text-teal-700 underline underline-offset-2 transition-colors"
              >
                Take First Test →
              </Link>
            </div>
          ) : (
            <>
              <div className="h-52 sm:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 4, left: -28, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="journeyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#cbd5e1"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#cbd5e1"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      content={<GraphTooltip allTests={chronologicalTests} />}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#journeyGradient)"
                      dot={{ r: 4, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#0d9488', stroke: '#fff', strokeWidth: 2.5 }}
                    />
                    {/* Highlight latest data point */}
                    {latestChartPoint && (
                      <ReferenceDot
                        x={latestChartPoint.name}
                        y={latestChartPoint.score}
                        r={5}
                        fill="#0d9488"
                        stroke="#fff"
                        strokeWidth={2.5}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* One concise graph insight */}
              {graphInsight && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-base leading-none mt-0.5">{graphInsight.icon}</span>
                  <p className="text-sm text-slate-600 leading-relaxed flex-1">
                    <span className="font-semibold text-slate-800">{graphInsight.strong}</span>{' '}
                    {graphInsight.detail}
                  </p>
                  <Link
                    to="/student/results"
                    className="shrink-0 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors self-center whitespace-nowrap"
                  >
                    All results →
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 · SUBJECT JOURNEY + NEXT FOCUS
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Your Subject Journey */}
          <section
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
            aria-label="Subject journey"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Your Subject Journey
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Average score per subject</p>
            </div>

            {subjectProgress.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
                <span className="text-2xl">📚</span>
                <p className="text-sm text-slate-500">
                  No test data yet.
                </p>
                <p className="text-xs text-slate-400">
                  Your subject journey will appear here after your first test.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {subjectProgress.map((subj, idx) => {
                  const label = getSubjectLabel(subj.average, idx === 0, subj.count);
                  const barColor =
                    subj.average >= 80
                      ? 'bg-emerald-500'
                      : subj.average >= 65
                      ? 'bg-teal-500'
                      : subj.average >= 1
                      ? 'bg-slate-400'
                      : 'bg-slate-200';
                  // Always show at least a sliver so 0% doesn't look broken
                  const barWidth = subj.average > 0 ? subj.average : 0;

                  return (
                    <div key={subj.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">
                          {subj.name}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 tabular-nums">
                          {subj.average}%
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${barColor}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-[11px] font-medium ${label.color}`}>
                          {label.text}
                        </p>
                        <p className="text-[10px] text-slate-400 tabular-nums">
                          {subj.count} test{subj.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Your Next Focus */}
          <section
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
            aria-label="Next focus area"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                Your Next Focus
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Where to improve most</p>
            </div>

            {focusSubject ? (
              <div className="flex-1 flex flex-col gap-3">
                {/* Subject name + count */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {focusSubject.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {focusSubject.count} test{focusSubject.count !== 1 ? 's' : ''} attempted
                    </p>
                  </div>
                </div>

                {/* Large score */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-slate-800 tabular-nums">
                    {focusSubject.average}%
                  </span>
                  <span className="text-sm text-slate-400">current avg</span>
                </div>

                {/* Progress bar */}
                <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-teal-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${focusSubject.average}%` }}
                  />
                </div>

                {/* Supportive copy */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  {focusSubject.average >= 75
                    ? `${focusSubject.name} is looking strong. Keep the momentum going!`
                    : `A little more practice in ${focusSubject.name} can help you improve in your next test.`}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
                <span className="text-2xl">🎯</span>
                <p className="text-sm text-slate-500">
                  Take tests across subjects to see where to focus.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 4 · YOUR MILESTONES
        ══════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5"
          aria-label="Milestones and achievements"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Your Milestones
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Achievements earned along your journey</p>
          </div>

          {/* Interactive 3D Metallic Badges Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {milestones.map(m => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>

          {/* Tests-completed counter — single source of truth */}
          {totalQuizzes > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {completedQuizzes} of {totalQuizzes} tests completed
              </p>
              <Link
                to="/student/results"
                className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                View all results →
              </Link>
            </div>
          )}
        </section>

      </div>
    </StudentLayout>
  );
}