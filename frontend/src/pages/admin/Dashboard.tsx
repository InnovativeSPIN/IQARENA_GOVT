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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type DashboardStats = {
  totalStudents: number;
  totalFaculty: number;
  totalTests: number;
  totalQuestions: number;
  totalSchools: number;
  examStudentCounts: Record<string, number>;
  examTestCounts: Record<string, number>;
  examQuestionCounts: Record<string, number>;
  schoolStudentCounts: Array<{ schoolName: string; studentCount: number }>;
};

type Exam = {
  id: number;
  name: string;
};

type School = {
  id: number;
  name: string;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatsAndExams(selectedSchool);
  }, [selectedSchool]);

  const fetchStatsAndExams = async (schoolId: string) => {
    setLoading(true);
    try {
      const url = schoolId === 'all' ? '/admin/dashboard/stats' : `/admin/dashboard/stats?schoolId=${schoolId}`;
      let res = await apiFetch(url);

      if (!res.success) {
        res = await apiFetch(url);
      }

      if (res.success && res.stats) {
        setStats(res.stats);
        if (res.exams) setExams(res.exams);
        if (res.schools) setSchools(res.schools);
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
        {/* 1. Header & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="page-header mb-0">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Welcome back! Here's an overview of your exam management system.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-card p-3 rounded-lg border shadow-sm">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by School:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full md:w-64 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            >
              <option value="all">All Schools</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
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
              title="Schools"
              value={stats ? stats.totalSchools : (loading ? '...' : '0')}
              icon={BookOpen}
              color="primary"
            />
          </div>
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

        {/* 4. Charts */}
        {stats && stats.schoolStudentCounts && stats.schoolStudentCounts.length > 0 && (
          <section className="bg-card p-6 rounded-xl border">
            <h3 className="font-display font-semibold text-lg mb-6">Students per School</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.schoolStudentCounts} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis 
                    dataKey="schoolName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1b69cf" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <Bar dataKey="studentCount" radius={[6, 6, 0, 0]} maxBarSize={50} fill="url(#colorStudents)">
                    {stats.schoolStudentCounts.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#1b69cf', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'][index % 7]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

         {/* Quick Actions */}
        <section>
          <h3 className="font-display font-semibold text-lg mb-4">Quick Actions</h3>
          <QuickActions />
        </section>
      </div>
    </AdminLayout>
  );
}
