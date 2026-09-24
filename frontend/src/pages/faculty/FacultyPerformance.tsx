import React, { useState } from 'react';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
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
import { SubjectPerformance, TopicAccuracy } from '@/types/faculty';
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
  GraduationCap
} from 'lucide-react';

const mockTopics = [
  { id: 'top-001', name: 'Mechanics', subjectId: 'sub-001', subjectName: 'Physics' },
  { id: 'top-002', name: 'Thermodynamics', subjectId: 'sub-001', subjectName: 'Physics' },
  { id: 'top-003', name: 'Optics', subjectId: 'sub-001', subjectName: 'Physics' },
  { id: 'top-004', name: 'Electromagnetism', subjectId: 'sub-002', subjectName: 'Physics' },
  { id: 'top-005', name: 'Organic Chemistry', subjectId: 'sub-003', subjectName: 'Chemistry' },
  { id: 'top-006', name: 'Inorganic Chemistry', subjectId: 'sub-003', subjectName: 'Chemistry' },
];

const mockTests = [
  { id: '1', name: 'Physics Unit Test 1', subjectId: 'sub-001', topicId: 'top-001', conductedAt: '2024-02-15' },
  { id: '2', name: 'Physics Mid-term', subjectId: 'sub-001', topicId: 'top-002', conductedAt: '2024-02-28' },
  { id: '3', name: 'Chemistry Organic Test', subjectId: 'sub-003', topicId: 'top-005', conductedAt: '2024-03-01' },
  { id: '4', name: 'Physics Final Practice', subjectId: 'sub-001', topicId: 'top-003', conductedAt: '2024-03-10' },
];

const mockStudents = [
  { id: 's1', name: 'Rahul Kumar', rollNo: 'NEET2024001', batch: 'NEET 2024' },
  { id: 's2', name: 'Priya Sharma', rollNo: 'NEET2024002', batch: 'NEET 2024' },
  { id: 's3', name: 'Amit Patel', rollNo: 'JEE2024001', batch: 'JEE 2024' },
  { id: 's4', name: 'Sneha Reddy', rollNo: 'NEET2024003', batch: 'NEET 2024' },
  { id: 's5', name: 'Karthik Iyer', rollNo: 'JEE2024002', batch: 'JEE 2024' },
];

const mockPerformanceData: SubjectPerformance[] = [
  { testId: '1', testName: 'Physics Unit Test 1', subjectName: 'Physics', totalStudents: 120, averageScore: 78, highestScore: 98, lowestScore: 45, passRate: 85, conductedAt: '2024-02-15' },
  { testId: '2', testName: 'Physics Mid-term', subjectName: 'Physics', totalStudents: 115, averageScore: 72, highestScore: 95, lowestScore: 38, passRate: 78, conductedAt: '2024-02-28' },
  { testId: '3', testName: 'Chemistry Organic Test', subjectName: 'Chemistry', totalStudents: 98, averageScore: 81, highestScore: 100, lowestScore: 52, passRate: 89, conductedAt: '2024-03-01' },
  { testId: '4', testName: 'Physics Final Practice', subjectName: 'Physics', totalStudents: 110, averageScore: 75, highestScore: 96, lowestScore: 42, passRate: 82, conductedAt: '2024-03-10' },
];

const mockTopicAccuracy: TopicAccuracy[] = [
  { topicId: 'top-001', topicName: 'Mechanics', totalQuestions: 450, correctAnswers: 342, accuracy: 76 },
  { topicId: 'top-002', topicName: 'Thermodynamics', totalQuestions: 380, correctAnswers: 312, accuracy: 82 },
  { topicId: 'top-003', topicName: 'Optics', totalQuestions: 290, correctAnswers: 247, accuracy: 85 },
  { topicId: 'top-004', topicName: 'Electromagnetism', totalQuestions: 420, correctAnswers: 294, accuracy: 70 },
  { topicId: 'top-005', topicName: 'Organic Chemistry', totalQuestions: 350, correctAnswers: 301, accuracy: 86 },
  { topicId: 'top-006', topicName: 'Inorganic Chemistry', totalQuestions: 280, correctAnswers: 218, accuracy: 78 },
];

const mockStudentPerformance = [
  { studentId: 's1', studentName: 'Rahul Kumar', testId: '1', testName: 'Physics Unit Test 1', score: 85, percentage: 85, rank: 12, timeTaken: 55, topicId: 'top-001' },
  { studentId: 's1', studentName: 'Rahul Kumar', testId: '2', testName: 'Physics Mid-term', score: 78, percentage: 78, rank: 25, timeTaken: 58, topicId: 'top-002' },
  { studentId: 's2', studentName: 'Priya Sharma', testId: '1', testName: 'Physics Unit Test 1', score: 92, percentage: 92, rank: 5, timeTaken: 52, topicId: 'top-001' },
  { studentId: 's2', studentName: 'Priya Sharma', testId: '3', testName: 'Chemistry Organic Test', score: 88, percentage: 88, rank: 8, timeTaken: 65, topicId: 'top-005' },
  { studentId: 's3', studentName: 'Amit Patel', testId: '2', testName: 'Physics Mid-term', score: 95, percentage: 95, rank: 2, timeTaken: 48, topicId: 'top-002' },
  { studentId: 's4', studentName: 'Sneha Reddy', testId: '1', testName: 'Physics Unit Test 1', score: 76, percentage: 76, rank: 35, timeTaken: 60, topicId: 'top-001' },
  { studentId: 's5', studentName: 'Karthik Iyer', testId: '4', testName: 'Physics Final Practice', score: 89, percentage: 89, rank: 6, timeTaken: 50, topicId: 'top-003' },
];

export default function FacultyPerformance() {
  const { allocatedSubjects } = useFacultyAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Helper functions for subject icons and colors
  const getSubjectIcon = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('physics')) return Atom;
    if (name.includes('chemistry')) return FlaskConical;
    if (name.includes('biology') || name.includes('botany') || name.includes('zoology')) return Brain;
    if (name.includes('mathematics') || name.includes('math')) return Calculator;
    return BookOpen;
  };

  const getSubjectColor = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('physics')) return 'from-blue-500 to-blue-600';
    if (name.includes('chemistry')) return 'from-green-500 to-green-600';
    if (name.includes('biology') || name.includes('botany') || name.includes('zoology')) return 'from-emerald-500 to-emerald-600';
    if (name.includes('mathematics') || name.includes('math')) return 'from-purple-500 to-purple-600';
    return 'from-orange-500 to-orange-600';
  };

  const getTopicsForSubject = (subjectId: string) => {
    return mockTopics.filter(t => t.subjectId === subjectId);
  };

  const getTestsForFilters = () => {
    return mockTests.filter(t => {
      if (selectedSubject && t.subjectId !== selectedSubject) return false;
      if (selectedTopic && t.topicId !== selectedTopic) return false;
      return true;
    });
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
  const filteredPerformance = mockPerformanceData.filter(p => {
    if (selectedSubject) {
      const subject = allocatedSubjects.find(s => s.id === selectedSubject);
      if (p.subjectName !== subject?.subjectName) return false;
    }
    if (selectedTest && p.testId !== selectedTest) return false;
    return true;
  });

  const filteredTopicAccuracy = mockTopicAccuracy.filter(t => {
    if (selectedSubject) {
      const topic = mockTopics.find(mt => mt.id === t.topicId);
      if (topic && topic.subjectId !== selectedSubject) return false;
    }
    if (selectedTopic && t.topicId !== selectedTopic) return false;
    return true;
  });

  const filteredStudentPerformance = mockStudentPerformance.filter(sp => {
    if (selectedStudent && sp.studentId !== selectedStudent) return false;
    if (selectedTest && sp.testId !== selectedTest) return false;
    if (selectedTopic && sp.topicId !== selectedTopic) return false;
    if (searchQuery && !sp.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const overallStats = {
    totalTests: filteredPerformance.length,
    avgScore: Math.round(filteredPerformance.reduce((acc, p) => acc + p.averageScore, 0) / filteredPerformance.length) || 0,
    totalStudents: filteredPerformance.reduce((acc, p) => acc + p.totalStudents, 0),
    avgPassRate: Math.round(filteredPerformance.reduce((acc, p) => acc + p.passRate, 0) / filteredPerformance.length) || 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">Comprehensive performance tracking and analysis</p>
        </div>
      </div>

      {/* Subject Filter Cards */}
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
          {allocatedSubjects.map((subject) => {
            const SubjectIcon = getSubjectIcon(subject.subjectName);
            const isSelected = selectedSubject === subject.id;
            
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
                      <p className="font-semibold text-sm text-gray-900">{subject.subjectName}</p>
                      <p className="text-xs text-gray-500 mt-1">{subject.examType}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Topic Filter Cards */}
      {selectedSubject && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Topic</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {getTopicsForSubject(selectedSubject).map((topic) => {
              const isSelected = selectedTopic === topic.id;
              const selectedSubjectData = allocatedSubjects.find(s => s.id === selectedSubject);
              
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
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getSubjectColor(selectedSubjectData?.subjectName || '')} flex items-center justify-center opacity-80`}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-medium text-sm text-gray-900">{topic.name}</p>
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
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Active Filters:</span>
              {selectedSubject && (
                <Badge variant="secondary" className="gap-1">
                  {allocatedSubjects.find(s => s.id === selectedSubject)?.subjectName}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setSelectedSubject('');
                      setSelectedTopic('');
                      setSelectedTest('');
                    }}
                  />
                </Badge>
              )}
              {selectedTopic && (
                <Badge variant="secondary" className="gap-1">
                  {mockTopics.find(t => t.id === selectedTopic)?.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setSelectedTopic('');
                      setSelectedTest('');
                    }}
                  />
                </Badge>
              )}
              {selectedTest && (
                <Badge variant="secondary" className="gap-1">
                  {mockTests.find(t => t.id === selectedTest)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTest('')} />
                </Badge>
              )}
              {selectedStudent && (
                <Badge variant="secondary" className="gap-1">
                  {mockStudents.find(s => s.id === selectedStudent)?.name}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStudent('')} />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedTest} onValueChange={(value) => setSelectedTest(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tests</SelectItem>
                {getTestsForFilters().map((test) => (
                  <SelectItem key={test.id} value={test.id}>
                    {test.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStudent || 'all'} onValueChange={(value) => setSelectedStudent(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {mockStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} ({student.rollNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.totalTests}</p>
                <p className="text-xs text-muted-foreground">Tests Conducted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Target className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-4/10">
                <Award className="h-5 w-5 text-chart-4" />
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="test-wise">Test-wise</TabsTrigger>
          <TabsTrigger value="topic-wise">Topic-wise</TabsTrigger>
          <TabsTrigger value="student-wise">Student-wise</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Subject-wise Summary */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Subject-wise Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allocatedSubjects.map((subject) => {
                  const subjectTests = mockPerformanceData.filter(p => p.subjectName === subject.subjectName);
                  const avgScore = subjectTests.length > 0 
                    ? Math.round(subjectTests.reduce((acc, p) => acc + p.averageScore, 0) / subjectTests.length)
                    : 0;

                  const SubjectIcon = getSubjectIcon(subject.subjectName);

                  return (
                    <div key={subject.id} className={`p-4 rounded-lg bg-gradient-to-br ${getSubjectColor(subject.subjectName)} bg-opacity-10`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSubjectColor(subject.subjectName)} flex items-center justify-center`}>
                            <SubjectIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium">{subject.subjectName}</span>
                        </div>
                        <Badge variant="outline">{subject.examType}</Badge>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-bold">{avgScore}%</p>
                          <p className="text-xs text-muted-foreground">Average Score</p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{subjectTests.length} tests</p>
                          <p>{subjectTests.reduce((acc, t) => acc + t.totalStudents, 0)} attempts</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Tests */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Test Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredPerformance.slice(0, 5).map((test) => (
                    <div key={test.testId} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{test.testName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(test.conductedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={test.averageScore >= 75 ? 'default' : test.averageScore >= 60 ? 'secondary' : 'destructive'}>
                          {test.averageScore}%
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {test.totalStudents} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {test.passRate}% pass rate
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.totalTests}</p>
                <p className="text-xs text-muted-foreground">Tests Conducted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Target className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-4/10">
                <Award className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.avgPassRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>

        {/* Test-wise Tab */}
        <TabsContent value="test-wise" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Test-wise Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Students</TableHead>
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
                            <p className="font-medium">{test.testName}</p>
                            <p className="text-xs text-muted-foreground">{test.subjectName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {new Date(test.conductedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">{test.totalStudents}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={test.averageScore >= 75 ? 'default' : test.averageScore >= 60 ? 'secondary' : 'destructive'}>
                            {test.averageScore}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-chart-2 font-semibold">{test.highestScore}%</TableCell>
                        <TableCell className="text-center text-destructive font-semibold">{test.lowestScore}%</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {test.passRate >= 80 ? (
                              <TrendingUp className="h-4 w-4 text-chart-2" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                            <span>{test.passRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topic-wise Tab */}
        <TabsContent value="topic-wise" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Topic-wise Accuracy Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredTopicAccuracy.map((topic) => (
                <div key={topic.topicId} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{topic.topicName}</p>
                        <p className="text-xs text-muted-foreground">
                          {mockTopics.find(t => t.id === topic.topicId)?.subjectName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${
                        topic.accuracy >= 80 ? 'text-chart-2' : 
                        topic.accuracy >= 60 ? 'text-chart-4' : 'text-destructive'
                      }`}>
                        {topic.accuracy}%
                      </span>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                  <Progress 
                    value={topic.accuracy} 
                    className={`h-3 mb-2 ${
                      topic.accuracy >= 80 ? '[&>div]:bg-chart-2' : 
                      topic.accuracy >= 60 ? '[&>div]:bg-chart-4' : '[&>div]:bg-destructive'
                    }`}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Correct: <span className="font-semibold text-foreground">{topic.correctAnswers}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">{topic.totalQuestions}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Wrong: <span className="font-semibold text-foreground">{topic.totalQuestions - topic.correctAnswers}</span>
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student-wise Tab */}
        <TabsContent value="student-wise" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Student-wise Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
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
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{sp.studentName}</p>
                              <p className="text-xs text-muted-foreground">
                                {mockStudents.find(s => s.id === sp.studentId)?.rollNo}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{sp.testName}</p>
                            <p className="text-xs text-muted-foreground">
                              {mockTopics.find(t => t.id === sp.topicId)?.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{sp.score}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={sp.percentage >= 75 ? 'default' : sp.percentage >= 60 ? 'secondary' : 'destructive'}>
                            {sp.percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1">
                            <Award className="h-3 w-3" />
                            #{sp.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {sp.timeTaken} mins
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
