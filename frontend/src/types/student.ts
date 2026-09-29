export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  batch: string;
  batchId: string;
  role: 'student';
  avatar?: string;
}

export interface AssignedTest {
  id: string;
  title: string;
  examType: string;
  duration: number; // in minutes
  totalMarks: number;
  totalQuestions: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'upcoming' | 'expired';
  rawStatus?: string; // e.g., 'draft', 'published', 'active'
  startTime?: string;
  endTime?: string;
  isActive: boolean;
  subjects: string[];
  obtainedScore?: number;
  percentage?: number | null;
  markPublish?: boolean;
  createdAt?: string;
  attemptedAt?: string | null;
  timeTaken?: string | null;
} 

export interface TestQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionTextTa?: string;
  optionA: string;
  optionATa?: string;
  optionB: string;
  optionBTa?: string;
  optionC: string;
  optionCTa?: string;
  optionD: string;
  optionDTa?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  subject: string;
  topic: string;
  marks: number;
  negativeMarks: number;
  questionImage?: string | null;
  optionAImage?: string | null;
  optionBImage?: string | null;
  optionCImage?: string | null;
  optionDImage?: string | null;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isMarkedForReview: boolean;
  timeTaken: number; // in seconds
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  examType: string;
  subject?: string;
  startedAt: string;
  submittedAt?: string;
  totalQuestions: number;
  attempted: number;
  unattempted: number;
  score?: number;
  totalMarks: number;
  percentage?: number;
  rank?: number;
  isResultReleased: boolean;
}

export interface SubjectWiseResult {
  subject: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  marksObtained: number;
  totalMarks: number;
}

export interface QuestionReview {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionTextTa?: string;
  optionA: string;
  optionATa?: string;
  optionB: string;
  optionBTa?: string;
  optionC: string;
  optionCTa?: string;
  optionD: string;
  optionDTa?: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  subject: string;
  topic: string;
  marks: number;
  isCorrect: boolean;
  status: 'correct' | 'wrong' | 'unattempted';
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type: 'exam_reminder' | 'result_alert' | 'announcement';
  isRead: boolean;
  createdAt: string;
}
