import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Filter, ChevronDown, ChevronUp, Loader2, BookOpen } from 'lucide-react';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SubjectWiseResult, TestAttempt } from '@/types/student';

  type ServerQuestion = {
    questionTextTa?: string | null;
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

import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL ;
const IMG_URL = import.meta.env.VITE_IMG_API_URL ;

const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  const baseUrl = IMG_URL.endsWith('/') ? IMG_URL.slice(0, -1) : IMG_URL;
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
};

// Format seconds into 'X min Y sec'
const formatTime = (seconds: number | null | undefined) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '0 min 0 sec';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} min ${secs < 10 ? '0' + secs : secs} sec`;
};

export default function ResultDetail() {
  const { testId } = useParams();
  const [activeFilter, setActiveFilter] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  type ResultStats = {
    totalQuestions: number;
    attempted: number;
    unattempted: number;
    correct: number;
    incorrect: number;
    markedForReview: number;
  } | null;

  const [testResult, setTestResult] = useState<(TestAttempt & { rank?: number; totalParticipants?: number; percentile?: number; duration?: number; timeTaken?: number; correctPercentage?: number }) | null>(null);
  const [questions, setQuestions] = useState<ServerQuestion[]>([]);
  const [stats, setStats] = useState<ResultStats>(null);
  const [subjectWise, setSubjectWise] = useState<Array<{subject: string, totalQuestions: number, attempted: number, correct: number, incorrect: number, unattempted: number}> | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const location = useLocation();

  const fetchResultDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/student/results/${testId}`);

      if (response && response.success) {
        setTestResult(response.data.attempt);
        setStats(response.data.stats);
        setQuestions(response.data.questions);
        setSubjectWise(response.data.subjectWise || null);
      }
    } catch (error) {
      console.error('Error fetching result detail:', error);
      toast.error('Failed to fetch result details');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    // If caller passed a preloaded report in location.state, use it to avoid extra fetch
    if (location.state?.report) {
      const report = location.state.report;
      setTestResult(report.attempt);
      setStats(report.stats);
      setQuestions(report.questions);
      setSubjectWise(report.subjectWise || null);
      setLoading(false);
    }

    // Always load the saved result too: it has the rank and subject breakdown the submit response lacks
    if (testId) {
      fetchResultDetail();
    }
  }, [testId, location.state, fetchResultDetail]);

  // Recompute score & percentage from questions to ensure accuracy when passing preloaded report
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    if (!testResult) return;

    const totalMarks = testResult.totalMarks || 0;
    let computedScore = 0;
    questions.forEach(q => {
      const marks = q.marks || 0;
      if (q.studentAnswer == null) return;
      if (q.isCorrect) computedScore += marks;
      else computedScore -= Math.round((marks * 0.25) * 100) / 100;
    });

    const percentage = totalMarks > 0 ? parseFloat(((computedScore / totalMarks) * 100).toFixed(1)) : 0;

    const correctCount = questions.filter(q => q.isCorrect).length;
    const correctPercentage = questions.length > 0 ? parseFloat(((correctCount / questions.length) * 100).toFixed(1)) : 0;

    // Avoid unnecessary setState if values are the same
    if (Math.abs((testResult.score || 0) - computedScore) < 0.0001 && testResult.percentage === percentage && testResult.correctPercentage === correctPercentage) return;

    setTestResult(prev => prev ? ({ ...prev, score: computedScore, percentage, correctPercentage }) : prev);
  }, [questions, testResult]);



  const getQuestionStatus = (question: ServerQuestion): 'correct' | 'wrong' | 'unattempted' => {
    if (!question.studentAnswer) return 'unattempted';
    return question.isCorrect ? 'correct' : 'wrong';
  };

  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === 'all') return true;
    return getQuestionStatus(q) === activeFilter;
  });

  const getStatusIcon = (status: 'correct' | 'wrong' | 'unattempted') => {
    switch (status) {
      case 'correct':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'wrong':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'unattempted':
        return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading result details...</p>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  if (!testResult || !stats) {
    return (
      <StudentLayout>
        <div className="p-4 md:p-6 pb-24 lg:pb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Result not found</p>
              <Link to="/student/results">
                <Button className="mt-4">Back to Results</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/student/results">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{testResult.testTitle}</h1>
            <Badge variant="outline" className="mt-1 bg-success/10 text-success border-success/30">
              {testResult.examType}
            </Badge>
          </div>

        </div>

        {/* Score Summary */}
        <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
          <div className="relative bg-gradient-to-br from-primary to-primary/75 p-5 sm:p-6 text-primary-foreground">
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
            <div className="relative grid grid-cols-1 sm:grid-cols-3 items-center gap-5">
              {/* Score ring */}
              <div className="flex justify-center sm:justify-start">
                {(() => {
                  const pct = Math.max(0, Math.min(100, Number(testResult.percentage) || 0));
                  const r = 42, c = 2 * Math.PI * r;
                  return (
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="9" />
                        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold">{pct}%</span>
                        <span className="text-[10px] uppercase tracking-wide text-primary-foreground/80">Score</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-center">
                <p className="text-primary-foreground/80 text-xs uppercase tracking-wide">Marks</p>
                <p className="text-3xl font-extrabold">{testResult.score} <span className="text-lg font-semibold text-primary-foreground/80">/ {testResult.totalMarks || 0}</span></p>
                <p className="text-xs text-primary-foreground/85 mt-1">
                  Correct {stats.correct} of {stats.totalQuestions} questions
                  {stats.totalQuestions > 0 ? ` (${Math.round((stats.correct / stats.totalQuestions) * 100)}%)` : ''}
                </p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-primary-foreground/80 text-xs uppercase tracking-wide">Rank</p>
                <p className="text-3xl font-extrabold">
                  {testResult.rank ? <>#{testResult.rank}<span className="text-lg font-semibold text-primary-foreground/80">{testResult.totalParticipants ? ` / ${testResult.totalParticipants}` : ''}</span></> : '—'}
                </p>
                {testResult.percentile != null && testResult.rank ? <p className="text-xs text-primary-foreground/85 mt-1">Better than {testResult.percentile}% of students</p> : null}
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="p-2 sm:p-3 rounded-xl bg-success/10">
                <p className="text-xl sm:text-2xl font-bold text-success">{stats.correct}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl bg-destructive/10">
                <p className="text-xl sm:text-2xl font-bold text-destructive">{stats.incorrect}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Wrong</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl bg-muted">
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{stats.unattempted}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Unattempted</p>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Test Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Test Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject:</span>
              <span className="font-medium">{testResult.subject || 'General'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Questions:</span>
              <span className="font-medium">{stats.totalQuestions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{testResult.duration} minutes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time Taken:</span>
              <span className="font-medium">{formatTime(testResult.timeTaken)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Marked for Review:</span>
              <span className="font-medium">{stats.markedForReview}</span>
            </div>
          </CardContent>
        </Card>

        {/* Subject-wise breakdown */}
        {subjectWise && subjectWise.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Subject-wise Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {subjectWise.map(s => (
                  <div key={s.subject} className="p-3 rounded-md bg-muted/10">
                    <p className="text-sm font-medium">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">{s.correct} correct • {s.incorrect} wrong • {s.unattempted} skipped</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Solutions & Review */}
        {showRawData && (
          <div className="p-3 bg-gray-50 rounded border mb-3 text-xs max-h-72 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify({ testResult, stats, questions, subjectWise }, null, 2)}</pre>
          </div>
        )}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Solutions & Review</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Tabs */}
            <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="all">All ({questions.length})</TabsTrigger>
                <TabsTrigger value="correct" className="text-success">
                  Correct ({stats.correct})
                </TabsTrigger>
                <TabsTrigger value="wrong" className="text-destructive">
                  Wrong ({stats.incorrect})
                </TabsTrigger>
                <TabsTrigger value="unattempted">
                  Skipped ({stats.unattempted})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeFilter} className="space-y-3">
                {filteredQuestions.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Questions Available</h3>
                      <p className="text-muted-foreground">This test has no questions or questions could not be retrieved.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredQuestions.map((question, index) => {
                    const questionStatus = getQuestionStatus(question);
                    // compute marks awarded (correct => full marks, wrong => -25% negative, unattempted => 0)
                    const marksAwarded = ((): number => {
                      if (question.studentAnswer == null) return 0;
                      if (question.isCorrect) return Number(question.marks || 0);
                      // negative marking 25%
                      return -Math.round(((question.marks || 0) * 0.25) * 100) / 100;
                    })();

                    return (
                    <div
                      key={question.id}
                      className={cn(
                        "rounded-xl border overflow-hidden",
                        questionStatus === 'correct' && "border-success/30 bg-success/5",
                        questionStatus === 'wrong' && "border-destructive/30 bg-destructive/5",
                        questionStatus === 'unattempted' && "border-border bg-muted/30"
                      )}
                    >
                      {/* Question Header */}
                      <button
                        onClick={() => setExpandedQuestion(
                          expandedQuestion === question.id.toString() ? null : question.id.toString()
                        )}
                        className="w-full p-4 flex items-start gap-3 text-left"
                      >
                        {getStatusIcon(questionStatus)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">Q{index + 1}</Badge>
                            <Badge variant="outline" className="text-xs">{question.marks} marks</Badge>                          <span className="ml-2 text-xs text-muted-foreground">{question.subject || 'General'}</span>                            <Badge className="ml-auto text-xs" variant={questionStatus === 'correct' ? 'default' : questionStatus === 'wrong' ? 'destructive' : 'secondary'}>
                              {marksAwarded > 0 ? `+${marksAwarded}` : `${marksAwarded}`} pts
                            </Badge>
                          </div>
                          {question.images?.question ? (
                            <img 
                              src={getImageUrl(question.images.question)} 
                              alt="Question" 
                              className="max-w-full h-auto rounded mb-2"
                            />
                          ) : (
                            <p className="text-sm text-foreground line-clamp-2">{question.questionText}</p>
                          )}

                          {/* Always-visible answer summary: what the student picked vs the correct option */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground font-medium">Your answer:</span>
                            {question.studentAnswer ? (
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                                questionStatus === 'correct' ? "border-success bg-success/10 text-success" : "border-destructive bg-destructive/10 text-destructive"
                              )}>
                                {questionStatus === 'correct' ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                {question.studentAnswer}
                                {question[`option${question.studentAnswer}` as keyof typeof question] ? ` · ${String(question[`option${question.studentAnswer}` as keyof typeof question])}` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground">
                                <MinusCircle className="h-3.5 w-3.5" /> Not answered
                              </span>
                            )}
                            {questionStatus !== 'correct' && question.correctAnswer && (
                              <>
                                <span className="text-muted-foreground font-medium ml-1">Correct:</span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-success bg-success/10 px-2 py-0.5 font-semibold text-success">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  {question.correctAnswer}
                                  {question[`option${question.correctAnswer}` as keyof typeof question] ? ` · ${String(question[`option${question.correctAnswer}` as keyof typeof question])}` : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {expandedQuestion === question.id.toString() ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {expandedQuestion === question.id.toString() && (
                        <div className="px-4 pb-4 space-y-4">
                          {/* Full Question */}
                          {question.images?.question ? (
                            <img 
                              src={getImageUrl(question.images.question)} 
                              alt="Question" 
                              className="max-w-full h-auto rounded"
                            />
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm text-foreground">{question.questionText}</p>
                              {question.questionTextTa && (
                                <p className="text-sm text-muted-foreground border-t border-border/50 pt-1 mt-1">{question.questionTextTa}</p>
                              )}
                            </div>
                          )}

                          {/* Options */}
                          <div className="space-y-2">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                              const optionKey = `option${opt}`;
                              const optionText = question[optionKey];
                              const optionImg = question.images?.[optionKey];
                              const isCorrect = question.correctAnswer === opt;
                              const isSelected = question.studentAnswer === opt;
                              
                              return (
                                <div
                                  key={opt}
                                  className={cn(
                                    "p-3 rounded-lg border flex items-center gap-3",
                                    isCorrect && "border-success bg-success/10",
                                    isSelected && !isCorrect && "border-destructive bg-destructive/10",
                                    !isCorrect && !isSelected && "border-border bg-card"
                                  )}
                                >
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                                    isCorrect && "bg-success text-success-foreground",
                                    isSelected && !isCorrect && "bg-destructive text-destructive-foreground",
                                    !isCorrect && !isSelected && "bg-muted text-muted-foreground"
                                  )}>
                                    {opt}
                                  </div>
                                  {optionImg ? (
                                    <img 
                                      src={getImageUrl(optionImg)} 
                                      alt={`Option ${opt}`} 
                                      className="max-w-[200px] h-auto rounded"
                                    />
                                  ) : (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-sm">{optionText}</span>
                                      {question[`option${opt}Ta` as keyof typeof question] && (
                                        <span className="text-sm text-muted-foreground border-t border-border/50 pt-1 mt-1">
                                          {String(question[`option${opt}Ta` as keyof typeof question])}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                                    {isSelected && (
                                      <span className={cn(
                                        "text-[11px] font-semibold rounded-full px-2 py-0.5",
                                        isCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                                      )}>
                                        Your answer
                                      </span>
                                    )}
                                    {isCorrect && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                                        <CheckCircle className="h-4 w-4" /> Correct answer
                                      </span>
                                    )}
                                    {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Student Answer Info */}
                          <div className={cn(
                            "p-3 rounded-lg border",
                            questionStatus === 'correct' && "bg-success/10 border-success",
                            questionStatus === 'wrong' && "bg-destructive/10 border-destructive",
                            questionStatus === 'unattempted' && "bg-muted border-border"
                          )}>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Your Answer:</span>
                                {question.studentAnswer ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant={questionStatus === 'correct' ? 'default' : 'destructive'}>
                                      Option {question.studentAnswer}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">{String(question[`option${question.studentAnswer}` as keyof typeof question] || '')}</span>
                                  </div>
                                ) : (
                                  <Badge variant="secondary">Not Attempted</Badge>
                                )}
                              </div>

                              <span className="mx-2">•</span>

                              <div className="flex items-center gap-2">
                                <span className="font-medium">Correct Answer:</span>
                                <Badge variant="outline" className="bg-success/10 text-success border-success">
                                  Option {question.correctAnswer}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{String(question[`option${question.correctAnswer}` as keyof typeof question] || '')}</span>
                              </div>
                            </div>

                            <div className="mt-2 text-sm">
                              <strong>Marks awarded:</strong>&nbsp;
                              <span className={cn(marksAwarded >= 0 ? 'text-success' : 'text-destructive')}>{marksAwarded >= 0 ? `+${marksAwarded}` : `${marksAwarded}`}</span>
                            </div>
                          </div>

                          {/* Explanation */}
                          <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                            <h5 className="font-medium text-accent-foreground mb-2">
                              💡 Explanation
                            </h5>
                            {question.images?.explanation ? (
                              <img 
                                src={getImageUrl(question.images.explanation)} 
                                alt="Explanation" 
                                className="max-w-full h-auto rounded"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">{question.explanation || 'No explanation available.'}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
