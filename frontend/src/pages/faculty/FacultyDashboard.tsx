import React, { useEffect, useState } from 'react';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import {
  FileQuestion,
  Layers,
  ClipboardList,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';


export default function FacultyDashboard() {
  const { faculty, allocatedSubjects } = useFacultyAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ totalQuestions?: number; totalTopics?: number; activeTests?: number; allocatedSubjects?: number }>({});
  const [activities, setActivities] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ avgStudentScore?: number; proposalsApproved?: number; pendingReviews?: number }>({});
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, activityRes, metricsRes] = await Promise.all([
        apiFetch('/faculty/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/faculty/dashboard/recent-activity', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/faculty/dashboard/performance-metrics', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes?.success && statsRes.stats) setStats(statsRes.stats);
      if (activityRes?.success && Array.isArray(activityRes.activities)) setActivities(activityRes.activities);
      if (metricsRes?.success && metricsRes.metrics) setMetrics(metricsRes.metrics);
    } catch (err) {
      console.warn('Failed to fetch faculty dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!token) return;
    fetchDashboardData();
    return () => { mounted = false; };
  }, [token, faculty?.id]);

  const totalQuestions = stats.totalQuestions ?? allocatedSubjects.reduce((acc, sub) => acc + sub.questionCount, 0);
  const totalTopics = stats.totalTopics ?? allocatedSubjects.reduce((acc, sub) => acc + sub.topicCount, 0);

  const statCards = [
    { label: 'Total Questions', value: totalQuestions, icon: FileQuestion, color: 'text-primary' },
    { label: 'Total Topics', value: totalTopics, icon: Layers, color: 'text-chart-2' },
    { label: 'Active Tests', value: stats.activeTests ?? 0, icon: ClipboardList, color: 'text-chart-3' },
    { label: 'Subjects Allocated', value: stats.allocatedSubjects ?? allocatedSubjects.length, icon: BookOpen, color: 'text-chart-4' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 md:p-8 text-primary-foreground">
        <div className="relative z-10">
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3">
            Faculty Dashboard
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Welcome back, {faculty?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-primary-foreground/80 max-w-xl">
            You have {allocatedSubjects.length} subjects allocated. Keep up the great work in creating quality content for students.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button 
              variant="secondary" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/faculty/questions')}
            >
              Add Questions
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/faculty/proposals')}
            >
              Create Test Proposal
            </Button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <BookOpen className="w-64 h-64" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Allocated Subjects */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Allocated Subjects</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/subjects')}>
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {allocatedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate('/faculty/subjects')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{subject.subjectName}</p>
                    <p className="text-sm text-muted-foreground">
                      {subject.topicCount} topics • {subject.questionCount} questions
                    </p>
                  </div>
                </div>
                <Badge variant={subject.examType === 'NEET' ? 'default' : 'secondary'}>
                  {subject.examType}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Button size="sm" variant="ghost" onClick={fetchDashboardData}>Refresh</Button>
          </CardHeader>
          <CardContent className="space-y-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent activity yet.</div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'question' ? 'bg-primary/10 text-primary' :
                      activity.type === 'proposal' ? 'bg-chart-2/10 text-chart-2' :
                      activity.type === 'topic' ? 'bg-chart-3/10 text-chart-3' : 'bg-muted/10 text-muted-foreground'
                    }`}>
                      {activity.type === 'question' && <FileQuestion className="h-4 w-4" />}
                      {activity.type === 'proposal' && <CheckCircle2 className="h-4 w-4" />}
                      {activity.type === 'topic' && <Layers className="h-4 w-4" />}
                      {!['question','proposal','topic'].includes(activity.type) && <AlertCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </span>
                  </div>
                ))
              )}
          </CardContent>
        </Card>
      </div>

      
    </div>
  );
}
