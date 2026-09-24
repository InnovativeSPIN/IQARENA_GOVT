import {
  Users,
  GraduationCap,
  ClipboardList,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ExamSummaryCard } from '@/components/dashboard/ExamSummaryCard';
import { apiFetch } from '@/lib/api';

type DashboardStats = {
  totalStudents: number;
  totalFaculty: number;
  totalTests: number;
  totalQuestions: number;
  activeBatches: number;
  examStudentCounts: Record<string, number>;
  examTestCounts: Record<string, number>;
  examQuestionCounts: Record<string, number>;
  examBatchCounts: Record<string, number>;
};

type Exam = {
  id: number;
  name: string;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatsAndExams();
  }, []);

  const fetchStatsAndExams = async () => {
    setLoading(true);
    try {
      let res = await apiFetch('/admin/dashboard/stats');

      if (!res.success) {
        res = await apiFetch('/admin/dashboard/stats');
      }

      if (res.success && res.stats) {
        setStats(res.stats);
        if (res.exams) setExams(res.exams);
      } else {
        const examsRes = await apiFetch('/admin/dashboard/exams');
        if (examsRes.success && examsRes.exams) setExams(examsRes.exams);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-10">
        {/* 1. Header */}
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back! Here's an overview of your exam management system.
          </p>
        </div>

        {/* 2. Statistic Cards */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              title="Total Students"
              value={stats ? stats.totalStudents.toLocaleString() : (loading ? '...' : '0')}
              icon={Users}
              color="primary"
            />
            <StatCard
              title="Total Faculty"
              value={stats ? stats.totalFaculty : (loading ? '...' : '0')}
              icon={GraduationCap}
              color="success"
            />
            <StatCard
              title="Total Tests"
              value={stats ? stats.totalTests : (loading ? '...' : '0')}
              icon={ClipboardList}
              color="info"
            />
            <StatCard
              title="Questions"
              value={stats ? stats.totalQuestions.toLocaleString() : (loading ? '...' : '0')}
              icon={HelpCircle}
              color="warning"
            />
            <StatCard
              title="Active Batches"
              value={stats ? stats.activeBatches : (loading ? '...' : '0')}
              icon={BookOpen}
              color="primary"
            />
          </div>
        </section>

        {/* 3. Quick Actions */}
        <section>
          <h3 className="font-display font-semibold text-lg mb-4">Quick Actions</h3>
          <QuickActions />
        </section>

        
          {/* Exam Summary Cards */}
          <div className="w-full">
            <h3 className="font-display font-semibold text-lg mb-4 text-orange-600">Exam Overview</h3>
            <div className="flex flex-wrap gap-8">
              {loading ? (
                <div className="text-muted-foreground">Loading exams...</div>
              ) : exams.length > 0 ? (
                exams.map((exam) => {
                  const studentCount = stats?.examStudentCounts?.[exam.name] ?? 0;
                  const testCount = stats?.examTestCounts?.[exam.name] ?? 0;
                  const questionCount = stats?.examQuestionCounts?.[exam.name] ?? 0;
                  
                  
                  
                  return (
                    <ExamSummaryCard
                      key={exam.id}
                      examType={exam.name as 'NEET' | 'JEE'}
                      studentCount={studentCount}
                      testCount={testCount}
                      questionCount={questionCount}
                    />
                  );
                })
              ) : (
                <div className="text-muted-foreground">No exam data available.</div>
              )}
            </div>
          </div>
        
      </div>
    </AdminLayout>
  );
}
