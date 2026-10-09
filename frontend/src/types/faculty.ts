export interface Faculty {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AllocatedSubject {
  id: string;
  subjectName: string;
  examId: string | number;
  examType: 'NEET' | 'JEE';
  topicCount: number;
  questionCount: number;
  allocatedAt: string;
}

export interface FacultyTopic {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  subjectName: string;
  createdBy: 'admin' | 'faculty';
  createdById: string;
  createdAt: string;
}

export interface FacultyQuestion {
  id: string;
  questionText: string;
  questionTextTa?: string | null;
  questionImage?: string | null;
  optionA: string;
  optionATa?: string | null;
  optionAImage?: string | null;
  optionB: string;
  optionBTa?: string | null;
  optionBImage?: string | null;
  optionC: string;
  optionCTa?: string | null;
  optionCImage?: string | null;
  optionD: string;
  optionDTa?: string | null;
  optionDImage?: string | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanationTa?: string | null;
  explanationImage?: string | null;
  marks: number;
  examType: 'NEET' | 'JEE';
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string | null;
  subtopicName?: string | null;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
}

export interface TestProposal {
  id: string;
  examType: 'NEET' | 'JEE';
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicName?: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  suggestedDuration: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SubjectPerformance {
  testId: string;
  testName: string;
  subjectName: string;
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  conductedAt: string;
}

export interface TopicAccuracy {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

export interface FacultyNotification {
  id: string;
  type: 'announcement' | 'subject_update' | 'test_alert' | 'syllabus';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
