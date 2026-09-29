// Shapes returned by /api/faculty/school/* (school-scoped monitoring for faculty)

export interface FacultySchool {
  schoolId: number;
  schoolName: string;
  district?: string | null;
  udiseCode?: string | null;
}

export interface SchoolTestSummary {
  id: number;
  title: string;
  startTime: string | null;
  endTime: string | null;
  totalMarks: number;
  standard?: string | null;
}

export interface SchoolOverview {
  school: FacultySchool;
  stats: {
    totalStudents: number;
    studentsWithLogin: number;
    publishedTests: number;
    liveTests: number;
    completedAttempts: number;
    averagePercent: number;
    passRate: number;
  };
  classes: Array<{ standard: string; students: number; withLogin: number; averagePercent: number | null; attempts: number }>;
  liveTests: SchoolTestSummary[];
  upcomingTests: SchoolTestSummary[];
  recentAttempts: Array<{
    id: number; testId: number; testTitle: string; studentName: string; standard: string;
    score: number; totalMarks: number; percent: number; completedAt: string;
  }>;
}

export interface SchoolStudentRow {
  id: number;
  emisNo: string;
  name: string;
  standard: string;
  section: string | null;
  hasLogin: boolean;
  attempts: number;
  avgPercent: number | null;
  bestPercent: number | null;
  lastAttemptAt: string | null;
}

export interface SchoolStudentHistory {
  attemptId: number;
  testId: number;
  title: string;
  score: number;
  totalMarks: number;
  percent: number;
  correct: number;
  wrong: number;
  questions: number;
  timeTaken: number;
  completedAt: string;
}

export interface SchoolTestRow extends SchoolTestSummary {
  duration: number;
  examName: string;
  subjectName: string | null;
  questions: number;
  classes: string[];
  eligibleStudents: number;
  attempted: number;
  averagePercent: number | null;
  highestPercent: number | null;
  passCount: number;
}

export interface SchoolTestReport {
  school: FacultySchool;
  test: SchoolTestRow;
  summary: {
    eligible: number;
    attempted: number;
    notAttempted: number;
    averagePercent: number | null;
    highestPercent: number | null;
    lowestPercent: number | null;
    passCount: number;
    passPercent: number;
    bands: Array<{ label: string; count: number }>;
  };
  students: Array<{
    schoolStudentId: number; emisNo: string; name: string; standard: string; section: string | null; hasLogin: boolean;
    status: 'completed' | 'in_progress' | 'not_attempted';
    score: number | null; percent: number | null; correct: number | null; wrong: number | null;
    timeTaken: number | null; completedAt: string | null; rank: number | null;
  }>;
  questions: Array<{
    id: number; text: string; topic: string | null; correctAnswer: string;
    correct: number; wrong: number; skipped: number; accuracy: number;
    options: Record<'A' | 'B' | 'C' | 'D', number>;
  }>;
}

export const formatDuration = (seconds: number | null | undefined) => {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const percentTone = (p: number | null | undefined) =>
  p == null ? 'text-muted-foreground' : p >= 75 ? 'text-green-600' : p >= 33 ? 'text-amber-600' : 'text-red-600';
