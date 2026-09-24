export type ExamType = 'NEET' | 'JEE';

export type UserRole = 'admin' | 'faculty' | 'student';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  batchId?: string;
  createdAt: Date;
}

export interface Batch {
  id: string;
  name: string;
  examType: ExamType;
  status: 'active' | 'inactive';
  studentCount: number;
  startDate: Date;
  endDate: Date;
}

export interface Subject {
  id: string;
  name: string;
  examType: ExamType;
  status: 'active' | 'inactive';
  topicCount: number;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  subjectName: string;
}

export interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanationImage?: string | null;
  marks: number;
  examType: ExamType;
  subjectId?: number | string | null;
  subjectName?: string;
  topicId?: number | string | null;
  topicName?: string;
  subtopicId?: number | string | null;
  subtopicName?: string;
  examId?: number | string | null;
  questionImage?: string | null;
  optionAImage?: string | null;
  optionBImage?: string | null;
  optionCImage?: string | null;
  optionDImage?: string | null;
  createdBy: string;
  createdAt?: string;
  status: 'active' | 'inactive';
}

export interface Test {
  id: string;
  title: string;
  examType: ExamType;
  batchId: string;
  duration: number;
  totalMarks: number;
  questionCount: number;
  status: 'draft' | 'published' | 'unpublished';
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  topicId?: string | number;
  topicName?: string;
  topic?: string; // Alternative field name for topic
  subject?: string;
  batchName?: string;
  startTime?: Date | string;
  endTime?: Date | string;
}

export interface FacultyAllocation {
  id: string;
  facultyId: string;
  facultyName: string;
  examType: ExamType;
  subjectId: string;
  subjectName: string;
}

export interface NotificationLog {
  id: string;
  type: 'sms' | 'email' | 'whatsapp';
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: Date;
}

export interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalTests: number;
  totalQuestions: number;
  activeBatches: number;
  neetStudents: number;
  jeeStudents: number;
}
