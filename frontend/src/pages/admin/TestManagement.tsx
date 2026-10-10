import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DEFAULT_QUESTION_MARKS } from '@/lib/utils';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Clock,
  FileText,
  Users,
  Send,
  Eye,
  BookOpen,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  X,
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Target,
  PieChart,
  Calendar,
  CalendarCheck,
  CalendarX,
  Sparkles,
  MinusCircle,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Test {
  id: string;
  title: string;
  examType: string;
  examId: number;
  subject?: string;
  subjectId?: number;
  allSubjects?: number | boolean;

  topic?: string;
  topicId?: number;
  subtopicId?: number | null;
  subtopicName?: string | null;
  duration: number;
  totalMarks: number;
  questionCount: number;
  status: 'draft' | 'published' | 'unpublished';
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  batchId?: number;
  batchName?: string;
  startTime?: string | null;
  endTime?: string | null;
  parentTestId?: number | string | null;
  childTests?: Test[];
  viewSubjects?: Array<{ id: number | null; name: string; count: number }>;
}

interface Question {
  id: string;
  text: string;
  questionImage?: string | null;
  optionA: string;
  optionAImage?: string | null;
  optionB: string;
  optionBImage?: string | null;
  optionC: string;
  optionCImage?: string | null;
  optionD: string;
  optionDImage?: string | null;
  answer: string;
  marks?: number;
  useImg?: boolean;
  subjectName?: string | null;
  topicName?: string | null;
  subtopicId?: number | null;
  subtopicName?: string | null;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  seq?: number;
  correctAnswer?: string | null;
  explanation?: string | null;
  explanationImage?: string | null;
  subjectId?: number | string | null;
  sourceTestId?: number | string | null;
}

interface TestReport { id: string; [key: string]: unknown }

interface TestReportData {
  testId: string;
  totalStudents: number;
  attemptedStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  averageTimeTaken: number;
  topPerformers: Array<{
    studentName: string;
    score: number;
    percentage: number;
    rank: number;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  schoolWise?: Array<{
    schoolName: string;
    totalStudents: number;
    completedStudents: number;
    averageScore: number;
  }>;
  questionStats?: Array<{
    questionId: number;
    questionText: string;
    difficulty?: string;
    attempts?: number;
    correctCount: number;
    wrongCount: number;
    successRate: number;
  }>;
}


interface Allocation {
  id: number;
  subjectId: number | null;
  topicId: number | null;
  subtopicId: number | null;
  questionCount: number;
  marksPerQuestion: number;
  topics: Array<{ id: number; name: string; available?: number }>;
  subtopics: Array<{ id: number; name: string }>;
  available: number;
  loading?: boolean;
  perTopicCounts?: Record<string, number>;
  _lastScope?: string | null;
  manualQuestionIds?: (string | number)[];
  manualQuestions?: Question[];
  previewQuestions?: Question[];
  previewOpen?: boolean;
  previewLoading?: boolean;
}

interface OfflinePaper {
  id: number;
  exam_id: number;
  subject_id?: number | null;
  topic_id?: number | null;
  subtopic_id?: number | null;
  batch_id?: number | null;
  parent_paper_id?: number | null;
  all_subjects?: number | boolean;
  title: string;
  description?: string | null;
  total_questions: number;
  total_marks: number;
  duration_minutes?: number | null;
  status: string;
  created_by?: number | null;
  created_at: string;
}

const subjectColors = {
  Physics: 'from-blue-500 to-blue-600',
  Chemistry: 'from-green-500 to-green-600',
  Biology: 'from-emerald-500 to-emerald-600',
  Mathematics: 'from-purple-500 to-purple-600',

};

const subjectIcons = {
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Brain,
  Mathematics: Calculator,
};


const statusStyles: Record<string, string> = {
  draft: 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300',
  published: 'border-green-500 text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300',
  unpublished: 'border-gray-400 text-gray-700 bg-gray-50 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function TestManagement() {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQuestionAllocOpen, setIsQuestionAllocOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<TestReportData | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [childTests, setChildTests] = useState<Test[]>([]);
  const [isCombinedParent, setIsCombinedParent] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyToAllTopics, setApplyToAllTopics] = useState(false);

  // Combine selected tests mode
  const [combineSelected, setCombineSelected] = useState(false);
  const [parentFor, setParentFor] = useState<number[] | null>(null);
  const [parentForDetails, setParentForDetails] = useState<Test[]>([]);

  const parentIds = useMemo(() => new Set(tests.map(t => t.parentTestId).filter(Boolean)), [tests]);
   const [allocatingQuestions, setAllocatingQuestions] = useState(false);
  const [numQuestionsToAllocate, setNumQuestionsToAllocate] = useState(10);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isManualSelectOpen, setIsManualSelectOpen] = useState(false);
  const [manualSelectionQuestions, setManualSelectionQuestions] = useState<Question[]>([]);
  const [loadingManualQuestions, setLoadingManualQuestions] = useState(false);
  // null = single-subject test; otherwise the allocation (section) being picked for
  const [manualTargetAllocId, setManualTargetAllocId] = useState<number | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [previewAllocBreakdown, setPreviewAllocBreakdown] = useState<PreviewAllocation[]>([]);

  // Edit preview state
  const [editPreviewQuestions, setEditPreviewQuestions] = useState<Question[]>([]);
  const [editLoadingPreview, setEditLoadingPreview] = useState(false);
  const [editPreviewWarnings, setEditPreviewWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!isPreviewOpen) {
      setPreviewWarnings([]);
      setPreviewAllocBreakdown([]);
      setEditPreviewQuestions([]);
      setEditPreviewWarnings([]);
    }
  }, [isPreviewOpen]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const handleViewPaper = async (paperId: number | string) => {
    setLoadingPaperAction(true);
    try{
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}`);
      const data = await res.json();
      if(data.paper){
        setSelectedPaper(data.paper);
        // normalize question objects to client Question shape
        const mapped = (data.questions || []).map((q: Record<string, unknown>) => ({
          id: String((q['question_id'] as number) || (q['id'] as number)),
          text: (q['question_text'] as string) || (q['stem'] as string) || (q['text'] as string) || '',
          optionA: (q['option_a'] as string) || (q['optionA'] as string) || '',
          optionB: (q['option_b'] as string) || (q['optionB'] as string) || '',
          optionC: (q['option_c'] as string) || (q['optionC'] as string) || '',
          optionD: (q['option_d'] as string) || (q['optionD'] as string) || '',
          correctAnswer: (((q['answer'] as string) || (q['correctAnswer'] as string) || '') as string).toString().trim().charAt(0).toUpperCase() || null,
          marks: Number.isFinite(Number(q['marks'])) ? Number(q['marks']) : DEFAULT_QUESTION_MARKS,
          questionImage: (q['question_image'] as string) || null,
          optionAImage: (q['option_a_image'] as string) || null,
          optionBImage: (q['option_b_image'] as string) || null,
          optionCImage: (q['option_c_image'] as string) || null,
          optionDImage: (q['option_d_image'] as string) || null,
          explanation: (q['explanation'] as string) || null
        } as Question));
        setPaperQuestions(mapped);
        setIsPaperViewOpen(true);
      }
    }catch(err){
      console.error('Failed to load paper', err);
    }finally{
      setLoadingPaperAction(false);
    }
  };

  const handleDeletePaper = async (paperId: number | string) => {
    if(!confirm('Delete this paper? This cannot be undone')) return;
    setLoadingPaperAction(true);
    try{
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}`, { method: 'DELETE' });
      const data = await res.json();
      if(data.success){
        setPapers(prev => prev.filter(p => String(p.id) !== String(paperId)));
      } else {
        alert(data.error || 'Failed to delete');
      }
    }catch(err){
      console.error('Failed to delete paper', err);
    }finally{
      setLoadingPaperAction(false);
    }
  };

  const openEditPaper = (paper: OfflinePaper) => {
    setPaperEditForm({
      title: paper.title,
      description: paper.description || '',
      total_questions: paper.total_questions || null,
      total_marks: paper.total_marks || null,
      duration_minutes: paper.duration_minutes || null,
      status: paper.status || null,
      exam_id: paper.exam_id || null,
      batch_id: paper.batch_id || null,
      subject_id: paper.subject_id || null,
      topic_id: paper.topic_id || null,
      subtopic_id: paper.subtopic_id || null
    });
    // sync dialog selects so dependent lists (topics/subtopics/batches) refresh
    setDialogExam(paper.exam_id || null);
    setDialogBatch(paper.batch_id || null);
    setDialogSubject(paper.subject_id || null);
    setDialogTopic(paper.topic_id || null);
    setDialogSubtopic(paper.subtopic_id || null);
    setSelectedPaper(paper);
    setIsPaperEditOpen(true);
  };

  const handleUpdatePaper = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if(!selectedPaper) return;
    setLoadingPaperAction(true);
    try{
      // If number of questions is being reduced, warn the user that allocated questions won't be automatically removed
      if(typeof paperEditForm.total_questions !== 'undefined' && selectedPaper && typeof selectedPaper.total_questions !== 'undefined' && paperEditForm.total_questions < selectedPaper.total_questions){
        const ok = window.confirm('You are reducing the number of questions. Existing allocated questions will remain; regenerate the paper if you want a new selection. Proceed?');
        if(!ok){ setLoadingPaperAction(false); return; }
      }

      // If number of questions is being increased, ensure the paper's nearest scope (subtopic/topic/subject/exam) has enough available questions
      if(typeof paperEditForm.total_questions !== 'undefined' && selectedPaper && typeof selectedPaper.total_questions !== 'undefined' && paperEditForm.total_questions > selectedPaper.total_questions){
        try{
          const target = paperEditForm.total_questions;
          // Determine most specific filter available
          const qParams: Record<string, number> = {};
          if(selectedPaper.subtopic_id) qParams.subtopicId = selectedPaper.subtopic_id;
          else if(selectedPaper.topic_id) qParams.topicId = selectedPaper.topic_id;
          else if(selectedPaper.subject_id) qParams.subjectId = selectedPaper.subject_id;
          else if(selectedPaper.exam_id) qParams.examId = selectedPaper.exam_id;

          const params = new URLSearchParams();
          for(const k in qParams) params.set(k, String(qParams[k]));

          const chkRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${params.toString()}`);
          if(!chkRes.ok){ const t = await chkRes.text(); console.error('Availability check failed', t); alert('Failed to verify question availability'); setLoadingPaperAction(false); return; }
          const chk = await chkRes.json();
          const available = (chk && typeof chk.total !== 'undefined') ? Number(chk.total) : 0;
          if(available < target){
            alert(`Not enough questions available in the selected scope. Available: ${available}, requested: ${target}. Reduce the number or change scope.`);
            setLoadingPaperAction(false);
            return;
          }

          // Fetch and display per-subtopic breakdown if scope is topic/subject/exam
          if(!selectedPaper.subtopic_id){
            fetchSubtopicAvailability();
          } else {
            // single subtopic only
            fetchSubtopicAvailability();
          }
        }catch(err){
          console.error('Availability check error', err);
          alert('Failed to verify question availability');
          setLoadingPaperAction(false);
          return;
        }
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${selectedPaper.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paperEditForm) });
      const data = await res.json();
      if(data.paper){
        // replace in list
        setPapers(prev => prev.map(p => String(p.id) === String(data.paper.id) ? data.paper : p));
        setIsPaperEditOpen(false);
      } else {
        alert(data.error || 'Failed to update');
      }
    }catch(err){
      console.error('Failed to update paper', err);
    }finally{
      setLoadingPaperAction(false);
    }
  };

  const downloadCsv = async (url: string, filename: string) => {
    try{
      const res = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!res.ok) { alert('Failed to export'); return; }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }catch(err){
      console.error('Export failed', err);
      alert('Export failed');
    }
  };

  const downloadDoc = async (paperId: number, type: 'question_doc' | 'answer_doc') => {
    try{
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}/download/${type}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!res.ok){ const t = await res.text(); console.error('Doc download failed', t); alert(t || 'Failed to download DOC'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paper_${paperId}_${type === 'question_doc' ? 'questions' : 'answers'}.doc`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'DOC downloaded' });
    }catch(err){
      console.error('Doc download error', err);
      toast({ title: 'Error', description: 'Doc download failed', variant: 'destructive' });
    }
  };

  // DOC preview
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(false);
  const [docPreviewFilename, setDocPreviewFilename] = useState('');

  const closeDocPreview = useCallback(() => {
    setDocPreviewOpen(false);
    if(docPreviewUrl){
      try { URL.revokeObjectURL(docPreviewUrl); } catch(e) { console.warn('Failed to revoke doc object URL', e); }
    }
    setDocPreviewUrl(null);
    setDocPreviewFilename('');
  }, [docPreviewUrl]);

  const previewDoc = async (paperId: number, type: 'question_doc' | 'answer_doc') => {
    setDocPreviewLoading(true);
    try{
      // ensure generated
      const genRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}/generate`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!genRes.ok){ const txt = await genRes.text(); console.error('Generate failed', txt); toast({ title: 'Error', description: txt || 'Failed to generate DOC', variant: 'destructive' }); setDocPreviewLoading(false); return; }
      await genRes.json();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}/download/${type}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!res.ok){ const t = await res.text(); console.error('Doc fetch failed', t); toast({ title: 'Error', description: t || 'Failed to fetch DOC', variant: 'destructive' }); setDocPreviewLoading(false); return; }
      // Read as text and create an HTML blob so iframe can render the document preview
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setDocPreviewUrl(url);
      setDocPreviewFilename(`paper_${paperId}_${type === 'question_doc' ? 'questions' : 'answers'}.doc`);
      setDocPreviewOpen(true);
    }catch(err){
      console.error('Doc preview failed', err);
      toast({ title: 'Error', description: 'Doc preview failed', variant: 'destructive' });
    }finally{
      setDocPreviewLoading(false);
    }
  };

  
  // State for View Test dialog - allocated questions
  const [allocatedQuestions, setAllocatedQuestions] = useState<Question[]>([]);
  const [loadingAllocatedQuestions, setLoadingAllocatedQuestions] = useState(false);
  const [expandedAllocatedQuestions, setExpandedAllocatedQuestions] = useState<Set<string>>(new Set());
  // View dialog: per-subject filter
  const [viewSubjectFilter, setViewSubjectFilter] = useState<number | null>(null);
  const [viewSubjects, setViewSubjects] = useState<Array<{ id: number | string | null; name: string; count: number }>>([]);

  // Multi-select state
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  

  // Meta data
  const [examTypes, setExamTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [batches, setBatches] = useState<Array<{ id: number; name: string }>>([]);

  // Dialog form
  const [dialogExam, setDialogExam] = useState<number | null>(null);
  const [dialogSubject, setDialogSubject] = useState<number | null>(null);
  const [dialogTopic, setDialogTopic] = useState<number | null>(null);
  const [dialogSubtopic, setDialogSubtopic] = useState<number | null>(null);
  const [dialogBatch, setDialogBatch] = useState<number | null>(null);
  // Class / standard values come from school_students.standard
  const [dialogSelectedStandards, setDialogSelectedStandards] = useState<string[]>([]);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [dialogStandards, setDialogStandards] = useState<Array<{ standard: string; studentCount: number }>>([]);
  const [dialogSubjects, setDialogSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [dialogTopics, setDialogTopics] = useState<Array<{ id: number; name: string }>>([]);
  const [dialogSubtopics, setDialogSubtopics] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingDialogSubtopics, setLoadingDialogSubtopics] = useState(false);
  const [dialogBatches, setDialogBatches] = useState<Array<{ id: number; name: string }>>([]);
  const [availableQuestions, setAvailableQuestions] = useState(0);

  // Offline papers management
  const [papers, setPapers] = useState<OfflinePaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [isPaperViewOpen, setIsPaperViewOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<OfflinePaper | null>(null);
  const [paperQuestions, setPaperQuestions] = useState<Question[]>([]);
  const [isPaperEditOpen, setIsPaperEditOpen] = useState(false);
  const [paperEditForm, setPaperEditForm] = useState<{ title?: string; description?: string; total_questions?: number | null; total_marks?: number | null; duration_minutes?: number | null; status?: string | null; exam_id?: number | null; batch_id?: number | null; subject_id?: number | null; topic_id?: number | null; subtopic_id?: number | null }>({});
  const [paperAvailableQuestions, setPaperAvailableQuestions] = useState<number | null>(null);

  // Availability per-subtopic when increasing question count
  const [subtopicAvailability, setSubtopicAvailability] = useState<Array<{ id: number | null; name: string; available: number }>>([]);
  const [loadingSubtopicAvailability, setLoadingSubtopicAvailability] = useState(false);
  const [previewSelectionLoading, setPreviewSelectionLoading] = useState(false);
  const [loadingPaperAction, setLoadingPaperAction] = useState(false);

  // Export preview state
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [exportPreviewQuestions, setExportPreviewQuestions] = useState<Question[]>([]);
  const [exportPreviewType, setExportPreviewType] = useState<'questions' | 'questions-with-answers'>('questions');
  const [exportPreviewPaperTitle, setExportPreviewPaperTitle] = useState<string>('');
  const [exportPreviewPaperId, setExportPreviewPaperId] = useState<number | null>(null);

  // Fetch available questions for paper edit when scope changes
  useEffect(() => {
    const fetchPaperAvailable = async () => {
      if (!dialogExam || !dialogSubject) {
        setPaperAvailableQuestions(null);
        return;
      }
      try {
        const params = new URLSearchParams({
          examId: String(dialogExam),
          subjectId: String(dialogSubject),
          ...(dialogTopic && { topicId: String(dialogTopic) }),
          ...(dialogSubtopic && { subtopicId: String(dialogSubtopic) })
        });
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/questions/count?${params}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });
        if (res.ok) {
          const data = await res.json();
          setPaperAvailableQuestions(data.count || 0);
        } else {
          setPaperAvailableQuestions(null);
        }
      } catch (err) {
        console.error('Failed to fetch paper available questions', err);
        setPaperAvailableQuestions(null);
      }
    };
    fetchPaperAvailable();
  }, [dialogExam, dialogSubject, dialogTopic, dialogSubtopic, token]);

  const openExportPreview = async (paperId: number, type: 'questions' | 'questions-with-answers') => {
    setExportPreviewLoading(true);
    try{
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!res.ok) { const errText = await res.text(); console.error('Preview failed', errText); alert(errText || 'Failed to load preview'); setExportPreviewLoading(false); return; }
      const data = await res.json();
      if(!data.questions){ alert('Failed to load preview'); setExportPreviewLoading(false); return; }
      const mapped = data.questions.map((q: { id: number; question_text?: string; text?: string; option_a?: string; option_b?: string; option_c?: string; option_d?: string; marks?: number; answer?: string; seq?: number }) => ({
        id: q.id,
        text: q.question_text || q.text || '',
        optionA: q.option_a || '',
        optionB: q.option_b || '',
        optionC: q.option_c || '',
        optionD: q.option_d || '',
        marks: q.marks,
        correctAnswer: q.answer ? String(q.answer).toUpperCase().charAt(0) : null,
        seq: q.seq
      }));
      setExportPreviewQuestions(mapped as Question[]);
      setExportPreviewPaperTitle(data.paper?.title || '');
      setExportPreviewPaperId(paperId);
      setExportPreviewType(type);
      setExportPreviewOpen(true);
    }catch(err){
      console.error('Failed to load export preview', err);
      alert('Failed to load preview');
    }finally{
      setExportPreviewLoading(false);
    }
  };

  const closeExportPreview = () => { setExportPreviewOpen(false); setExportPreviewQuestions([]); setExportPreviewPaperTitle(''); setExportPreviewPaperId(null); };

  const [exportGenerating, setExportGenerating] = useState(false);

  // PDF preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewType, setPdfPreviewType] = useState<'question' | 'answer'>('question');
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState('');

  const closePdfPreview = useCallback(() => {
    setPdfPreviewOpen(false);
    if(pdfPreviewUrl){
      try { URL.revokeObjectURL(pdfPreviewUrl); } catch (e) { console.warn('Failed to revoke pdf object URL', e); }
    }
    setPdfPreviewUrl(null);
    setPdfPreviewFilename('');
  }, [pdfPreviewUrl]);

  // Generate PDF on server and open preview (don't auto-download)
  const previewPdf = async (paperId: number, type: 'question' | 'answer' = 'question') => {
    setPdfPreviewLoading(true);
    try{
      // trigger server generation
      const genRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}/generate`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!genRes.ok){ const txt = await genRes.text(); console.error('Generate failed', txt); toast({ title: 'Error', description: txt || 'Failed to generate PDF', variant: 'destructive' }); setPdfPreviewLoading(false); return; }
      await genRes.json();

      // fetch the generated PDF file as blob
      const downloadRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}/download/${type}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if(!downloadRes.ok){ const txt = await downloadRes.text(); console.error('Download failed', txt); toast({ title: 'Error', description: txt || 'Failed to fetch PDF', variant: 'destructive' }); setPdfPreviewLoading(false); return; }
      const blob = await downloadRes.blob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfPreviewType(type);
      setPdfPreviewFilename(`paper_${paperId}_${type === 'question' ? 'questions' : 'answers'}.pdf`);
      setPdfPreviewOpen(true);
    }catch(err){
      console.error('PDF preview failed', err);
      toast({ title: 'Error', description: 'PDF preview failed', variant: 'destructive' });
    }finally{
      setPdfPreviewLoading(false);
    }
  };

  // Preserve backward compatibility: previous function now opens preview instead of auto-download
  const generateAndDownloadPdf = async (paperId: number, type: 'question' | 'answer' = 'question') => {
    await previewPdf(paperId, type);
  };

  // fetch & filter helper for papers
  const fetchPapers = useCallback(async (opts: { examId?: number | null; subjectId?: number | null; batchId?: number | null; q?: string } = {}) => {
    setLoadingPapers(true);
    try{
      const params = new URLSearchParams();
      if(typeof opts.examId !== 'undefined' && opts.examId !== null) params.set('exam_id', String(opts.examId));
      if(typeof opts.subjectId !== 'undefined' && opts.subjectId !== null) params.set('subject_id', String(opts.subjectId));
      if(typeof opts.batchId !== 'undefined' && opts.batchId !== null) params.set('batch_id', String(opts.batchId));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers?${params.toString()}`);
      const data = await res.json();
      if(data.papers) setPapers(data.papers);
    }catch(err){
      console.error('Failed to fetch papers', err);
    }finally{
      setLoadingPapers(false);
    }
  }, [setPapers, setLoadingPapers]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Fetch per-subtopic availability when required
  const fetchSubtopicAvailability = useCallback(async () => {
    if(!selectedPaper) return;
    setLoadingSubtopicAvailability(true);
    try{
      // Choose most specific scope for detailed breakdown
      if(selectedPaper.subtopic_id){
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subtopicId=${selectedPaper.subtopic_id}`);
        const data = await res.json();
        const cnt = data && typeof data.total !== 'undefined' ? Number(data.total) : 0;
        const subName = dialogSubtopics.find(s => s.id === selectedPaper.subtopic_id)?.name || 'Selected subtopic';
        setSubtopicAvailability([{ id: selectedPaper.subtopic_id, name: subName, available: cnt }]);
      } else if(selectedPaper.topic_id){
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${selectedPaper.topic_id}`);
        const data = await res.json();
        const map = new Map<number | null, { id: number | null; name: string; available: number }>();
        (data.questions || []).forEach((q: Question) => {
          const sid = q.subtopicId ?? null;
          const name = q.subtopicName || (sid === null ? '(No subtopic)' : `Subtopic ${sid}`);
          const existing = map.get(sid);
          if(existing) { existing.available += 1; }
          else { map.set(sid, { id: sid, name, available: 1 }); }
        });
        setSubtopicAvailability(Array.from(map.values()));
      } else if(selectedPaper.subject_id){
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${selectedPaper.subject_id}`);
        const data = await res.json();
        const map = new Map<number | null, { id: number | null; name: string; available: number }>();
        (data.questions || []).forEach((q: Question) => {
          const sid = q.subtopicId ?? null;
          const name = q.subtopicName || (sid === null ? '(No subtopic)' : `Subtopic ${sid}`);
          const existing = map.get(sid);
          if(existing) { existing.available += 1; }
          else { map.set(sid, { id: sid, name, available: 1 }); }
        });
        setSubtopicAvailability(Array.from(map.values()));
      } else if(selectedPaper.exam_id){
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?examId=${selectedPaper.exam_id}`);
        const data = await res.json();
        const map = new Map<number | null, { id: number | null; name: string; available: number }>();
        (data.questions || []).forEach((q: Question) => {
          const sid = q.subtopicId ?? null;
          const name = q.subtopicName || (sid === null ? '(No subtopic)' : `Subtopic ${sid}`);
          const existing = map.get(sid);
          if(existing) { existing.available += 1; }
          else { map.set(sid, { id: sid, name, available: 1 }); }
        });
        setSubtopicAvailability(Array.from(map.values()));
      }
    }catch(err){
      console.error('Failed to fetch subtopic availability', err);
      setSubtopicAvailability([]);
    }finally{
      setLoadingSubtopicAvailability(false);
    }
  }, [selectedPaper, dialogSubtopics]);

  // Preview a selection from a scope (subtopic/topic/subject/exam) using preview endpoint
  const previewSelection = useCallback(async (opts: { subtopicId?: number | null; topicId?: number | null; subjectId?: number | null; examId?: number | null; num_questions: number }) => {
    setPreviewSelectionLoading(true);
    try{
      const bodyObj: { [key: string]: number } = { num_questions: opts.num_questions };
      if(typeof opts.subtopicId !== 'undefined') bodyObj['subtopic_id'] = opts.subtopicId;
      if(typeof opts.topicId !== 'undefined') bodyObj['topic_id'] = opts.topicId;
      if(typeof opts.subjectId !== 'undefined') bodyObj['subject_id'] = opts.subjectId;
      if(typeof opts.examId !== 'undefined') bodyObj['exam_id'] = opts.examId;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(bodyObj) });
      if(!res.ok){ const t = await res.text(); console.error('Preview failed', t); alert(t || 'Failed to preview selection'); setPreviewSelectionLoading(false); return; }
      const data = await res.json();
      if(!data.questions){ alert('No questions returned'); setPreviewSelectionLoading(false); return; }

      const mapped = data.questions.map((q: Question) => ({
        id: q.id,
        text: q.question_text || q.text || '',
        optionA: q.option_a || '',
        optionB: q.option_b || '',
        optionC: q.option_c || '',
        optionD: q.option_d || '',
        marks: q.marks,
        correctAnswer: q.answer ? String(q.answer).toUpperCase().charAt(0) : null,
        seq: q.seq
      }));
      setExportPreviewQuestions(mapped as Question[]);
      setExportPreviewPaperTitle(`Preview (${mapped.length} questions)`);
      setExportPreviewType('questions');
      setExportPreviewOpen(true);
    }catch(err){
      console.error('Preview selection failed', err);
      alert('Failed to preview selection');
    }finally{
      setPreviewSelectionLoading(false);
    }
  }, [token]);



  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const allocationsKey = allocations.map(a => `${a.subjectId}-${a.topicId}-${a.subtopicId}`).join('|');

  const addAllocation = () => {
    if (allocations.length >= 3) {
      alert('Maximum of 3 allocations allowed');
      return;
    }
    setAllocations(prev => ([...prev, { id: Date.now(), subjectId: null, topicId: null, subtopicId: null, questionCount: 0, marksPerQuestion: 4, topics: [], subtopics: [], available: 0, loading: false, perTopicCounts: {} }]));
  };

  const removeAllocation = (id: number) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
  };

  const updateAllocation = (id: number, patch: Partial<Allocation>) => {
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  // Ensure availability count for a given topic is loaded on demand
  const ensureTopicAvailability = async (allocationId: number, topicId: number) => {
    const alloc = allocations.find((x) => x.id === allocationId);
    if (!alloc) return;
    const topic = (alloc.topics || []).find((t) => Number(t.id) === Number(topicId));
    if (!topic) return;
    if (typeof topic.available !== 'undefined') return; // already fetched
    try {
      const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topicId}`);
      const qData = await qRes.json();
      const available = qData.success ? (qData.total || 0) : 0;
      updateAllocation(allocationId, { topics: (alloc.topics || []).map((t) => t.id === topicId ? { ...t, available } : t) });
    } catch (err) {
      updateAllocation(allocationId, { topics: (alloc.topics || []).map((t) => t.id === topicId ? { ...t, available: 0 } : t) });
    }
  };

  // Fetch topics/subtopics and available question counts for allocations when scope changes
  useEffect(() => {
    allocations.forEach(a => {
      const loadInfo = async () => {
        // If no subject selected, ensure available is 0 and skip
        if (!a.subjectId) return updateAllocation(a.id, { available: 0, _lastScope: null });

        // Avoid concurrent loads for the same allocation
        if (a.loading) return;

        // Build query param scope
        const qp = a.subtopicId ? `subtopicId=${a.subtopicId}` : a.topicId ? `topicId=${a.topicId}` : `subjectId=${a.subjectId}`;

        // If we've already loaded availability for this scope, skip fetch
        if (a._lastScope === qp && typeof a.available !== 'undefined') return;

        // Mark as loading
        updateAllocation(a.id, { loading: true });
        try {
          // Fetch topics only if not already present
          if (!Array.isArray(a.topics) || a.topics.length === 0) {
            const tRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${a.subjectId}`);
            const tData = await tRes.json();
            if (tData.success) {
              const topics = tData.topics || [];
              updateAllocation(a.id, { topics });
            }
          }

          // Fetch availability for the current scope
          const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${qp}`);
          const qData = await qRes.json();
          if (qData.success) updateAllocation(a.id, { available: qData.total || 0, _lastScope: qp });
        } catch (err) {
          console.error('Failed to load allocation info', err);
          updateAllocation(a.id, { available: 0, _lastScope: qp });
        } finally {
          updateAllocation(a.id, { loading: false });
        }
      };

      loadInfo();
    });
    
  const allocationsKey = allocations.map(a => `${a.subjectId}-${a.topicId}-${a.subtopicId}`).join('|');
  }, [allocationsKey, allocations]);

  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    numQuestions: 0,
    marksPerQuestion: 4,
    startTime: '',
    endTime: '',
    isRandomized: false,
    schoolIds: [] as string[],
    selectionMode: 'automatic' as 'automatic' | 'manual',
    manualSelectedQuestionIds: [] as (string | number)[],
    totalMarksOverride: null as number | null,
  });

  const [testFormat, setTestFormat] = useState<'single' | 'multi'>('single');
  const [dialogSchools, setDialogSchools] = useState<Array<{ id: number; school_name: string }>>([]);


  const [isPaperProcessing, setIsPaperProcessing] = useState<boolean>(false);

  // Offline papers: dialog & listing
  const [isPaperDialogOpen, setIsPaperDialogOpen] = useState(false);
  const [paperForm, setPaperForm] = useState({ title: '', examId: null as number | null, batchId: null as number | null, durationMinutes: 0, subjectId: null as number | null, topicId: null as number | null, subtopicId: null as number | null, numQuestions: 0, totalMarks: null as number | null });


  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'single' | 'combined' | 'child' | 'paper'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View mode for toggling between online tests and offline papers
  const [viewMode, setViewMode] = useState<'online' | 'offline'>('online');

  // Toggle between online tests and offline papers
  const toggleViewMode = () => setViewMode((m) => (m === 'online' ? 'offline' : 'online'));

  // When the user switches to 'paper' filter, refresh the paper list
  useEffect(() => {
    if (testTypeFilter === 'paper') fetchPapers();
  }, [testTypeFilter, fetchPapers]);

  // Load exams and schools
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [examsRes, schoolsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/admin/meta/exams`).catch(() => null),
          fetch(`${import.meta.env.VITE_API_URL}/admin/schools`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
        ]);
        
        if (examsRes && examsRes.ok) {
          const data = await examsRes.json();
          if (data.success) setExamTypes(data.exams || []);
        }
        
        if (schoolsRes && schoolsRes.ok) {
          const data = await schoolsRes.json();
          if (data.success) setDialogSchools(data.schools || []);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    };
    fetchInitialData();
  }, []);

  // Load subjects for filter
  useEffect(() => {
    if (!selectedExam) {
      setSubjects([]);
      setSelectedSubject(null);
      return;
    }
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${selectedExam}`);
        const data = await res.json();
        if (data.success) setSubjects(data.subjects || []);
      } catch (err) {
        console.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, [selectedExam]);

  // Load subjects & batches for dialog
  useEffect(() => {
    if (!dialogExam) {
      setDialogSubjects([]);
      setDialogBatches([]);
      setDialogTopics([]);
      setDialogSubtopics([]);
      return;
    }
    const fetchData = async () => {
      try {
        const [subjectsRes, batchesRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${dialogExam}`),
          fetch(`${import.meta.env.VITE_API_URL}/admin/batches?examId=${dialogExam}&active=true`),
        ]);
        const subData = await subjectsRes.json();
        const batchData = await batchesRes.json();
        if (subData.success) setDialogSubjects(subData.subjects || []);
        if (batchData.success) setDialogBatches(batchData.batches || []);
      } catch (err) {
        console.error('Failed to load dialog data');
      }
    };
    fetchData();
  }, [dialogExam]);

  // Classes come from the selected schools' students
  const selectedSchoolsKey = formData.schoolIds.slice().sort().join(',');
  useEffect(() => {
    if (!selectedSchoolsKey) {
      setDialogStandards([]);
      setDialogSelectedStandards([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingStandards(true);
      try {
        const params = new URLSearchParams({ schoolIds: selectedSchoolsKey });
        if (dialogExam) params.set('examId', String(dialogExam));
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/standards?${params}`);
        const data = await res.json();
        if (cancelled) return;
        const list: Array<{ standard: string; studentCount: number }> = data.success ? (data.standards || []) : [];
        setDialogStandards(list);
        // drop classes that no longer exist in the chosen schools
        setDialogSelectedStandards(prev => prev.filter(sv => list.some(l => l.standard === sv)));
      } catch {
        if (!cancelled) setDialogStandards([]);
      } finally {
        if (!cancelled) setLoadingStandards(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSchoolsKey, dialogExam]);

  // Load topics when subject is selected
  useEffect(() => {
    if (!dialogSubject) {
      setDialogTopics([]);
      setDialogTopic(null);
      setDialogSubtopic(null);
      setDialogSubtopics([]);
      setAvailableQuestions(0);
      return;
    }
    const fetchTopics = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${dialogSubject}`);
        const data = await res.json();
        if (data.success) setDialogTopics(data.topics || []);
      } catch (err) {
        console.error('Failed to load topics');
      }
    };
    fetchTopics();
  }, [dialogSubject]);

  // Load subtopics when topic is selected
  useEffect(() => {
    if (!dialogTopic) {
      setDialogSubtopics([]);
      setDialogSubtopic(null);
      return;
    }
    const fetchSubtopics = async () => {
      setLoadingDialogSubtopics(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${dialogTopic}`);
        const data = await res.json();
        if (data.success) setDialogSubtopics(data.subtopics || []);
      } catch (err) {
        console.error('Failed to load subtopics');
        setDialogSubtopics([]);
      } finally {
        setLoadingDialogSubtopics(false);
      }
    };
    fetchSubtopics();
  }, [dialogTopic]);


  // Fetch preview from server using current dialog filters and numQuestions
  const fetchPreviewFromServer = useCallback(async () => {
    // require exam and numQuestions
    if (!paperForm.examId || !paperForm.numQuestions || Number(paperForm.numQuestions) <= 0) return [];
    setLoadingPreview(true);
    setPreviewWarnings([]);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_id: paperForm.examId, subject_id: paperForm.subjectId, topic_id: paperForm.topicId, subtopic_id: paperForm.subtopicId, num_questions: Number(paperForm.numQuestions) }) });
      const data = await res.json();
      if (res.ok && data.questions) {
        // Normalize fields to match preview renderer
        const mapped = (data.questions || []).map((q: Record<string, unknown>) => {
          const qq = q as Record<string, unknown>;
          return {
            id: qq['id'],
            text: (qq['text'] as string) || (qq['stem'] as string) || (qq['question_text'] as string) || '',
            marks: Number(qq['marks'] as number) || 4,
            questionImage: (qq['image_url'] as string) || (qq['question_image'] as string) || null,
            optionA: (qq['optionA'] as string) || (qq['option_a'] as string) || '',
            optionB: (qq['optionB'] as string) || (qq['option_b'] as string) || '',
            optionC: (qq['optionC'] as string) || (qq['option_c'] as string) || '',
            optionD: (qq['optionD'] as string) || (qq['option_d'] as string) || '',
            optionAImage: (qq['optionAImage'] as string) || (qq['option_a_image'] as string) || null,
            optionBImage: (qq['optionBImage'] as string) || (qq['option_b_image'] as string) || null,
            optionCImage: (qq['optionCImage'] as string) || (qq['option_c_image'] as string) || null,
            optionDImage: (qq['optionDImage'] as string) || (qq['option_d_image'] as string) || null,
            answer: (qq['answer'] as string) || (qq['correctAnswer'] as string) || null,
            correctAnswer: ((qq['answer'] as string) || (qq['correctAnswer'] as string) || '')?.toString().trim().charAt(0).toUpperCase() || null,
            explanation: (qq['explanation'] as string) || null,
            explanationImage: (qq['explanation_image'] as string) || null,
            subjectId: (qq['subject_id'] as number) || (qq['subjectId'] as number) || null,
            topicId: (qq['topic_id'] as number) || (qq['topicId'] as number) || null,
            useImg: Boolean(qq['image_url'] || qq['optionAImage'] || qq['optionBImage'] || qq['optionCImage'] || qq['optionDImage']),
          };
        });
        setPreviewQuestions(mapped);
        // Auto-set total marks from preview
        const sumMarks = mapped.reduce((s, q: { marks?: number }) => s + (q.marks || 0), 0);
        setPaperForm(prev => ({ ...prev, totalMarks: sumMarks }));
        // Warn if fewer questions returned than requested
        if (Number(paperForm.numQuestions) > mapped.length) {
          setPreviewWarnings([`Requested ${paperForm.numQuestions} but only ${mapped.length} available for the selected scope`]);
        } else {
          setPreviewWarnings([]);
        }
        return mapped;
      } else {
        setPreviewQuestions([]);
        setPreviewWarnings([]);
        setPaperForm(prev => ({ ...prev, totalMarks: 0 }));
        return [];
      }
    } catch (err) {
      console.error('Preview fetch failed', err);
      setPreviewQuestions([]);
      setPreviewWarnings([]);
      setPaperForm(prev => ({ ...prev, totalMarks: 0 }));
      return [];
    } finally {
      setLoadingPreview(false);
    }
  }, [paperForm.examId, paperForm.subjectId, paperForm.topicId, paperForm.subtopicId, paperForm.numQuestions]);

  // Auto-refresh preview when key inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreviewFromServer();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPreviewFromServer]);

  // When availableQuestions changes, prefill numQuestions and trigger an immediate preview
  useEffect(() => {
    if (availableQuestions && availableQuestions > 0) {
      setPaperForm(prev => ({ ...prev, numQuestions: availableQuestions }));
      // run an immediate preview when available changes
      // Intentionally DO NOT include fetchPreviewFromServer in deps — its identity changes when numQuestions changes
      // which would cause this effect to run and reset manual edits. Call it here without adding it to deps.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      (async () => { try { await fetchPreviewFromServer(); } catch (err) { /* ignore */ } })();
    }
  }, [availableQuestions]);

  // Helpers: explicit fetchers used during the Edit flow to ensure the selects are populated
  const fetchDialogTopicsFor = async (subjectId: number | null) => {
    if (!subjectId) {
      setDialogTopics([]);
      setDialogTopic(null);
      setDialogSubtopics([]);
      setDialogSubtopic(null);
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${subjectId}`);
      const data = await res.json();
      if (data.success) setDialogTopics(data.topics || []);
    } catch (err) {
      console.error('Failed to load dialog topics', err);
      setDialogTopics([]);
    }
  };

  const fetchDialogSubtopicsFor = async (topicId: number | null) => {
    if (!topicId) {
      setDialogSubtopics([]);
      setDialogSubtopic(null);
      return;
    }
    setLoadingDialogSubtopics(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${topicId}`);
      const data = await res.json();
      if (data.success) setDialogSubtopics(data.subtopics || []);
    } catch (err) {
      console.error('Failed to load dialog subtopics', err);
      setDialogSubtopics([]);
    } finally {
      setLoadingDialogSubtopics(false);
    }
  };

  // Fetch available questions count when subject or topic is selected
  useEffect(() => {
    if (!dialogSubject) {
      setAvailableQuestions(0);
      return;
    }
    const fetchQuestionCount = async () => {
      try {
        const queryParam = dialogSubtopic ? `subtopicId=${dialogSubtopic}` : dialogTopic ? `topicId=${dialogTopic}` : `subjectId=${dialogSubject}`;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${queryParam}`);
        const data = await res.json();
        if (data.success) {
          // Use the new response structure (total instead of pagination.total)
          setAvailableQuestions(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load question count');
        setAvailableQuestions(0);
      }
    };
    fetchQuestionCount();
  }, [dialogSubject, dialogTopic, dialogSubtopic]);

  // Load tests
  const fetchTests = useCallback(async () => {
    setLoadingTests(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/admin/tests?`;
      if (selectedExam) url += `examId=${selectedExam}&`;
      if (selectedSubject) url += `subjectId=${selectedSubject}&`;
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (testTypeFilter && testTypeFilter !== 'all') url += `testType=${testTypeFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTests(data.tests || []);
      }
    } catch (err) {
      console.error('Failed to load tests');
    } finally {
      setLoadingTests(false);
    }
  }, [selectedExam, selectedSubject, statusFilter, searchQuery, testTypeFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Filter tests
  const filteredTests = tests.filter(test => {
    // If user asked for 'paper' type, tests list should be empty (we show papers instead)
    if (testTypeFilter === 'paper') return false;

    const matchesSearch = !searchQuery || 
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesExam = !selectedExam || test.examId === selectedExam;
    const matchesSubject = !selectedSubject || test.subjectId === selectedSubject;
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
  const matchesType = testTypeFilter === 'all' || (testTypeFilter === 'single' && test.parentTestId == null && Number(test.allSubjects || 0) === 0) || (testTypeFilter === 'combined' && test.parentTestId == null && Number(test.allSubjects || 0) === 1) || (testTypeFilter === 'child' && test.parentTestId != null);

    return matchesSearch && matchesExam && matchesSubject && matchesStatus && matchesType;
  });

  const clearFilters = () => {
    setSelectedExam(null);
    setSelectedSubject(null);
    setStatusFilter('all');
    setTestTypeFilter('all');
    setSearchQuery('');
  };

  // Reset dialog-level view filters
  useEffect(() => {
    if (!isViewOpen) {
      setViewSubjectFilter(null);
      setViewSubjects([]);
    }
  }, [isViewOpen]);

  const resetDialog = (keepSelection = false) => {
    setDialogExam(null);
    setDialogSubject(null);
    setDialogTopic(null);
    setDialogSubtopic(null);
    setDialogBatch(null);
    setDialogSelectedStandards([]);
    setDialogSubjects([]);
    setDialogTopics([]);
    setDialogSubtopics([]);
    setDialogBatches([]);
    setAvailableQuestions(0);
    setFormData({ title: '', duration: 60, numQuestions: 0, marksPerQuestion: 4, startTime: '', endTime: '', isRandomized: false, schoolIds: [], selectionMode: 'automatic', manualSelectedQuestionIds: [], totalMarksOverride: null });
    setPreviewQuestions([]);
    setExpandedQuestions(new Set());
    setApplyToAllTopics(false);
    setAllocations([]);
    setIsCombinedParent(false);
    // clear combine-selected state when resetting the dialog (unless caller requests to keep selection)
    if (!keepSelection) {
      setCombineSelected(false);
      setParentFor(null);
    }
  };

  const handlePreviewQuestions = async () => {
    // Allow preview for allocations or normal selection
    if (!dialogSubject && allocations.length === 0) return;

    setLoadingPreview(true);
    setPreviewWarnings([]);
    setPreviewAllocBreakdown([]);
    try {
      const selectedQuestions: Question[] = [];
      const selectedIds = new Set<number | string>();
      const warnings: string[] = [];

      if (allocations.length > 0) {
        // For each allocation, fetch candidate questions and pick randoms
        for (const a of allocations) {
          // Determine per-topic breakdown or single allocation
          const perTopic = Object.entries(a.perTopicCounts || {}).map(([tid, cnt]) => ({ topicId: Number(tid), cnt: Number(cnt) }));

          if (perTopic.length > 0 && perTopic.some(p => p.cnt > 0)) {
            for (const p of perTopic) {
              if (p.cnt <= 0) continue;
              try {
                const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${p.topicId}`);
                const qData = await qRes.json();
                if (qData.success && Array.isArray(qData.questions) && qData.questions.length > 0) {
                  const avail = (qData.questions as Question[]).filter((q: Question) => !selectedIds.has(q.id));
                  if (avail.length === 0) {
                    warnings.push(`No available questions for topic id ${p.topicId}`);
                    continue;
                  }
                  const shuffled = avail.sort(() => Math.random() - 0.5);
                  const take = shuffled.slice(0, p.cnt);
                  (take as Question[]).forEach((t: Question) => { selectedIds.add(t.id); selectedQuestions.push(t); });
                  if (take.length < p.cnt) warnings.push(`Requested ${p.cnt} but only allocated ${take.length} for topic id ${p.topicId}`);
                } else {
                  warnings.push(`No questions found for topic id ${p.topicId}`);
                }
              } catch (err) {
                console.error('Failed to load questions for topic preview', err);
                warnings.push(`Failed to load questions for topic id ${p.topicId}`);
              }
            }
          } else {
            // Single allocation (subject/topic/subtopic)
            const qp = a.subtopicId ? `subtopicId=${a.subtopicId}` : a.topicId ? `topicId=${a.topicId}` : `subjectId=${a.subjectId}`;
            const count = Number(a.questionCount) || 0;
            if (count <= 0) continue;
            try {
              const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${qp}`);
              const qData = await qRes.json();
              if (qData.success && Array.isArray(qData.questions) && qData.questions.length > 0) {
                const avail = (qData.questions as Question[]).filter((q: Question) => !selectedIds.has(q.id));
                if (avail.length === 0) {
                  warnings.push(`No available questions for allocation (subject/topic/subtopic)`);
                  continue;
                }
                const shuffled = avail.sort(() => Math.random() - 0.5);
                const take = shuffled.slice(0, count);
                (take as Question[]).forEach((t: Question) => { selectedIds.add(t.id); selectedQuestions.push(t); });
                if (take.length < count) warnings.push(`Requested ${count} but only allocated ${take.length} for an allocation`);
              } else {
                warnings.push(`No questions found for allocation (subject/topic/subtopic)`);
              }
            } catch (err) {
              console.error('Failed to load questions for allocation preview', err);
              warnings.push('Failed to load questions for an allocation');
            }
          }
        }

        if (selectedQuestions.length > 0) {
          setPreviewQuestions(selectedQuestions);
          setIsPreviewOpen(true);
        }
        if (warnings.length > 0) setPreviewWarnings(warnings);
      } else {
         const queryParam = dialogSubtopic ? `subtopicId=${dialogSubtopic}` : dialogTopic ? `topicId=${dialogTopic}` : dialogSubject ? `subjectId=${dialogSubject}` : `examId=${dialogExam}`;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${queryParam}`);
        const data = await res.json();
        if (data.success && data.questions) {
          const shuffled = [...data.questions].sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, formData.numQuestions);
          setPreviewQuestions(selected);
          setIsPreviewOpen(true);
        }
      }
      
    } catch (err) {
      console.error('Failed to fetch questions for preview:', err);
      setPreviewWarnings(['Failed to load question preview']);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Load a random sample (or the manual picks) for one section and show it inline
  const loadSectionPreview = async (alloc: Allocation) => {
    if (alloc.manualQuestionIds?.length) {
      updateAllocation(alloc.id, { previewOpen: true, previewQuestions: alloc.manualQuestions || [] });
      return;
    }
    updateAllocation(alloc.id, { previewLoading: true, previewOpen: true });
    try {
      const qp = alloc.subtopicId ? `subtopicId=${alloc.subtopicId}` : alloc.topicId ? `topicId=${alloc.topicId}` : `subjectId=${alloc.subjectId}`;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${qp}`);
      const data = await res.json();
      const all: Question[] = data.success && Array.isArray(data.questions) ? data.questions : [];
      const shuffled = [...all];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      updateAllocation(alloc.id, { previewQuestions: shuffled.slice(0, Number(alloc.questionCount) || 0), previewLoading: false });
    } catch (err) {
      console.error('Section preview failed', err);
      updateAllocation(alloc.id, { previewQuestions: [], previewLoading: false });
    }
  };

  const handleOpenManualSelect = async (allocId?: number) => {
    const targetAlloc = typeof allocId === 'number' ? allocations.find(a => a.id === allocId) : undefined;
    setManualTargetAllocId(targetAlloc ? targetAlloc.id : null);
    if (targetAlloc) {
      setLoadingManualQuestions(true);
      setIsManualSelectOpen(true);
      try {
        const qp = targetAlloc.subtopicId ? `subtopicId=${targetAlloc.subtopicId}` : targetAlloc.topicId ? `topicId=${targetAlloc.topicId}` : `subjectId=${targetAlloc.subjectId}`;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${qp}`);
        const data = await res.json();
        setManualSelectionQuestions(data.success && Array.isArray(data.questions) ? data.questions : []);
      } catch (err) {
        console.error('Failed to load section questions:', err);
        setManualSelectionQuestions([]);
      } finally {
        setLoadingManualQuestions(false);
      }
      return;
    }
    if (!dialogSubject && allocations.length === 0) return;
    
    setLoadingManualQuestions(true);
    setIsManualSelectOpen(true);
    try {
      if (allocations.length > 0) {
        // Collect all possible questions for all allocations
        let allQs: Question[] = [];
        const seenIds = new Set<string | number>();
        for (const a of allocations) {
          const perTopic = Object.keys(a.perTopicCounts || {});
          if (perTopic.length > 0) {
            for (const tid of perTopic) {
              const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${tid}`);
              const qData = await qRes.json();
              if (qData.success && Array.isArray(qData.questions)) {
                qData.questions.forEach((q: Question) => {
                  if (!seenIds.has(q.id)) { seenIds.add(q.id); allQs.push(q); }
                });
              }
            }
          } else {
             const queryParam = a.subtopicId ? `subtopicId=${a.subtopicId}` : a.topicId ? `topicId=${a.topicId}` : `subjectId=${a.subjectId}`;
             const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${queryParam}`);
             const qData = await qRes.json();
             if (qData.success && Array.isArray(qData.questions)) {
                qData.questions.forEach((q: Question) => {
                  if (!seenIds.has(q.id)) { seenIds.add(q.id); allQs.push(q); }
                });
             }
          }
        }
        setManualSelectionQuestions(allQs);
      } else {
         const queryParam = dialogSubtopic ? `subtopicId=${dialogSubtopic}` : dialogTopic ? `topicId=${dialogTopic}` : dialogSubject ? `subjectId=${dialogSubject}` : `examId=${dialogExam}`;
         const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${queryParam}`);
         const data = await res.json();
         if (data.success && Array.isArray(data.questions)) {
           setManualSelectionQuestions(data.questions);
         }
      }
    } catch (err) {
      console.error('Failed to load manual questions:', err);
    } finally {
      setLoadingManualQuestions(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogExam || !formData.title.trim()) return;

    // Duration is required for tests (also required by server)
    if (!formData.duration || Number(formData.duration) <= 0) {
      alert('Please specify a valid test duration (minutes).');
      return;
    }

    if (allocations.length > 0) {
      let sum = 0;
      for (const a of allocations) {
        if (!a.subjectId) { alert('Each allocation must select a subject'); setSubmitting(false); return; }

        const perTopicSum = (Object.values(a.perTopicCounts || {}).map((n) => Number(n) || 0) as number[]).reduce((s: number, n: number) => s + n, 0);
        if (perTopicSum > 0) {
          for (const [tid, cnt] of Object.entries(a.perTopicCounts || {})) {
            const topic = (a.topics || []).find((x) => String(x.id) === String(tid));
            let available: number | undefined = typeof topic?.available !== 'undefined' ? topic.available : undefined;
            if (typeof available === 'undefined' && topic) {
              try {
                const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topic.id}`);
                const qData = await qRes.json();
                available = qData.success ? (qData.total || 0) : 0;
                updateAllocation(a.id, { topics: (a.topics || []).map((t) => t.id === topic.id ? { ...t, available } : t) });
              } catch (err) {
                available = 0;
                updateAllocation(a.id, { topics: (a.topics || []).map((t) => t.id === topic.id ? { ...t, available: 0 } : t) });
              }
            }
            if (topic && Number(cnt) > (available || 0)) { alert(`Allocation for topic ${topic.name} requests ${cnt} but only ${available || 0} available.`); setSubmitting(false); return; }
          }
          sum += perTopicSum;
        } else {
          if (!a.questionCount || Number(a.questionCount) < 1) { alert('Each allocation must request at least 1 question'); setSubmitting(false); return; }
          if (Number(a.questionCount) > (a.available || 0)) { alert(`Allocation for subject ${a.subjectId} requests ${a.questionCount} but only ${a.available || 0} available.`); setSubmitting(false); return; }
          sum += Number(a.questionCount);
        }
      }
      // override numQuestions to sum of allocations
      setFormData(prev => ({ ...prev, numQuestions: sum }));
    } else if (!combineSelected) {
      // Validate number of questions (skip validation in combine-selected mode)
      if (formData.numQuestions > availableQuestions) {
        alert(`Cannot allocate ${formData.numQuestions} questions. Only ${availableQuestions} available.`);
        return;
      }

      if (formData.numQuestions < 1) {
        alert('Please specify at least 1 question for the test.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const totalMarks = calculateTotalMarks();
      
      // Step 1: Create the test
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          examId: dialogExam,
          // When allocations are provided, treat as all-subjects test and do not set subject/topic/subtopic on the tests row
          subjectId: allocations.length > 0 ? null : (dialogSubject || null),
          topicId: allocations.length > 0 ? null : (dialogTopic || null),
          subtopicId: allocations.length > 0 ? null : (dialogSubtopic || null),

          batchId: dialogBatch || null,
          standards: dialogSelectedStandards.length > 0 ? dialogSelectedStandards : undefined,
          duration: formData.duration,
            totalMarks: totalMarks,
            totalMarksOverride: formData.totalMarksOverride || undefined,
              // Expand per-topic breakdowns into individual allocations for submission
              allocations: allocations.length > 0 ? allocations.flatMap(a => {
                const marksPer = Number(a.marksPerQuestion) || 4;
                if (a.manualQuestionIds && a.manualQuestionIds.length > 0) {
                  return [{ subjectId: a.subjectId, topicId: a.topicId || null, subtopicId: a.subtopicId || null, questionCount: a.manualQuestionIds.length, marksPerQuestion: marksPer, questionIds: a.manualQuestionIds }];
                }
                const perTopic = Object.entries(a.perTopicCounts || {}).map(([tid, cnt]) => ({ topicId: Number(tid), cnt: Number(cnt) }));
                if (perTopic.length > 0 && perTopic.some(p => p.cnt > 0)) {
                  return perTopic.filter(p => p.cnt > 0).map(p => ({ subjectId: a.subjectId, topicId: p.topicId, subtopicId: null, questionCount: p.cnt, marksPerQuestion: marksPer }));
                }
                return [{ subjectId: a.subjectId, topicId: a.topicId || null, subtopicId: a.subtopicId || null, questionCount: Number(a.questionCount), marksPerQuestion: marksPer }];
              }) : undefined,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          createdBy: user?.id ? parseInt(user.id) : null,
          isRandomized: formData.isRandomized,
          schoolIds: formData.schoolIds.length > 0 ? formData.schoolIds : undefined,
          // parentFor: when combineSelected mode is active, attach selected tests as children
          parentFor: combineSelected && Array.isArray(parentFor) ? parentFor : undefined,
        }),
      });
      const data = await res.json();
      
      if (data.success && data.testId) {
        const testId = data.testId;
        // Show server-side allocation warnings/details if present
        if (data.allocationResult) {
          const ar = data.allocationResult;
          const msgs: string[] = [];
          if (ar.warnings && ar.warnings.length > 0) msgs.push('Allocation warnings:\n' + ar.warnings.join('\n'));
          if (ar.perAllocation && ar.perAllocation.length > 0) {
            msgs.push('Allocation summary:');
            msgs.push(...(ar.perAllocation as AllocationResultItem[]).map((p) => `Allocation ${p.allocationId}: requested ${p.requested}, allocated ${p.allocated}, marksPerQuestion ${p.marksPerQuestion}`));
          }
          if (msgs.length > 0) alert(msgs.join('\n\n'));
        }

        // If we created a parent (combineSelected mode), clear selection and exit combine mode
        if (combineSelected) {
          // Keep the current selection so user can create another parent from the same selected tests if desired
          setCombineSelected(false);
          // Close dialog and refresh list — keep parentFor and selectedTests intact
          setIsCreateOpen(false);
          resetDialog(true); // keep selection
          await fetchTests();
          toast({ title: 'Combined', description: 'Selected tests attached to new parent test', duration: 3000 });
          setSubmitting(false);
          return;
        }

        // If allocations were provided, backend already created and allocated questions -> skip client-side question addition
        if (allocations.length > 0) {
          // Refresh tests
          const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
          const refreshData = await refreshRes.json();
          if (refreshData.success) setTests(refreshData.tests || []);

          setIsCreateOpen(false);
          resetDialog();
          alert('✅ Test created and questions allocated based on allocations.');
          setSubmitting(false);
          return;
        }
        
        // Step 2: Determine questionIdsToUse from normal selection flow
        let questionIdsToUse: (string | number)[] = [];

        if (formData.selectionMode === 'manual') {
          questionIdsToUse = formData.manualSelectedQuestionIds || [];
          if (questionIdsToUse.length === 0) {
            alert('⚠️ Test created, but no questions were selected manually.');
            setIsCreateOpen(false);
            resetDialog();
            setSubmitting(false);
            return;
          }
        } else if (formData.numQuestions > 0) {
          // Normal flow: Fetch and randomly select questions
          try {
            const queryParam = dialogSubtopic
              ? `subtopicId=${dialogSubtopic}`
              : dialogTopic
              ? `topicId=${dialogTopic}` 
              : dialogSubject 
              ? `subjectId=${dialogSubject}` 
              : `examId=${dialogExam}`;
            
            // Fetch all questions (no limit needed)
            const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${queryParam}`);
            const qData = await qRes.json();
            
            if (qData.success && qData.questions && qData.questions.length > 0) {
              // Randomly shuffle and select questions
              const shuffled = [...qData.questions].sort(() => Math.random() - 0.5);
              questionIdsToUse = shuffled.slice(0, formData.numQuestions).map(q => q.id);
              
              console.log('Fetched and selected question IDs:', questionIdsToUse);
            } else {
              alert('⚠️ No questions available for the selected criteria. Test created without questions.');
              setIsCreateOpen(false);
              resetDialog();
              // Refresh tests
              const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
              const refreshData = await refreshRes.json();
              if (refreshData.success) setTests(refreshData.tests || []);
              setSubmitting(false);
              return;
            }
          } catch (qErr) {
            console.error('Error fetching questions:', qErr);
            alert('⚠️ Test created but failed to fetch questions. You can add them manually.');
            setIsCreateOpen(false);
            resetDialog();
            setSubmitting(false);
            return;
          }
        }

        // Validate before sending to backend
        if (formData.numQuestions > 0 && questionIdsToUse.length === 0) {
          alert('❌ Failed to allocate questions. Please check the question pool and try again.');
          setIsCreateOpen(false);
          resetDialog();
          setSubmitting(false);
          return;
        }

        // Add questions to test if we have any
        if (questionIdsToUse.length > 0) {
          try {
            const requestBody = { questionIds: questionIdsToUse };
            console.log('=== SENDING TO BACKEND ===');
            console.log('Test ID:', testId);
            console.log('Question IDs array:', questionIdsToUse);
            console.log('Array length:', questionIdsToUse.length);
            console.log('Array type:', Array.isArray(questionIdsToUse));
            console.log('First few IDs:', questionIdsToUse.slice(0, 5));
            console.log('Request body:', requestBody);
            console.log('JSON stringified:', JSON.stringify(requestBody));
            console.log('URL:', `${import.meta.env.VITE_API_URL}/admin/tests/${testId}/questions`);
            
            const allocRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}/questions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });
            
            console.log('Response status:', allocRes.status);
            console.log('Response ok?', allocRes.ok);
            
            const allocData = await allocRes.json();
            
            console.log('Backend response:', allocData);
            
            if (allocData.success) {
              // Show detailed feedback
              setIsCreateOpen(false);
              resetDialog();
              
              // Refresh tests
              const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
              const refreshData = await refreshRes.json();
              if (refreshData.success) setTests(refreshData.tests || []);
              
              // Show success message with details
              const message = allocData.skippedCount > 0
                ? `✅ Test created successfully!\n\n📝 ${allocData.addedCount} questions added\n⚠️ ${allocData.skippedCount} questions were already allocated (skipped)\n📊 Total: ${allocData.totalRequested} questions requested`
                : `✅ Test created successfully with ${allocData.addedCount} questions!`;
              alert(message);
              setSubmitting(false);
              return;
            } else {
              console.error('Failed to allocate questions:', allocData.message);
              alert(`❌ Error: ${allocData.message || 'Failed to add questions to test'}\n\n⚠️ Test was created but questions were not added. You can add them manually.`);
              setIsCreateOpen(false);
              resetDialog();
              // Refresh tests
              const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
              const refreshData = await refreshRes.json();
              if (refreshData.success) setTests(refreshData.tests || []);
              setSubmitting(false);
              return;
            }
          } catch (qErr) {
            console.error('Error allocating questions:', qErr);
            alert('❌ Network error while adding questions. Test was created but questions were not added. You can add them manually.');
            setIsCreateOpen(false);
            resetDialog();
            setSubmitting(false);
            return;
          }
        }
        
        setIsCreateOpen(false);
        resetDialog();
        
        // Refresh tests
        const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setTests(refreshData.tests || []);
        
        alert(`✅ Test created successfully!`);
      } else {
        alert(data.message || 'Failed to create test');
      }
    } catch (err) {
      console.error('Error creating test:', err);
      alert('Failed to create test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (testId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'unpublished' : 'published';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTests(prev => prev.map(t => 
          t.id === testId ? { ...t, status: newStatus as 'draft' | 'published' | 'unpublished' } : t
        ));
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Convert a filesystem path returned by the server into a served URL under /uploads
  const filePathToUrl = (fp?: string | null) => {
    if (!fp) return null;
    const normalized = fp.replace(/\\\\/g, '/').replace(/\\/g, '/');
    const idx = normalized.indexOf('/uploads');
    if (idx >= 0) return `${import.meta.env.VITE_API_URL}${normalized.substring(idx)}`;
    // If not containing uploads, return as-is
    return fp;
  };

  // Create an offline paper for the given test and optionally generate PDFs
  const createAndGeneratePaperForTest = async (testId: string | number, title?: string, questionIdsParam?: string[] | null) => {
    setIsPaperProcessing(true);
    try {
      let questionIds: string[] | undefined = questionIdsParam || undefined;
      let examIdToUse: number | null = dialogExam || null;
      let batchIdToUse: number | null = dialogBatch || null;
      let durationToUse: number | null = formData.duration || null;

      if (!questionIds) {
        // fetch test details
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}`);
        const data = await res.json();
        if (!data.success || !data.test) throw new Error('Failed to load test details for paper creation');
        const t = data.test;
        questionIds = (t.questions || []).map((q: { id: string | number }) => String(q.id));
        examIdToUse = t.examId || examIdToUse;
        batchIdToUse = t.batchId || batchIdToUse;
        durationToUse = t.duration || durationToUse;
        if (!title) title = `Paper - ${t.title}`;
      }

      if (!questionIds || questionIds.length === 0) {
        alert('This test has no questions to create an offline paper.');
        return;
      }

      // Create paper
      const createRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examIdToUse, batch_id: batchIdToUse, title: title || `Paper - ${testId}`, question_ids: questionIds, duration_minutes: durationToUse, created_by: user?.id ? Number(user.id) : null }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.paper) {
        console.error('Create paper failed', createData);
        throw new Error(createData.message || 'Failed to create offline paper');
      }
      const paperId = createData.paper.id;

      // Generate PDFs
      const genRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paperId}/generate`, { method: 'POST' });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.message || 'Failed to generate PDFs');

      // Server now returns download URLs (no filesystem paths)
      const qUrl = genData.questionUrl || genData.questionPdfPath ? filePathToUrl(genData.questionPdfPath) : null;
      const aUrl = genData.answerUrl || genData.answerPdfPath ? filePathToUrl(genData.answerPdfPath) : null;

      // Fallbacks: if server returned full URLs use them directly
      const qOpenUrl = genData.questionUrl || qUrl;
      const aOpenUrl = genData.answerUrl || aUrl;

      // Open in new tabs for convenience
      if (qOpenUrl) window.open(qOpenUrl, '_blank');
      if (aOpenUrl) window.open(aOpenUrl, '_blank');

      toast({ title: 'Offline paper generated', description: 'Question & answer PDFs are ready and opened in new tabs.' });

      return { paperId, qUrl: qOpenUrl, aUrl: aOpenUrl };
    } finally {
      setIsPaperProcessing(false);
    }
  };

  // Action: Generate offline paper for a given test via UI action
  const handleGenerateOfflineFromTest = async (test: Test) => {
    if (!confirm('Create an offline paper from this test and generate question & answer PDFs?')) return;
    try {
      await createAndGeneratePaperForTest(test.id, `Paper - ${test.title}`, null);
      await fetchPapers();
    } catch (err) {
      console.error(err);
      alert('Failed to create/generate offline paper');
    }
  };

  // Offline papers management



  const openPaperDialogPrefill = () => {
    // Prefill dialog title
    setPaperForm(prev => ({ ...prev, title: `Paper - ${new Date().toLocaleDateString()}` }));
    // Ensure dialog exam/batch/subjects are loaded if exam already selected
    if (paperForm.examId) setDialogExam(paperForm.examId);
    if (paperForm.subjectId) setDialogSubject(paperForm.subjectId);
    if (paperForm.topicId) setDialogTopic(paperForm.topicId);
    if (paperForm.subtopicId) setDialogSubtopic(paperForm.subtopicId);

    setIsPaperDialogOpen(true);
  };

  const handleCreatePaper = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!paperForm.title || !paperForm.examId) { alert('Title and exam are required'); return; }

    // Determine number of questions - require numQuestions
    let questionIds: string[] = []; // no longer supported; keep var for backward compatibility but ignore content


    // Deduplicate
    questionIds = Array.from(new Set(questionIds));

    // Require a number of questions to create a paper
    if (!paperForm.numQuestions || Number(paperForm.numQuestions) <= 0) { alert('Please specify the number of questions for the paper'); return; }

    // Validate against available questions when allocations not used
    if (allocations.length === 0 && availableQuestions !== null && Number(paperForm.numQuestions) > Number(availableQuestions)) {
      alert(`Cannot allocate ${paperForm.numQuestions} questions — only ${availableQuestions} available for the selected scope.`);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        exam_id: paperForm.examId,
        batch_id: paperForm.batchId,
        title: paperForm.title,
        duration_minutes: paperForm.durationMinutes || null,
        created_by: user?.id ? Number(user.id) : null,
        subject_id: paperForm.subjectId || null,
        topic_id: paperForm.topicId || null,
        subtopic_id: paperForm.subtopicId || null,
        num_questions: Number(paperForm.numQuestions) || 0,
      };

      if (typeof paperForm.totalMarks !== 'undefined' && paperForm.totalMarks !== null) payload.total_marks = Number(paperForm.totalMarks);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.paper) { console.error('Create failed', data); alert('Failed to create paper'); return; }

      toast({ title: 'Paper created', description: 'Paper saved successfully (PDF generation is separate)' });
      setIsPaperDialogOpen(false);
      await fetchPapers();
    } catch (err) {
      console.error('Create paper error', err);
      alert('Failed to create paper');
    }
  };

  const handleDownloadPaper = (paper: OfflinePaper, type: 'question' | 'answer') => {
    const url = `${import.meta.env.VITE_API_URL}/admin/offline-papers/${paper.id}/download/${type}`;
    window.open(url, '_blank');
  };

  const handleGenerateExistingPaper = async (paper: OfflinePaper) => {
    if (!confirm('Generate PDFs for this paper now?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${paper.id}/generate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Generated', description: 'PDFs generated successfully' });
        const qUrl = data.questionUrl || (data.questionPdfPath ? filePathToUrl(data.questionPdfPath) : null);
        const aUrl = data.answerUrl || (data.answerPdfPath ? filePathToUrl(data.answerPdfPath) : null);
        if (qUrl) window.open(qUrl, '_blank');
        if (aUrl) window.open(aUrl, '_blank');
        fetchPapers();
      } else {
        console.error('Generate failed', data);
        alert('Failed to generate PDFs');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDFs');
    }
  };

  const handleRetestTest = async (testId: string) => {
    if (!confirm('Are you sure you want to create a Retest based on this test? This will copy all test configurations and, if not randomized, the exact questions. You can then edit the new test.')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}/retest`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Retest created successfully!');
        fetchTests(); // Refresh the list
      } else {
        alert(data.message || 'Failed to create retest');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating retest');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Delete this test permanently?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTests(prev => prev.filter(t => t.id !== testId));
        return;
      }

      // If server reports attempts exist, offer forced delete
      if (!data.success && data.message === 'Cannot delete test with existing student attempts') {
        const count = data.attemptCount || 0;
        const doForce = confirm(`This test has ${count} student attempt(s). Delete the test and all associated student attempts and answers? This action is irreversible.`);
        if (!doForce) return;

        // Send forced delete
        const forceRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}?force=true`, { method: 'DELETE' });
        const forceData = await forceRes.json();
        if (forceData.success) {
          setTests(prev => prev.filter(t => t.id !== testId));
        } else {
          alert(forceData.message || 'Failed to force delete test');
        }
      } else {
        alert(data.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete test error:', err);
      alert('Failed to delete');
    }
  };

  const handleEditTest = (test: Test) => {
    // Load fresh test details (including allocations) before opening edit dialog
    (async () => {
      try {
        setEditingTestId(test.id);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${test.id}`);
        const data = await res.json();
        if (!data.success) {
          alert('Failed to load test for edit');
          return;
        }

        const t = data.test;
        setDialogExam(t.examId || test.examId);
        // Ensure topics & subtopics are loaded for the test's subject/topic so selects show correctly
        setDialogSubject(t.subjectId || null);
        await fetchDialogTopicsFor(t.subjectId || null);
        setDialogTopic(t.topicId || null);
        await fetchDialogSubtopicsFor(t.topicId || null);
        setDialogSubtopic(t.subtopicId || null);
        setDialogBatch(t.batchId || null);
        setFormData(prev => ({
          ...prev,
          title: t.title || test.title,
          duration: t.duration || test.duration,
          numQuestions: t.allocations && t.allocations.length > 0 ? (t.allocations as Array<{ questionCount?: number }>).reduce((s: number, a) => s + (Number(a.questionCount) || 0), 0) : (t.questionCount || test.questionCount || 0),
          startTime: t.startTime ? toLocalInputValue(new Date(t.startTime)) : '',
          endTime: t.endTime ? toLocalInputValue(new Date(t.endTime)) : '',
          isRandomized: !!(t.isRandomized || t.is_randomized),
          schoolIds: (() => {
            const raw = t.schoolIds || t.school_ids;
            if (Array.isArray(raw)) return raw.map(String);
            if (typeof raw === 'string') {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.map(String);
              } catch (e) {
                return [];
              }
            }
            return [];
          })()
        }));

        // Detect combined/parent tests via server flag or presence of child tests
        const combinedFlag = Number(t.allSubjects || t.all_subjects || 0) === 1 || (Array.isArray(t.childTests) && t.childTests.length > 0);
        setIsCombinedParent(combinedFlag);

        // Map server allocations into client shape
        if (Array.isArray(t.allocations) && t.allocations.length > 0) {
          const mapped = (t.allocations as Array<{ subjectId?: number; topicId?: number; subtopicId?: number; questionCount?: number; marksPerQuestion?: number }>).map((a) => ({ // allocations from server; shape is flexible
            id: Date.now() + Math.random(),
            subjectId: a.subjectId || null,
            topicId: a.topicId || null,
            subtopicId: a.subtopicId || null,
            questionCount: Number(a.questionCount) || 0,
            marksPerQuestion: Number(a.marksPerQuestion) || 4,
            topics: [],
            subtopics: [],
            available: 0,
            loading: false,
            perTopicCounts: {}
          }));
          setAllocations(mapped);
        } else {
          setAllocations([]);
        }

        // Set apply flags based on test (use allSubjects flag or presence of allocations)
        setApplyToAllTopics(t.topicId == null && !!t.subjectId);
        // all-subjects handling removed; ignore t.allSubjects and treat test as normal single/allocation-driven test
        // No UI flag is set for applyToAllSubjects anymore.

        setIsEditOpen(true);
      } catch (err) {
        console.error('Failed to load test details for edit', err);
        alert('Failed to load test details. Try again.');
      }
    })();
  };

        // Per-subject edit seeding removed as all-subjects handling is no longer supported.
        // Previously this effect seeded inline per-subject edits when editing an all-subjects test; it's intentionally removed.

// Per-subject seeding removed; per-subject edits and previews are intentionally not supported anymore.

        // Per-subject topic preload removed (per-subject editing deprecated).
        // No longer preloading topics for each subject when edit dialog opens.

        // Per-subject preview helpers removed (per-subject editing is no longer supported).

        // Per-subject updates: use `Update Subject` button for each subject to apply changes individually.
        // The previous 'Apply All' bulk action was removed to encourage per-subject confirmation and clearer status handling.

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestId) return;

    setSubmitting(true);
    // Confirm if applying to all topics
    if (applyToAllTopics) {
      const ok = confirm('Apply changes to ALL topics in this subject? This will apply updates across all topics. Continue?');
      if (!ok) {
        setSubmitting(false);
        return;
      }
    }
    // 'Apply to all subjects' feature removed — no propagation confirmation or behavior will be executed.
    try {
      // First, update the test metadata
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${editingTestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          examId: dialogExam,
          subjectId: dialogSubject,
          topicId: dialogTopic,
          batchId: dialogBatch,
          applyToAllTopics: applyToAllTopics,
          allocations: allocations.map(a => ({ subjectId: a.subjectId, topicId: a.topicId, subtopicId: a.subtopicId, questionCount: a.questionCount, marksPerQuestion: a.marksPerQuestion })),
          duration: formData.duration,
          totalMarks: formData.numQuestions * 4,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          createdBy: user?.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Failed to update test');
        setSubmitting(false);
        return;
      }
      // If server returned propagation warnings (skipped subjects), show them
      if (Array.isArray(data.propagationWarnings) && data.propagationWarnings.length > 0) {
        alert('Propagation warnings:\n' + data.propagationWarnings.join('\n'));
      }

      // Get the current test to check the original question count
      const currentTest = tests.find(t => t.id === editingTestId);
      const originalQuestionCount = currentTest?.questionCount || 0;
      const newQuestionCount = formData.numQuestions;

      // Handle question count changes
      if (newQuestionCount !== originalQuestionCount) {
        if (newQuestionCount < originalQuestionCount) {
          // Decrease: Remove excess questions
          const questionsToRemove = originalQuestionCount - newQuestionCount;
          const removeRes = await fetch(
            `${import.meta.env.VITE_API_URL}/admin/tests/${editingTestId}/questions/remove-excess`,
            {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ count: questionsToRemove }),
            }
          );
          const removeData = await removeRes.json();
          if (!removeData.success) {
            console.warn('Failed to remove excess questions:', removeData.message);
          }
        } else if (newQuestionCount > originalQuestionCount) {
          // Increase: Add more questions
          const questionsToAdd = newQuestionCount - originalQuestionCount;
          const queryParam = dialogSubtopic ? `subtopicId=${dialogSubtopic}` : (dialogTopic ? `topicId=${dialogTopic}` : `subjectId=${dialogSubject}`);
          
          const addRes = await fetch(
            `${import.meta.env.VITE_API_URL}/admin/tests/${editingTestId}/allocate?${queryParam}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ numQuestions: questionsToAdd }),
            }
          );
          const addData = await addRes.json();
          if (!addData.success) {
            alert(`Test updated, but failed to add questions: ${addData.message}`);
            setSubmitting(false);
            return;
          }
        }
      }

      setIsEditOpen(false);
      resetDialog();
      setEditingTestId(null);
      
      // Refresh tests
      const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
      const refreshData = await refreshRes.json();
      if (refreshData.success) setTests(refreshData.tests || []);
      
      alert('Test updated successfully!');
    } catch (err) {
      console.error('Error updating test:', err);
      alert('Failed to update test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewTest = async (test: Test) => {
    setSelectedTest(test);
    setIsViewOpen(true);
    setAllocatedQuestions([]);
    setExpandedAllocatedQuestions(new Set());
    setViewSubjectFilter(null);
    setViewSubjects([]);
    setChildTests([]);
 
    setLoadingAllocatedQuestions(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${test.id}`);
      const data = await res.json();
      if (data.success && data.test) {
        // Start with any questions directly on this test
        let qs: Question[] = Array.isArray(data.test.questions) ? (data.test.questions as Question[]).map((q: Question) => ({ ...q, sourceTestId: test.id })) : [];

        // If this test has child tests (combined children), fetch their questions and append only when server did not include them
        if (Array.isArray(data.test.childTests) && data.test.childTests.length > 0) {
          setChildTests(data.test.childTests);

          // If server response already included child questions (tagged with sourceTestId !== parent id), skip per-child fetch to avoid duplicates
          const hasChildQsInResponse = Array.isArray(qs) && qs.some(q => q.sourceTestId && Number(q.sourceTestId) !== Number(test.id));
          if (!hasChildQsInResponse) {
            try {
              const childQsArrays = await Promise.all((data.test.childTests as Test[]).map(async (ct: Test) => {
                try {
                  const r = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${ct.id}`);
                  const jd = await r.json();
                  if (jd.success && Array.isArray(jd.test.questions)) {
                    return (jd.test.questions as Question[]).map((q: Question) => ({ ...q, sourceTestId: ct.id }));
                  }
                } catch (e) {
                  console.error('Failed to load child test questions', e);
                }
                return [];
              }));
              // Flatten and append
              qs = qs.concat(...childQsArrays);
            } catch (e) {
              console.error('Failed to fetch child questions:', e);
            }
          }
        }

        // If there are no questions fetched but childTests exist, derive totals & subjects from child test metadata
        if (qs.length === 0 && Array.isArray(data.test.childTests) && data.test.childTests.length > 0) {
          // Sum totals from children
          const qSum = (data.test.childTests as Test[]).reduce((s, ct) => s + (Number(ct.questionCount) || 0), 0);
          const mSum = (data.test.childTests as Test[]).reduce((s, ct) => s + (Number(ct.totalMarks) || 0), 0);

          // Build subjects map from child tests (aggregate question counts per subject)
          const subjMap2: Record<string, { id: number | string | null; name: string; count: number }> = {};
          (data.test.childTests as Test[]).forEach(ct => {
            const sid = ct.subjectId ?? null;
            const name = subjects.find(s => s.id === sid)?.name || (sid ? `Subject ${sid}` : 'Uncategorized');
            const key = `${sid || 'null'}::${name}`;
            const cur = subjMap2[key] || { id: sid, name, count: 0 };
            cur.count += Number(ct.questionCount) || 0;
            subjMap2[key] = cur;
          });

          setViewSubjects(Object.values(subjMap2));

          // Update the selectedTest with aggregated totals so UI displays counts properly
          setSelectedTest(prev => ({ ...(prev || {}), ...(data.test || {}), questionCount: qSum, totalMarks: mSum } as Test));
        } else {
          // Deduplicate questions by question id to avoid duplicates coming from different sources
          const uniqMap: Record<string, Question> = {};
          qs.forEach(q => {
            const key = String(q.id);
            if (!uniqMap[key]) uniqMap[key] = q;
          });
          const uniqQs = Object.values(uniqMap);

          setAllocatedQuestions(uniqQs.map(q => ({ ...q, correctAnswer: (q.correctAnswer || q.answer || '')?.toString().trim().charAt(0).toUpperCase() || null } as Question)));


          // Build viewSubjects from the combined question list so subjects appear for combined tests
          const subjMap: Record<string, { id: number | string | null; name: string; count: number }> = {};
          uniqQs.forEach(q => {
            const sid = q.subjectId ?? null;
            const name = q.subjectName || (sid ? `Subject ${sid}` : 'Uncategorized');
            const key = `${sid || 'null'}::${name}`;
            const cur = subjMap[key] || { id: sid, name, count: 0 };
            cur.count += 1;
            subjMap[key] = cur;
          });
          setViewSubjects(Object.values(subjMap));

          // update selectedTest with server-side details (including corrected questionCount and recomputed totals)
          const qCount = uniqQs.length;
          const tMarks = uniqQs.reduce((s, q) => s + (Number(q.marks) || 0), 0);
          setSelectedTest(prev => ({ ...(prev || {}), ...(data.test || {}), questionCount: qCount, totalMarks: tMarks } as Test));
        }
      }
    } catch (err) {
      console.error('Failed to fetch allocated questions:', err);
    } finally {
      setLoadingAllocatedQuestions(false);
    }
  };

  const handleLoadChildTest = async (childId: string | number) => {
    setLoadingAllocatedQuestions(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${childId}`);
      const data = await res.json();
      if (data.success && data.test) {
        setSelectedTest(data.test);
        setAllocatedQuestions((data.test.questions || []).map((q: Partial<Question>) => ({ ...q, correctAnswer: (q.correctAnswer || q.answer || '')?.toString().trim().charAt(0).toUpperCase() || null })) );
        setViewSubjects(data.test.viewSubjects || []);
        setChildTests(data.test.childTests || []);
      }
    } catch (err) {
      console.error('Failed to load child test', err);
    } finally {
      setLoadingAllocatedQuestions(false);
    }
  };

  const handleOpenTestById = async (id: string | number) => {
    // Open the view dialog and load test by id
    setIsViewOpen(true);
    await handleLoadChildTest(id);
  };



  const handleViewReport = async (test: Test) => {
    setSelectedTest(test);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${test.id}/report`);
      const data = await res.json();
      if (data.success && data.report) {
        setSelectedReport(data.report);
        setIsReportOpen(true);
      } else {
        alert('No report available');
      }
    } catch (err) {
      alert('Failed to load report');
    }
  };

  const handleAllocateQuestions = async () => {
    if (!selectedTest || numQuestionsToAllocate <= 0) return;
    
    setAllocatingQuestions(true);
    try {
      const queryParam = selectedTest.subtopicId
        ? `subtopicId=${selectedTest.subtopicId}`
        : selectedTest.topicId
        ? `topicId=${selectedTest.topicId}`
        : selectedTest.subjectId
        ? `subjectId=${selectedTest.subjectId}`
        : `examId=${selectedTest.examId}`;
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${queryParam}`);
      const data = await res.json();
      
      if (data.success && data.questions) {
        // Randomly shuffle and select questions
        const shuffled = [...data.questions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, numQuestionsToAllocate).map(q => q.id);
        
        // Add questions to test
        const allocRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${selectedTest.id}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIds: selectedQuestions }),
        });
        
        const allocData = await allocRes.json();
        if (allocData.success) {
          setIsQuestionAllocOpen(false);
          // Refresh tests
          const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
          const refreshData = await refreshRes.json();
          if (refreshData.success) setTests(refreshData.tests || []);
          
          alert(`✅ ${allocData.addedCount} questions allocated successfully!`);
        } else {
          alert(allocData.message || 'Failed to allocate questions');
        }
      }
    } catch (err) {
      console.error('Error allocating questions:', err);
      alert('Failed to allocate questions');
    } finally {
      setAllocatingQuestions(false);
    }
  };
  
  // Multi-select handlers
  const handleSelectTest = (testId: string) => {
    setSelectedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map(t => t.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedTests(new Set());
  };

  // 'Create from Selected' feature removed — handler deleted
const hasAllocations = Array.isArray(allocations) && allocations.length > 0;

const canPreviewWithoutAllocations =
  Boolean(dialogSubject) &&
  availableQuestions > 0 &&
  formData.numQuestions > 0;

const shouldShowPreview = (hasAllocations || canPreviewWithoutAllocations) && !combineSelected;

const editingTest = tests?.find(t => t.id === editingTestId);

const topicName = dialogTopics?.find(t => t.id === dialogTopic)?.name;
const subjectName = dialogSubjects?.find(s => s.id === dialogSubject)?.name;

  const handleDeleteSelected = async () => {
    if (selectedTests.size === 0) {
      alert('Please select at least one test to delete');
      return;
    }

    if (!confirm(`Delete ${selectedTests.size} test(s) permanently? This action cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedTests).map(testId =>
        fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${testId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      // Refresh tests
      const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests`);
      const refreshData = await refreshRes.json();
      if (refreshData.success) setTests(refreshData.tests || []);

      // Clear selection
      setSelectedTests(new Set());

      alert(`✅ Successfully deleted ${selectedTests.size} test(s)!`);
    } catch (err) {
      console.error('Error deleting tests:', err);
      alert('Failed to delete some tests');
    }
  };

  // Ensure parentForDetails contains detail objects for parentFor ids (fill missing by fetching)
  useEffect(() => {
    (async () => {
      if (!parentFor || parentFor.length === 0) { setParentForDetails([]); return; }
      const details: Test[] = [];
      const missing: number[] = [];
      for (const id of parentFor) {
        const found = tests.find(t => String(t.id) === String(id));
        if (found) details.push(found);
        else missing.push(Number(id));
      }
      if (missing.length > 0) {
        // fetch missing tests in parallel
        try {
          const fetched = await Promise.all(missing.map(id => fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${id}`).then(r=>r.json()).then(j=>j.success && j.test ? j.test : null).catch(()=>null)));
          for (const f of fetched) if (f) details.push(f);
        } catch (err) { console.error('Failed to fetch parent test details', err); }
      }
      setParentForDetails(details);
    })();
  }, [parentFor, tests]);

  const getSubjectIcon = (subjectName: string) => {
    const Icon = subjectIcons[subjectName as keyof typeof subjectIcons] || BookOpen;
    return <Icon className="w-5 h-5" />;
  };

  const getSubjectColor = (subjectName: string) => {
    return subjectColors[subjectName as keyof typeof subjectColors] || 'from-gray-500 to-gray-600';
  };

  // Calculate total marks based on preview questions or default marks per question
  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Set the start time and keep the end time valid (defaults to start + duration)
  const setScheduleStart = (value: string) => {
    setFormData(prev => {
      if (!value) return { ...prev, startTime: '' };
      let endTime = prev.endTime;
      if (!endTime || endTime <= value) {
        const end = new Date(value);
        end.setMinutes(end.getMinutes() + (Number(prev.duration) || 60));
        endTime = toLocalInputValue(end);
      }
      return { ...prev, startTime: value, endTime };
    });
  };

  // Total computed from questions x marks, ignoring any manual override
  const calculateTotalMarks = () => {
    if (!combineSelected && formData.totalMarksOverride) return formData.totalMarksOverride;
    return calculateAutoTotalMarks();
  };

  const calculateAutoTotalMarks = () => {
    // If combining selected tests, show sum of selected tests' total marks
    if (combineSelected && parentForDetails && parentForDetails.length > 0) {
      return parentForDetails.reduce((s, it) => s + (Number(it.totalMarks) || 0), 0);
    }

    if (allocations.length > 0) {
      return allocations.reduce((sum, a) => {
        // if per-topic breakdown, sum per-topic counts
        const perTopicSum = (Object.values(a.perTopicCounts || {}).map((n) => Number(n) || 0) as number[]).reduce((s: number, n: number) => s + n, 0);
        if (perTopicSum > 0) {
          return sum + perTopicSum * (Number(a.marksPerQuestion) || 4);
        }
        return sum + ((Number(a.questionCount) || 0) * (Number(a.marksPerQuestion) || 4));
      }, 0);
    }
    // Default: use the marksPerQuestion defined in formData
    return formData.numQuestions * formData.marksPerQuestion;
  };

  const manualSelectedIds: (string | number)[] = manualTargetAllocId !== null
    ? (allocations.find(a => a.id === manualTargetAllocId)?.manualQuestionIds || [])
    : (formData.manualSelectedQuestionIds || []);

  // Total questions requested across allocations (including per-topic breakdown)
  const allocationTotalQuestions = allocations.reduce((sum, a) => {
    const perTopicSum = (Object.values(a.perTopicCounts || {}).map((n) => Number(n) || 0) as number[]).reduce((s: number, n: number) => s + n, 0);
    return sum + (perTopicSum > 0 ? perTopicSum : (Number(a.questionCount) || 0));
  }, 0);

  const previewButtonDisabled = loadingPreview || (allocations.length === 0 ? (formData.numQuestions <= 0 || formData.numQuestions > availableQuestions) : allocationTotalQuestions <= 0);

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };
  
  const toggleAllocatedQuestionExpansion = (questionId: string) => {
    setExpandedAllocatedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  

  // Edit or create a test scoped to a single subject from the preview breakdown
  const handleEditSubjectFromPreview = (subjectId: number, breakdownEntry?: PreviewAllocation, examId?: number) => {
    // Close preview modal
    setIsPreviewOpen(false);

    // Try to find an existing test for this exam and subject
    const targetExamId = examId ?? dialogExam;
    const existing = tests.find(t => t.examId === targetExamId && t.subjectId === subjectId);
    if (existing) {
      // Edit existing test
      handleEditTest(existing);
      return;
    }

    // No existing test — prompt to create
    const subjectName = (dialogSubjects.find(s => s.id === subjectId)?.name) || (breakdownEntry && breakdownEntry.subjectName) || 'this subject';
    if (!confirm(`No test exists for ${subjectName}. Create a new test prefilled for this subject?`)) return;

    // Prefill create dialog for this subject
    setDialogExam(targetExamId || null);
    setDialogSubject(subjectId);
    setDialogTopic(null);
    // Use allocated if present else requested
    const numQ = breakdownEntry?.allocated || breakdownEntry?.requested || formData.numQuestions || 10;
    setFormData(prev => ({ ...prev, title: `${subjectName} - ${formData.title}`, numQuestions: numQ }));
    setIsCreateOpen(true);
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    const baseUrl = import.meta.env.VITE_IMG_API_URL.replace(/\/$/, '');
    
    if (cleanPath.startsWith('uploads/')) {
      return `${baseUrl}/${cleanPath}`;
    }
    
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  // Fetch existing test for a given examId & subjectId
  const fetchTestForSubject = async (subjectId: number) => {
    if (!dialogExam) return null;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests?examId=${dialogExam}&subjectId=${subjectId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tests) && data.tests.length > 0) return data.tests[0];
      return null;
    } catch (err) {
      console.error('Failed to fetch test for subject', err);
      return null;
    }
  };

  // Update or create a test for a single subject based on the inline subjectEdits
  // Per-subject update functionality removed — per-subject test updates are no longer supported from the Edit dialog.

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Test Management</h1>
            <p className="text-muted-foreground">Create and manage examination tests</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <div className="flex items-center gap-2">
            {/* View mode toggle: Online Tests / Offline Papers */}
            <div className="flex items-center gap-1 mr-2">
              <Button type="button" size="sm" variant={viewMode === 'online' ? 'secondary' : 'ghost'} onClick={() => setViewMode('online')}>Online Tests</Button>
              <Button type="button" size="sm" variant={viewMode === 'offline' ? 'secondary' : 'ghost'} onClick={() => setViewMode('offline')}>Offline Papers</Button>
            </div>

            <DialogTrigger asChild>
              <Button onClick={() => { setIsCreateOpen(true); resetDialog(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </DialogTrigger>

            <Button
              size="default"
              variant="secondary"
              disabled={selectedTests.size === 0}
              onClick={() => {
                // Open create dialog in combine-selected mode
                const ids = Array.from(selectedTests).map(id => Number(id));
                // Pre-fill exam and title based on first selected test
                const first = tests.find(t => String(t.id) === String(ids[0]));
                if (first) {
                  setDialogExam(first.examId);
                  setFormData(prev => ({ ...prev, title: `Combined Test - ${first.title}${ids.length > 1 ? ` (+${ids.length - 1} more)` : ''}` }));
                } else {
                  setFormData(prev => ({ ...prev, title: `Combined Test - ${new Date().toLocaleDateString()}` }));
                }
                setParentFor(ids);
                // Pre-fill duration as sum of selected tests' durations to satisfy backend validation
                const durationSum = ids.reduce((s, id) => {
                  const t = tests.find(x => String(x.id) === String(id));
                  return s + (t ? Number(t.duration || 0) : 0);
                }, 0);
                setFormData(prev => ({ ...prev, duration: durationSum || prev.duration }));
                setCombineSelected(true);
                setIsCreateOpen(true);
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" /> Combine Selected
            </Button>

            <Button size="default" variant="ghost" onClick={openPaperDialogPrefill}>
              <FileText className="w-4 h-4 mr-2" /> Create Paper
            </Button>
          </div>
            <DialogContent className="w-[96vw] max-w-[1400px] sm:max-w-[1400px] max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
                <DialogDescription>Fill in the test details below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTest} className="space-y-6">
                {/* Test Format Selector (Only if not combined) */}
                {!combineSelected && (
                  <div className="flex gap-4 p-1 bg-muted/30 rounded-lg w-max mx-auto mb-6">
                    <button
                      type="button"
                      className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${testFormat === 'single' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted text-muted-foreground'}`}
                      onClick={() => { setTestFormat('single'); setAllocations([]); }}
                    >
                      Single Subject Test
                    </button>
                    <button
                      type="button"
                      className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${testFormat === 'multi' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted text-muted-foreground'}`}
                      onClick={() => setTestFormat('multi')}
                    >
                      Multi-Topic Test
                    </button>
                  </div>
                )}

                {/* Section 1: Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Basic Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Test Title *</Label>
                      <Input
                        placeholder="e.g., NEET Physics Mock Test - Chapter 1"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        className="mt-1.5"
                      />
                      {combineSelected && parentFor && (
                        <div className="mt-2 px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-700">
                          This will attach <strong>{parentFor.length}</strong> selected tests as children of the new test.
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Exam Type *</Label>
                      <Select value={dialogExam?.toString() || ""} onValueChange={(v) => setDialogExam(v ? Number(v) : null)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                        <SelectContent>
                          {examTypes.map(exam => (
                            <SelectItem key={exam.id} value={exam.id.toString()}>{exam.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">1. Assigned Schools</Label>
                      <div className="border rounded-md mt-1.5 p-3 max-h-56 overflow-y-auto bg-muted/10 space-y-2.5">
                        <div>
                          <Select
                            onValueChange={(val) => {
                              if (val && !formData.schoolIds.includes(val)) {
                                setFormData(prev => ({ ...prev, schoolIds: [...prev.schoolIds, val] }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs bg-background">
                              <SelectValue placeholder="Select School" />
                            </SelectTrigger>
                            <SelectContent>
                              {dialogSchools.map(sch => (
                                <SelectItem key={sch.id} value={String(sch.id)}>
                                  {sch.school_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="border-t pt-2">
                          <div className="flex items-center justify-between pb-1.5 mb-2">
                            <span className="text-xs text-muted-foreground">Select the schools that take this test</span>
                            {dialogSchools.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() => setFormData(prev => ({ ...prev, schoolIds: prev.schoolIds.length === dialogSchools.length ? [] : dialogSchools.map(sc => String(sc.id)) }))}
                              >
                                {formData.schoolIds.length === dialogSchools.length ? 'Clear' : 'Select all'}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dialogSchools.map(sch => (
                              <label key={sch.id} className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${formData.schoolIds.includes(String(sch.id)) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}>
                                <input
                                  type="checkbox"
                                  checked={formData.schoolIds.includes(String(sch.id))}
                                  onChange={(e) => {
                                    setFormData(prev => {
                                      const newIds = e.target.checked
                                        ? [...prev.schoolIds, String(sch.id)]
                                        : prev.schoolIds.filter(id => id !== String(sch.id));
                                      return { ...prev, schoolIds: newIds };
                                    });
                                  }}
                                />
                                <span className="truncate">{sch.school_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">2. Classes</Label>
                      <div className={`border rounded-md mt-1.5 p-3 max-h-40 overflow-y-auto ${formData.schoolIds.length === 0 ? 'bg-muted/40' : 'bg-muted/10'}`}>
                        {formData.schoolIds.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Select at least one school to see its classes.</p>
                        ) : loadingStandards ? (
                          <p className="text-xs text-muted-foreground py-2">Loading classes...</p>
                        ) : dialogStandards.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No students with a class found in the selected schools.</p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                              <span className="text-xs text-muted-foreground">Leave all unticked for every class</span>
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() => setDialogSelectedStandards(prev => prev.length === dialogStandards.length ? [] : dialogStandards.map(d => d.standard))}
                              >
                                {dialogSelectedStandards.length === dialogStandards.length ? 'Clear' : 'Select all'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dialogStandards.map(st => (
                                <label key={st.standard} className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${dialogSelectedStandards.includes(st.standard) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'}`}>
                                  <input
                                    type="checkbox"
                                    checked={dialogSelectedStandards.includes(st.standard)}
                                    onChange={(e) => setDialogSelectedStandards(prev => e.target.checked ? [...prev, st.standard] : prev.filter(v => v !== st.standard))}
                                  />
                                  <span>Class {st.standard}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">{st.studentCount} students</span>
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {formData.schoolIds.length > 0 && dialogStandards.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Students of {dialogSelectedStandards.length > 0 ? `class ${dialogSelectedStandards.join(', ')}` : 'all these classes'} in the selected schools are notified when the test is published.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Content Selection */}
                {!combineSelected && testFormat === 'single' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Content Selection</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Subject *</Label>
                      <Select value={dialogSubject?.toString() || ""} onValueChange={(v) => setDialogSubject(v ? Number(v) : null)} disabled={!dialogExam}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={!dialogExam ? "Select exam first" : dialogSubjects.length === 0 ? "No subjects for this exam" : "Select subject"} />
                        </SelectTrigger>
                        <SelectContent>
                          {dialogSubjects.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name.trim()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dialogExam && dialogSubjects.length === 0 && (
                        <p className="text-xs text-destructive mt-1">This exam has no active subjects. Add them in Subject Management first.</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Topics</Label>
                      <Select value={dialogTopic?.toString() || "none"} onValueChange={(v) => { setDialogTopic(v === "none" ? null : Number(v)); setDialogSubtopic(null); }} disabled={!dialogSubject}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={dialogSubject ? "All topics" : "Select subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All Topics</SelectItem>
                          {dialogTopics.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Subtopics</Label>
                      <Select value={dialogSubtopic?.toString() || "none"} onValueChange={(v) => setDialogSubtopic(v === "none" ? null : Number(v))} disabled={!dialogTopic || loadingDialogSubtopics}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={dialogTopic ? (loadingDialogSubtopics ? 'Loading...' : 'All subtopics') : 'Select topic first'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All Subtopics</SelectItem>
                          {dialogSubtopics.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                ) : (
                  // Combine selected summary
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <h3 className="font-semibold text-sm">Combine Selected Summary</h3>
                    </div>
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      {parentForDetails && parentForDetails.length > 0 ? (
                        <div className="space-y-2">
                          {parentForDetails.map((t: Test) => {
                            const pid = t.id;
                            return (
                              <div key={pid} className="flex items-center justify-between">
                                <div className="text-sm">{t.title}</div>
                                <div className="text-sm text-muted-foreground">{`${t.questionCount || 0} q • ${t.totalMarks || 0} marks`}</div>
                              </div>
                            );
                          })}
                          <hr className="my-2" />
                          <div className="flex items-center justify-between font-semibold">
                            <div>Total</div>
                            <div>{(() => {
                              const sel = (parentForDetails || []);
                              const qSum = sel.reduce((s, it) => s + (Number(it.questionCount) || 0), 0);
                              const mSum = sel.reduce((s, it) => s + (Number(it.totalMarks) || 0), 0);
                              return `${qSum} q • ${mSum} marks`;
                            })()}</div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div>Subjects</div>
                            <div>{(() => {
                              const sel = (parentForDetails || []);
                              const names = new Set<string>();
                              sel.forEach(it => {
                                const name = it.subject || (it.subjectId ? `Subject ${it.subjectId}` : 'Uncategorized');
                                names.add(name);
                              });
                              const arr = Array.from(names);
                              return `${arr.length} subject${arr.length === 1 ? '' : 's'}${arr.length > 0 ? ` • ${arr.join(', ')}` : ''}`;
                            })()}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No tests selected.</div>
                      )}
                    </div>
                  </div>
                )}

                  {/* Section 3: Test Configuration */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Target className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">Test Configuration</h3>
                    </div>

                    {!combineSelected && allocations.length === 0 && (
                      <div className="space-y-3 bg-muted/20 p-4 rounded-lg border">
                        <Label className="text-sm font-medium">Question Selection Method</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${formData.selectionMode === 'automatic' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/50 bg-background'}`}>
                            <input 
                              type="radio" 
                              name="selectionMode" 
                              checked={formData.selectionMode === 'automatic'} 
                              onChange={() => setFormData(prev => ({...prev, selectionMode: 'automatic'}))} 
                              className="mt-1"
                            />
                            <div>
                              <p className="font-medium text-sm text-foreground">Automatic (Random)</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Select a quantity, questions are picked randomly.</p>
                            </div>
                          </label>
                          <label className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${formData.selectionMode === 'manual' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-muted/50 bg-background'}`}>
                            <input 
                              type="radio" 
                              name="selectionMode" 
                              checked={formData.selectionMode === 'manual'} 
                              onChange={() => setFormData(prev => ({...prev, selectionMode: 'manual', numQuestions: prev.manualSelectedQuestionIds.length || 0}))} 
                              className="mt-1"
                            />
                            <div>
                              <p className="font-medium text-sm text-foreground">Manual Selection</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Hand-pick specific questions from the bank.</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* When combining selected tests we auto-set duration and total marks — those fields are shown in the summary above and removed from the form */}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Duration (minutes) *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) || 0 }))}
                        className="mt-1.5"
                        placeholder="60"
                        required
                      />
                    </div>

                    {!combineSelected && testFormat === 'single' && (
                      <div>
                        <Label className="text-sm font-medium">Marks per Question</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.marksPerQuestion}
                          onChange={(e) => setFormData(prev => ({ ...prev, marksPerQuestion: Number(e.target.value) || 1 }))}
                          disabled={allocations.length > 0}
                          className="mt-1.5"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium">Total Marks</Label>
                      <div className="relative mt-1.5">
                        <Target className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          type="number"
                          min="1"
                          value={calculateTotalMarks() || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, totalMarksOverride: Number(e.target.value) || null }))}
                          disabled={combineSelected}
                          className="pl-9 font-bold text-primary bg-gradient-to-r from-primary/5 to-primary/10"
                          placeholder="0"
                        />
                      </div>
                      {formData.totalMarksOverride && !combineSelected ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Custom total (calculated: {calculateAutoTotalMarks()}).{' '}
                          <button type="button" className="text-primary underline" onClick={() => setFormData(prev => ({ ...prev, totalMarksOverride: null }))}>Use calculated</button>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Auto-calculated; type to override.</p>
                      )}
                    </div>
                  </div>

                  {!combineSelected && testFormat === 'single' && (
                    <div>
                      <Label className="text-sm font-medium">Number of Questions *</Label>
                      {formData.selectionMode === 'manual' ? (
                        <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
                          <Input
                            type="number"
                            value={formData.manualSelectedQuestionIds?.length || ''}
                            disabled
                            className="sm:w-24 bg-muted text-center"
                          />
                          <Button type="button" variant="outline" className="sm:flex-1 border-primary text-primary hover:bg-primary/5" onClick={() => handleOpenManualSelect()} disabled={!dialogSubject}>
                            {dialogSubject ? 'Select Questions Manually' : 'Pick a subject first'}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={availableQuestions || 100}
                            value={formData.numQuestions || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, numQuestions: Number(e.target.value) || 0 }))}
                            disabled={!dialogSubject || allocations.length > 0}
                            placeholder={allocations.length > 0 ? 'Allocated' : (dialogSubject ? "10" : "Pick Subject")}
                            className="sm:w-24"
                          />
                          <Button type="button" variant="outline" className="sm:flex-1" onClick={handlePreviewQuestions} disabled={!dialogSubject || formData.numQuestions < 1}>
                            <Eye className="w-4 h-4 mr-2" /> Preview Sample
                          </Button>
                        </div>
                      )}
                      {allocations.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">Derived from allocations: {allocations.reduce((s,a) => s + Number(a.questionCount || 0), 0)} questions</p>
                      ) : (dialogSubject && formData.selectionMode !== 'manual' && (
                        <p className="text-xs text-muted-foreground mt-1">{availableQuestions} available{dialogSubtopic ? ' in selected subtopic' : dialogTopic ? ' in selected topic' : ''}</p>
                      ))}
                    </div>
                  )}

                  {dialogSubject && formData.numQuestions > availableQuestions && testFormat === 'single' && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-destructive font-medium">
                        ⚠️ Cannot allocate {formData.numQuestions} questions. Only {availableQuestions} available.
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview CTA for Multi-Mode */}
                {testFormat === 'multi' && allocations.length > 0 && !combineSelected && (
                  <div className="flex justify-end -mt-2 mb-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handlePreviewQuestions}
                      disabled={loadingPreview}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {loadingPreview ? 'Loading...' : 'Preview Allocated Questions'}
                    </Button>
                  </div>
                )}

                {/* Section 4: Schedule (Optional) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm text-muted-foreground">Test Schedule</h3>
                  </div>

                  <div className="p-5 rounded-lg bg-muted/30 border shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground mr-1">Quick set start:</span>
                      {[
                        { label: 'Now', get: () => new Date() },
                        { label: 'In 1 hour', get: () => new Date(Date.now() + 60 * 60 * 1000) },
                        { label: 'Today 6:00 PM', get: () => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; } },
                        { label: 'Tomorrow 9:00 AM', get: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
                      ].map(p => (
                        <Button key={p.label} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setScheduleStart(toLocalInputValue(p.get()))}>
                          {p.label}
                        </Button>
                      ))}
                      {(formData.startTime || formData.endTime) && (
                        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setFormData(prev => ({ ...prev, startTime: '', endTime: '' }))}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <CalendarCheck className="w-4 h-4 text-green-600" />
                          Start Date & Time
                        </Label>
                        <Input
                          type="datetime-local"
                          value={formData.startTime}
                          onChange={(e) => setScheduleStart(e.target.value)}
                          onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* unsupported */ } }}
                          className="h-11 cursor-pointer bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <CalendarX className="w-4 h-4 text-red-600" />
                          End Date & Time
                        </Label>
                        <Input
                          type="datetime-local"
                          value={formData.endTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                          onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* unsupported */ } }}
                          min={formData.startTime || undefined}
                          className="h-11 cursor-pointer bg-background"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">End time is filled automatically as start time + duration; adjust it if the test window should stay open longer.</p>
                    {formData.startTime && formData.endTime && formData.endTime <= formData.startTime && (
                      <p className="text-xs text-destructive font-medium">End time must be after the start time.</p>
                    )}
                  </div>
                </div>

                {/* Randomization */}
                <div className="flex items-center gap-3 p-3 mt-6 rounded-lg bg-muted/20 border">
                  <input
                    type="checkbox"
                    id="isRandomized"
                    checked={formData.isRandomized}
                    onChange={(e) => setFormData(prev => ({ ...prev, isRandomized: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <div>
                    <Label htmlFor="isRandomized" className="text-sm font-medium cursor-pointer">Randomize Questions at Runtime</Label>
                    <p className="text-xs text-muted-foreground">Students see questions in a different order each time</p>
                  </div>
                </div>

                {/* Multi-Topic / Cross-Subject Allocation */}
                {testFormat === 'multi' && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold text-sm">Multi-Topic / Cross-Subject Allocation</h3>
                    </div>

                    {dialogExam ? (
                      <div className="p-4 rounded-lg border space-y-4 bg-background">
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Split your test questions across multiple topics or subjects.</p>
                          </div>
                          <Button type="button" size="sm" onClick={addAllocation} className="shrink-0 h-9">
                            <Plus className="w-4 h-4 mr-1" /> Add Section
                          </Button>
                        </div>

                        {allocations.length > 0 ? (
                          <div className="space-y-4 mt-2">
                            {allocations.map((alloc, idx) => (
                              <div key={alloc.id} className="p-4 rounded-lg bg-muted/10 border space-y-3 relative">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-primary uppercase tracking-wide">Section {idx + 1}</span>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAllocation(alloc.id)} className="h-6 w-6 p-0 hover:bg-destructive/10">
                                    <X className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Subject</Label>
                                    <Select value={alloc.subjectId?.toString() || ''} onValueChange={async (v) => {
                                      const subId = v ? Number(v) : null;
                                      updateAllocation(alloc.id, { subjectId: subId, topicId: null, subtopicId: null, topics: [], subtopics: [], available: 0 });
                                      if (subId) {
                                        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${subId}`);
                                        const d = await res.json();
                                        if (d.success) updateAllocation(alloc.id, { topics: d.topics || [] });
                                        const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${subId}`);
                                        const qData = await qRes.json();
                                        if (qData.success) updateAllocation(alloc.id, { available: qData.total || 0 });
                                      }
                                    }}>
                                      <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue placeholder="Subject" /></SelectTrigger>
                                      <SelectContent>
                                        {dialogSubjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Topic</Label>
                                    <Select value={alloc.topicId?.toString() || 'none'} onValueChange={async (v) => {
                                      const topicId = v === 'none' ? null : Number(v);
                                      updateAllocation(alloc.id, { topicId, subtopicId: null, subtopics: [] });
                                      if (topicId) {
                                        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${topicId}`);
                                        const d = await res.json();
                                        if (d.success) updateAllocation(alloc.id, { subtopics: d.subtopics || [] });
                                        const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topicId}`);
                                        const qData = await qRes.json();
                                        if (qData.success) updateAllocation(alloc.id, { available: qData.total || 0 });
                                      } else if (alloc.subjectId) {
                                        const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${alloc.subjectId}`);
                                        const qData = await qRes.json();
                                        if (qData.success) updateAllocation(alloc.id, { available: qData.total || 0 });
                                      }
                                    }} disabled={!alloc.subjectId}>
                                      <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue placeholder="All Topics" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">All Topics</SelectItem>
                                        {alloc.topics.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Subtopic</Label>
                                    <Select value={alloc.subtopicId?.toString() || 'none'} onValueChange={async (v) => {
                                      const subtopicId = v === 'none' ? null : Number(v);
                                      updateAllocation(alloc.id, { subtopicId });
                                      const qp = subtopicId ? `subtopicId=${subtopicId}` : `topicId=${alloc.topicId}`;
                                      const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?${qp}`);
                                      const qData = await qRes.json();
                                      if (qData.success) updateAllocation(alloc.id, { available: qData.total || 0 });
                                    }} disabled={!alloc.topicId}>
                                      <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue placeholder={alloc.topicId ? 'All Subtopics' : 'Select topic first'} /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">All Subtopics</SelectItem>
                                        {alloc.subtopics.map(st => <SelectItem key={st.id} value={st.id.toString()}>{st.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Questions</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={(alloc.manualQuestionIds?.length || alloc.questionCount) || ''}
                                      onChange={(e) => updateAllocation(alloc.id, { questionCount: Number(e.target.value) || 0, previewQuestions: undefined })}
                                      disabled={!!alloc.manualQuestionIds?.length}
                                      className="mt-1.5 h-10 text-sm"
                                      placeholder="0"
                                    />
                                    {alloc.manualQuestionIds?.length ? (
                                      <p className="text-xs text-primary mt-1 font-medium">Manually chosen</p>
                                    ) : alloc.available > 0 && <p className="text-xs text-emerald-600 mt-1 font-medium">{alloc.available} avail.</p>}
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Marks per Q</Label>
                                    <div className="mt-1.5 flex items-center h-10 rounded-md border border-input overflow-hidden">
                                      <button type="button" className="h-full w-9 border-r hover:bg-muted text-lg leading-none" onClick={() => updateAllocation(alloc.id, { marksPerQuestion: Math.max(1, (Number(alloc.marksPerQuestion) || 4) - 1) })}>−</button>
                                      <input
                                        type="number"
                                        min="1"
                                        value={alloc.marksPerQuestion || ''}
                                        onChange={(e) => updateAllocation(alloc.id, { marksPerQuestion: Number(e.target.value) || 0 })}
                                        onBlur={() => { if (!alloc.marksPerQuestion) updateAllocation(alloc.id, { marksPerQuestion: 1 }); }}
                                        className="w-full h-full text-center text-sm bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button type="button" className="h-full w-9 border-l hover:bg-muted text-lg leading-none" onClick={() => updateAllocation(alloc.id, { marksPerQuestion: (Number(alloc.marksPerQuestion) || 0) + 1 })}>+</button>
                                    </div>
                                  </div>
                                </div>

                                {/* Section actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <Button type="button" size="sm" variant="outline" disabled={!alloc.subjectId} onClick={() => handleOpenManualSelect(alloc.id)}>
                                    {alloc.manualQuestionIds?.length ? `Edit chosen questions (${alloc.manualQuestionIds.length})` : 'Choose questions manually'}
                                  </Button>
                                  {alloc.manualQuestionIds?.length ? (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => updateAllocation(alloc.id, { manualQuestionIds: [], manualQuestions: [], questionCount: 0, previewQuestions: undefined })}>
                                      Switch to random
                                    </Button>
                                  ) : null}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!alloc.subjectId || (!alloc.manualQuestionIds?.length && !(alloc.questionCount > 0)) || alloc.previewLoading}
                                    onClick={() => alloc.previewOpen ? updateAllocation(alloc.id, { previewOpen: false }) : loadSectionPreview(alloc)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    {alloc.previewLoading ? 'Loading...' : alloc.previewOpen ? 'Hide preview' : 'Preview section'}
                                  </Button>
                                  {alloc.previewOpen && !alloc.manualQuestionIds?.length && (
                                    <Button type="button" size="sm" variant="ghost" onClick={() => loadSectionPreview(alloc)}>Regenerate</Button>
                                  )}
                                  <span className="ml-auto text-xs font-semibold text-muted-foreground">
                                    Section total: {(alloc.manualQuestionIds?.length || Number(alloc.questionCount) || 0) * (Number(alloc.marksPerQuestion) || 0)} marks
                                  </span>
                                </div>

                                {alloc.previewOpen && (
                                  <div className="rounded-md border bg-background divide-y max-h-80 overflow-y-auto">
                                    {(alloc.previewQuestions || []).length === 0 ? (
                                      <div className="p-3 text-sm text-muted-foreground">No questions found for this section.</div>
                                    ) : (alloc.previewQuestions || []).map((q, qi) => (
                                      <div key={q.id} className="flex gap-3 p-3 text-sm">
                                        <span className="flex-shrink-0 w-8 h-6 rounded border bg-muted text-xs font-semibold flex items-center justify-center">{qi + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium break-words">{q.text}</p>
                                          <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-muted-foreground">
                                            {(['A', 'B', 'C', 'D'] as const).map(o => (
                                              <span key={o} className={`truncate rounded border px-1.5 py-0.5 ${q.correctAnswer === o ? 'border-green-600 text-green-700 bg-green-50' : ''}`}>
                                                {o}. {String(q[`option${o}` as keyof Question] ?? '')}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <span className="flex-shrink-0 text-xs text-muted-foreground">{Number(alloc.marksPerQuestion) || 0} m</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20 shadow-sm mt-4">
                              <span className="font-bold text-primary">Total: {allocations.reduce((s, a) => s + (a.manualQuestionIds?.length || Number(a.questionCount) || 0), 0)} Questions</span>
                              <span className="font-bold text-primary">{calculateTotalMarks()} Marks{formData.totalMarksOverride ? ' (custom)' : ''}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No sections added yet. Click "Add Section" to allocate questions.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">Please select an Exam Type in Basic Information first.</div>
                    )}
                  </div>
                )}
              
                {/* Action Buttons */}

                <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background py-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setIsCreateOpen(false); resetDialog(); }}
                    size="lg"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={
                      submitting || 
                      !dialogExam || 
                      // require subject only when not combining and no allocations
                      (allocations.length === 0 && !combineSelected && !dialogSubject) ||
                      // Skip numQuestions validation in combine mode
                      (!combineSelected && (allocations.length > 0 ? allocations.reduce((n, a) => n + (a.manualQuestionIds?.length || Number(a.questionCount) || 0), 0) <= 0 : (formData.numQuestions <= 0 || formData.numQuestions > availableQuestions))) ||
                      // Require duration to be positive
                      (!formData.duration || Number(formData.duration) <= 0)
                    }
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Test
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPaperDialogOpen} onOpenChange={setIsPaperDialogOpen}>
            <DialogContent className="max-w-full w-full p-5 sm:px-6 md:px-8 sm:max-w-xl md:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Offline Paper</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleCreatePaper(e); }} className="space-y-4">
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div>
                  <Label>Title *</Label>
                  <Input value={paperForm.title} onChange={(e) => setPaperForm(prev => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Exam *</Label>
                    <Select value={paperForm.examId ? String(paperForm.examId) : 'none'} onValueChange={(v) => { setPaperForm(prev => ({ ...prev, examId: v === 'none' ? null : Number(v) })); setDialogExam(v === 'none' ? null : Number(v)); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select exam" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select exam</SelectItem>
                        {examTypes.map(ex => <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Batch</Label>
                    <Select value={paperForm.batchId ? String(paperForm.batchId) : 'none'} onValueChange={(v) => setPaperForm(prev => ({ ...prev, batchId: v === 'none' ? null : Number(v) }))}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select batch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select batch</SelectItem>
                        {dialogBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <Select value={paperForm.subjectId ? String(paperForm.subjectId) : 'none'} onValueChange={(v) => { setPaperForm(prev => ({ ...prev, subjectId: v === 'none' ? null : Number(v) })); setDialogSubject(v === 'none' ? null : Number(v)); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select subject</SelectItem>
                        {dialogSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Topic </Label>
                    <Select disabled={!paperForm.subjectId} value={paperForm.topicId ? String(paperForm.topicId) : 'none'} onValueChange={(v) => { setPaperForm(prev => ({ ...prev, topicId: v === 'none' ? null : Number(v) })); setDialogTopic(v === 'none' ? null : Number(v)); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder={paperForm.subjectId ? "Select topic" : "Select subject first"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select topic</SelectItem>
                        {dialogTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Subtopic </Label>
                    <Select disabled={!paperForm.topicId || loadingDialogSubtopics} value={paperForm.subtopicId ? String(paperForm.subtopicId) : 'none'} onValueChange={(v) => { setPaperForm(prev => ({ ...prev, subtopicId: v === 'none' ? null : Number(v) })); setDialogSubtopic(v === 'none' ? null : Number(v)); }}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder={paperForm.topicId ? (loadingDialogSubtopics ? 'Loading...' : 'Select subtopic') : 'Select topic first'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select subtopic</SelectItem>
                        {dialogSubtopics.map(st => <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
<div className="w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-full sm:w-auto min-w-0">
                      <Label>Number of Questions</Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPaperForm(prev => {
                              const cur = Number(prev.numQuestions) || 1;
                              let v = Math.max(1, cur - 1);
                              // Clamp to availableQuestions when allocations not present
                              if (allocations.length === 0 && availableQuestions && Number(availableQuestions) > 0 && v > Number(availableQuestions)) {
                                v = Number(availableQuestions);
                              }
                              return { ...prev, numQuestions: v };
                            });
                          }}
                          disabled={Number(paperForm.numQuestions || 0) <= 1}
                        >
                          <MinusCircle className="w-4 h-4" />
                        </Button>

                        <Input
                          type="number"
                          min={1}
                          max={availableQuestions || undefined}
                          value={paperForm.numQuestions || ''}
                          onChange={(e) => {
                            const parsed = Number(e.target.value);
                            // Allow editing, but coerce invalid/empty to 1 immediately to avoid 0/empty states
                            let v = Number.isFinite(parsed) ? parsed : 1;
                            if (v < 1) v = 1;
                            if (allocations.length === 0 && availableQuestions && Number(availableQuestions) > 0 && v > Number(availableQuestions)) {
                              v = Number(availableQuestions);
                            }
                            setPaperForm(prev => ({ ...prev, numQuestions: v }));
                          }}
                          onBlur={() => {
                            // Ensure a minimum of 1 on blur in case of manual edits
                            setPaperForm(prev => ({ ...prev, numQuestions: (!prev.numQuestions || Number(prev.numQuestions) < 1) ? 1 : Number(prev.numQuestions) }));
                          }}
                          className="w-full sm:w-36 min-w-0"
                        />

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPaperForm(prev => {
                              const cur = Number(prev.numQuestions) || 0;
                              let v = cur + 1;
                              if (allocations.length === 0 && availableQuestions && Number(availableQuestions) > 0 && v > Number(availableQuestions)) {
                                v = Number(availableQuestions);
                              }
                              return { ...prev, numQuestions: v };
                            });
                          }}
                          disabled={allocations.length === 0 && availableQuestions !== null && Number(paperForm.numQuestions || 0) >= Number(availableQuestions || 0)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        <div className="text-xs text-muted-foreground">{availableQuestions !== null ? `${availableQuestions} available` : 'Available: —'}</div>
                      </div>
                    </div>

                  

                    <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto self-start sm:self-end text-sm text-muted-foreground">
                      {previewQuestions.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>Preview: <strong>{previewQuestions.length}</strong> questions • Total marks: <strong>{previewQuestions.reduce((s, q) => s + (q.marks || 0), 0)}</strong></span>
                          <Button type="button" size="sm" variant="ghost" className="ml-2 mt-2 sm:mt-0" onClick={() => setIsPreviewOpen(true)}>View</Button>
                        </div>
                      ) : (
                        <span>Questions available: <strong>{availableQuestions}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Total Marks</Label>
                    <Input type="number" min={0} value={paperForm.totalMarks || ''} onChange={(e) => setPaperForm(prev => ({ ...prev, totalMarks: e.target.value === '' ? null : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <Label className="invisible">placeholder</Label>
                    <div />
                  </div>
                </div>

                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min={1} value={paperForm.durationMinutes} onChange={(e) => setPaperForm(prev => ({ ...prev, durationMinutes: Number(e.target.value) || 0 }))} />
                </div>


                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsPaperDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button type="submit" className="w-full sm:w-auto">Create Paper</Button>
                </div>
              </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="space-y-6">
          {/* Exam Filter */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Exam Type</h3>
              {(selectedExam || selectedSubject || statusFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear All</Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {examTypes.map(exam => {
                const count = tests.filter(t => t.examId === exam.id).length;
                const isActive = selectedExam === exam.id;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setSelectedExam(isActive ? null : exam.id)}
                    className={`p-6 rounded-xl border-2 transition-all ${isActive ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="text-center">
                      <BookOpen className={`w-10 h-10 mx-auto mb-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`font-semibold ${isActive ? 'text-primary' : ''}`}>{exam.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{count} tests</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Filter */}
          {selectedExam && subjects.length > 0 && (
            <div>
              <h3 className="font-medium mb-4">Subjects</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subjects.map(subject => {
                  const Icon = subjectIcons[subject.name as keyof typeof subjectIcons] || BookOpen;
                  const count = tests.filter(t => t.subjectId === subject.id).length;
                  const isActive = selectedSubject === subject.id;
                  return (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(isActive ? null : subject.id)}
                      className={`relative p-6 rounded-xl overflow-hidden transition-all ${isActive ? 'ring-4 ring-primary/30' : ''}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${getSubjectColor(subject.name)} opacity-90`} />
                      <div className="relative z-10 text-white text-center">
                        <Icon className="w-10 h-10 mx-auto mb-3" />
                        <p className="font-semibold">{subject.name}</p>
                        <p className="text-xs opacity-90 mt-1">{count} tests</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <Label>Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tests</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Type Filter */}
          <div className="flex items-center gap-4">
            <Label>Type:</Label>
            <Select value={testTypeFilter} onValueChange={(v: string) => setTestTypeFilter(v as 'all' | 'single' | 'combined' | 'child' | 'paper')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single">Single-subject</SelectItem>
                <SelectItem value="combined">Combined (parent)</SelectItem>
                <SelectItem value="child">Child tests</SelectItem>
                <SelectItem value="paper">Offline Papers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {(selectedExam || selectedSubject || statusFilter !== 'all' || testTypeFilter !== 'all') && (
            <div className="flex flex-wrap gap-2">
              {selectedExam && <Badge variant="secondary">Exam: {examTypes.find(e => e.id === selectedExam)?.name} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSelectedExam(null)} /></Badge>}
              {selectedSubject && <Badge variant="secondary">Subject: {subjects.find(s => s.id === selectedSubject)?.name} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSelectedSubject(null)} /></Badge>}
              {statusFilter !== 'all' && <Badge variant="secondary">{statusFilter} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setStatusFilter('all')} /></Badge>}
              {testTypeFilter !== 'all' && <Badge variant="secondary">{testTypeFilter} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setTestTypeFilter('all')} /></Badge>}
            </div>
          )}
        </div>

        {/* Offline Papers Management */}
        {viewMode !== 'online' && (
        <div className="p-4 rounded-xl bg-card border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Offline Papers</h3>
              <p className="text-xs text-muted-foreground">Manage generated offline papers — view, edit, delete and export</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => fetchPapers({ examId: selectedExam, subjectId: selectedSubject, batchId: dialogBatch })}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <Select value={selectedExam ? String(selectedExam) : 'all'} onValueChange={(v) => { setSelectedExam(v === 'all' ? null : Number(v)); fetchPapers({ examId: v === 'all' ? null : Number(v) }); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by exam" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {examTypes.map(ex => <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dialogBatch ? String(dialogBatch) : 'all'} onValueChange={(v) => { setDialogBatch(v === 'all' ? null : Number(v)); fetchPapers({ batchId: v === 'all' ? null : Number(v) }); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {dialogBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSubject ? String(selectedSubject) : 'all'} onValueChange={(v) => { setSelectedSubject(v === 'all' ? null : Number(v)); fetchPapers({ subjectId: v === 'all' ? null : Number(v) }); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Exam</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Q</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Marks</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingPapers ? (
                  <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
                ) : papers.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No papers</td></tr>
                ) : (
                  papers.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3">{p.title}</td>
                      <td className="px-6 py-3">{examTypes.find(e => e.id === p.exam_id)?.name || '-'}</td>
                      <td className="px-6 py-3">{p.total_questions}</td>
                      <td className="px-6 py-3">{p.total_marks}</td>
                      <td className="px-6 py-3">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleViewPaper(p.id)}>View</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditPaper(p)}>Edit</Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleDeletePaper(p.id)}>Delete</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => previewPdf(p.id, 'question')}>Preview PDF</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => previewDoc(p.id, 'question_doc')}>Preview DOC</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => previewPdf(p.id, 'answer')}>Preview Answer PDF</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => previewDoc(p.id, 'answer_doc')}>Preview Answer DOC</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>)}

        {/* Bulk Actions Toolbar */}
        {selectedTests.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-2 border-primary/30 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="font-medium">{selectedTests.size} test(s) selected</span>
            </div>
            <div className="flex items-center gap-2">

              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteSelected}
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Tests Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-12 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedTests.size === filteredTests.length && filteredTests.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Test</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Details</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingTests ? (
                  <tr><td colSpan={6} className="text-center py-12">Loading tests...</td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No tests found</td></tr>
                ) : (
                  filteredTests.map(test => (
                    <tr key={test.id} className="hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTests.has(test.id)}
                          onChange={() => handleSelectTest(test.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={test.examType === 'NEET' ? 'default' : 'secondary'}>{test.examType}</Badge>
                            {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                            {test.parentTestId && (
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive">Child</Badge>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenTestById(test.parentTestId as number); }}>
                                  Parent #{test.parentTestId}
                                </Button>
                              </div>
                            )}
                            {parentIds.has(test.id) && <Badge variant="secondary">Combined</Badge> }
                          </div>
                          <p className="font-medium text-lg">{test.title}</p>
                          {test.batchName && <p className="text-sm text-muted-foreground mt-1">Batch: {test.batchName}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {test.duration} mins</div>
                          <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> {test.questionCount} questions</div>
                          <div className="flex items-center gap-2"><Target className="w-4 h-4" /> {test.totalMarks} marks</div>
                          {test.startTime && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CalendarCheck className="w-4 h-4" />
                              <span className="text-xs">
                                Start: {new Date(test.startTime).toLocaleString('en-IN', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                              </span>
                            </div>
                          )}
                          {test.endTime && (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <CalendarX className="w-4 h-4" />
                              <span className="text-xs">
                                End: {new Date(test.endTime).toLocaleString('en-IN', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                              </span>
                            </div>
                          )}
                          {test.subtopicName && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Subtopic:</span>
                              <Badge variant="outline" className="text-xs">{test.subtopicName}</Badge>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={statusStyles[test.status]}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleViewTest(test)}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800 dark:text-blue-300"
                          >
                            <Eye className="w-4 h-4 mr-1" /> 
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditTest(test)}
                            className="bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:border-indigo-800 dark:text-indigo-300"
                          >
                            <Edit className="w-4 h-4 mr-1" /> 
                          </Button>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleRetestTest(test.id)}
                            className="bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 dark:bg-teal-950 dark:hover:bg-teal-900 dark:border-teal-800 dark:text-teal-300"
                            title="Create Retest"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" /> 
                          </Button>

                          {/* Combine from this test -> create per-subject child tests */}


                          {/* no Manage Subjects button in test list per request */}
                          
                          {test.status === 'published' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewReport(test)}
                              className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-950 dark:hover:bg-purple-900 dark:border-purple-800 dark:text-purple-300"
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                            </Button>
                          )}

                          {test.status !== 'published' ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleToggleStatus(test.id, test.status)}
                              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800 dark:text-green-300"
                            >
                              <Send className="w-4 h-4 mr-1" /> Publish
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleToggleStatus(test.id, test.status)}
                              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-950 dark:hover:bg-orange-900 dark:border-orange-800 dark:text-orange-300"
                            >
                              <Eye className="w-4 h-4 mr-1" /> Unpublish
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteTest(test.id)}
                            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800 dark:text-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> 
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>



        {/* Report Dialog */}
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Test Report - {selectedTest?.title}</DialogTitle>
              <DialogDescription>View detailed test statistics and performance</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 mb-4">
              <Button onClick={async () => {
                if (!selectedTest) return;
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/tests/${selectedTest.id}/report/pdf`);
                  if (!res.ok) throw new Error('Failed to download PDF');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${(selectedTest.title || 'report').replace(/\s+/g, '_')}_report.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  alert('Failed to download report PDF');
                }
              }}>
                Export PDF
              </Button>
            </div>
            {selectedReport && (
              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                  <TabsTrigger value="students">Top Students</TabsTrigger>
                  <TabsTrigger value="schools">Schools</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Total Students</CardTitle>
                        <CardDescription className="text-muted-foreground">Assigned</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedReport.totalStudents}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Attempted</CardTitle>
                        <CardDescription className="text-muted-foreground">Started attempts</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedReport.attemptedStudents}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Completed</CardTitle>
                        <CardDescription className="text-muted-foreground">Finished tests</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedReport.completedStudents}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Avg. Score</CardTitle>
                        <CardDescription className="text-muted-foreground">Avg. %: {selectedReport.averagePercentage}%</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedReport.averageScore}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
                        <CardDescription className="text-muted-foreground">Distribution of completed students</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(() => {
                            if (selectedReport.scoreDistribution && selectedReport.scoreDistribution.length > 0) {
                              return selectedReport.scoreDistribution.map(d => (
                                <div key={d.range} className="flex items-center justify-between">
                                  <div className="text-sm">{d.range}</div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-sm font-medium">{d.count}</div>
                                    <div className="text-xs text-muted-foreground">{d.percentage}%</div>
                                  </div>
                                </div>
                              ));
                            }
                            return <div className="text-sm text-muted-foreground">No distribution data</div>;
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Timing & Peaks</CardTitle>
                        <CardDescription className="text-muted-foreground">Average time taken</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedReport.averageTimeTaken} mins</div>
                        <div className="text-sm text-muted-foreground mt-2">Highest: {selectedReport.highestScore} • Lowest: {selectedReport.lowestScore}</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="mt-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Performance Overview</CardTitle>
                      <CardDescription className="text-muted-foreground">Metrics across students</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Average Percentage</p>
                          <div className="text-xl font-bold">{selectedReport.averagePercentage}%</div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Average Score</p>
                          <div className="text-xl font-bold">{selectedReport.averageScore}</div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Attempted</p>
                          <div className="text-xl font-bold">{selectedReport.attemptedStudents}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="questions" className="mt-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Question Stats</CardTitle>
                      <CardDescription className="text-muted-foreground">Per-question metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedReport.questionStats && selectedReport.questionStats.length > 0 ? (
                        <div className="space-y-3">
                          {selectedReport.questionStats.map(q => (
                            <div key={q.questionId} className="p-3 rounded border bg-card">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{q.questionText}</div>
                                  <div className="text-xs text-muted-foreground">Difficulty: {q.difficulty}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {q.attempts} attempts
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full bg-green-600"
                                    style={{ width: `${q.successRate}%` }}
                                   />
                                </div>
                                <div className="text-xs font-medium">
                                  {q.successRate}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No question-level data available</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="students" className="mt-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Top Performers</CardTitle>
                      <CardDescription className="text-muted-foreground">Best performing students</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedReport.topPerformers && selectedReport.topPerformers.length > 0 ? (
                        <div className="space-y-2">
                          {selectedReport.topPerformers.map(p => (
                            <div key={p.rank} className="flex items-center justify-between p-2 rounded border">
                              <div>
                                <div className="font-medium">{p.studentName}</div>
                                <div className="text-xs text-muted-foreground">Rank #{p.rank}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{p.score}</div>
                                <div className="text-xs text-muted-foreground">{p.percentage}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No top performers yet</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="schools" className="mt-4">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">School Performance</CardTitle>
                      <CardDescription className="text-muted-foreground">Compare performance across different schools</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedReport.schoolWise && selectedReport.schoolWise.length > 0 ? (
                        <div className="space-y-4">
                          {selectedReport.schoolWise.map((sc, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                              <div>
                                <div className="font-medium text-sm">{sc.schoolName || 'Unknown School'}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {sc.completedStudents} / {sc.totalStudents} completed
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="text-lg font-bold text-primary">
                                  {Math.round(sc.averageScore || 0)}
                                </div>
                                <div className="text-xs font-medium text-muted-foreground">Avg. Score</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No school data available</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Test Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { resetDialog(); setEditingTestId(null); }}}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Test</DialogTitle>
              <DialogDescription>Update test details below</DialogDescription>
            </DialogHeader>

            {isCombinedParent && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-900 mb-3">
<div className="font-medium">Note: This is a combined parent test — subjects, topics and subtopics are managed by child tests and cannot be edited here.</div>
              </div>
            )}

            <form onSubmit={handleUpdateTest} className="space-y-6">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Basic Information</h3>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Test Title *</Label>
                  <Input
                    placeholder="e.g., NEET Physics Mock Test - Chapter 1"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Exam Type *</Label>
                    <Select value={dialogExam?.toString() || ""} onValueChange={(v) => setDialogExam(v ? Number(v) : null)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select exam type" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes.map(exam => (
                          <SelectItem key={exam.id} value={exam.id.toString()}>{exam.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {!isCombinedParent ? (
                <div className="space-y-4">
                  {/* Section 2: Content Selection */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Content Selection</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Subject *</Label>
                      <Select value={dialogSubject?.toString() || ""} onValueChange={(v) => setDialogSubject(v ? Number(v) : null)} disabled={!dialogExam}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={!dialogExam ? "Select exam first" : dialogSubjects.length === 0 ? "No subjects for this exam" : "Select subject"} />
                        </SelectTrigger>
                        <SelectContent>
                          {dialogSubjects.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name.trim()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dialogExam && dialogSubjects.length === 0 && (
                        <p className="text-xs text-destructive mt-1">This exam has no active subjects. Add them in Subject Management first.</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Topics</Label>
                      <Select value={dialogTopic?.toString() || "none"} onValueChange={(v) => { setDialogTopic(v === "none" ? null : Number(v)); setDialogSubtopic(null); }} disabled={!dialogSubject}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={dialogSubject ? "All topics" : "Select subject first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All Topics</SelectItem>
                          {dialogTopics.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Subtopics</Label>
                      <Select value={dialogSubtopic?.toString() || "none"} onValueChange={(v) => setDialogSubtopic(v === "none" ? null : Number(v))} disabled={!dialogTopic || loadingDialogSubtopics}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={dialogTopic ? (loadingDialogSubtopics ? 'Loading...' : 'All subtopics') : 'Select topic first'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">All Subtopics</SelectItem>
                          {dialogSubtopics.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Section 3: Test Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Test Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Duration (minutes) *</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={formData.duration} 
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) || 60 }))}
                      className="mt-1.5"
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Number of Questions *</Label>
                    <Input 
                      type="number" 
                      min="1"
                      max={availableQuestions || 100}
                      value={formData.numQuestions || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, numQuestions: Number(e.target.value) || 1 }))} 
                      disabled={!dialogSubject}
                      placeholder={dialogSubject ? "10" : "Select subject first"}
                      className="mt-1.5"
                    />
                    {dialogSubject && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {availableQuestions} available
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Marks</Label>
                    <div className="flex items-center h-10 px-3 py-2 mt-1.5 rounded-md border border-input bg-gradient-to-r from-primary/5 to-primary/10">
                      <Target className="w-4 h-4 mr-2 text-primary" />
                      <span className="font-bold text-lg text-primary">
                        {formData.numQuestions * 4}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto: {formData.numQuestions} × 4
                    </p>
                  </div>
                </div>

                {dialogSubject && formData.numQuestions > availableQuestions && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Cannot allocate {formData.numQuestions} questions. Only {availableQuestions} available.
                    </p>
                  </div>
                )}
              </div>

              {/* Inline Question Preview CTA for Create Dialog */}
              {shouldShowPreview && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Eye className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Question Preview</h3>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            {hasAllocations ? (
                              <>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-400">{allocationTotalQuestions} Questions (from allocations)</p>
                                <p className="text-xs text-blue-700 dark:text-blue-500">Allocations determine topics/subtopics</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-400">{availableQuestions} Questions Available</p>
                                <p className="text-xs text-blue-700 dark:text-blue-500">{dialogTopic ? `From topic: ${topicName}` : `From subject: ${subjectName}`}</p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Target:</span>
                            <span className="font-bold text-blue-900 dark:text-blue-400">{hasAllocations ? allocationTotalQuestions : formData.numQuestions} questions</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Total marks:</span>
                            <span className="font-bold text-blue-900 dark:text-blue-400">{calculateTotalMarks()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="default"
                        variant="outline"
                        onClick={handlePreviewQuestions}
                        disabled={previewButtonDisabled || loadingPreview}
                        className="bg-white dark:bg-blue-900 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-800 shrink-0"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {loadingPreview ? 'Loading...' : 'Preview Questions'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Schedule (Optional) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm text-muted-foreground">Test Schedule </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarCheck className="w-3.5 h-3.5 text-green-600" />
                      Start Time
                    </Label>
                    <Input 
                      type="datetime-local"
                      value={formData.startTime} 
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarX className="w-3.5 h-3.5 text-red-600" />
                      End Time
                    </Label>
                    <Input 
                      type="datetime-local"
                      value={formData.endTime} 
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))} 
                      min={formData.startTime || undefined}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background py-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsEditOpen(false); resetDialog(); setEditingTestId(null); }}
                  size="lg"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || !dialogExam || (allocations.length === 0 && !dialogSubject) || formData.numQuestions <= 0 || (allocations.length === 0 && formData.numQuestions > availableQuestions)}
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Update Test
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Question Allocation Dialog */}
        <Dialog open={isQuestionAllocOpen} onOpenChange={setIsQuestionAllocOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Allocate Questions</DialogTitle>
              <DialogDescription>Randomly select and add questions to this test</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTest && (
                <>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">{selectedTest.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline">{selectedTest.examType}</Badge>
                      {selectedTest.subject && <span>• {selectedTest.subject}</span>}
                      {selectedTest.topic && <span>• {selectedTest.topic}</span>}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm">
                        Currently: <span className="font-semibold">{selectedTest.questionCount}</span> questions
                      </p>
                    </div>
                  </div>

                  {/* Per-subject tabs */}
                  {viewSubjects.length > 0 && (
                    <div className="mt-3">
                      <Tabs value={viewSubjectFilter === null ? 'all' : String(viewSubjectFilter)} onValueChange={(v) => setViewSubjectFilter(v === 'all' ? null : Number(v))}>
                        <TabsList className="overflow-x-auto">
                          <TabsTrigger value="all" className="whitespace-nowrap">All ({selectedTest.questionCount})</TabsTrigger>
                          {viewSubjects.map(s => (
                            <TabsTrigger key={`${s.id}-${s.name}`} value={String(s.id)} className="whitespace-nowrap">
                              {s.name} ({s.count})
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
                      📚 Available Questions: <span className="font-bold">{availableQuestions}</span>
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                      Questions will be randomly selected from {selectedTest.topic || selectedTest.subject || 'all available questions'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="numQuestions">Number of Questions to Add</Label>
                    <Input
                      id="numQuestions"
                      type="number"
                      min="1"
                      max={availableQuestions}
                      value={numQuestionsToAllocate}
                      onChange={(e) => setNumQuestionsToAllocate(Number(e.target.value) || 0)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: {availableQuestions} questions
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsQuestionAllocOpen(false)}
                      disabled={allocatingQuestions}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAllocateQuestions}
                      disabled={allocatingQuestions || numQuestionsToAllocate <= 0 || numQuestionsToAllocate > availableQuestions}
                    >
                      {allocatingQuestions ? 'Allocating...' : `Allocate ${numQuestionsToAllocate} Questions`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Subjects dialog removed per request */}

        {/* View Test Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Test Details</DialogTitle>
              <DialogDescription>View complete test information</DialogDescription>
            </DialogHeader>
            {selectedTest && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Test Title</Label>
                      <p className="font-medium mt-1">{selectedTest.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={statusStyles[selectedTest.status]}>
                          {selectedTest.status.charAt(0).toUpperCase() + selectedTest.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Exam Type</Label>
                      <p className="font-medium mt-1">{selectedTest.examType}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Subject</Label>
                      {Array.isArray(selectedTest?.viewSubjects) && selectedTest?.viewSubjects.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedTest!.viewSubjects!.map((s: { id: number | null; name: string; count: number }) => (
                            <Badge key={`${s.id}-${s.name}`} variant="secondary">{s.name}{s.count ? ` (${s.count})` : ''}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium mt-1">{selectedTest.subject || 'N/A'}</p>
                      )}
                    </div>
                    {selectedTest.topic && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Topic</Label>
                        <p className="font-medium mt-1">{selectedTest.topic}</p>
                      </div>
                    )}
                    {selectedTest.batchName && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Batch</Label>
                        <p className="font-medium mt-1">{selectedTest.batchName}</p>
                      </div>
                    )}

                    {selectedTest?.parentTestId && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Parent Test</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="font-medium">#{selectedTest?.parentTestId}</p>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenTestById(selectedTest?.parentTestId as number)}>View Parent</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Test Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Target className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Test Configuration</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{selectedTest.duration}</p>
                      <p className="text-xs text-muted-foreground">minutes</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-green-600" />
                        <Label className="text-xs text-muted-foreground">Questions</Label>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{selectedTest.questionCount}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-purple-600" />
                        <Label className="text-xs text-muted-foreground">Total Marks</Label>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{selectedTest.totalMarks}</p>
                      <p className="text-xs text-muted-foreground">marks</p>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                {(selectedTest.startTime || selectedTest.endTime) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">Schedule</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTest.startTime && (
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarCheck className="w-4 h-4 text-green-600" />
                            <Label className="text-sm font-medium text-green-900 dark:text-green-400">Start Time</Label>
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(selectedTest.startTime).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                      )}
                      {selectedTest.endTime && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarX className="w-4 h-4 text-red-600" />
                            <Label className="text-sm font-medium text-red-900 dark:text-red-400">End Time</Label>
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(selectedTest.endTime).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Additional Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                 
                    <div>
                      <Label className="text-sm text-muted-foreground">Created By</Label>
                      <p className="font-medium mt-1">{selectedTest.createdByName || selectedTest.createdBy || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Created At</Label>
                      <p className="font-medium mt-1">
                        {new Date(selectedTest.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Child / Combined Tests */}
                {childTests.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Users className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">Child Tests</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {childTests.map((ct: Test) => (
                        <div key={ct.id} className="p-3 border rounded flex justify-between items-center">
                          <div>
                            <p className="font-medium">{ct.title}</p>
                            <p className="text-sm ">{ct.questionCount} q • {ct.totalMarks} marks</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditTest(ct)}>Edit</Button>
                            <Button size="sm" onClick={() => handleLoadChildTest(ct.id)}>Open</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allocated Questions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Allocated Questions</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {allocatedQuestions.length} questions
                    </Badge>
                  </div>
                  
                  {loadingAllocatedQuestions ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      Loading questions...
                    </div>
                  ) : allocatedQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No questions allocated to this test yet</p>
                      <p className="text-xs mt-1">Use "Add Questions" action to allocate questions</p>
                    </div>
                  ) : (
                    <>
                      {/* Subject filter tabs for Allocated Questions */}
                      {viewSubjects.length > 0 && (
                        <div className="mb-2">
                          <Tabs value={viewSubjectFilter === null ? 'all' : String(viewSubjectFilter)} onValueChange={(v) => setViewSubjectFilter(v === 'all' ? null : Number(v))}>
                            <TabsList className="overflow-x-auto mb-2">
                              <TabsTrigger value="all" className="whitespace-nowrap">All ({allocatedQuestions.length})</TabsTrigger>
                              {viewSubjects.map(s => (
                                <TabsTrigger key={`${s.id}-${s.name}`} value={String(s.id)} className="whitespace-nowrap">
                                  {s.name} ({s.count})
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
                            📝 Total Questions: <span className="font-bold">{(allocatedQuestions.filter(q => !viewSubjectFilter || q.subjectId === viewSubjectFilter)).length}</span>
                            {' '} / <span className="text-muted">{allocatedQuestions.length} total</span>
                            {' '} • Total Marks: <span className="font-bold">{allocatedQuestions.filter(q => !viewSubjectFilter || q.subjectId === viewSubjectFilter).reduce((sum, q) => sum + ((typeof q.marks === 'number') ? q.marks : DEFAULT_QUESTION_MARKS), 0)}</span>
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                            Click on any question to view full details
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const visible = allocatedQuestions.filter(q => !viewSubjectFilter || q.subjectId === viewSubjectFilter);
                            if (expandedAllocatedQuestions.size === visible.length) {
                              setExpandedAllocatedQuestions(new Set());
                            } else {
                              setExpandedAllocatedQuestions(new Set(visible.map(q => q.id)));
                            }
                          }}
                          className="bg-white dark:bg-blue-900"
                        >
                          {expandedAllocatedQuestions.size === allocatedQuestions.length ? (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Collapse All
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Expand All
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {allocatedQuestions.filter(q => !viewSubjectFilter || q.subjectId === viewSubjectFilter).map((question, index) => {
                          const hasImages = question.useImg && (question.questionImage || question.optionAImage || question.optionBImage || question.optionCImage || question.optionDImage);
                          const isExpanded = expandedAllocatedQuestions.has(question.id);
                          
                          return (
                            <Card key={question.id} className="overflow-hidden">
                              <CardHeader 
                                className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-all"
                                onClick={() => toggleAllocatedQuestionExpansion(question.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="font-mono">Q{index + 1}</Badge>
                                      {question.subjectName && (
                                        <Badge variant="secondary">{question.subjectName}</Badge>
                                      )}
                                      {question.topicName && (
                                        <Badge variant="outline">{question.topicName}</Badge>
                                      )}

                                      {question.sourceTestId && Number(question.sourceTestId) !== Number(selectedTest?.id) && (
                                        <Badge variant="secondary">From #{question.sourceTestId}</Badge>
                                      )}
                                      {hasImages && (
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                          🖼️ Image
                                        </Badge>
                                      )}
                                      {question.correctAnswer && (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                          Ans: {question.correctAnswer}
                                        </Badge>
                                      )}
                                      <Badge className="ml-auto">{question.marks} marks</Badge>
                                    </div>
                                    <CardTitle className="text-sm font-medium leading-relaxed">
                                      {question.text}
                                    </CardTitle>
                                    {question.questionImage && (
                                      <div className="mt-3">
                                        <img
                                          src={getImageUrl(question.questionImage) || ''}
                                          alt="Question"
                                          className="max-w-full h-auto rounded-lg border shadow-sm"
                                          style={{ maxHeight: isExpanded ? '250px' : '150px' }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAllocatedQuestionExpansion(question.id);
                                    }}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        <span className="text-xs">Hide</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4 mr-1" />
                                        <span className="text-xs">View</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </CardHeader>
                              {isExpanded && (
                              <CardContent className="pt-4">
                                <div className="space-y-2">
                                  {['A', 'B', 'C', 'D'].map((option) => {
                                    const optionKey = `option${option}` as keyof Question;
                                    const optionImageKey = `option${option}Image` as keyof Question;
                                    const optionValue = question[optionKey] as string;
                                    const optionImage = question[optionImageKey] as string | null | undefined;
                                    const isCorrect = question.correctAnswer === option;
                                    
                                    return (
                                      <div
                                        key={option}
                                        className={`p-3 rounded-lg border-2 transition-all ${
                                          isCorrect
                                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                                            : 'border-border bg-muted/30'
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div
                                            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-semibold text-sm ${
                                              isCorrect
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-muted text-muted-foreground'
                                            }`}
                                          >
                                            {option}
                                          </div>
                                          <div className="flex-1">
                                            {optionImage ? (
                                              <div className="space-y-2">
                                                <img
                                                  src={getImageUrl(optionImage) || ''}
                                                  alt={`Option ${option}`}
                                                  className="max-w-xs h-auto rounded border"
                                                  style={{ maxHeight: '150px' }}
                                                />
                                                {optionValue && optionValue.trim() && (
                                                  <p className="text-sm">{optionValue}</p>
                                                )}
                                              </div>
                                            ) : (
                                              <p className="text-sm pt-1">{optionValue}</p>
                                            )}
                                            {isCorrect && (
                                              <div className="flex items-center gap-1 mt-2">
                                                <CheckCircle2 className="w-4 h-4 text-orange-600" />
                                                <span className="text-xs font-semibold text-orange-700">Correct Answer</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {question.explanation && (
                                  <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-400 mb-1">
                                      💡 Explanation
                                    </p>
                                    {question.explanationImage && (
                                      <img
                                        src={getImageUrl(question.explanationImage) || ''}
                                        alt="Explanation"
                                        className="max-w-md h-auto rounded border mb-2"
                                        style={{ maxHeight: '200px' }}
                                      />
                                    )}
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                      {question.explanation}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                    Close
                  </Button>
                  {selectedTest.status === 'published' && (
                    <Button onClick={() => {
                      setIsViewOpen(false);
                      handleViewReport(selectedTest);
                    }}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Report
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Question Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="w-[96vw] max-w-[1200px] sm:max-w-[1200px] max-h-[92vh] p-0 sm:p-0 gap-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-5 pb-4 border-b">
              <DialogTitle>Question Preview</DialogTitle>
              <DialogDescription>
                {allocations.length > 0 ? 'These questions were allocated based on your sections.' : 'A random sample of questions that will be allocated to the test.'}
              </DialogDescription>
            </DialogHeader>

            {previewQuestions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {loadingPreview ? 'Loading questions...' : 'No questions to preview'}
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="px-6 py-3 border-b bg-muted/30 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">Questions</span>
                    <span className="font-bold text-primary">{previewQuestions.length}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">Total Marks</span>
                    <span className="font-bold text-primary">{previewQuestions.reduce((sum, q) => sum + (Number(q.marks) || DEFAULT_QUESTION_MARKS), 0)}</span>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (expandedQuestions.size === previewQuestions.length) setExpandedQuestions(new Set());
                        else setExpandedQuestions(new Set(previewQuestions.map(q => q.id)));
                      }}
                    >
                      {expandedQuestions.size === previewQuestions.length ? 'Hide All Answers' : 'Show All Answers'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={handlePreviewQuestions} disabled={loadingPreview}>
                      {loadingPreview ? 'Loading...' : 'Regenerate'}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {previewWarnings.length > 0 && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
                      <p className="text-sm font-medium text-destructive">Preview warnings</p>
                      <ul className="text-xs mt-2 list-disc list-inside">
                        {previewWarnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}

                  {previewAllocBreakdown.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="px-4 py-2 border-b bg-muted/40 text-sm font-semibold">Allocation summary</div>
                      <div className="divide-y">
                        {previewAllocBreakdown.map((b, idx) => (
                          <div key={idx} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
                            <div>
                              <div className="font-medium">Section {idx + 1}</div>
                              <div className="text-xs text-muted-foreground">Requested {b.requested} • Allocated {b.allocated} • {b.marksPerQuestion} marks/Q • {b.allocatedMarks} marks</div>
                              {b.breakdown && b.breakdown.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {b.breakdown.map((d: PreviewAllocationDetail) => `${d.label}: ${d.allocated}/${d.requested}`).join(' • ')}
                                </div>
                              )}
                            </div>
                            {b.subjectId && (
                              <Button size="sm" variant="outline" onClick={() => handleEditSubjectFromPreview(b.subjectId, b)}>Edit Subject</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewQuestions.map((question, index) => {
                    const isExpanded = expandedQuestions.has(question.id);
                    return (
                      <div key={question.id} className="rounded-lg border-2 border-border bg-card overflow-hidden">
                        {/* Tab header */}
                        <div className="flex items-stretch border-b bg-muted/40">
                          <div className="flex items-center justify-center px-4 border-r bg-primary text-primary-foreground font-bold text-sm min-w-[56px]">
                            Q{index + 1}
                          </div>
                          <div className="flex flex-1 flex-wrap items-center gap-2 px-3 py-2">
                            {question.subjectName && <Badge variant="secondary">{question.subjectName}</Badge>}
                            {question.topicName && <Badge variant="outline">{question.topicName}</Badge>}
                            {question.subtopicName && <Badge variant="outline">{question.subtopicName}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 px-3 border-l">
                            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{question.marks ?? DEFAULT_QUESTION_MARKS} marks</span>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleQuestionExpansion(question.id)}>
                              {isExpanded ? 'Hide Answer' : 'Show Answer'}
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{question.text}</p>
                          {question.questionImage && (
                            <img
                              src={getImageUrl(question.questionImage) || ''}
                              alt="Question"
                              className="max-w-full h-auto rounded-md border"
                              style={{ maxHeight: '280px' }}
                            />
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {['A', 'B', 'C', 'D'].map((option) => {
                              const optionValue = question[`option${option}` as keyof Question] as string;
                              const optionImage = question[`option${option}Image` as keyof Question] as string | null | undefined;
                              const showCorrect = isExpanded && question.correctAnswer === option;
                              return (
                                <div
                                  key={option}
                                  className={`flex items-start gap-3 rounded-md border p-2.5 ${showCorrect ? 'border-green-600 bg-green-50 dark:bg-green-950/30' : 'border-border bg-background'}`}
                                >
                                  <span className={`flex-shrink-0 w-6 h-6 rounded border flex items-center justify-center text-xs font-semibold ${showCorrect ? 'bg-green-600 border-green-600 text-white' : 'bg-muted'}`}>
                                    {option}
                                  </span>
                                  <div className="flex-1 min-w-0 text-sm">
                                    {optionImage && (
                                      <img src={getImageUrl(optionImage) || ''} alt={`Option ${option}`} className="max-w-[200px] h-auto rounded border mb-1" style={{ maxHeight: '140px' }} />
                                    )}
                                    {optionValue && <span className="break-words">{optionValue}</span>}
                                  </div>
                                  {showCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {isExpanded && question.explanation && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3">
                              <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">Explanation</p>
                              {question.explanationImage && (
                                <img src={getImageUrl(question.explanationImage) || ''} alt="Explanation" className="max-w-md h-auto rounded border mb-2" style={{ maxHeight: '220px' }} />
                              )}
                              <p className="text-sm text-blue-800 dark:text-blue-200">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 px-6 py-3 border-t bg-background">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Paper View Dialog */}
        <Dialog open={isPaperViewOpen} onOpenChange={setIsPaperViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Paper: {selectedPaper?.title}</DialogTitle>
              <DialogDescription>{selectedPaper?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {paperQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No questions</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm">Total Questions: <strong>{paperQuestions.length}</strong> • Total Marks: <strong>{selectedPaper?.total_marks}</strong></div>
                  {paperQuestions.map((q, i) => (
                    <Card key={q.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="font-mono">Q{i+1}</Badge>
                            <CardTitle className="text-sm font-medium">{q.text}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            {q.correctAnswer && <Badge className="bg-orange-50 text-orange-700 border-orange-200">Ans: {q.correctAnswer}</Badge>}
                            <Badge>{q.marks} marks</Badge>
                            <Button type="button" size="sm" variant="ghost" onClick={() => selectedPaper && previewPdf(selectedPaper.id, 'question')}>Preview PDF</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {['A','B','C','D'].map(opt => {
                            const key = `option${opt}` as keyof Question;
                            const val = q[key] as string;
                            const isCorrect = q.correctAnswer === opt;
                            return (
                              <div key={opt} className={`p-3 rounded ${isCorrect ? 'bg-orange-50 border-orange-300' : 'bg-muted/10'}`}>
                                <div className="flex items-start gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${isCorrect ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>{opt}</div>
                                  <div className="flex-1 text-sm">{val}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsPaperViewOpen(false)}>Close</Button>
                <Button type="button" variant="ghost" onClick={() => selectedPaper && previewPdf(selectedPaper.id, 'question')}>Preview PDF</Button>
                <Button type="button" variant="ghost" onClick={() => selectedPaper && previewDoc(selectedPaper.id, 'question_doc')}>Preview DOC</Button>
                <Button type="button" variant="ghost" onClick={() => selectedPaper && previewPdf(selectedPaper.id, 'answer')}>Preview Answer PDF</Button>
                <Button type="button" variant="ghost" onClick={() => selectedPaper && previewDoc(selectedPaper.id, 'answer_doc')}>Preview Answer DOC</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Preview Dialog */}
        <Dialog open={exportPreviewOpen} onOpenChange={setExportPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Export Preview: {exportPreviewPaperTitle}</DialogTitle>
              <DialogDescription>{exportPreviewType === 'questions' ? 'Preview of questions (answers hidden)' : 'Preview of questions with answers'}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {exportPreviewLoading ? (
                <div className="text-center py-8">Loading preview…</div>
              ) : exportPreviewQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No questions to preview</div>
              ) : (
                <div className="space-y-2">
                  {exportPreviewQuestions.map((q, idx) => (
                    <div key={idx} className="p-2 border-b">
                      <div className="text-sm"><strong>{q.seq || idx + 1}.</strong> {q.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeExportPreview}>Close</Button>
              <Button type="button" variant="secondary" onClick={() => { if(!exportPreviewPaperId) return; const type = exportPreviewType === 'questions' ? 'question_doc' : 'answer_doc'; previewDoc(exportPreviewPaperId, type); closeExportPreview(); }}>Preview DOC</Button>
              <Button type="button" variant="secondary" onClick={() => { if(!exportPreviewPaperId) return; previewPdf(exportPreviewPaperId, exportPreviewType === 'questions' ? 'question' : 'answer'); }}>Preview PDF</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF Preview Dialog */}
        <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>PDF Preview: {exportPreviewPaperTitle || pdfPreviewFilename}</DialogTitle>
              <DialogDescription>{pdfPreviewType === 'question' ? 'Questions PDF preview' : 'Answer key PDF preview'}</DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              {pdfPreviewLoading ? (
                <div className="text-center py-8">Generating PDF…</div>
              ) : pdfPreviewUrl ? (
                <div className="h-[70vh]">
                  <iframe src={pdfPreviewUrl} className="w-full h-full border" title="PDF Preview" />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No preview available</div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { closePdfPreview(); }}>Close</Button>
              {pdfPreviewUrl && <Button type="button" variant="secondary" onClick={() => { const link = document.createElement('a'); link.href = pdfPreviewUrl!; link.download = pdfPreviewFilename || 'paper.pdf'; document.body.appendChild(link); link.click(); link.remove(); }}>Download PDF</Button>}
            </div>
          </DialogContent>
        </Dialog>

        {/* DOC Preview Dialog */}
        <Dialog open={docPreviewOpen} onOpenChange={setDocPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>DOC Preview</DialogTitle>
              <DialogDescription>Preview document before download</DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              {docPreviewLoading ? (
                <div className="text-center py-8">Generating DOC…</div>
              ) : docPreviewUrl ? (
                <div className="h-[70vh]">
                  <iframe src={docPreviewUrl} className="w-full h-full border" title="DOC Preview" />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No preview available</div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { closeDocPreview(); }}>Close</Button>
              {docPreviewUrl && <Button type="button" variant="secondary" onClick={() => { const link = document.createElement('a'); link.href = docPreviewUrl!; link.download = docPreviewFilename || 'paper.doc'; document.body.appendChild(link); link.click(); link.remove(); }}>Download DOC</Button>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Paper Dialog */}
        <Dialog open={isPaperEditOpen} onOpenChange={setIsPaperEditOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Paper</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdatePaper(); }} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={paperEditForm.title || ''} onChange={(e) => setPaperEditForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
             
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min={0}
                    max={paperAvailableQuestions || undefined}
                    value={paperEditForm.total_questions ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value);
                      setPaperEditForm(prev => {
                        if(v === null) return { ...prev, total_questions: null, total_marks: null };

                        // Determine marks per question basis:
                        // Prefer selected paper average ONLY if it yields an integer per-question mark.
                        const selValid = selectedPaper && selectedPaper.total_questions && selectedPaper.total_questions > 0 && typeof selectedPaper.total_marks === 'number' && Number.isInteger(selectedPaper.total_marks / selectedPaper.total_questions);
                        const prevValid = prev.total_questions && prev.total_questions > 0 && typeof prev.total_marks === 'number' && Number.isInteger(prev.total_marks / prev.total_questions);
                        const baseMPP = selValid ? (selectedPaper.total_marks / selectedPaper.total_questions) : (prevValid ? (prev.total_marks / prev.total_questions) : 4);

                        const newTotalMarks = Math.round(baseMPP * v);
                        return { ...prev, total_questions: v, total_marks: newTotalMarks };
                      });
                    }}
                  />
                  {paperAvailableQuestions !== null && <div className="text-xs text-muted-foreground mt-1">{paperAvailableQuestions} available</div>}
                </div>
                <div>
                  <Label>Total Marks</Label>
                  <Input type="number" value={paperEditForm.total_marks ?? ''} onChange={(e) => setPaperEditForm(prev => ({ ...prev, total_marks: e.target.value === '' ? null : Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input type="number" value={paperEditForm.duration_minutes || ''} onChange={(e) => setPaperEditForm(prev => ({ ...prev, duration_minutes: e.target.value === '' ? null : Number(e.target.value) }))} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Marks per question: {paperEditForm.total_questions ? (() => {
                const tq = paperEditForm.total_questions!;
                const tm = paperEditForm.total_marks;
                const avg = (typeof tm === 'number' && tq > 0) ? (tm / tq) : null;
                const perQ = (avg !== null && Number.isInteger(avg)) ? avg : 4;
                return perQ.toFixed(2);
              })() : '—'}</div>

              {/* Scope & Preview: always show scope (exam/batch/subject/topic/subtopic) and allow previewing questions */}
              {selectedPaper && (
                <div className="mt-3 p-3 border rounded">
                  <div className="text-sm font-medium mb-2">Scope & Preview</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Exam</Label>
                      <Select value={paperEditForm.exam_id ? String(paperEditForm.exam_id) : 'none'} onValueChange={(v) => { setPaperEditForm(prev => ({ ...prev, exam_id: v === 'none' ? null : Number(v) })); setDialogExam(v === 'none' ? null : Number(v)); }}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select exam" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">--</SelectItem>
                          {examTypes.map(ex => <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Batch</Label>
                      <Select value={paperEditForm.batch_id ? String(paperEditForm.batch_id) : 'none'} onValueChange={(v) => { setPaperEditForm(prev => ({ ...prev, batch_id: v === 'none' ? null : Number(v) })); setDialogBatch(v === 'none' ? null : Number(v)); }}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select batch" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">--</SelectItem>
                          {dialogBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <Label>Subject</Label>
                      <Select value={paperEditForm.subject_id ? String(paperEditForm.subject_id) : 'none'} onValueChange={(v) => { setPaperEditForm(prev => ({ ...prev, subject_id: v === 'none' ? null : Number(v), topic_id: null, subtopic_id: null })); setDialogSubject(v === 'none' ? null : Number(v)); setDialogTopic(null); setDialogSubtopic(null); }}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">--</SelectItem>
                          {dialogSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Topic</Label>
                      <Select value={paperEditForm.topic_id ? String(paperEditForm.topic_id) : 'none'} onValueChange={(v) => { setPaperEditForm(prev => ({ ...prev, topic_id: v === 'none' ? null : Number(v), subtopic_id: null })); setDialogTopic(v === 'none' ? null : Number(v)); setDialogSubtopic(null); }}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select topic" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">--</SelectItem>
                          {dialogTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subtopic</Label>
                      <Select value={paperEditForm.subtopic_id ? String(paperEditForm.subtopic_id) : 'none'} onValueChange={(v) => { setPaperEditForm(prev => ({ ...prev, subtopic_id: v === 'none' ? null : Number(v) })); setDialogSubtopic(v === 'none' ? null : Number(v)); }}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select subtopic" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">--</SelectItem>
                          {dialogSubtopics.map(st => <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

           
                </div>
              )}

              {/* Edit preview controls */}
              {selectedPaper && (
                <div className="mt-4 p-3 border rounded bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Preview questions for the selected scope</div>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={async () => {
                        // execute preview
                        if (!paperEditForm.total_questions || Number(paperEditForm.total_questions) <= 0) return;
                        setEditLoadingPreview(true);
                        setEditPreviewWarnings([]);
                        try {
                          const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam_id: paperEditForm.exam_id || selectedPaper.exam_id, subject_id: paperEditForm.subject_id || selectedPaper.subject_id, topic_id: paperEditForm.topic_id || selectedPaper.topic_id, subtopic_id: paperEditForm.subtopic_id || selectedPaper.subtopic_id, num_questions: Number(paperEditForm.total_questions) }) });
                          const data = await res.json();
                          if (res.ok && data.questions) {
                            const mapped = (data.questions || []).map((qq: Record<string, unknown>) => ({
                              id: qq['id'],
                              text: (qq['text'] as string) || (qq['stem'] as string) || (qq['question_text'] as string) || '',
                              marks: Number.isFinite(Number(qq['marks'])) ? Number(qq['marks']) : DEFAULT_QUESTION_MARKS,
                              questionImage: (qq['image_url'] as string) || (qq['question_image'] as string) || null,
                              optionA: (qq['optionA'] as string) || (qq['option_a'] as string) || '',
                              optionB: (qq['optionB'] as string) || (qq['option_b'] as string) || '',
                              optionC: (qq['optionC'] as string) || (qq['option_c'] as string) || '',
                              optionD: (qq['optionD'] as string) || (qq['option_d'] as string) || '',
                              optionAImage: (qq['optionAImage'] as string) || (qq['option_a_image'] as string) || null,
                              optionBImage: (qq['optionBImage'] as string) || (qq['option_b_image'] as string) || null,
                              optionCImage: (qq['optionCImage'] as string) || (qq['option_c_image'] as string) || null,
                              optionDImage: (qq['optionDImage'] as string) || (qq['option_d_image'] as string) || null,
                              answer: (qq['answer'] as string) || (qq['correctAnswer'] as string) || null,
                              correctAnswer: ((qq['answer'] as string) || (qq['correctAnswer'] as string) || '')?.toString().trim().charAt(0).toUpperCase() || null,
                              explanation: (qq['explanation'] as string) || null,
                              explanationImage: (qq['explanation_image'] as string) || null,
                              subjectId: (qq['subject_id'] as number) || (qq['subjectId'] as number) || null,
                              topicId: (qq['topic_id'] as number) || (qq['topicId'] as number) || null,
                              useImg: Boolean(qq['image_url'] || qq['optionAImage'] || qq['optionBImage'] || qq['optionCImage'] || qq['optionDImage'])
                            } as Question));
                            setEditPreviewQuestions(mapped);
                            // compute total marks and apply to edit form for convenience
                            const sumMarks = mapped.reduce((s, q: { marks?: number }) => s + (q.marks || 0), 0);
                            setPaperEditForm(prev => ({ ...prev, total_marks: sumMarks }));
                            if (Number(paperEditForm.total_questions) > mapped.length) {
                              setEditPreviewWarnings([`Requested ${paperEditForm.total_questions} but only ${mapped.length} available for the selected scope`]);
                            } else {
                              setEditPreviewWarnings([]);
                            }
                          } else {
                            setEditPreviewQuestions([]);
                            setEditPreviewWarnings([]);
                          }
                        } catch (err) {
                          console.error('Edit preview failed', err);
                          setEditPreviewQuestions([]);
                          setEditPreviewWarnings([]);
                        } finally {
                          setEditLoadingPreview(false);
                        }
                      }} disabled={!paperEditForm.total_questions || Number(paperEditForm.total_questions) <= 0 || editLoadingPreview}>
                        {editLoadingPreview ? 'Loading...' : 'Preview Questions'}
                      </Button>
                      {editPreviewQuestions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Preview: <strong>{editPreviewQuestions.length}</strong> • Marks: <strong>{editPreviewQuestions.reduce((s, q) => s + (q.marks || 0), 0)}</strong></span>
                          <Button size="sm" variant="ghost" onClick={() => { setPreviewQuestions(editPreviewQuestions); setIsPreviewOpen(true); }}>View</Button>
                          <Button size="sm" variant="secondary" disabled={editLoadingPreview || !paperEditForm.total_questions || Number(paperEditForm.total_questions) <= 0} onClick={async () => {
                            setEditLoadingPreview(true);
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/offline-papers/${selectedPaper.id}/preview-generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ num_questions: Number(paperEditForm.total_questions) }) });
                              const data = await res.json();
                              if (res.ok) {
                                const mapped = (data.selectedQuestions || []).map((qq: any) => ({
                                  id: qq.id,
                                  text: qq.question_text || qq.stem || '',
                                  marks: Number.isFinite(Number(qq.marks)) ? Number(qq.marks) : DEFAULT_QUESTION_MARKS,
                                  optionA: qq.option_a || '',
                                  optionB: qq.option_b || '',
                                  optionC: qq.option_c || '',
                                  optionD: qq.option_d || '',
                                  answer: qq.answer || null
                                } as Question));
                                setEditPreviewQuestions(mapped);
                                setPaperEditForm(prev => ({ ...prev, total_marks: data.totalMarks }));
                                if (data.questionPdfUrl) window.open(data.questionPdfUrl, '_blank');
                                if (data.questionDocUrl) window.open(data.questionDocUrl, '_blank');
                                toast({ title: 'Preview files generated', description: 'Preview PDF/DOC opened in new tabs' });
                              } else {
                                toast({ title: 'Failed', description: data.error || 'Could not generate preview files', variant: 'destructive' });
                              }
                            } catch (err) {
                              console.error('Preview-generate failed', err);
                              toast({ title: 'Error', description: 'Failed to generate preview files', variant: 'destructive' });
                            } finally {
                              setEditLoadingPreview(false);
                            }
                          }}>Generate Preview Files</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPaperEditOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manual Question Selection Dialog */}
        <Dialog open={isManualSelectOpen} onOpenChange={setIsManualSelectOpen}>
          <DialogContent className="w-[96vw] max-w-[1400px] sm:max-w-[1400px] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-none">
              <DialogTitle>Select Questions Manually</DialogTitle>
              <DialogDescription>
                {manualTargetAllocId !== null ? 'Pick the questions for this section.' : 'Select the exact questions you want in this test.'} Currently selected: <strong>{manualSelectedIds.length}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
              {loadingManualQuestions ? (
                <div className="text-center py-8">Loading questions...</div>
              ) : manualSelectionQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No questions found for the selected criteria.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {manualSelectionQuestions.map((q) => {
                    const isSelected = manualSelectedIds.includes(q.id);
                    return (
                      <Card key={q.id} className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50 bg-card'}`} onClick={() => {
                        if (manualTargetAllocId !== null) {
                          setAllocations(prev => prev.map(a => {
                            if (a.id !== manualTargetAllocId) return a;
                            const ids = [...(a.manualQuestionIds || [])];
                            const qs = [...(a.manualQuestions || [])];
                            const at = ids.indexOf(q.id);
                            if (at >= 0) { ids.splice(at, 1); qs.splice(qs.findIndex(x => x.id === q.id), 1); }
                            else { ids.push(q.id); qs.push(q); }
                            return { ...a, manualQuestionIds: ids, manualQuestions: qs, questionCount: ids.length, previewQuestions: a.previewOpen ? qs : a.previewQuestions };
                          }));
                          return;
                        }
                        setFormData(prev => {
                          const currentlySelected = [...(prev.manualSelectedQuestionIds || [])];
                          const index = currentlySelected.indexOf(q.id);
                          if (index >= 0) {
                            currentlySelected.splice(index, 1);
                          } else {
                            currentlySelected.push(q.id);
                          }
                          return { ...prev, manualSelectedQuestionIds: currentlySelected, numQuestions: currentlySelected.length };
                        });
                      }}>
                        <CardHeader className="p-4 pb-3">
                          <div className="flex items-start gap-4">
                            <Checkbox 
                              checked={isSelected}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                  ID: {q.id}
                                </Badge>
                                {q.topicName && (
                                  <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                    {q.topicName}
                                  </Badge>
                                )}
                                <Badge className="ml-auto">{typeof q.marks === 'number' ? q.marks : formData.marksPerQuestion} marks</Badge>
                              </div>
                              <CardTitle className="text-sm font-medium leading-relaxed">
                                {q.text}
                              </CardTitle>
                              {q.questionImage && (
                                <div className="mt-2">
                                  <img
                                    src={getImageUrl(q.questionImage) || ''}
                                    alt="Question"
                                    className="max-h-32 object-contain rounded border bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex-none pt-4 border-t mt-4 flex justify-between items-center bg-background">
              <span className="text-sm text-muted-foreground font-medium">Selected: {manualSelectedIds.length} questions</span>
              <Button type="button" onClick={() => setIsManualSelectOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

interface AllocationResultItem {
  allocationId: number;
  requested: number;
  allocated: number;
  marksPerQuestion: number;
}

interface PreviewAllocationDetail {
  label?: string;
  requested?: number;
  allocated?: number;
  allocatedMarks?: number;
}

interface PreviewAllocation {
  subjectId?: number;
  requested: number;
  allocated: number;
  marksPerQuestion: number;
  allocatedMarks?: number;
  breakdown?: PreviewAllocationDetail[];
  subjectName?: string;
}