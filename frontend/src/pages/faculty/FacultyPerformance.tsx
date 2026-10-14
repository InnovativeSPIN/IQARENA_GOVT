import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  BookOpen,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  X,
  Search,
  FileText,
  GraduationCap,
  ClipboardList
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface SubjectItem {
  id: string;
  subjectName: string;
  examType: string;
  testsCount: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
}

interface TestItem {
  testId: string;
  testName: string;
  subjectId: string;
  subjectName: string;
  examType: string;
  totalStudents: number;
  eligibleStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  conductedAt: string;
  duration: number;
  totalMarks: number;
  questions: number;
}

interface TopicAccuracyItem {
  topicId: string;
  topicName: string;
  subjectId: string | null;
  subjectName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

interface StudentPerformanceItem {
  studentId: string;
  studentName: string;
  rollNo: string;
  standard: string;
  section: string;
  testId: string;
  testName: string;
  subjectName: string;
  score: number;
  percentage: number;
  rank: number;
  timeTaken: number;
  completedAt: string;
}

interface TopicOption {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
}

interface StudentOption {
  id: string;
  name: string;
  rollNo: string;
  standard: string;
  section: string;
}

export default function FacultyPerformance() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [topicAccuracy, setTopicAccuracy] = useState<TopicAccuracyItem[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformanceItem[]>([]);
  const [allTopics, setAllTopics] = useState<TopicOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    apiFetch<{
      success: boolean;
      subjects: SubjectItem[];
      tests: TestItem[];
      topicAccuracy: TopicAccuracyItem[];
      studentPerformance: StudentPerformanceItem[];
      allTopics: TopicOption[];
      allStudents: StudentOption[];
    }>('/faculty/school/performance')
      .then((res) => {
        if (res?.success) {
          setSubjects(res.subjects || []);
          setTests(res.tests || []);
          setTopicAccuracy(res.topicAccuracy || []);
          setStudentPerformance(res.studentPerformance || []);
          setAllTopics(res.allTopics || []);
          setAllStudents(res.allStudents || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load performance analytics:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Helper functions for subject icons and colors
  const getSubjectIcon = (subjectName: string) => {
    const name = (subjectName || '').toLowerCase();
    if (name.includes('physics')) return Atom;
    if (name.includes('chemistry')) return FlaskConical;
    if (name.includes('biology') || name.includes('botany') || name.includes('zoology')) return Brain;
    if (name.includes('mathematics') || name.includes('math')) return Calculator;
    return BookOpen;
  };

  const getSubjectColor = (subjectName: string) => {
    const name = (subjectName || '').toLowerCase();
    if (name.includes('physics')) return 'from-blue-500 to-blue-600';
    if (name.includes('chemistry')) return 'from-green-500 to-green-600';
    if (name.includes('biology') || name.includes('botany') || name.includes('zoology')) return 'from-emerald-500 to-emerald-600';
    if (name.includes('mathematics') || name.includes('math')) return 'from-purple-500 to-purple-600';
    return 'from-orange-500 to-orange-600';
  };

  const getTopicsForSubject = (subjectId: string) => {
    return allTopics.filter((t) => t.subjectId === subjectId);
  };

  const clearFilters = () => {
    setSelectedSubject('');
    setSelectedTopic('');
    setSelectedTest('');
    setSelectedStudent('');
    setSearchQuery('');
  };

  const activeFiltersCount = [selectedSubject, selectedTopic, selectedTest, selectedStudent, searchQuery].filter(Boolean).length;

  // Filtered data based on selections
  const filteredPerformance = useMemo(() => {
    return tests.filter((p) => {
      if (selectedSubject && p.subjectId !== selectedSubject && p.subjectName !== selectedSubject) return false;
      if (selectedTest && p.testId !== selectedTest) return false;
      if (searchQuery && !p.testName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tests, selectedSubject, selectedTest, searchQuery]);

  const filteredTopicAccuracy = useMemo(() => {
    return topicAccuracy.filter((t) => {
      if (selectedSubject && t.subjectId !== selectedSubject) return false;
      if (selectedTopic && t.topicId !== selectedTopic) return false;
      return true;
    });
  }, [topicAccuracy, selectedSubject, selectedTopic]);

  const filteredStudentPerformance = useMemo(() => {
    return studentPerformance.filter((sp) => {
      if (selectedStudent && sp.studentId !== selectedStudent) return false;
      if (selectedTest && sp.testId !== selectedTest) return false;
      if (selectedSubject && sp.subjectName !== selectedSubject) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = sp.studentName.toLowerCase().includes(query);
        const matchesRoll = sp.rollNo ? sp.rollNo.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesRoll) return false;
      }
      return true;
    });
  }, [studentPerformance, selectedStudent, selectedTest, selectedSubject, searchQuery]);

  const overallStats = useMemo(() => {
    const totalTests = filteredPerformance.length;
    const totalStudentsAttempted = filteredPerformance.reduce((acc, p) => acc + p.totalStudents, 0);
    const avgScore = totalStudentsAttempted > 0
      ? Math.round(filteredPerformance.reduce((acc, p) => acc + (p.averageScore * p.totalStudents), 0) / totalStudentsAttempted)
      : (totalTests > 0 ? Math.round(filteredPerformance.reduce((acc, p) => acc + p.averageScore, 0) / totalTests) : 0);
    const totalPass = filteredPerformance.reduce((acc, p) => acc + (p.passRate * p.totalStudents / 100), 0);
    const avgPassRate = totalStudentsAttempted > 0 ? Math.round((totalPass / totalStudentsAttempted) * 100) : 0;

    return {
      totalTests,
      avgScore,
      totalStudents: totalStudentsAttempted,
      avgPassRate
    };
  }, [filteredPerformance]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">Comprehensive student and test performance for your school</p>
        </div>
      </div>

      {/* Subject Filter Cards */}
      {subjects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Filter by Subject</h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All ({activeFiltersCount})
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {subjects.map((subject) => {
              const SubjectIcon = getSubjectIcon(subject.subjectName);
              const isSelected = selectedSubject === subject.id || selectedSubject === subject.subjectName;

              return (
                <Card
                  key={subject.id}
                  className={`cursor-pointer transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-orange-500 shadow-lg shadow-orange-500/20 scale-105'
                      : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                  }`}
                  onClick={() => {
                    setSelectedSubject(isSelected ? '' : subject.id);
                    if (!isSelected) {
                      setSelectedTopic('');
                      setSelectedTest('');
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getSubjectColor(subject.subjectName)} flex items-center justify-center shadow-lg`}>
                        <SubjectIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900 truncate max-w-[130px]">{subject.subjectName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{subject.examType}</p>
                        <p className="text-[11px] text-orange-600 font-medium mt-1">{subject.testsCount} tests</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Topic Filter Cards (if any available for selected subject) */}
      {selectedSubject && getTopicsForSubject(selectedSubject).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Topic</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {getTopicsForSubject(selectedSubject).map((topic) => {
              const isSelected = selectedTopic === topic.id;
              return (
                <Card
                  key={topic.id}
                  className={`cursor-pointer transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-orange-500 shadow-lg shadow-orange-500/20 scale-105'
                      : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                  }`}
                  onClick={() => {
                    setSelectedTopic(isSelected ? '' : topic.id);
                    if (!isSelected) setSelectedTest('');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-xs text-gray-900 truncate max-w-[120px]">{topic.name}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <Card className="border-orange-200 bg-orange-50/70">
          <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">Active Filters:</span>
              {selectedSubject && (
                <Badge variant="secondary" className="gap-1 bg-white shadow-xs">
                  {subjects.find((s) => s.id === selectedSubject)?.subjectName || selectedSubject}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSubject('')} />
                </Badge>
              )}
              {selectedTopic && (
                <Badge variant="secondary" className="gap-1 bg-white shadow-xs">
                  {allTopics.find((t) => t.id === selectedTopic)?.name || selectedTopic}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTopic('')} />
                </Badge>
              )}
              {selectedTest && (
                <Badge variant="secondary" className="gap-1 bg-white shadow-xs">
                  {tests.find((t) => t.testId === selectedTest)?.testName || 'Test'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTest('')} />
                </Badge>
              )}
              {selectedStudent && (
                <Badge variant="secondary" className="gap-1 bg-white shadow-xs">
                  {allStudents.find((s) => s.id === selectedStudent)?.name || 'Student'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStudent('')} />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1 bg-white shadow-xs">
                  "{searchQuery}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-orange-700">
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search & Select Filter Bar */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search test name or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedTest} onValueChange={(val) => setSelectedTest(val === 'all' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Tests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tests</SelectItem>
                {tests.map((t) => (
                  <SelectItem key={t.testId} value={t.testId}>
                    {t.testName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val === 'all' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {allStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.standard || 'Std'} - {s.rollNo || s.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.totalTests}</p>
                <p className="text-xs text-muted-foreground">Tests Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.avgScore}%</p>
                <p className="text-xs text-muted-foreground">School Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Student Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.avgPassRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="test-wise" className="rounded-lg">Test-wise</TabsTrigger>
          <TabsTrigger value="topic-wise" className="rounded-lg">Topic-wise</TabsTrigger>
          <TabsTrigger value="student-wise" className="rounded-lg">Student-wise</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Subject-wise Summary */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Subject Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No subject test data recorded yet.</p>
                ) : (
                  subjects.map((subject) => {
                    const SubjectIcon = getSubjectIcon(subject.subjectName);
                    return (
                      <div key={subject.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSubjectColor(subject.subjectName)} flex items-center justify-center`}>
                              <SubjectIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-sm">{subject.subjectName}</span>
                          </div>
                          <Badge variant="outline">{subject.examType}</Badge>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-3xl font-bold">{subject.averageScore}%</p>
                            <p className="text-xs text-muted-foreground">Average Score</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">{subject.testsCount} tests assigned</p>
                            <p>{subject.totalAttempts} total attempts</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Recent Tests */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Recent Test Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPerformance.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No tests found matching the selected filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPerformance.slice(0, 5).map((test) => (
                      <div key={test.testId} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900">{test.testName}</p>
                            <p className="text-xs text-muted-foreground">
                              {test.subjectName} • {test.duration} mins • {new Date(test.conductedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={test.averageScore >= 70 ? 'default' : test.averageScore >= 50 ? 'secondary' : 'outline'}>
                            {test.averageScore}% avg
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-gray-200/60">
                          <span className="flex items-center gap-1 font-medium">
                            <Users className="h-3.5 w-3.5 text-orange-600" />
                            {test.totalStudents} attempted
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Award className="h-3.5 w-3.5 text-amber-600" />
                            {test.passRate}% pass rate
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test-wise Tab */}
        <TabsContent value="test-wise" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Test-wise Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPerformance.length === 0 ? (
                <p className="text-sm text-center py-8 text-muted-foreground">No tests match the current criteria.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test Title</TableHead>
                        <TableHead className="text-center">Scheduled Date</TableHead>
                        <TableHead className="text-center">Attempted</TableHead>
                        <TableHead className="text-center">Avg Score</TableHead>
                        <TableHead className="text-center">Highest</TableHead>
                        <TableHead className="text-center">Lowest</TableHead>
                        <TableHead className="text-center">Pass Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPerformance.map((test) => (
                        <TableRow key={test.testId}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">{test.testName}</p>
                              <p className="text-xs text-muted-foreground">{test.subjectName} ({test.examType})</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {new Date(test.conductedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {test.totalStudents} {test.eligibleStudents > 0 ? `/ ${test.eligibleStudents}` : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={test.averageScore >= 70 ? 'default' : test.averageScore >= 50 ? 'secondary' : 'outline'}>
                              {test.averageScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-emerald-600 font-semibold">{test.highestScore}%</TableCell>
                          <TableCell className="text-center text-rose-600 font-semibold">{test.lowestScore}%</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 font-semibold text-xs">
                              {test.passRate >= 70 ? (
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                              )}
                              <span>{test.passRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topic-wise Tab */}
        <TabsContent value="topic-wise" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-orange-600" />
                Topic-wise Accuracy Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredTopicAccuracy.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No topic-level student answers recorded yet.</p>
                </div>
              ) : (
                filteredTopicAccuracy.map((topic) => (
                  <div key={topic.topicId} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{topic.topicName}</p>
                          <p className="text-xs text-muted-foreground">{topic.subjectName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-bold ${
                          topic.accuracy >= 75 ? 'text-emerald-600' :
                          topic.accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {topic.accuracy}%
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase">Accuracy</p>
                      </div>
                    </div>
                    <Progress
                      value={topic.accuracy}
                      className="h-2.5 mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Correct: <strong className="text-foreground">{topic.correctAnswers}</strong></span>
                      <span>Total Questions Answered: <strong className="text-foreground">{topic.totalQuestions}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student-wise Tab */}
        <TabsContent value="student-wise" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-orange-600" />
                Student-wise Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStudentPerformance.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No completed student attempts found.</p>
                  <p className="text-xs mt-1">Once students start taking tests, their detailed rankings and marks will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
                        <TableHead className="text-center">Rank</TableHead>
                        <TableHead className="text-center">Time Taken</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudentPerformance.map((sp, index) => (
                        <TableRow key={`${sp.studentId}-${sp.testId}-${index}`}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                                {sp.studentName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{sp.studentName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {sp.standard ? `Class ${sp.standard}` : ''} {sp.section ? `(${sp.section})` : ''} • {sp.rollNo || 'EMIS'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{sp.testName}</p>
                              <p className="text-xs text-muted-foreground">{sp.subjectName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold">{sp.score}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={sp.percentage >= 70 ? 'default' : sp.percentage >= 50 ? 'secondary' : 'outline'}>
                              {sp.percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="gap-1 font-semibold">
                              <Award className="h-3 w-3 text-amber-500" />
                              #{sp.rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {sp.timeTaken ? `${sp.timeTaken} mins` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
