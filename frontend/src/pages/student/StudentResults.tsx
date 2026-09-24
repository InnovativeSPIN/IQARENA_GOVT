import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Filter, 
  Search, 
  Eye,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  X,
  BookOpen,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestAttempt, QuestionReview } from '@/types/student';
import { cn } from '@/lib/utils';
import { useExams } from '@/lib/useExams';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ;

export default function StudentResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [results, setResults] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewShowRaw, setPreviewShowRaw] = useState(false);
  type ServerQuestion = {
    id: number | string;
    questionText: string;
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
    correctAnswer?: string | null;
    studentAnswer?: string | null;
    isCorrect?: boolean;
    images?: {
      question?: string | null;
      optionA?: string | null;
      optionB?: string | null;
      optionC?: string | null;
      optionD?: string | null;
      explanation?: string | null;
    } | null;
    explanation?: string | null;
    marks?: number | null;
    isMarkedForReview?: boolean;
    subject?: string | null;
  };

  interface PreviewDataType {
    attempt: TestAttempt & { rank?: number; totalParticipants?: number; percentile?: number };
    stats: {
      totalQuestions: number;
      attempted: number;
      unattempted: number;
      correct: number;
      incorrect: number;
      markedForReview: number;
    };
    questions: ServerQuestion[];
    subjectWise?: Array<{subject: string, totalQuestions: number, attempted: number, correct: number, incorrect: number, unattempted: number}>;
  }

  const [previewData, setPreviewData] = useState<PreviewDataType | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all'|'correct'|'wrong'|'unattempted'>('all');
  const navigate = useNavigate();
  const { exams } = useExams();

  const openPreview = async (testId: string) => {
    try {
      setPreviewLoading(true);
      setPreviewLoadingId(testId);
      const res = await axios.get(`${API_URL}/student/results/${testId}`);
      if (res.data && res.data.success) {
        setPreviewData(res.data.data);
        setPreviewFilter('all');
        setPreviewOpen(true);
      } else {
        toast.error('Failed to load preview');
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      toast.error('Failed to load preview');
    } finally {
      setPreviewLoading(false);
      setPreviewLoadingId(null);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const [stats, setStats] = useState({
    totalTests: 0,
    highestScore: 0,
    averageScore: 0,
    totalRank1: 0,
  });
  const [availableSubjects, setAvailableSubjects] = useState<Array<{id: string, name: string, count: number}>>([]);

  // Exam-specific subject lists
  // Filter subjects based on selected exam filter (uses availableSubjects.examType populated by backend)
  const getFilteredSubjects = () => {
    if (examFilter === 'all') {
      return availableSubjects.filter(s => s.count > 0);
    }
    return availableSubjects.filter(s => s.count > 0 && (s.examType === examFilter));
  };

  // Fetch results on component mount
  useEffect(() => {
    fetchResults();
  }, []);

  // Clear selected subject when exam filter changes if subject is not valid for new exam
  useEffect(() => {
    if (selectedSubject && examFilter !== 'all') {
      const allowedSubjects = EXAM_SUBJECTS[examFilter as keyof typeof EXAM_SUBJECTS] || [];
      if (!allowedSubjects.includes(selectedSubject)) {
        setSelectedSubject('');
      }
    }
  }, [examFilter, selectedSubject]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/student/results`);
      
      if (response.data.success) {
        setResults(response.data.data.results);
        setStats(response.data.data.stats);
        setAvailableSubjects(response.data.data.availableSubjects);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to fetch test results');
    } finally {
      setLoading(false);
    }
  };

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

  const clearFilters = () => {
    setSelectedSubject('');
    setExamFilter('all');
    setSearchQuery('');
  };

  const activeFiltersCount = [selectedSubject, examFilter !== 'all' ? examFilter : '', searchQuery].filter(Boolean).length;

  const filteredResults = results.filter((result) => {
    const matchesSearch = result.testTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExam = examFilter === 'all' || result.examType === examFilter;
    const matchesSubject = !selectedSubject || result.subject === selectedSubject;
    return matchesSearch && matchesExam && matchesSubject;
  });

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results & Performance</h1>
          <p className="text-muted-foreground mt-1">Track your exam performance</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="inline-flex p-2 rounded-xl bg-primary/10 text-primary mb-2">
                <Target className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.totalTests}</p>
              <p className="text-xs text-muted-foreground">Tests Taken</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="inline-flex p-2 rounded-xl bg-success/10 text-success mb-2">
                <Trophy className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.highestScore}%</p>
              <p className="text-xs text-muted-foreground">Highest Score</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="inline-flex p-2 rounded-xl bg-info/10 text-info mb-2">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : stats.averageScore}%</p>
              <p className="text-xs text-muted-foreground">Average Score</p>
            </CardContent>
          </Card>
         
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {getFilteredSubjects().map((subject) => {
              const SubjectIcon = getSubjectIcon(subject.name);
              const isSelected = selectedSubject === subject.name;
              
              return (
                <Card
                  key={subject.id}
                  className={cn(
                    "cursor-pointer transition-all duration-300 border-2",
                    isSelected
                      ? "border-orange-500 shadow-lg shadow-orange-500/20 scale-105"
                      : "border-gray-200 hover:border-orange-300 hover:shadow-md"
                  )}
                  onClick={() => setSelectedSubject(isSelected ? '' : subject.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={cn(
                        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                        `bg-gradient-to-br ${getSubjectColor(subject.name)}`
                      )}>
                        <SubjectIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{subject.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {subject.count} {subject.count === 1 ? 'result' : 'results'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Active Filters:</span>
                {selectedSubject && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedSubject}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSelectedSubject('')}
                    />
                  </Badge>
                )}
                {examFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {examFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setExamFilter('all')}
                    />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchQuery}"
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSearchQuery('')}
                    />
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search results..."
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
        </div>

        {/* Results List */}
        <div className="space-y-3">
          {loading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading results...</p>
              </CardContent>
            </Card>
          ) : filteredResults.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeFiltersCount > 0 
                    ? "Try adjusting your filters to see more results"
                    : "You haven't taken any tests yet"
                  }
                </p>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredResults.map((result) => {
              const SubjectIcon = getSubjectIcon(result.subject || '');
              const resultWithCP = result as unknown as { correctPercentage?: number };
              const correctPct = typeof resultWithCP.correctPercentage !== 'undefined' ? resultWithCP.correctPercentage : (result.totalQuestions ? Math.round(((result.correct||0)/result.totalQuestions)*100) : 0);
              
              return (
                <Card key={result.id} className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="p-4 md:p-5">
                      <div className="flex items-start gap-4">
                        {/* Subject Icon */}
                        <div className={cn(
                          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0",
                          `bg-gradient-to-br ${getSubjectColor(result.subject || '')}`
                        )}>
                          <SubjectIcon className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "font-semibold",
                                (() => {
                                // Choose badge color based on exam name
                                const name = String(result.examType || '').toUpperCase();
                                if (name === 'NEET') return 'bg-green-50 text-green-700 border-green-200';
                                if (name === 'JEE') return 'bg-blue-50 text-blue-700 border-blue-200';
                                // fallback deterministic color
                                return 'bg-gray-50 text-gray-700 border-gray-200';
                              })()
                              )}
                            >
                              {result.examType}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className="bg-gray-50 text-gray-700 border-gray-200"
                            >
                              {result.subject || 'General'}
                            </Badge>
                            {result.isResultReleased ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Result Released
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                Awaiting Result
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{result.testTitle}</h3>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Calendar className="h-4 w-4" />
                            {result.submittedAt}
                          </div>

                          {result.isResultReleased ? (
                            <>
                              <div className="flex items-center gap-4 mb-3">
                                <div>
                                  <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                                    {result.percentage}%
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {result.score}/{result.totalMarks} marks
                                  </p>
                                </div>
                                {result.rank && (
                                  <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 shadow-sm">
                                    <div className="flex items-center gap-1">
                                      <Trophy className="h-4 w-4 text-yellow-600" />
                                      <p className="text-xl font-bold text-yellow-700">#{result.rank}</p>
                                    </div>
                                    <p className="text-xs text-yellow-600">Rank</p>
                                  </div>
                                )}
                              </div>
                              <Progress 
                                value={result.percentage} 
                                className={cn(
                                  "h-2",
                                  result.percentage >= 80 ? "[&>div]:bg-green-500" :
                                  result.percentage >= 60 ? "[&>div]:bg-yellow-500" :
                                  "[&>div]:bg-red-500"
                                )}
                              />
                              <div className="flex justify-between mt-2 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  Attempted: {result.attempted}/{result.totalQuestions}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                                  Unattempted: {result.unattempted}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-700" />
                                  Correct Rate: {`${correctPct}%`}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Correct:</span>
                                  <span className="ml-1">{result.correct ?? 0}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="font-medium">Wrong:</span>
                                  <span className="ml-1">{result.incorrect ?? 0}</span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-700 font-medium">
                                Results will be available soon. You'll be notified when released.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {result.isResultReleased ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPreview(result.testId)}
                                disabled={previewLoading && previewLoadingId === result.testId.toString()}
                                className="hidden sm:inline"
                              >
                                {previewLoading && previewLoadingId === result.testId.toString() ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <span className="text-sm">Preview</span>
                                )}
                              </Button>

                              <Button 
                                size="sm" 
                                className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md"
                                onClick={async () => {
                                  try {
                                    setLoadingDetailId(result.testId.toString());
                                    const res = await axios.get(`${API_URL}/student/results/${result.testId}`);
                                    if (res.data && res.data.success) {
                                      // pass the report payload in state to avoid re-fetch on detail page
                                      navigate(`/student/results/${result.testId}`, { state: { report: res.data.data } });
                                    } else {
                                      toast.error('Failed to load result details');
                                    }
                                  } catch (err) {
                                    console.error('Error loading detail:', err);
                                    toast.error('Failed to load result details');
                                  } finally {
                                    setLoadingDetailId(null);
                                  }
                                }}
                                disabled={loadingDetailId === result.testId.toString()}
                              >
                                {loadingDetailId === result.testId.toString() ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    <span className="hidden sm:inline">View Details</span>
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              Pending
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview(); setPreviewOpen(open); }}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{previewData?.attempt?.testTitle || 'Result Preview'}</DialogTitle>
            <DialogDescription className="mt-1">{previewData?.attempt?.examType} • {previewData?.attempt?.subject || 'General'}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3 overflow-auto max-h-[calc(90vh-120px)]">
            {/* Summary */}
            {previewLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            ) : previewData ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="text-lg font-bold">{previewData.attempt.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{previewData.attempt.score}/{previewData.attempt.totalMarks}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/20 text-center">
                    <p className="text-sm text-muted-foreground">Rank</p>
                    <p className="text-lg font-bold">#{previewData.attempt.rank}{previewData.attempt.totalParticipants ? ` / ${previewData.attempt.totalParticipants}` : ''}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button className={cn('px-3 py-1 rounded-md text-sm', previewFilter === 'all' ? 'bg-primary text-white' : 'bg-muted')} onClick={() => setPreviewFilter('all')}>All ({previewData.questions.length})</button>
                    <button className={cn('px-3 py-1 rounded-md text-sm', previewFilter === 'correct' ? 'bg-success text-white' : 'bg-muted')} onClick={() => setPreviewFilter('correct')}>Correct ({previewData.stats.correct})</button>
                    <button className={cn('px-3 py-1 rounded-md text-sm', previewFilter === 'wrong' ? 'bg-destructive text-white' : 'bg-muted')} onClick={() => setPreviewFilter('wrong')}>Wrong ({previewData.stats.incorrect})</button>
                    <button className={cn('px-3 py-1 rounded-md text-sm', previewFilter === 'unattempted' ? 'bg-muted text-white' : 'bg-muted')} onClick={() => setPreviewFilter('unattempted')}>Skipped ({previewData.stats.unattempted})</button>
                  </div>

                  {previewData.subjectWise && previewData.subjectWise.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {previewData.subjectWise.map((s: {subject:string,totalQuestions:number,attempted:number,correct:number,incorrect:number,unattempted:number,percentage?:number}) => (
                        <Badge key={s.subject} variant="outline" className="text-xs">
                          {s.subject}: {s.correct}/{s.totalQuestions} correct {typeof s.percentage !== 'undefined' ? `• ${s.percentage}%` : ''}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2 max-h-[50vh] overflow-auto">
                  {previewData.questions && previewData.questions.length > 0 ? (
                    previewData.questions.filter((q: ServerQuestion) => {
                      if (previewFilter === 'all') return true;
                      if (previewFilter === 'correct') return q.isCorrect === true;
                      if (previewFilter === 'wrong') return q.isCorrect === false && q.studentAnswer != null;
                      if (previewFilter === 'unattempted') return q.studentAnswer == null;
                      return true;
                    }).map((q: ServerQuestion, idx: number) => (
                      <div key={q.id} className={cn('p-3 rounded-lg border', q.studentAnswer == null ? 'bg-muted/10 border-border' : q.isCorrect ? 'bg-success/10 border-success' : 'bg-destructive/10 border-destructive')}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground">{idx+1}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex-1">
                                {q.images?.question ? <img src={`${import.meta.env.VITE_IMG_API_URL?.replace(/\/+$/, '')}${q.images.question}`} alt="q" className="max-w-full h-auto rounded mb-2" /> : <p className="text-sm font-medium">{q.questionText}</p>}
                              </div>
                              <div className="shrink-0">
                                <Badge variant="secondary" className="text-xs">{q.subject || 'General'}</Badge>
                              </div>
                            </div>

                            <div className="mt-2 space-y-1">
                              {(['A','B','C','D'] as const).map((opt) => {
                                const key = `option${opt}` as keyof typeof q;
                                const isCorrect = q.correctAnswer === opt;
                                const isSelected = q.studentAnswer === opt;
                                return (
                                  <div key={opt} className={cn('flex items-center gap-3 p-2 rounded', isCorrect ? 'bg-success/10 border border-success' : isSelected && !isCorrect ? 'bg-destructive/10 border border-destructive' : 'bg-card')}> 
                                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium', isCorrect ? 'bg-success text-success-foreground' : isSelected ? 'bg-destructive text-destructive-foreground' : 'bg-muted')}>{opt}</div>
                                    <div className="text-sm">{String(((q as Record<string, unknown>)[key]) || '')}</div>
                                    {isCorrect && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
                                    {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600 ml-auto" />}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 text-sm">
                              <strong>Your Answer:</strong> {q.studentAnswer ? `Option ${q.studentAnswer}` : 'Not Attempted'}
                            </div>
                            <div className="mt-1 text-sm">
                              <strong>Correct Answer:</strong> Option {q.correctAnswer}
                            </div>

                            <div className="mt-2 p-2 rounded bg-accent/20 border border-accent">
                              <strong className="block mb-1">💡 Explanation</strong>
                              {q.images?.explanation ? <img src={`${import.meta.env.VITE_IMG_API_URL?.replace(/\/+$/, '')}${q.images.explanation}`} alt="exp" className="max-w-full h-auto rounded" /> : <p className="text-sm text-muted-foreground">{q.explanation || 'No explanation available.'}</p>}
                            </div>

                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No questions available for this attempt.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">No preview data</div>
            )}
          </div>

          {previewShowRaw && (
            <div className="mt-3 p-3 bg-gray-50 border rounded max-h-60 overflow-auto text-xs">
              <pre className="whitespace-pre-wrap">{JSON.stringify(previewData, null, 2)}</pre>
            </div>
          )}

          <DialogFooter className="mt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">Total Questions: {previewData?.stats?.totalQuestions ?? 0}</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreviewShowRaw(s => !s)}>{previewShowRaw ? 'Hide Raw' : 'Show Raw Payload'}</Button>
                <Button variant="outline" size="sm" onClick={() => { if (previewData?.attempt?.testId) navigate(`/student/results/${previewData.attempt.testId}`, { state: { report: previewData } }); }}>Open Details</Button>
                <Button size="sm" onClick={closePreview}>Close</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </StudentLayout>
  );
}
