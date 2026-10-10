import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  Play,
  CheckCircle,
  Loader2,
  AlertCircle,
  Filter,
  Search,
  Plus,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  Sparkles
} from 'lucide-react';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExams } from '@/lib/useExams';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AssignedTest } from '@/types/student';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const SUBJECTS_BY_EXAM = {
  NEET: [
    { id: 'physics', name: 'Physics', icon: Atom, color: 'from-blue-500 to-blue-600' },
    { id: 'chemistry', name: 'Chemistry', icon: FlaskConical, color: 'from-green-500 to-green-600' },
    { id: 'biology', name: 'Biology', icon: Brain, color: 'from-emerald-500 to-emerald-600' },
  ],
  JEE: [
    { id: 'physics', name: 'Physics', icon: Atom, color: 'from-blue-500 to-blue-600' },
    { id: 'chemistry', name: 'Chemistry', icon: FlaskConical, color: 'from-green-500 to-green-600' },
    { id: 'mathematics', name: 'Mathematics', icon: Calculator, color: 'from-purple-500 to-purple-600' },
  ],
};

const getSubjectsForExam = (examType?: string) => {
  if (examType === 'NEET' || examType === 'JEE') {
    return SUBJECTS_BY_EXAM[examType];
  }
  return [];
};

// Simple date formatter used for availability display: DD/MM/YYYY, HH:mm:ss
const formatSimpleDate = (input?: string | null | Date) => {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  return `${day}/${month}/${year}, ${hours}:${mins}:${secs}`;
};

const difficultyLevels = [
  { value: 'easy', label: 'Easy', description: 'Basic concepts and simple problems' },
  { value: 'medium', label: 'Medium', description: 'Moderate difficulty, mixed concepts' },
  { value: 'hard', label: 'Hard', description: 'Advanced problems and complex concepts' },
  { value: 'mixed', label: 'Mixed', description: 'Combination of all difficulty levels' },
];

const getStatusBadge = (status: AssignedTest['status']) => {
  switch (status) {
    case 'not_started':
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Not Started</Badge>;
    case 'in_progress':
      return <Badge variant="default" className="gap-1 bg-warning text-warning-foreground"><Loader2 className="h-3 w-3 animate-spin" /> In Progress</Badge>;
    case 'submitted':
      return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><CheckCircle className="h-3 w-3" /> Submitted</Badge>;
  }
};

export default function AssignedTests() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState<string>(location.state?.examType || 'all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
  const [tests, setTests] = useState<AssignedTest[]>([]);
  const [recentTests, setRecentTests] = useState<AssignedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    upcomingTests: 0,
    activeTests: 0,
    completedTests: 0,
    inProgressTests: 0
  });

  // Custom test configuration
  const [customTest, setCustomTest] = useState({
    examType: '' as string,
    subjects: [] as string[],
    questionCount: 30,
    duration: 45,
    difficulty: 'medium',
  });

  const { exams } = useExams();


  // Sync exam filter from navigation state
  useEffect(() => {
    if (location.state?.examType) {
      setExamFilter(location.state.examType);
    }
  }, [location.state?.examType]);

  // Fetch assigned tests
  useEffect(() => {
    fetchAssignedTests();
  }, []);

  // Clear subject filter when exam filter changes if subject is not valid for new exam
  useEffect(() => {
    if (subjectFilter !== 'all' && examFilter !== 'all') {
      const allowedSubjects = getSubjectsForExam(examFilter as 'NEET' | 'JEE').map(s => s.id);
      if (!allowedSubjects.includes(subjectFilter)) {
        setSubjectFilter('all');
      }
    }
  }, [examFilter, subjectFilter]);

  const fetchAssignedTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/student/assigned-tests`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

      if (response.data.success) {
        setTests(response.data.data.tests);
        setRecentTests(response.data.data.recentTests || []);
        setStats({
          totalTests: response.data.data.totalTests,
          upcomingTests: response.data.data.upcomingTests,
          activeTests: response.data.data.activeTests,
          completedTests: response.data.data.completedTests,
          inProgressTests: response.data.data.inProgressTests
        });
      }
    } catch (error) {
      console.error('Error fetching assigned tests:', error);
      toast.error('Failed to fetch assigned tests');
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExam = examFilter === 'all' || test.examType === examFilter;
    const matchesSubject = subjectFilter === 'all' || test.subjects.some(subject =>
      subject.toLowerCase() === subjectFilter.toLowerCase()
    );
    const matchesStatus = statusFilter === 'all' || (
      statusFilter === 'published' ? test.rawStatus === 'published' : (
        statusFilter === 'draft' ? test.rawStatus === 'draft' : (
          statusFilter === 'unpublished' ? (test.rawStatus !== 'published') : true
        )
      )
    );

    if (activeTab === 'all') return matchesSearch && matchesExam && matchesSubject && matchesStatus;
    if (activeTab === 'available') return matchesSearch && matchesExam && matchesSubject && matchesStatus && test.isActive && test.status !== 'submitted';
    if (activeTab === 'completed') return matchesSearch && matchesExam && matchesSubject && matchesStatus && test.status === 'submitted';
    if (activeTab === 'upcoming') return matchesSearch && matchesExam && matchesSubject && matchesStatus && test.status === 'upcoming';

    return matchesSearch && matchesExam && matchesSubject;
  });

  // Prepare tests for rendering; sort 'completed' tab by attemptedAt desc so most recent submissions show first
  const displayTests = (() => {
    if (activeTab === 'completed') {
      return filteredTests.slice().sort((a, b) => {
        const ta = a.attemptedAt ? new Date(a.attemptedAt).getTime() : 0;
        const tb = b.attemptedAt ? new Date(b.attemptedAt).getTime() : 0;
        return tb - ta;
      });
    }

    // For available tab, show soonest tests first
    if (activeTab === 'available') {
      return filteredTests.slice().sort((a, b) => {
        const sa = a.startTime ? new Date(a.startTime).getTime() : Infinity;
        const sb = b.startTime ? new Date(b.startTime).getTime() : Infinity;
        return sa - sb;
      });
    }
    // Default (all): show most recent tests first. Use attempt submission time if available, otherwise startTime.
    // Show the newest tests by creation time. Limit to the most recent 10 tests.
    const LAST_COUNT = 10;
    return filteredTests.slice().sort((a, b) => {
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    }).slice(0, LAST_COUNT);
  })();

  const handleSubjectToggle = (subjectId: string) => {
    setCustomTest(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(s => s !== subjectId)
        : [...prev.subjects, subjectId]
    }));
  };

  const handleCreateCustomTest = () => {
    if (customTest.subjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    const subjectNames = customTest.subjects.map(id =>
      getSubjectsForExam(customTest.examType).find(s => s.id === id)?.name
    ).filter(Boolean);

    toast.success('Custom test created successfully!', {
      description: `${customTest.questionCount} questions, ${customTest.duration} minutes`
    });

    setIsCreateTestOpen(false);

    // Navigate to exam interface with custom test
    navigate(`/student/exam/custom-${Date.now()}`);
  };

  const resetCustomTest = () => {
    setCustomTest({
      examType: 'NEET',
      subjects: [],
      questionCount: 30,
      duration: 45,
      difficulty: 'medium',
    });
  };

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assigned Tests</h1>
            <p className="text-muted-foreground mt-1">View and attempt your assigned tests</p>
          </div>
          {/* <Button 
            onClick={() => setIsCreateTestOpen(true)}
            className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md"
          >
            <Sparkles className="h-4 w-4" />
            Create Own Test
          </Button> */}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Exam Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(examFilter === 'all' ? [...SUBJECTS_BY_EXAM.NEET, ...SUBJECTS_BY_EXAM.JEE] : getSubjectsForExam(examFilter as 'NEET' | 'JEE'))
                .filter((subject, index, self) => self.findIndex(s => s.id === subject.id) === index) // Remove duplicates
                .map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({stats.totalTests})</TabsTrigger>
            <TabsTrigger value="available">Available ({stats.activeTests})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({stats.upcomingTests})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({stats.completedTests})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {loading && (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading tests...</p>
                </CardContent>
              </Card>
            )}

            {!loading && filteredTests.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No tests found</h3>
                  <p className="text-muted-foreground mt-1">No tests match your current filters</p>
                </CardContent>
              </Card>
            )}

            {!loading && filteredTests.length > 0 && (
              <div>
                {displayTests.map((test) => (
                  <Card key={test.id} className="border-0 shadow-sm overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="p-4 md:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className={test.examType === 'NEET' ? 'bg-success/10 text-success border-success/30' : 'bg-info/10 text-info border-info/30'}>
                                {test.examType}
                              </Badge>
                              {/* If test has a non-published raw status, show it clearly */}
                              {test.rawStatus && test.rawStatus !== 'published' ? (
                                <Badge variant="outline" className="gap-1 text-xs">{test.rawStatus === 'draft' ? 'Draft' : 'Unpublished'}</Badge>
                              ) : (
                                getStatusBadge(test.status)
                              )}
                              {test.isActive && test.status !== 'submitted' && (
                                <Badge variant="destructive" className="animate-pulse">
                                  <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full mr-1.5" />
                                  LIVE
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-lg font-semibold text-foreground mb-2">{test.title}</h3>

                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {test.duration} minutes
                              </span>
                              <span>{test.totalQuestions} Questions</span>
                              <span>{test.totalMarks} Marks</span>
                            </div>


                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {test.subjects.map((subject) => (
                                <Badge key={subject} variant="secondary" className="text-xs">{subject}</Badge>
                              ))}
                            </div>

                            <p className="text-xs text-muted-foreground mt-3">{formatSimpleDate(test.startTime)} - {formatSimpleDate(test.endTime)}</p>
                            {test.rawStatus === 'published' && (() => {
                              const now = new Date();
                              const start = test.startTime ? new Date(test.startTime) : null;
                              const end = test.endTime ? new Date(test.endTime) : null;
                              const inWindow = (!start || now >= start) && (!end || now <= end);
                              if (!inWindow) {
                                if (start && now < start) {
                                  return <p className="text-xs text-muted-foreground mt-1">Available from {formatSimpleDate(start)}</p>;
                                }
                                if (end && now > end) {
                                  return <p className="text-xs text-muted-foreground mt-1">Available until {formatSimpleDate(end)}</p>;
                                }
                              }
                              return null;
                            })()}
                          </div>

                          <div className="shrink-0">
                            {(() => {
                              // Results are available as soon as the test is submitted (no separate "publish marks" step)
                              if (test.status === 'submitted') {
                                const hasScore = typeof test.obtainedScore !== 'undefined' && test.obtainedScore !== null;
                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    {hasScore && (
                                      <span className="text-sm font-semibold text-foreground">
                                        {test.obtainedScore}{test.totalMarks ? ` / ${test.totalMarks}` : ''}
                                      </span>
                                    )}
                                    <Link to={`/student/results/${test.id}`}>
                                      <Button variant="outline" size="sm">View Result</Button>
                                    </Link>
                                  </div>
                                );
                              }

                              if (test.status === 'in_progress') {
                                return (
                                  <Link to={`/student/exam/${test.id}`}>
                                    <Button size="sm" className="gap-1.5"><Play className="h-4 w-4" />Continue</Button>
                                  </Link>
                                );
                              }

                              if (test.rawStatus === 'published') {
                                // Only offer Start while the test window is open
                                const now = new Date();
                                const start = test.startTime ? new Date(test.startTime) : null;
                                const end = test.endTime ? new Date(test.endTime) : null;
                                if (start && now < start) {
                                  return <Button size="sm" disabled className="gap-1.5"><Clock className="h-4 w-4" />Opens soon</Button>;
                                }
                                if (end && now > end) {
                                  return <Button size="sm" disabled className="gap-1.5"><Clock className="h-4 w-4" />Test ended</Button>;
                                }
                                return (
                                  <Link to={`/student/exam/${test.id}`}>
                                    <Button size="sm" className="gap-1.5"><Play className="h-4 w-4" />Start Test</Button>
                                  </Link>
                                );
                              }

                              return <Button size="sm" disabled className="gap-1.5"><Clock className="h-4 w-4" />Not Available</Button>;
                            })()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </TabsContent>
        </Tabs>

        {/* Create Custom Test Dialog */}
        <Dialog open={isCreateTestOpen} onOpenChange={(open) => {
          setIsCreateTestOpen(open);
          if (!open) resetCustomTest();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Create Your Own Test
              </DialogTitle>
              <DialogDescription>
                Customize your practice test by selecting subjects, difficulty, and number of questions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Exam Type */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Exam Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['NEET', 'JEE'].map((type) => (
                    <Card
                      key={type}
                      className={cn(
                        "cursor-pointer transition-all duration-200 border-2",
                        customTest.examType === type
                          ? "border-orange-500 bg-orange-50 shadow-lg"
                          : "border-gray-200 hover:border-orange-300"
                      )}
                      onClick={() => setCustomTest(prev => {
                        const newExam = type as 'NEET' | 'JEE';
                        const allowed = getSubjectsForExam(newExam).map(s => s.id);
                        return { ...prev, examType: newExam, subjects: prev.subjects.filter(sid => allowed.includes(sid)) };
                      })}
                    >
                      <CardContent className="p-4 text-center">
                        <p className={cn(
                          "text-lg font-bold",
                          customTest.examType === type ? "text-orange-600" : "text-gray-700"
                        )}>
                          {type}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Select Subjects */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Subjects</Label>
                <div className="grid grid-cols-2 gap-3">
                  {getSubjectsForExam(customTest.examType).map((subject) => {
                    const SubjectIcon = subject.icon;
                    const isSelected = customTest.subjects.includes(subject.id);

                    return (
                      <Card
                        key={subject.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 border-2",
                          isSelected
                            ? "border-orange-500 shadow-lg shadow-orange-500/20 scale-105"
                            : "border-gray-200 hover:border-orange-300 hover:shadow-md"
                        )}
                        onClick={() => handleSubjectToggle(subject.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md",
                              `bg-gradient-to-br ${subject.color}`
                            )}>
                              <SubjectIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{subject.name}</p>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {customTest.subjects.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {customTest.subjects.length} subject{customTest.subjects.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Difficulty Level */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Difficulty Level</Label>
                <Select
                  value={customTest.difficulty}
                  onValueChange={(value) => setCustomTest({ ...customTest, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{level.label}</span>
                          <span className="text-xs text-muted-foreground">{level.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Number of Questions</Label>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {customTest.questionCount}
                  </Badge>
                </div>
                <Slider
                  value={[customTest.questionCount]}
                  onValueChange={([value]) => setCustomTest({ ...customTest, questionCount: value })}
                  min={10}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10 questions</span>
                  <span>100 questions</span>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Test Duration</Label>
                  <Badge variant="secondary" className="text-base px-3 py-1 gap-1">
                    <Clock className="h-3 w-3" />
                    {customTest.duration} mins
                  </Badge>
                </div>
                <Slider
                  value={[customTest.duration]}
                  onValueChange={([value]) => setCustomTest({ ...customTest, duration: value })}
                  min={15}
                  max={180}
                  step={15}
                  className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>15 minutes</span>
                  <span>3 hours</span>
                </div>
              </div>

              {/* Summary */}
              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Test Summary</h4>
                  <div className="space-y-1 text-sm text-orange-800">
                    <p><span className="font-medium">Exam:</span> {customTest.examType}</p>
                    <p><span className="font-medium">Subjects:</span> {customTest.subjects.length > 0
                      ? customTest.subjects.map(id => getSubjectsForExam(customTest.examType).find(s => s.id === id)?.name).join(', ')
                      : 'None selected'
                    }</p>
                    <p><span className="font-medium">Questions:</span> {customTest.questionCount}</p>
                    <p><span className="font-medium">Duration:</span> {customTest.duration} minutes</p>
                    <p><span className="font-medium">Difficulty:</span> {difficultyLevels.find(d => d.value === customTest.difficulty)?.label}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateTestOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomTest}
                disabled={customTest.subjects.length === 0}
                className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                <Play className="h-4 w-4" />
                Start Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
