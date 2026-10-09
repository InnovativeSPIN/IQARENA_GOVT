import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  AlertTriangle,
  CheckCircle,
  Circle,
  Bookmark,
  Send,
  X,
  Menu,
  Grid3x3,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TestQuestion, StudentAnswer } from '@/types/student';
import { apiFetch } from '@/lib/api';
import { getBilingualOption } from '@/lib/questionTranslation';

const IMG_URL = import.meta.env.VITE_IMG_API_URL || 'http://localhost:3000';

// Helper function to build image URL
const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  // Remove leading slash if IMG_URL already has trailing slash or vice versa
  const baseUrl = IMG_URL.endsWith('/') ? IMG_URL.slice(0, -1) : IMG_URL;
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
};

interface TestData {
  test: {
    id: number;
    title: string;
    exam_name: string;
    subject_name: string;
    duration: number;
    total_marks: number;
    passing_marks: number;
  };
  questions: TestQuestion[];
  attemptId?: number;
}

export default function ExamInterface() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, StudentAnswer>>(new Map());
  const [timeLeft, setTimeLeft] = useState(60 * 60); // Will be set from test data
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Load test data and start attempt
  useEffect(() => {
    const loadTestAndStartAttempt = async () => {
      try {
        setLoading(true);
        
        // Start or resume the attempt first: randomized (multi-topic) tests pick each
        // student's questions when the attempt starts, so they must exist before loading
        const attemptResponse = await apiFetch<{ 
          attemptId?: number; 
          message: string; 
          alreadyAttempted?: boolean;
        }>(`/student/tests/${testId}/start`, {
          method: 'POST',
        });
        
        if (attemptResponse.alreadyAttempted) {
          toast({
            title: "Test Already Completed",
            description: "You have already completed this test.",
            variant: "destructive",
          });
          navigate('/student');
          return;
        }

        // Fetch test data (questions in this attempt's order)
        const data = await apiFetch<TestData>(`/student/tests/${testId}`);

        if (!data.questions || data.questions.length === 0) {
          throw new Error('This test has no questions yet. Please contact your teacher.');
        }
        
        // Transform questions to ensure string IDs
        const transformedData = {
          ...data,
          questions: data.questions.map(q => ({
            ...q,
            id: `q${q.id}`, // Convert numeric ID to string format
          }))
        };
        
        setTestData(transformedData);
        setTimeLeft(data.test.duration * 60); // Convert minutes to seconds
        
        setAttemptId(attemptResponse.attemptId || null);
        
        if (/resumed|continuing/i.test(attemptResponse.message)) {
          toast({
            title: "Exam Resumed",
            description: "Continuing from where you left off.",
          });
        }
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load exam data";
        // If server provided additional details, show a helpful message
        // @ts-ignore
        const serverData = error instanceof Error ? (error as any).data : null;
        if (serverData && serverData.reason) {
          if (serverData.reason === 'not_started') {
            toast({
              title: "Test Not Started",
              description: `This test will be available from ${serverData.startTime ? new Date(serverData.startTime).toLocaleString() : 'scheduled time'}.`,
              variant: 'destructive'
            });
          } else if (serverData.reason === 'ended') {
            toast({
              title: "Test Ended",
              description: `This test was available until ${serverData.endTime ? new Date(serverData.endTime).toLocaleString() : 'end time'}.`,
              variant: 'destructive'
            });
          } else {
            toast({
              title: "Error Loading Exam",
              description: serverData.message || errorMessage,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error Loading Exam",
            description: errorMessage,
            variant: "destructive",
          });
        }
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      loadTestAndStartAttempt();
    }
  }, [testId, navigate, toast]);

  // Define handleSubmit first (before other effects that use it)
  const handleSubmit = useCallback(async () => {
    if (!attemptId) return;
    
    try {
      // Convert answers map to array format expected by backend
      const answersArray = Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId: parseInt(questionId.replace('q', '')), // Extract numeric ID
        selectedOption: answer.selectedOption,
        isMarkedForReview: answer.isMarkedForReview,
      }));

      const result = await apiFetch<{ 
        score: number; 
        totalMarks: number; 
        percentage: number;
        message: string;
      }>(`/student/tests/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          answers: answersArray,
        }),
      });

      toast({
        title: "Exam Submitted!",
        description: `You scored ${result.score} out of ${result.totalMarks} (${result.percentage.toFixed(1)}%)`,
      });

      // If backend returned a detailed report, navigate directly to the result detail page and pass the report in state
      const resObj = result as { report?: unknown };
      if (resObj.report) {
        navigate(`/student/results/${testId}`, { state: { report: resObj.report } });
        return;
      }

      // Calculate summary stats
      const attempted = Array.from(answers.values()).filter(a => a.selectedOption).length;
      const markedForReview = Array.from(answers.values()).filter(a => a.isMarkedForReview).length;

      navigate(`/student/exam-complete/${testId}`, {
        state: {
          summary: {
            totalQuestions: totalQuestions,
            attempted: attempted,
            unattempted: totalQuestions - attempted,
            markedForReview: markedForReview,
            score: result.score,
            totalMarks: result.totalMarks,
            percentage: result.percentage,
          }
        }
      });
    } catch (error: unknown) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit exam",
        variant: "destructive",
      });
    }
  }, [attemptId, answers, testId, toast, navigate, totalQuestions]);

  const handleAutoSubmit = useCallback(async () => {
    if (!attemptId) return;
    
    try {
      const answersArray = Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId: parseInt(questionId.replace('q', '')),
        selectedOption: answer.selectedOption,
        isMarkedForReview: answer.isMarkedForReview,
      }));

      await apiFetch(`/student/tests/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          answers: answersArray,
        }),
      });
    } catch (error) {
      console.error('Auto-submit failed:', error);
    }
  }, [attemptId, answers, testId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleAutoSubmit]);

  // Auto-submit on tab/browser close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      
      // Auto-submit the exam
      handleAutoSubmit();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleAutoSubmit]);

  // Detect tab switching and warn user
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switched away
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        setShowTabSwitchWarning(true);
        
        if (newCount >= 2) {
          toast({
            title: "Exam Auto-Submitted!",
            description: "You switched tabs 2 times. Your exam is being submitted automatically.",
            variant: "destructive",
          });
          
          // Auto-submit after 2 seconds to show the message
          setTimeout(() => {
            handleSubmit();
          }, 2000);
        } else {
          toast({
            title: "Warning: Tab Switch Detected!",
            description: `You switched tabs. Count: ${newCount}/2. One more switch will auto-submit!`,
            variant: "destructive",
          });
          
          // Auto-hide warning after 3 seconds
          setTimeout(() => setShowTabSwitchWarning(false), 3000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tabSwitchCount, toast, handleSubmit]);

  // Disable right-click and common keyboard shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast({
        description: "Right-click is disabled during the exam.",
        variant: "destructive",
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        toast({
          description: "This action is disabled during the exam.",
          variant: "destructive",
        });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (option: 'A' | 'B' | 'C' | 'D') => {
    const currentAnswer = answers.get(currentQuestion.id);
    const newAnswer: StudentAnswer = {
      questionId: currentQuestion.id,
      selectedOption: currentAnswer?.selectedOption === option ? null : option,
      isMarkedForReview: currentAnswer?.isMarkedForReview || false,
      timeTaken: 0,
    };
    setAnswers(new Map(answers.set(currentQuestion.id, newAnswer)));
  };

  const handleMarkForReview = () => {
    const currentAnswer = answers.get(currentQuestion.id);
    const newAnswer: StudentAnswer = {
      questionId: currentQuestion.id,
      selectedOption: currentAnswer?.selectedOption || null,
      isMarkedForReview: !currentAnswer?.isMarkedForReview,
      timeTaken: 0,
    };
    setAnswers(new Map(answers.set(currentQuestion.id, newAnswer)));
    
    toast({
      title: newAnswer.isMarkedForReview ? "Marked for review" : "Unmarked",
      description: newAnswer.isMarkedForReview 
        ? "You can come back to this question later"
        : "Question removed from review list",
    });
  };

  const handleClearResponse = () => {
    const currentAnswer = answers.get(currentQuestion.id);
    if (currentAnswer) {
      const newAnswer: StudentAnswer = {
        ...currentAnswer,
        selectedOption: null,
      };
      setAnswers(new Map(answers.set(currentQuestion.id, newAnswer)));
      toast({
        description: "Response cleared",
      });
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionNav(false);
  };

  const getQuestionStatus = (questionId: string) => {
    const answer = answers.get(questionId);
    if (!answer) return 'not_visited';
    if (answer.isMarkedForReview && answer.selectedOption) return 'marked_answered';
    if (answer.isMarkedForReview) return 'marked';
    if (answer.selectedOption) return 'answered';
    return 'not_answered';
  };

  const getAnsweredCount = () => {
    return Array.from(answers.values()).filter(a => a.selectedOption).length;
  };

  const getMarkedCount = () => {
    return Array.from(answers.values()).filter(a => a.isMarkedForReview).length;
  };

  const getNotAnsweredCount = () => {
    return totalQuestions - getAnsweredCount();
  };

  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!testData || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">Failed to load exam data</p>
          <Button onClick={() => navigate('/student')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Tab Switch Warning Banner */}
      {showTabSwitchWarning && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 text-center font-bold animate-pulse">
          ⚠️ WARNING: Tab switching detected! This action is being recorded. Count: {tabSwitchCount}
        </div>
      )}

      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExitDialog(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Exit Exam"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-sm sm:text-base">
                {testData.test.title}
              </h1>
              <Badge variant="outline" className="mt-0.5 text-xs bg-orange-50 text-orange-700 border-orange-200">
                {testData.test.exam_name}
              </Badge>
            </div>
          </div>

          {/* Mobile Question Navigator Toggle */}
          <button
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Question Navigator"
          >
            <Grid3x3 className="h-5 w-5 text-gray-600" />
          </button>

          {/* Timer */}
          <div className={cn(
            "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-mono font-bold shadow-md",
            timeLeft < 300 
              ? "bg-red-50 text-red-600 border-2 border-red-200 animate-pulse" 
              : "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-2 border-orange-200"
          )}>
            <Clock className="h-4 w-4" />
            <span className="text-base sm:text-lg">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Question Navigator Sidebar - Desktop */}
        <aside className="hidden lg:block w-80 bg-white border-r border-gray-200 shadow-sm">
          <div className="h-full flex flex-col">
            {/* Stats Summary */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                Question Navigator
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-600">{getAnsweredCount()}</p>
                    <p className="text-gray-600">Answered</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                  <Circle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-600">{getNotAnsweredCount()}</p>
                    <p className="text-gray-600">Unanswered</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                  <Bookmark className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="font-semibold text-purple-600">{getMarkedCount()}</p>
                    <p className="text-gray-600">Marked</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
                  <Info className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{totalQuestions}</p>
                    <p className="text-gray-600">Total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-semibold text-gray-700 mb-2">Legend:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-green-100 border-2 border-green-500 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 border-2 border-red-300" />
                  <span className="text-gray-700">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 border-2 border-purple-500 flex items-center justify-center">
                    <Bookmark className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-gray-700">Marked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 border-2 border-gray-300" />
                  <span className="text-gray-700">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Question Grid */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const status = getQuestionStatus(q.id);
                  const isCurrent = currentQuestionIndex === index;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={cn(
                        "h-12 rounded-lg flex items-center justify-center font-semibold text-sm transition-all relative group",
                        isCurrent && "ring-2 ring-orange-500 ring-offset-2 scale-110",
                        status === 'answered' && "bg-green-100 text-green-700 border-2 border-green-500 hover:bg-green-200",
                        status === 'marked' && "bg-purple-100 text-purple-700 border-2 border-purple-500 hover:bg-purple-200",
                        status === 'marked_answered' && "bg-purple-100 text-purple-700 border-2 border-purple-500 hover:bg-purple-200",
                        status === 'not_answered' && "bg-red-50 text-red-600 border-2 border-red-300 hover:bg-red-100",
                        status === 'not_visited' && "bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200"
                      )}
                    >
                      {index + 1}
                      {status === 'answered' && (
                        <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
                      )}
                      {(status === 'marked' || status === 'marked_answered') && (
                        <Bookmark className="absolute -top-1 -right-1 h-4 w-4 text-purple-600 bg-white rounded-full fill-purple-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Main Question Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-4">
            {/* Question Header Card */}
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-4 lg:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="text-base px-4 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md">
                      Question {currentQuestion.questionNumber}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {currentQuestion.subject}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-gray-50">
                      {currentQuestion.topic}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 font-semibold">+{currentQuestion.marks}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-red-600 font-semibold">-{currentQuestion.negativeMarks}</span>
                  </div>
                </div>
                <Separator className="my-3" />
                <div className="space-y-3">
                  <div className="space-y-1" data-question-content="true">
                    <p className="text-base lg:text-lg leading-relaxed text-gray-800">
                      {currentQuestion.questionText}
                    </p>
                    {currentQuestion.questionTextTa && (
                      <p className="text-sm lg:text-base leading-relaxed text-gray-500 border-t border-gray-200/50 pt-1 mt-1">
                        {currentQuestion.questionTextTa}
                      </p>
                    )}
                  </div>
                  {currentQuestion.questionImage && (
                    <img
                      src={getImageUrl(currentQuestion.questionImage)}
                      alt="Question"
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="space-y-3" data-question-content="true">
              {(['A', 'B', 'C', 'D'] as const).map((option) => {
                const optionText = currentQuestion[`option${option}` as keyof TestQuestion] as string;
                const optionImage = currentQuestion[`option${option}Image` as keyof TestQuestion] as string | null | undefined;
                const isSelected = currentAnswer?.selectedOption === option;
                
                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    className={cn(
                      "w-full p-4 lg:p-5 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4 group",
                      isSelected 
                        ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20 scale-[1.02]" 
                        : "border-gray-200 hover:border-orange-300 bg-white hover:shadow-md hover:scale-[1.01]"
                    )}
                  >
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 transition-all",
                      isSelected 
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md" 
                        : "bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-700"
                    )}>
                      {option}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const optTa = currentQuestion[`option${option}Ta` as keyof TestQuestion] as string | undefined;
                          const bilingual = getBilingualOption(optionText, optTa);
                          return (
                            <span className={cn(
                              "text-base lg:text-lg block",
                              isSelected ? "text-gray-900 font-medium" : "text-gray-700"
                            )}>
                              <span>{bilingual.en}</span>
                              {bilingual.hasBoth && (
                                <>
                                  <span className="text-muted-foreground/70 mx-1.5 font-normal select-none">/</span>
                                  <span className="text-emerald-700 font-medium">{bilingual.ta}</span>
                                </>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                      {optionImage && (
                        <img
                          src={getImageUrl(optionImage)}
                          alt={`Option ${option}`}
                          className="mt-2 max-w-full h-auto rounded border border-gray-200"
                        />
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-6 w-6 text-orange-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <Card className="border-0 shadow-md bg-white">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={currentAnswer?.isMarkedForReview ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "gap-2 flex-1 sm:flex-none",
                      currentAnswer?.isMarkedForReview && "bg-purple-600 hover:bg-purple-700"
                    )}
                    onClick={handleMarkForReview}
                  >
                    <Bookmark className={cn(
                      "h-4 w-4",
                      currentAnswer?.isMarkedForReview && "fill-white"
                    )} />
                    {currentAnswer?.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleClearResponse}
                    disabled={!currentAnswer?.selectedOption}
                    className="gap-2 flex-1 sm:flex-none hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  >
                    <X className="h-4 w-4" />
                    Clear Response
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Fixed Footer Navigation */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="gap-2 flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{currentQuestionIndex + 1}</span>
              <span>/</span>
              <span>{totalQuestions}</span>
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                size="lg"
                className="gap-2 flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
              >
                <Send className="h-5 w-5" />
                Submit Exam
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                size="lg"
                className="gap-2 flex-1 sm:flex-none bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md"
              >
                <span className="hidden sm:inline">Next Question</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* Mobile Question Navigation Panel */}
      {/* Mobile Question Navigation Panel */}
      {showQuestionNav && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowQuestionNav(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5" />
                  Question Navigator
                </h3>
                <button 
                  onClick={() => setShowQuestionNav(false)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="font-bold text-green-600">{getAnsweredCount()}</p>
                  <p className="text-gray-600">Answered</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="font-bold text-red-600">{getNotAnsweredCount()}</p>
                  <p className="text-gray-600">Pending</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="font-bold text-purple-600">{getMarkedCount()}</p>
                  <p className="text-gray-600">Marked</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="font-bold text-gray-900">{totalQuestions}</p>
                  <p className="text-gray-600">Total</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-green-100 border-2 border-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 border-2 border-red-300 shrink-0" />
                  <span className="text-gray-700 font-medium">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 border-2 border-purple-500 flex items-center justify-center shrink-0">
                    <Bookmark className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-gray-700 font-medium">Marked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 border-2 border-gray-300 shrink-0" />
                  <span className="text-gray-700 font-medium">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Question Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                {questions.map((q, index) => {
                  const status = getQuestionStatus(q.id);
                  const isCurrent = currentQuestionIndex === index;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={cn(
                        "h-12 rounded-lg flex items-center justify-center font-semibold text-sm transition-all relative",
                        isCurrent && "ring-2 ring-orange-500 ring-offset-2 scale-110",
                        status === 'answered' && "bg-green-100 text-green-700 border-2 border-green-500",
                        status === 'marked' && "bg-purple-100 text-purple-700 border-2 border-purple-500",
                        status === 'marked_answered' && "bg-purple-100 text-purple-700 border-2 border-purple-500",
                        status === 'not_answered' && "bg-red-50 text-red-600 border-2 border-red-300",
                        status === 'not_visited' && "bg-gray-100 text-gray-600 border-2 border-gray-300"
                      )}
                    >
                      {index + 1}
                      {status === 'answered' && (
                        <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
                      )}
                      {(status === 'marked' || status === 'marked_answered') && (
                        <Bookmark className="absolute -top-1 -right-1 h-4 w-4 text-purple-600 bg-white rounded-full fill-purple-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Submit Exam?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>Are you sure you want to submit your exam?</p>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <span className="font-semibold">{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Answered:</span>
                    <span className="font-semibold text-success">{getAnsweredCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unanswered:</span>
                    <span className="font-semibold text-destructive">{totalQuestions - getAnsweredCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Marked for Review:</span>
                    <span className="font-semibold text-warning">{getMarkedCount()}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit Exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Exit Exam?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If you exit now, your progress will be saved but you may not be able to resume later. Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('//student/tests')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
