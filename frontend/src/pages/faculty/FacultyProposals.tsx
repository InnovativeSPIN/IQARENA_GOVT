import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { getUploadUrl } from '@/lib/utils';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { TestProposal } from '@/types/faculty';

interface Test {
  id: string;
  title?: string;
  examId?: number | null;
  examType: 'NEET' | 'JEE';
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  batchId?: string;
  batchName?: string;
  startTime?: string;
  endTime?: string;
  questionCount: number;
  suggestedDuration: number;
  notes: string;
  createdAt: string;
  status?: 'draft' | 'published' | 'unpublished';
  attemptsCount?: number;
  mark_publish?: number;
  all_subjects?: number;
  parent_test_id?: number | null;
  totalMarks?: number;
}

type Topic = { id: string; name: string; subjectId: string };
type ExamType = { id: string; name: string };
type ReportData = {
  test: {
    id: string;
    title?: string;
    subjectName: string;
    topicName?: string;
    subtopicId?: string | null;
    examType?: string;
    difficulty?: string;
    questionCount?: number;
    suggestedDuration?: number;
    notes?: string;
    submittedAt?: string;
    mark_publish?: number;
  };
  statistics?: {
    totalAttempts?: number;
    averageScore?: number;
    highestScore?: number;
    lowestScore?: number;
    passRate?: number;
    averageTimeTaken?: number;
    completionRate?: number;
  };
  topPerformers?: Array<{ rank: number; name: string; rollNo: string; score: number; percentage: number; timeTaken: number }>;
  attempts?: Array<{ studentId: number; name: string; rollNo: string; status: string; score: number; percentage: number; timeTaken: number; startedAt?: string; completedAt?: string }>;
  difficultyBreakdown?: Array<{ level: string; count: number; avgAccuracy: number }>;
  scoreDistribution?: Array<{ range: string; count: number; percentage: number }>;
};
interface QuestionItem {
  id: string;
  text: string;
  subjectName?: string;
  topicName?: string;
  marks?: number;
  optionA?: string;
  optionB?: string;
  // when previewing aggregated questions from multiple tests
  sourceTestTitle?: string;
  sourceTestId?: string;
  optionC?: string;
  optionD?: string;
  optionAImage?: string | null;
  optionBImage?: string | null;
  optionCImage?: string | null;
  optionDImage?: string | null;
  questionImage?: string | null;
  explanation?: string;
  explanationImage?: string | null;
  answer?: string; // e.g. 'A', 'B', 'C', 'D'
}
import {
  ClipboardList,
  Plus,
  BookOpen,
  FileQuestion,
  FileText,
  Timer,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  X,
  Eye,
  Calendar,
  CalendarCheck,
  CalendarX,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Target,
  Edit,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Copy } from 'lucide-react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// topics will be fetched via API, no top-level mock required

export default function FacultyProposals() {
      
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [editingTest, setEditingTest] = useState<Test | null>(null);
      const [editForm, setEditForm] = useState({
        title: '',
        subjectId: '',
        topicId: '',
        subtopicId: '',
        questionCount: 30,
        suggestedDuration: 45,
        batchId: '',
        startTime: '',
        endTime: '',
        notes: '',
        status: 'draft',
      });
      const [editFormErrors, setEditFormErrors] = useState<Record<string,string>>({});
      const [editSubmitting, setEditSubmitting] = useState(false);
      // Clone dialog state
      const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
      const [cloneSourceTest, setCloneSourceTest] = useState<Test | null>(null);
      const [cloneForm, setCloneForm] = useState({ title: '', subjectId: '', topicId: '', questionCount: 0, duration: 45 });
      const [multiCloneForm, setMultiCloneForm] = useState({ title: `Combined Test - ${new Date().toLocaleDateString()}`, examId: '', subjectId: '', topicId: '', questionCount: 0, duration: 45, combine: true, batchId: '', startTime: '', endTime: '' });
      const [cloneSubmitting, setCloneSubmitting] = useState(false);
      // Multi-select for combining tests
      const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
      const [isMultiCloneDialogOpen, setIsMultiCloneDialogOpen] = useState(false);

      const [multiCloneSubmitting, setMultiCloneSubmitting] = useState(false);

      // Helper to retrieve current auth token on-demand (avoids TDZ and keeps value fresh)
      const getToken = () => typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;

      const handleEditTest = async (test: Test) => {
        try {
          const tk = getToken();
          const res = await apiFetch(`/faculty/tests/${test.id}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
          if (res?.success && res.test) {
            const t = res.test;
            console.debug('Fetched test details (server):', t);
            setEditingTest({
              id: String(t.id),
              examType: t.examType || 'NEET',
              subjectId: String(t.subjectId || ''),
              subjectName: t.subject || '',
              topicId: String(t.topicId || ''),
              topicName: t.topicName || '',
              batchId: t.batchId ? String(t.batchId) : '',
              batchName: t.batchName || '',
              startTime: toDateTimeLocal(t.startTime) || '',
              endTime: toDateTimeLocal(t.endTime) || '',
              questionCount: t.questionCount || 0,
              suggestedDuration: t.duration || 45,
              notes: t.notes || '',
              createdAt: t.createdAt,
              status: t.status || 'draft',
              title: t.title || '',
              all_subjects: t.all_subjects || 0,
              totalMarks: t.totalMarks || ((t.questionCount || 0) * 4),
              parent_test_id: t.parent_test_id || null
            });
            setEditForm({
              title: t.title || '',
              subjectId: String(t.subjectId || ''),
              topicId: String(t.topicId || ''),
              subtopicId: t.subtopicId ? String(t.subtopicId) : '',
              questionCount: t.questionCount || 0,
              suggestedDuration: t.duration || 45,
              batchId: t.batchId ? String(t.batchId) : '',
              startTime: toDateTimeLocal(t.startTime) || '',
              endTime: toDateTimeLocal(t.endTime) || '',
              notes: t.notes || '',
              status: t.status || 'draft'
            });
            // fetch topics and available question count for this subject/topic
            if (t.subjectId) {
              fetchTopics(String(t.subjectId));
              await fetchAvailableQuestionsCount(String(t.subjectId), t.topicId ? String(t.topicId) : undefined, t.subtopicId ? String(t.subtopicId) : undefined);

              // Also fetch subtopics for the current topic so the Subtopic select shows the current value
              if (t.topicId) {
                try {
                  const subRes = await apiFetch(`/admin/subtopics?topicId=${t.topicId}`, { headers: (getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });
                  if (subRes?.success && Array.isArray(subRes.subtopics)) {
                    const mapped = subRes.subtopics.map((s: any) => ({ id: String(s.id), name: s.name }));
                    // ensure current subtopic is present
                    if (t.subtopicId && t.subtopicName && !mapped.some((m: any) => String(m.id) === String(t.subtopicId))) {
                      mapped.unshift({ id: String(t.subtopicId), name: t.subtopicName });
                    }
                    setEditSubtopics(mapped);
                  } else setEditSubtopics([]);
                } catch (err) {
                  console.warn('Failed to fetch edit subtopics during edit load', err);
                  setEditSubtopics([]);
                }
              }
              // also fetch batches filtered by exam if available
              const subj = allocatedSubjects.find(s => String(s.id) === String(t.subjectId));
              if (subj && subj.examId) {
                    const fetched = await fetchBatchesForExam(subj.examId);
                    // If test has a batch, prefer that; otherwise, default to the first available batch so something is shown
                    if (t.batchId) {
                      setEditForm(prev => ({ ...prev, batchId: t.batchId ? String(t.batchId) : '' }));
                    } else if (Array.isArray(fetched) && fetched.length > 0) {
                      setEditForm(prev => ({ ...prev, batchId: String(fetched[0].id) }));
                    }
                // ensure fetched batches include current batch (if any)
                if (t.batchId && t.batchName) {
                  setBatches(prev => {
                    const id = String(t.batchId);
                    // ensure current batch is present and moved to the front so it's visible immediately
                    const existing = prev.filter(b => String(b.id) !== id);
                    return [{ id: Number(id), name: t.batchName }, ...existing];
                  });
                }
              } else {
                    // no exam associated with this subject; use the global batches list
                    if (t.batchId) {
                      setEditForm(prev => ({ ...prev, batchId: t.batchId ? String(t.batchId) : '' }));
                    } else if (batches && batches.length > 0) {
                      setEditForm(prev => ({ ...prev, batchId: String(batches[0].id) }));
                    }
                // ensure the dialog batches also include current batch
                if (t.batchId && t.batchName) {
                  const id = String(t.batchId);
                  setDialogBatches(prev => {
                    const existing = prev.filter(b => String(b.id) !== id);
                    return [{ id: Number(id), name: t.batchName }, ...existing];
                  });
                  // also ensure global batches list shows selection first
                  setBatches(prev => {
                    const existing = prev.filter(b => String(b.id) !== id);
                    return [{ id: Number(id), name: t.batchName }, ...existing];
                  });
                } else {
                  setDialogBatches(batches);
                }
              }
              // Ensure topics list includes current topic if missing
              if (t.topicId && t.topicName) {
                setTopics(prev => {
                  if (prev.some(tt => String(tt.id) === String(t.topicId))) return prev;
                  return [{ id: String(t.topicId), name: t.topicName, subjectId: String(t.subjectId) }, ...prev];
                });
              }
            }
          } else {
            // fallback to given test object (normalize schedule fields)
            setEditingTest({
              id: String(test.id),
              examType: test.examType || 'NEET',
              subjectId: String(test.subjectId || ''),
              subjectName: test.subjectName || '',
              topicId: String(test.topicId || ''),
              topicName: test.topicName || '',
              batchId: test.batchId ? String(test.batchId) : '',
              batchName: test.batchName || '',
              startTime: toDateTimeLocal(test.startTime) || '',
              endTime: toDateTimeLocal(test.endTime) || '',
              questionCount: test.questionCount || 0,
              suggestedDuration: test.suggestedDuration || 45,
              notes: test.notes || '',
              createdAt: test.createdAt || '',
              status: test.status || 'draft',
              title: test.title || '',
              all_subjects: test.all_subjects || 0,
              totalMarks: (test.totalMarks || (test.questionCount || 0) * 4),
              parent_test_id: test.parent_test_id || null
            });
            setEditForm({
              title: test.title || '',
              subjectId: test.subjectId || '',
              topicId: test.topicId || '',
              subtopicId: test.subtopicId ? String(test.subtopicId) : '',
              questionCount: test.questionCount || 0,
              suggestedDuration: test.suggestedDuration || 45,
              batchId: test.batchId ? String(test.batchId) : '',
              startTime: toDateTimeLocal(test.startTime) || '',
              endTime: toDateTimeLocal(test.endTime) || '',
              notes: test.notes || '',
              status: test.status || 'draft',
            });
          }
        } catch (err) {
          console.warn('Failed to fetch test details, using provided test object', err);
          // fallback when fetch fails: still map schedule if present
          setEditingTest({
            id: String(test.id),
            examType: test.examType || 'NEET',
            subjectId: String(test.subjectId || ''),
              subjectName: test.subjectName || '',
            topicId: String(test.topicId || ''),
            topicName: test.topicName || '',
            batchId: test.batchId ? String(test.batchId) : '',
            batchName: test.batchName || '',
            startTime: toDateTimeLocal(test.startTime) || '',
            endTime: toDateTimeLocal(test.endTime) || '',
            questionCount: test.questionCount || 0,
            suggestedDuration: test.suggestedDuration || 45,
            notes: test.notes || '',
            createdAt: test.createdAt || '',
            status: test.status || 'draft',
            title: test.title || ''
          });
          setEditForm({
            title: test.title || '',
            subjectId: test.subjectId || '',
            topicId: test.topicId || '',
            subtopicId: test.subtopicId ? String(test.subtopicId) : '',
            questionCount: test.questionCount || 0,
            suggestedDuration: test.suggestedDuration || 45,
            batchId: test.batchId ? String(test.batchId) : '',
            startTime: toDateTimeLocal(test.startTime) || '',
            endTime: toDateTimeLocal(test.endTime) || '',
            notes: test.notes || '',
            status: test.status || 'draft',
          });
        }
        setEditFormErrors({});
        setIsEditDialogOpen(true);
      };

      // Update test handler

      const openCloneDialog = (test: Test) => {
        setCloneSourceTest(test);
        setCloneForm({
          title: `Copy of ${test.title || `${test.subjectName} ${test.topicName || ''}`}`,
          subjectId: String(test.subjectId || ''),
          topicId: String(test.topicId || ''),
          questionCount: test.questionCount || 0,
          duration: test.suggestedDuration || 45
        });
        // ensure topics for subject are loaded
        if (test.subjectId) fetchTopics(String(test.subjectId));
        setIsCloneDialogOpen(true);
      };

      const resetCloneForm = () => {
        setCloneSourceTest(null);
        setCloneForm({ title: '', subjectId: '', topicId: '', questionCount: 0, duration: 45 });
        setCloneSubmitting(false);
      };

      const handleCloneSubmit = async () => {
        if (!cloneSourceTest) return;
        setCloneSubmitting(true);
        try {
          const body = {
            title: cloneForm.title.trim(),
            subjectId: cloneForm.subjectId || undefined,
            topicId: cloneForm.topicId || undefined,
            duration: cloneForm.duration || 45,
            questionCount: cloneForm.questionCount || undefined
          };
          const res = await apiFetch(`/faculty/tests/${cloneSourceTest.id}/clone`, { method: 'POST', headers: (getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), body: JSON.stringify(body) });
          if (res?.success && res.testId) {
            const markMsg = res.totalMarks !== undefined ? ` — Total Marks: ${res.totalMarks}` : '';
            toast.success(`Test created from previous test${markMsg}`);
            setIsCloneDialogOpen(false);
            resetCloneForm();
            // refresh tests list and open new test for edit
            await fetchTests();
            // open edit dialog for new test
            const newTest = { id: String(res.testId) } as Test;
            await handleEditTest(newTest);
          } else {
            toast.error(res?.message || 'Failed to create test from previous');
          }
        } catch (err) {
          console.error('Clone error:', err);
          toast.error('Failed to create test from previous');
        } finally {
          setCloneSubmitting(false);
        }
      };
      const handleUpdateTest = async () => {
        if (!editingTest) return;
        // client-side validation
        const errs: Record<string,string> = {};
        const isCombined = editingTest && Number(editingTest.all_subjects || 0) === 1;
        if (!isCombined && !editForm.subjectId) errs.subject = 'Please select a subject';
        // Enforce minimum of 1 question for non-combined tests
        if (!isCombined && (!editForm.questionCount || editForm.questionCount <= 0)) {
          toast(`Question count must be at least 1 — using 1`, { icon: 'ℹ️' });
          setEditForm(prev => ({ ...prev, questionCount: 1 }));
        }
        if (!editForm.suggestedDuration || editForm.suggestedDuration <= 0) errs.suggestedDuration = 'Enter a valid duration';
        setEditFormErrors(errs);
        if (Object.keys(errs).length > 0) { toast.error('Please fix form errors'); return; }
        try {
          setEditSubmitting(true);
          const body: any = {
            title: editForm.title || (editingTest ? editingTest.title : ''),
            duration: Number(editForm.suggestedDuration),
            batchId: editForm.batchId ? Number(editForm.batchId) : null,
            startTime: editForm.startTime || null,
            endTime: editForm.endTime || null,
            notes: editForm.notes || '',
            status: editForm.status || 'draft',
          };

          // If this is NOT a combined (all subjects) parent test, allow subject/topic/subtopic/questionCount edits
          if (!(editingTest && Number(editingTest.all_subjects || 0) === 1)) {
            body.subjectId = Number(editForm.subjectId);
            body.topicId = editForm.topicId ? Number(editForm.topicId) : null;
            body.subtopicId = editForm.subtopicId ? Number(editForm.subtopicId) : null;
            body.questionCount = Number(editForm.questionCount);
          } else {
            // For combined tests, ensure we do not accidentally change these fields
            // (server expects no updates for these properties when all_subjects=1)
          }
          const res = await apiFetch(`/faculty/tests/${editingTest.id}`, {
            method: 'PUT',
            headers: (getToken() ? { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }),
            body: JSON.stringify(body)
          });
          if (res?.success) {
            toast.success('Test updated successfully');
            // If the server removed questions due to decrease, inform the user
            if (res?.removedCount && Number(res.removedCount) > 0) {
              toast.success(`Removed ${Number(res.removedCount)} questions from test due to decreased question count`);
            }
            // If questionCount increased and this is not a combined (all-subjects) parent test, attempt to allocate additional questions
            if (!(editingTest && Number(editingTest.all_subjects || 0) === 1)) {
              try {
                const newCount = Math.max(1, Number(editForm.questionCount) || 0);
                const prevCount = Math.max(0, Number(editingTest.questionCount) || 0);
                if (newCount > prevCount) {
                  const delta = newCount - prevCount;
                  const q = editForm.topicId ? `?topicId=${editForm.topicId}` : editForm.subjectId ? `?subjectId=${editForm.subjectId}` : '';
                  const allocRes = await apiFetch(`/faculty/tests/${editingTest.id}/allocate${q}`, { method: 'POST', headers: (getToken() ? { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), body: JSON.stringify({ numQuestions: delta }) });
                  if (allocRes?.success) {
                    toast.success(`Allocated ${allocRes.addedCount || delta} questions to test`);
                  } else {
                    toast.error(allocRes?.message || 'Failed to auto-allocate additional questions');
                  }
                }
              } catch (allocErr) {
                console.warn('Auto-allocation after update failed', allocErr);
              }
            }
            await fetchTests?.();
            // refresh available question count for this subject/topic
            if (editForm.subjectId) await fetchAvailableQuestionsCount(String(editForm.subjectId), editForm.topicId ? String(editForm.topicId) : undefined);
            setIsEditDialogOpen(false);
            setEditingTest(null);
          } else {
            toast.error(res?.message || 'Failed to update test');
          }
        } catch (err) {
          console.error('Update test error:', err);
          toast.error('Failed to update test');
        } finally {
          setEditSubmitting(false);
        }
      };
    // Delete dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<string | null>(null);
    const [isDeleteBlockedDialogOpen, setIsDeleteBlockedDialogOpen] = useState(false);
    const [deleteBlockedInfo, setDeleteBlockedInfo] = useState<{ testId: string; attempts: number } | null>(null);
    const [isForceDeleting, setIsForceDeleting] = useState(false);
    // Delete children dialog state
    const [isDeleteChildrenDialogOpen, setIsDeleteChildrenDialogOpen] = useState(false);
    const [deleteChildrenInfo, setDeleteChildrenInfo] = useState<{ testId: string; childCount: number } | null>(null);
    const [isUncombining, setIsUncombining] = useState(false);

    // Confirm delete handler
    const confirmDeleteTest = async () => {
      if (!testToDelete) return;
      try {
        const tk = getToken();
        const res = await apiFetch(`/faculty/tests/${testToDelete}`, {
          method: 'DELETE',
          headers: (tk ? { Authorization: `Bearer ${tk}` } : {}),
        });
        if (res?.success) {
          toast.success('Test deleted successfully');
          await fetchTests?.();
        } else if (res?.message === 'Cannot delete test with existing student attempts') {
          // Show blocked dialog with options to Unpublish or Force Delete
          setDeleteBlockedInfo({ testId: testToDelete, attempts: res.attempts || 0 });
          setIsDeleteBlockedDialogOpen(true);
        } else if (res?.message && res?.message.toLowerCase().includes('child tests')) {
          // Parent test has child tests; ask to confirm deleting children too
          setDeleteChildrenInfo({ testId: testToDelete, childCount: res.childCount || 0 });
          setIsDeleteChildrenDialogOpen(true);
        } else {
          toast.error(res?.message || 'Failed to delete test');
        }
      } catch (err: any) {
        console.error('Delete test error:', err);
        // apiFetch throws an Error with response body attached as `data` for non-2xx responses
        const resp = err && err.data ? err.data : null;
        if (resp && resp.message === 'Cannot delete test with existing student attempts') {
          setDeleteBlockedInfo({ testId: testToDelete, attempts: resp.attempts || 0 });
          setIsDeleteBlockedDialogOpen(true);
        } else if (resp && resp.message && resp.message.toLowerCase().includes('child tests')) {
          // Parent test has child tests; show confirmation dialog to let the user choose:
          // - Unlink children & delete parent (preserve children)
          // - Delete parent and children (force delete)
          setDeleteChildrenInfo({ testId: testToDelete, childCount: resp.childCount || 0 });
          setIsDeleteChildrenDialogOpen(true);
        } else {
          toast.error(err?.message || 'Failed to delete test');
        }
      } finally {
        setIsDeleteDialogOpen(false);
        setTestToDelete(null);
      }
    };

    const handleUnpublishTest = async (id: string) => {
      try {
        setStatusUpdatingId(id);
        const tk = getToken();
        const res = await apiFetch(`/faculty/tests/${id}`, {
          method: 'PUT',
          headers: (tk ? { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status: 'unpublished' })
        });
        if (res?.success) {
          toast.success('Test unpublished successfully');
          await fetchTests?.();
          setIsDeleteBlockedDialogOpen(false);
          setDeleteBlockedInfo(null);
        } else {
          toast.error(res?.message || 'Failed to unpublish test');
        }
      } catch (err) {
        console.error('Unpublish error:', err);
        toast.error('Failed to unpublish test');
      } finally {
        setStatusUpdatingId(null);
      }
    };

    const handleForceDelete = async (id: string) => {
      try {
        setIsForceDeleting(true);
        const tk = getToken();
        const res = await apiFetch(`/faculty/tests/${id}?force=true`, {
          method: 'DELETE',
          headers: (tk ? { Authorization: `Bearer ${tk}` } : {}),
        });
        if (res?.success) {
          toast.success('Test and attempts deleted successfully');
          await fetchTests?.();
          setIsDeleteBlockedDialogOpen(false);
          setDeleteBlockedInfo(null);
          setIsDeleteChildrenDialogOpen(false);
          setDeleteChildrenInfo(null);
        } else {
          toast.error(res?.message || 'Failed to force delete test');
        }
      } catch (err) {
        console.error('Force delete error:', err);
        toast.error('Failed to force delete test');
      } finally {
        setIsForceDeleting(false);
      }
    };

    const handleUncombineTest = async (id: string) => {
      try {
        setIsUncombining(true);
        const tk = getToken();
        const res = await apiFetch(`/faculty/tests/${id}/uncombine`, {
          method: 'POST',
          headers: (tk ? { Authorization: `Bearer ${tk}` } : {}),
        });
        if (res?.success) {
          toast.success('Parent uncombined and deleted successfully');
          await fetchTests?.();
          setIsDeleteChildrenDialogOpen(false);
          setDeleteChildrenInfo(null);
        } else {
          toast.error(res?.message || 'Failed to uncombine test');
        }
      } catch (err) {
        console.error('Uncombine error:', err);
        toast.error('Failed to uncombine test');
      } finally {
        setIsUncombining(false);
      }
    };

    const handleCreatePaperFromTest = async (test: Test) => {
      if (!confirm('Create an offline paper from this test and generate PDFs?')) return;
      try {
        setIsPaperProcessing(true);
        // Fetch test details and aggregated questions if needed
        const tk = getToken();
        const res = await apiFetch(`/faculty/tests/${test.id}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
        if (!res?.success || !res.test) throw new Error('Failed to fetch test');
        const t = res.test as any;
        let questionIds: number[] = [];
        if (Array.isArray(res.questions) && res.questions.length > 0) {
          questionIds = res.questions.map((q: any) => Number(q.id));
        } else if (Number(t.all_subjects || 0) === 1) {
          const tk = getToken();
          const agg = await apiFetch(`/faculty/tests/${test.id}/aggregate-questions`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
          if (agg?.success && Array.isArray(agg.questions)) questionIds = agg.questions.map((q: any) => Number(q.id));
        }
        if (!questionIds || questionIds.length === 0) { alert('No questions available in this test to create a paper'); return; }

        const payload: any = {
          exam_id: t.examId || t.exam_id || null,
          batch_id: t.batchId || t.batch_id || null,
          title: `Paper - ${t.title || test.title}`,
          question_ids: questionIds,
          duration_minutes: t.duration || t.duration_minutes || null,
          created_by: faculty?.id || null
        };

        const createRes = await fetch(`/api/admin/offline-papers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.paper) { console.error('Create paper failed', createData); throw new Error('Failed to create paper'); }
        const paperId = createData.paper.id;

        // Generate PDFs
        const genRes = await fetch(`/api/admin/offline-papers/${paperId}/generate`, { method: 'POST' });
        const genData = await genRes.json();
        if (!genRes.ok) { console.error('Generate failed', genData); throw new Error('Failed to generate PDFs'); }

        // Prefer returned URLs; otherwise fall back to download endpoints
        const qUrl = genData.questionUrl || `/api/admin/offline-papers/${paperId}/download/question`;
        const aUrl = genData.answerUrl || `/api/admin/offline-papers/${paperId}/download/answer`;
        if (isCreatePaperDialogOpen) {
          if (qUrl) window.open(qUrl, '_blank');
          if (aUrl) window.open(aUrl, '_blank');
          toast.success('Paper created and PDFs generated');
        } else {
          console.warn('Create Paper dialog closed before generation finished; skipping auto-open of generated files.');
          toast.success('Paper created (files generated)');
        }
        // Refresh tests list (papers appear in admin area; refresh tests here for visibility)
        await fetchTests?.();
      } catch (err) {
        console.error('Create paper error', err);
        toast.error('Failed to create paper');
      } finally {
        setIsPaperProcessing(false);
      }
    };

    // Create Paper (standalone) dialog submit
    const [paperForm, setPaperForm] = useState({
      title: '',
      examId: '',
      batchId: '',
      subjectId: '',
      topicId: '',
      subtopicId: '',
      numQuestions: 10,
      durationMinutes: 60
    });
    const createPaperAbortRef = useRef<AbortController | null>(null);
    const createdPaperIdRef = useRef<number | null>(null);

    const cleanupCreatedPaper = async (id: number | null) => {
      if (!id) return;
      try {
        const tk = getToken();
        await apiFetch(`/admin/offline-papers/${id}`, { method: 'DELETE', headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
        console.warn('Created paper cleaned up after abort:', id);
      } catch (err) {
        console.warn('Failed to cleanup created paper', id, err);
      }
    };
    const [paperDialogTopics, setPaperDialogTopics] = useState<Array<{ id: string; name: string }>>([]);
    const [paperDialogSubtopics, setPaperDialogSubtopics] = useState<Array<{ id: string; name: string }>>([]);

    // Dialog open state
    const [isCreatePaperDialogOpen, setIsCreatePaperDialogOpen] = useState(false);

    // Available questions for Create Paper dialog (updated when exam/subject/topic/subtopic changes)
    const [paperAvailableQuestions, setPaperAvailableQuestions] = useState<number | null>(null);
    const fetchPaperAvailableQuestionsCount = React.useCallback(async () => {
      try {
        let url = '/faculty/available-questions?';
        if (paperForm.subtopicId) url += `subtopicId=${paperForm.subtopicId}`;
        else if (paperForm.topicId) url += `topicId=${paperForm.topicId}`;
        else if (paperForm.subjectId) url += `subjectId=${paperForm.subjectId}`;
        else if (paperForm.examId) url += `examId=${paperForm.examId}`;
        const tk = getToken();
        const res = await apiFetch(url, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
        if (res?.success) {
          const total = res.total ?? (Array.isArray(res.questions) ? res.questions.length : 0);
          setPaperAvailableQuestions(total);
          // Ensure numQuestions stays within available bounds
          setPaperForm(prev => {
            let n = Number(prev.numQuestions) || 1;
            if (total === 0) n = 1;
            if (n > total) n = total;
            if (n < 1) n = 1;
            return { ...prev, numQuestions: n };
          });
        }
      } catch (err) {
        console.warn('Failed to fetch available question count for paper dialog', err);
        setPaperAvailableQuestions(0);
      }
    }, [paperForm.subjectId, paperForm.topicId, paperForm.subtopicId, paperForm.examId]);

    React.useEffect(() => {
      if (!isCreatePaperDialogOpen) return; // only fetch when dialog is open
      fetchPaperAvailableQuestionsCount();
    }, [paperForm.subjectId, paperForm.topicId, paperForm.subtopicId, paperForm.examId, isCreatePaperDialogOpen]);

    const handleCreatePaperSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (creatingPaper) return;
      // Validate
      if (!paperForm.title || !paperForm.examId || Number(paperForm.numQuestions) <= 0) {
        toast.error('Please provide a title, exam and a positive number of questions');
        return;
      }
      // Validate against availability
      if (paperAvailableQuestions !== null && Number(paperForm.numQuestions) > paperAvailableQuestions) {
        toast.error(`Only ${paperAvailableQuestions} questions available for the selected scope`);
        return;
      }
      try {
        setCreatingPaper(true);
        // create an abort controller for this operation
        const controller = new AbortController();
        createPaperAbortRef.current = controller;
        createdPaperIdRef.current = null;

        const payload: any = {
          exam_id: paperForm.examId ? Number(paperForm.examId) : null,
          batch_id: paperForm.batchId ? Number(paperForm.batchId) : null,
          subject_id: paperForm.subjectId ? Number(paperForm.subjectId) : null,
          topic_id: paperForm.topicId ? Number(paperForm.topicId) : null,
          subtopic_id: paperForm.subtopicId ? Number(paperForm.subtopicId) : null,
          num_questions: Number(paperForm.numQuestions),
          duration_minutes: Number(paperForm.durationMinutes) || null,
          title: paperForm.title,
          created_by: faculty?.id || null
        };

        // Use apiFetch so base URL is derived from env (VITE_API_URL) and errors are normalized
        const data = await apiFetch('/admin/offline-papers', { method: 'POST', body: JSON.stringify(payload), signal: controller.signal });
        const paperId = data.paper?.id;
        createdPaperIdRef.current = paperId ?? null;
        if (!paperId) {
          throw new Error('Failed to create paper (no id returned)');
        }

        // check if aborted before proceeding
        if (controller.signal.aborted) {
          await cleanupCreatedPaper(createdPaperIdRef.current);
          throw new Error('Create cancelled');
        }

        // Generate PDFs via API helper
        const genData = await apiFetch(`/admin/offline-papers/${paperId}/generate`, { method: 'POST', signal: controller.signal });
        const base = import.meta.env.VITE_API_URL || '';
        const qUrl = genData.questionUrl || `${base}/admin/offline-papers/${paperId}/download/question`;
        const aUrl = genData.answerUrl || `${base}/admin/offline-papers/${paperId}/download/answer`;

        // Only open generated files if the Create Paper dialog is still open (user may have closed it)
        if (!controller.signal.aborted) {
          if (isCreatePaperDialogOpen) {
            if (qUrl) window.open(qUrl, '_blank');
            if (aUrl) window.open(aUrl, '_blank');
            toast.success('Paper created and PDFs generated');
          } else {
            console.warn('Create Paper dialog closed before generation finished; skipping auto-open of generated files.');
            toast.success('Paper created (files generated)');
          }
        } else {
          // aborted during generation - cleanup created paper
          await cleanupCreatedPaper(createdPaperIdRef.current);
          toast.info('Create paper cancelled');
        }

        setIsCreatePaperDialogOpen(false);
        setPaperForm({ title: '', examId: '', batchId: '', subjectId: '', topicId: '', subtopicId: '', numQuestions: 10, durationMinutes: 60 });
      } catch (err: any) {
        if (err.name === 'AbortError' || /cancel/i.test(err.message)) {
          // user cancelled - already cleaned up above
          toast.info('Create paper cancelled');
        } else {
          console.error('Create paper error', err);
          toast.error('Failed to create paper');
        }
      } finally {
        setCreatingPaper(false);
        createPaperAbortRef.current = null;
        createdPaperIdRef.current = null;
      }
    };

    // Open Create Paper dialog with sensible defaults (exam, subject from allocation)
    const openCreatePaperDialog = () => {
      // If faculty has allocations, default to the first allocated subject and its exam
      if (allocatedSubjects && allocatedSubjects.length > 0) {
        const defaultSub = allocatedSubjects[0];
        setPaperForm(prev => ({ ...prev, examId: defaultSub.examId ? String(defaultSub.examId) : prev.examId, subjectId: String(defaultSub.id), title: prev.title || `Paper - ${defaultSub.subjectName}` }));
        if (defaultSub.examId) fetchBatchesForExam(defaultSub.examId);
        // populate topics for subject
        (async () => {
          try {
            const tk = getToken();
            const res = await apiFetch(`/faculty/topics?subjectId=${defaultSub.id}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
            if (res?.success && Array.isArray(res.topics)) setPaperDialogTopics(res.topics.map((t:any)=>({ id: String(t.id), name: t.name }))); else setPaperDialogTopics([]);
          } catch (err) { console.warn('Failed to fetch topics for create paper dialog', err); setPaperDialogTopics([]); }
        })();
      }
      setIsCreatePaperDialogOpen(true);
    };

    // When paper subject changes, fetch topics
    React.useEffect(() => {
      const s = paperForm.subjectId;
      if (!s) { setPaperDialogTopics([]); setPaperForm(prev=>({ ...prev, topicId: '', subtopicId: '' })); return; }
      (async () => {
        try {
          const tk = getToken();
          const res = await apiFetch(`/faculty/topics?subjectId=${s}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
          if (res?.success && Array.isArray(res.topics)) setPaperDialogTopics(res.topics.map((t:any)=>({ id: String(t.id), name: t.name }))); else setPaperDialogTopics([]);
        } catch (err) { console.warn('Failed to fetch topics for paper dialog', err); setPaperDialogTopics([]); }
      })();
      setPaperForm(prev=>({ ...prev, topicId: '', subtopicId: '' }));
    }, [paperForm.subjectId]);

    // When paper topic changes, fetch subtopics
    React.useEffect(() => {
      const t = paperForm.topicId;
      if (!t) { setPaperDialogSubtopics([]); setPaperForm(prev=>({ ...prev, subtopicId: '' })); return; }
      (async () => {
        try {
          const tk = getToken();
          const res = await apiFetch(`/admin/subtopics?topicId=${t}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
          if (res?.success && Array.isArray(res.subtopics)) setPaperDialogSubtopics(res.subtopics.map((s:any)=>({ id: String(s.id), name: s.name }))); else setPaperDialogSubtopics([]);
        } catch (err) { console.warn('Failed to fetch subtopics for paper dialog', err); setPaperDialogSubtopics([]); }
      })();
      setPaperForm(prev=>({ ...prev, subtopicId: '' }));
    }, [paperForm.topicId]);
  const { allocatedSubjects, faculty } = useFacultyAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isPaperProcessing, setIsPaperProcessing] = useState(false);
  const [creatingPaper, setCreatingPaper] = useState(false);
  const [selectedTestForReport, setSelectedTestForReport] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  // Test type filter: 'all' | 'combined' (all_subjects=1) | 'child' (parent_test_id != null) | 'single' (no parent, not combined)
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'combined' | 'child' | 'single'>('all');

  // List mode: 'online' shows tests, 'offline' shows offline papers
  const [listMode, setListMode] = useState<'online' | 'offline'>('online');

  type OfflinePaper = {
    id: string;
    exam_id?: number | null;
    subject_id?: number | null;
    topic_id?: number | null;
    subtopic_id?: number | null;
    batch_id?: number | null;
    parent_paper_id?: number | null;
    all_subjects?: number;
    title?: string;
    description?: string;
    total_questions?: number;
    total_marks?: number;
    duration_minutes?: number | null;
    status?: string;
    created_by?: number | null;
    created_at?: string;
    question_pdf_path?: string | null;
    answer_pdf_path?: string | null;
  };
  const [offlinePapers, setOfflinePapers] = useState<OfflinePaper[]>([]);

  // Offline paper edit/delete state
  const [editingPaper, setEditingPaper] = useState<OfflinePaper | null>(null);
  const [editPaperForm, setEditPaperForm] = useState<{ title?: string; description?: string; total_questions?: number | null; total_marks?: number | null; status?: string; subject_id?: string; topic_id?: string; subtopic_id?: string }>({});
  const [isEditPaperDialogOpen, setIsEditPaperDialogOpen] = useState(false);
  const [subjectsList, setSubjectsList] = useState<Array<{ id: string; name: string }>>([]);
  const [editDialogTopics, setEditDialogTopics] = useState<Array<{ id: string; name: string }>>([]);
  const [editDialogSubtopics, setEditDialogSubtopics] = useState<Array<{ id: string; name: string }>>([]);
  const [editDialogQuestions, setEditDialogQuestions] = useState<Array<any>>([]);
  const [allocatedCount, setAllocatedCount] = useState<number>(0);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingScopeChange, setPendingScopeChange] = useState<{ subject?: string; topic?: string; subtopic?: string } | null>(null);

  const [isPaperDeleteDialogOpen, setIsPaperDeleteDialogOpen] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<string | null>(null);
  const [isDeletingPaper, setIsDeletingPaper] = useState(false);

  // Preview dialog state for preview-generate
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ selectedQuestions?: QuestionItem[]; totalQuestions?: number; totalMarks?: number; questionPdfUrl?: string; questionDocUrl?: string } | null>(null);

  const downloadFile = async (url: string, filename?: string) => {
    try {
      const tk = getToken();
      const res = await fetch(url, { method: 'GET', headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || url.split('/').pop() || 'file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error', err);
      toast.error('Failed to download file');
    }
  };

  const fetchOfflinePapers = React.useCallback(async () => {
    try {
      const tk = getToken();
      // Only fetch papers created by this faculty (created_by)
      const createdBy = faculty?.id ? `?created_by=${faculty.id}` : '';
      const res = await apiFetch(`/admin/offline-papers${createdBy}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      const papersArray = Array.isArray(res) ? res : (Array.isArray(res?.papers) ? res.papers : []);
      if (Array.isArray(papersArray)) {
        setOfflinePapers(papersArray.map((p: any) => ({
          id: String(p.id),
          exam_id: p.exam_id,
          subject_id: p.subject_id,
          topic_id: p.topic_id,
          subtopic_id: p.subtopic_id,
          batch_id: p.batch_id,
          parent_paper_id: p.parent_paper_id,
          all_subjects: p.all_subjects,
          title: p.title,
          description: p.description,
          total_questions: p.total_questions,
          total_marks: p.total_marks,
          duration_minutes: p.duration_minutes,
          status: p.status,
          created_by: p.created_by,
          created_at: p.created_at,
          question_pdf_path: p.question_pdf_path || null,
          answer_pdf_path: p.answer_pdf_path || null,
        })));
      } else {
        setOfflinePapers([]);
      }
    } catch (err) {
      console.warn('Failed to fetch offline papers', err);
      setOfflinePapers([]);
    }
  }, [faculty?.id]);

  React.useEffect(() => {
    if (listMode === 'offline' && faculty?.id) fetchOfflinePapers();
  }, [listMode, fetchOfflinePapers, faculty?.id]);

  const [newTest, setNewTest] = useState({
    subjectId: '',
    topicId: '',
    subtopicId: '',
    questionCount: 30,
    suggestedDuration: 45,
    batchId: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'draft',
  });
  // Dialog form local state (more comprehensive form layout)
  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    numQuestions: 10,
    startTime: '',
    endTime: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogExam, setDialogExam] = useState<number | null>(null);
  const [dialogBatch, setDialogBatch] = useState<number | null>(null);
  const [dialogSubject, setDialogSubject] = useState<number | null>(null);
  const [dialogTopic, setDialogTopic] = useState<number | null>(null);
  const [dialogSubtopic, setDialogSubtopic] = useState<number | null>(null);
  const [dialogBatches, setDialogBatches] = useState<Array<{ id: number; name?: string; batch_name?: string }>>([]);
  const [dialogSubjects, setDialogSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [dialogTopics, setDialogTopics] = useState<Array<{ id: string; name: string }>>([]);
  const [dialogSubtopics, setDialogSubtopics] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editSubtopics, setEditSubtopics] = useState<Array<{ id: string; name: string }>>([]);

  const calculateTotalMarks = () => (Number(formData.numQuestions) || 0) * 4;

  const resetDialog = () => {
    setFormData({ title: '', duration: 60, numQuestions: 10, startTime: '', endTime: '' });
    setDialogExam(null);
    setDialogBatch(null);
    setDialogSubject(null);
    setDialogTopic(null);
    setDialogSubtopic(null);
    setDialogBatches([]);
    setDialogSubjects([]);
    setDialogTopics([]);
    setDialogSubtopics([]);
    // clear preview state when dialog resets
    setPreviewQuestions([]);
    setPreviewParams(null);
    setExpandedPreview(new Set());
  };
  const isCreateFormDirty = () => {
    return !!(dialogSubject || dialogTopic || dialogBatch || formData.title || formData.numQuestions !== 10 || formData.startTime || formData.endTime || formData.duration !== 60);
  };
  // UI controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'unpublished'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [previewQuestions, setPreviewQuestions] = useState<QuestionItem[]>([]);
  // Remember the parameters used to generate the current preview so repeated opens don't reshuffle
  const [previewParams, setPreviewParams] = useState<{ subjectId?: string; topicId?: string; subtopicId?: string; count?: number; source?: string } | null>(null);
  // When previewing combined/multi-selected tests, store their metadata (title, questionCount, marks)
  const [previewSourceTests, setPreviewSourceTests] = useState<Array<{ id: string; title?: string; questionCount: number; marksTotal: number }>>([]);
  // When previewing combined tests we keep the deduplicated full pool so shuffle can pick different subsets
  const [previewAggregatedPool, setPreviewAggregatedPool] = useState<QuestionItem[]>([]);
  const [previewDuplicateCount, setPreviewDuplicateCount] = useState<number>(0);

  // if a pool is discovered/updated and we're in combine mode, ensure the questionCount is capped
  useEffect(() => {
    if (multiCloneForm.combine && previewAggregatedPool.length > 0 && (multiCloneForm.questionCount || 0) > previewAggregatedPool.length) {
      setMultiCloneForm(prev => ({ ...prev, questionCount: previewAggregatedPool.length }));
    }
  }, [previewAggregatedPool, multiCloneForm.combine]);
  // per-preview expansion state (collapsed by default)
  const [expandedPreview, setExpandedPreview] = useState<Set<string>>(new Set());
  const togglePreviewExpand = (id: string) => {
    setExpandedPreview(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  // Parent-child UI: open a dialog to show children, and quick view parent for child tests 🔗
  const [childrenDialogOpen, setChildrenDialogOpen] = useState(false);
  const [childrenDialogParentId, setChildrenDialogParentId] = useState<string | null>(null);
  const getChildrenFor = (parentId: string) => tests.filter(t => String(t.parent_test_id) === String(parentId));
  const openChildrenDialog = (parentId: string) => { setChildrenDialogParentId(parentId); setChildrenDialogOpen(true); };
  const handleViewParent = async (parentId: string) => {
    if (!parentId) return;
    try {
      // Open edit dialog for parent test (will fetch its details)
      await handleEditTest({ id: String(parentId) } as Test);
    } catch (err) {
      console.warn('Failed to open parent test', err);
      toast.error('Failed to open parent test');
    }
  };

  // Image zoom state for preview images
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Image component with fallback and zoom (mirrors the one in FacultyQuestions)
  const ImageWithFallback = ({
    src,
    localSrc,
    alt,
    className,
    clickToZoom = false,
    maxHeight
  }: {
    src?: string | null;
    localSrc?: string | null;
    alt?: string;
    className?: string;
    clickToZoom?: boolean;
    maxHeight?: string;
  }) => {
    const getImageSource = () => {
      if (localSrc && localSrc.startsWith('blob:')) return localSrc;
      if (src) return getUploadUrl(src);
      return '';
    };

    const [imgSrc, setImgSrc] = useState(() => getImageSource());
    const [isOverflowing, setIsOverflowing] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      const newSrc = localSrc && localSrc.startsWith('blob:') ? localSrc : (src ? getUploadUrl(src) : '');
      setImgSrc(newSrc);
    }, [src, localSrc]);

    useEffect(() => {
      if (imgRef.current && maxHeight) {
        const maxHeightPx = parseInt(maxHeight);
        if (imgRef.current.naturalHeight > maxHeightPx) {
          setIsOverflowing(true);
        }
      }
    }, [imgSrc, maxHeight]);

    const handleError = () => {
      if (imgSrc.startsWith('blob:') && src) {
        setImgSrc(getUploadUrl(src));
        return;
      }
      setImgSrc('');
    };

    const handleClick = () => {
      if (clickToZoom && imgSrc) {
        setZoomImageUrl(imgSrc);
        setIsImageZoomOpen(true);
      }
    };

    if (!imgSrc) return null;

    return (
      <div className="relative inline-block">
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt || ''}
          className={`${className} ${clickToZoom ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          style={maxHeight ? { maxHeight, objectFit: 'cover' } : undefined}
          onError={handleError}
          onClick={handleClick}
        />
        {isOverflowing && clickToZoom && (
          <div
            className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer hover:bg-black/90 transition-colors"
            onClick={handleClick}
          >
            <span className="sr-only">View Full</span>
            View Full
          </div>
        )}
      </div>
    );
  };  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isPreviewFromEdit, setIsPreviewFromEdit] = useState(false);
  const [previewDesiredCount, setPreviewDesiredCount] = useState<number>(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<ExamType[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [batches, setBatches] = useState<Array<{ id: number; name: string; examType?: string }>>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState<number>(0);
  const [isQuestionAllocOpen, setIsQuestionAllocOpen] = useState(false);
  const [allocatingTestId, setAllocatingTestId] = useState<string | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

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
    return topics.filter(t => String(t.subjectId) === String(subjectId));
  };

  const toDateTimeLocal = (iso?: string | null) => {
    if (!iso) return '';
    try {
      // Normalize common server formats: 'YYYY-MM-DD HH:mm:ss' -> 'YYYY-MM-DDTHH:mm:ss'
      let s = String(iso).trim();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
        s = s.replace(' ', 'T');
      }
      // If string lacks seconds but has time, ensure seconds are present for Date parsing
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s = `${s}:00`;
      // If string is date-only like 'YYYY-MM-DD', append midnight time
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s = `${s}T00:00:00`;
      const d = new Date(s);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      const YYYY = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const DD = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
    } catch (err) {
      return '';
    }
  };

  const formatReadableDate = (dateTimeLocal?: string) => {
    if (!dateTimeLocal) return '';
    const d = new Date(dateTimeLocal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTestCountBySubject = (subjectId: string) => {
    return tests.filter(t => String(t.subjectId) === String(subjectId)).length;
  };

  const getTestCountByTopic = (topicId: string) => {
    return tests.filter(t => String(t.topicId) === String(topicId)).length;
  };

  const clearFilters = () => {
    setSelectedSubject('');
    setSelectedTopic('');
  };

  const buildPreviewUrl = (p: { subjectId?: string; topicId?: string; subtopicId?: string }) => {
    let url = '/faculty/available-questions?';
    if (p.subtopicId) url += `subtopicId=${p.subtopicId}`;
    else if (p.topicId) url += `topicId=${p.topicId}`;
    else if (p.subjectId) url += `subjectId=${p.subjectId}`;
    return url;
  };

  const isSamePreview = (
    p1: { subjectId?: string; topicId?: string; subtopicId?: string; count?: number; source?: string } | null,
    p2: { subjectId?: string; topicId?: string; subtopicId?: string; count?: number; source?: string } | null
  ) => {
    if (!p1 || !p2) return false;
    return (p1.subjectId || '') === (p2.subjectId || '') && (p1.topicId || '') === (p2.topicId || '') && (p1.subtopicId || '') === (p2.subtopicId || '') && Number(p1.count || 0) === Number(p2.count || 0) && (p1.source || '') === (p2.source || '');
  };

  const handleShufflePreview = async () => {
    if (!previewParams) return;
    setLoadingPreview(true);
    try {
      // If it's a multi-selected preview, reshuffle from the aggregated unique pool
      if (previewParams.source === 'multi' && previewAggregatedPool.length > 0) {
        const pool = [...previewAggregatedPool];
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const useCount = Number(previewParams.count || shuffled.length);
        const selected = shuffled.slice(0, useCount);
        try {
          const detailed = await Promise.all(selected.map(async (sq: any) => {
            try {
              const tk = getToken();
              const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
              return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id), sourceTestTitle: sq.sourceTestTitle, sourceTestId: sq.sourceTestId }) : sq;
            } catch (err) { return sq; }
          }));
          setPreviewQuestions(detailed as QuestionItem[]);
        } catch (err) {
          setPreviewQuestions(selected as QuestionItem[]);
        }
        setExpandedPreview(new Set());
        setIsPreviewOpen(true);
        return;
      }

      // fallback to earlier behavior (subject/topic based preview)
      const url = buildPreviewUrl(previewParams);
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.questions)) {
        const shuffled = [...res.questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, previewParams.count || 0).map((q: any) => ({ ...q, id: String(q.id) }));
        // fetch details
        const detailed = await Promise.all(selected.map(async (sq: any) => {
          try {
            const tk = getToken();
            const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
            return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id) }) : sq;
          } catch (err) {
            return sq;
          }
        }));
        setPreviewQuestions(detailed);
        setExpandedPreview(new Set());
        setIsPreviewOpen(true);
      } else {
        toast.error('No questions available to shuffle');
      }
    } catch (err) {
      console.error('Shuffle failed', err);
      toast.error('Failed to shuffle preview');
    } finally {
      setLoadingPreview(false);
    }
  };
  const handlePreviewQuestions = async () => {
    if (!newTest.subjectId || !newTest.topicId || newTest.questionCount <= 0) {
      toast.error('Please select subject, topic and question count');
      return;
    }

    // Clear any previous multi-selected preview metadata
    setPreviewSourceTests([]);

    const params = { subjectId: String(newTest.subjectId || ''), topicId: String(newTest.topicId || ''), subtopicId: String(newTest.subtopicId || ''), count: Number(newTest.questionCount || 0), source: 'create' };
    // If the same params are already previewed, reuse the preview
    if (isSamePreview(previewParams, params) && previewQuestions.length > 0) {
      setIsPreviewOpen(true);
      return;
    }

    setLoadingPreview(true);
    try {
      const url = buildPreviewUrl(params);
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.questions)) {
        // Randomly shuffle and select questions for preview
        const shuffled = [...res.questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, newTest.questionCount).map((q: any) => ({ ...q, id: String(q.id) }));
        // Fetch detailed question objects to include options, images, explanation
        try {
          const detailed = await Promise.all(selected.map(async (sq: any) => {
            try {
              const tk = getToken();
              const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
              return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id) }) : sq;
            } catch (err) {
              console.warn('Failed to fetch question detail', sq.id, err);
              return sq;
            }
          }));
          setPreviewQuestions(detailed);
        } catch (err) {
          console.warn('Failed to fetch detailed preview questions', err);
          setPreviewQuestions(selected);
        }
        setPreviewParams(params);
        setExpandedPreview(new Set());
        setIsPreviewOpen(true);
      } else {
        toast.error('No questions available');
      }
    } catch (err) {
      console.error('Failed to fetch preview questions:', err);
      toast.error('Failed to load question preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Preview for Create Paper dialog
  const handlePreviewPaperQuestions = async () => {
    if (!paperForm.subjectId && !paperForm.topicId && !paperForm.subtopicId && !paperForm.examId) {
      toast.error('Please select subject/topic/subtopic or an exam to preview questions');
      return;
    }
    if (Number(paperForm.numQuestions) <= 0) {
      toast.error('Enter a positive number of questions');
      return;
    }

    // Clear any previous multi-selected preview metadata
    setPreviewSourceTests([]);

    setLoadingPreview(true);
    try {
      // build URL using subtopic > topic > subject > exam
      let url = '/faculty/available-questions?';
      if (paperForm.subtopicId) url += `subtopicId=${paperForm.subtopicId}`;
      else if (paperForm.topicId) url += `topicId=${paperForm.topicId}`;
      else if (paperForm.subjectId) url += `subjectId=${paperForm.subjectId}`;
      else if (paperForm.examId) url += `examId=${paperForm.examId}`;

      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.questions)) {
        // Randomly shuffle and select questions for preview
        const shuffled = [...res.questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Number(paperForm.numQuestions || 0)).map((q: any) => ({ ...q, id: String(q.id) }));
        // Fetch detailed question objects to include options, images, explanation
        try {
          const detailed = await Promise.all(selected.map(async (sq: any) => {
            try {
              const tk2 = getToken();
              const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk2 ? { Authorization: `Bearer ${tk2}` } : {}) });
              return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id) }) : sq;
            } catch (err) {
              console.warn('Failed to fetch question detail', sq.id, err);
              return sq;
            }
          }));
          setPreviewQuestions(detailed);
        } catch (err) {
          console.warn('Failed to fetch detailed preview questions', err);
          setPreviewQuestions(selected);
        }
        setPreviewParams({ subjectId: paperForm.subjectId || '', topicId: paperForm.topicId || '', subtopicId: paperForm.subtopicId || '', count: Number(paperForm.numQuestions || 0), source: 'create-paper' });
        setExpandedPreview(new Set());
        setIsPreviewOpen(true);
      } else {
        toast.error('No questions available');
      }
    } catch (err) {
      console.error('Failed to fetch preview questions:', err);
      toast.error('Failed to load question preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const activeFiltersCount = [selectedSubject, selectedTopic, statusFilter !== 'all' ? 'status' : '', testTypeFilter !== 'all' ? 'type' : ''].filter(Boolean).length;


  const resetEditForm = () => {
    if (editingTest) {
      setEditForm({
        title: editingTest.title || '',
        subjectId: editingTest.subjectId,
        topicId: editingTest.topicId,
        subtopicId: editingTest.subtopicId ? String(editingTest.subtopicId) : '',
        questionCount: editingTest.questionCount,
        suggestedDuration: editingTest.suggestedDuration,
        batchId: editingTest.batchId || '',
        startTime: editingTest.startTime || '',
        endTime: editingTest.endTime || '',
        notes: editingTest.notes || '',
        status: editingTest.status || 'draft',
      });
      // refresh counts
      if (editingTest.subjectId) {
        fetchTopics(String(editingTest.subjectId));
        fetchAvailableQuestionsCount(String(editingTest.subjectId), editingTest.topicId ? String(editingTest.topicId) : undefined);
      }
    } else {
      setEditForm({
        title: '',
        subjectId: '',
        topicId: '',
        subtopicId: '',
        questionCount: 30,
        suggestedDuration: 45,
        batchId: '',
        startTime: '',
        endTime: '',
        notes: '',
        status: 'draft',
      });
    }
    setEditFormErrors({});
    setEditSubmitting(false);
  };

  // Preview handler extracted from inline button to avoid JSX parse issues
  const handlePreviewFromEdit = async () => {
    if (!editForm.subjectId) { toast.error('Please select subject first'); return; }
    setIsPreviewFromEdit(true);
    setPreviewDesiredCount(editForm.questionCount || 0);
    setPreviewSourceTests([]);
    const params = { subjectId: String(editForm.subjectId || ''), topicId: String(editForm.topicId || ''), subtopicId: String(editForm.subtopicId || ''), count: Number(editForm.questionCount || 0), source: 'edit' };
    if (isSamePreview(previewParams, params) && previewQuestions.length > 0) { setIsPreviewOpen(true); return; }
    setLoadingPreview(true);
    try {
      const url = buildPreviewUrl(params);
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.questions)) {
        const shuffled = [...res.questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(res.questions.length, Math.max(1, editForm.questionCount || 1))).map((q: any) => ({ ...q, id: String(q.id) }));
        try {
          const detailed = await Promise.all(selected.map(async (sq: any) => {
            try {
              const tk2 = getToken();
              const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk2 ? { Authorization: `Bearer ${tk2}` } : {}) });
              return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id) }) : sq;
            } catch (err) {
              console.warn('Failed to fetch question detail', sq.id, err);
              return sq;
            }
          }));
          setPreviewQuestions(detailed);
        } catch (err) {
          console.warn('Failed to fetch detailed preview questions', err);
          setPreviewQuestions(selected);
        }
        setPreviewParams(params);
        setExpandedPreview(new Set());
        setIsPreviewOpen(true);
      } else {
        toast.error('No questions available');
      }
    } catch (err) {
      console.error('Preview failed', err);
      toast.error('Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };
  const isEditFormValid = () => {
    const isCombined = !!(editingTest && Number(editingTest.all_subjects || 0) === 1);
    if (!isCombined) {
      if (!editForm.subjectId) return false;
      if (!editForm.questionCount || editForm.questionCount <= 0) return false;
    }
    if (!editForm.suggestedDuration || editForm.suggestedDuration <= 0) return false;
    return true;
  }; 
  const filteredTests = tests.filter(t => {
    const matchesSubject = !selectedSubject || t.subjectId === selectedSubject;
    const matchesTopic = !selectedTopic || t.topicId === selectedTopic;
    const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;
    const matchesSearch = !searchQuery ? true : (
      String(t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.subjectName).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.topicName).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Type filtering: Combined (all_subjects=1), Child (parent_test_id != null), Single (not combined, no parent)
    const isCombined = Number(t.all_subjects || 0) === 1;
    const isChild = t.parent_test_id !== null && typeof t.parent_test_id !== 'undefined';
    const isSingle = !isCombined && !isChild;

    const matchesType = testTypeFilter === 'all' ? true : (
      testTypeFilter === 'combined' ? isCombined : (testTypeFilter === 'child' ? isChild : isSingle)
    );

    return matchesSubject && matchesTopic && matchesStatus && matchesSearch && matchesType;
  });

  // Sorting
  const sortedTests = React.useMemo(() => {
    const copy = [...filteredTests];
    if (sortBy === 'newest') return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sortBy === 'oldest') return copy.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    if (sortBy === 'title') return copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return copy.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [filteredTests, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedTests.length / pageSize));
  const paginatedTests = sortedTests.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleCreateTest = async () => {
    if (!newTest.subjectId || !newTest.topicId) {
      toast.error('Please select subject and topic');
      return;
    }
    // Ensure at least 1 question
    let qc = Number(newTest.questionCount) || 0;
    if (qc < 1) {
      qc = 1;
      toast(`Question count must be at least 1 — using ${qc}`, { icon: 'ℹ️' });
    }

    if (qc > availableQuestionsCount) {
      toast.error(`Cannot create test with ${qc} questions. Only ${availableQuestionsCount} available.`);
      return;
    }

    const subject = allocatedSubjects.find(s => s.id === newTest.subjectId);
    const topic = topics.find(t => String(t.id) === String(newTest.topicId));

    // Create test via backend
    try {
      setSubmitting(true);
      const body = {
        title: `${subject?.subjectName || 'Subject'} - ${topic?.name || 'Topic'} Test`,
        examId: Number(subject?.examId) || null,
          subjectId: Number(newTest.subjectId),
          topicId: Number(newTest.topicId),
          subtopicId: newTest.subtopicId ? Number(newTest.subtopicId) : null,
          duration: Number(newTest.suggestedDuration) || 45,
          questionCount: qc,
          batchId: newTest.batchId ? Number(newTest.batchId) : null,
          startTime: newTest.startTime || null,
          endTime: newTest.endTime || null,
          status: newTest.status || 'draft',
        };
  // ...existing code...
        console.log('Creating test with payload:', body);
        const tk = getToken();
        const res = await apiFetch('/faculty/tests', { 
          method: 'POST', 
          headers: (tk ? { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), 
          body: JSON.stringify(body) 
        });
        if (res?.success) {
          // Try auto-allocate if requested
          const testId = res.testId;
          let allocatedOk = false;
            try {
            if (qc > 0 && testId) {
              // Build query param
              const q = newTest.subtopicId ? `?subtopicId=${newTest.subtopicId}` : newTest.topicId ? `?topicId=${newTest.topicId}` : newTest.subjectId ? `?subjectId=${newTest.subjectId}` : '';
              const tk = getToken();
              const allocRes = await apiFetch(`/faculty/tests/${testId}/allocate${q}`, { method: 'POST', headers: (tk ? { Authorization: `Bearer ${tk}` } : {}), body: JSON.stringify({ numQuestions: qc }) });
              if (allocRes?.success) {
                allocatedOk = true;
                toast.success(`Test created and ${allocRes.addedCount || 0} questions allocated`);
              }
            }
          } catch (allocErr) {
            console.warn('Auto-allocate failed', allocErr);
          }

          if (!allocatedOk && res.testId) {
            // Refresh tests and open dialog so teacher can manually add questions
            await fetchTests();
            openQuestionAllocDialog(String(res.testId), newTest.subjectId, newTest.topicId, newTest.subtopicId);
            toast.success('Test created successfully');
          } else {
            await fetchTests();
          }
        }
      } catch (err) {
        toast.error('Failed to create test');
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    setNewTest({
      subjectId: '',
      topicId: '',
      subtopicId: '',
      questionCount: 30,
      suggestedDuration: 45,
      batchId: '',
      startTime: '',
      endTime: '',
      notes: '',
      status: 'draft'
    });
    setPreviewQuestions([]);
    setIsCreateDialogOpen(false);
  };

  const handleViewReport = async (testId: string) => {
    try {
      // Ensure the test has at least one question; server will auto-allocate if necessary
      const ensureRes = await apiFetch(`/faculty/tests/${testId}/ensure-min`, { method: 'POST', headers: (getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });
      if (ensureRes?.success && ensureRes.addedCount > 0) {
        toast.success(`Automatically allocated ${ensureRes.addedCount} question(s) to the test`);
      }
    } catch (err) {
      console.warn('ensure-min request failed', err);
    }

    setSelectedTestForReport(testId);
    setIsReportDialogOpen(true);
  };

  const fetchQuestions = async (queryParams?: { subjectId?: string; topicId?: string; subtopicId?: string; search?: string }) => {
    setLoadingQuestions(true);
    try {
      let url = '/faculty/available-questions';
      const params = new URLSearchParams();
      if (queryParams?.subtopicId) params.append('subtopicId', String(queryParams.subtopicId));
      else if (queryParams?.topicId) params.append('topicId', String(queryParams.topicId));
      else if (queryParams?.subjectId) params.append('subjectId', String(queryParams.subjectId));
      if (queryParams?.search) params.append('search', String(queryParams.search));
      if (params.toString()) url += `?${params.toString()}`;
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.questions)) {
        setAvailableQuestions(res.questions);
      } else {
        setAvailableQuestions([]);
      }
    } catch (err) {
      console.warn('Failed to fetch questions', err);
      setAvailableQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const openQuestionAllocDialog = async (testId: string, subjectId?: string, topicId?: string, subtopicId?: string) => {
    setAllocatingTestId(testId);
    setIsQuestionAllocOpen(true);
    setSelectedQuestionIds([]);
    await fetchQuestions({ subjectId, topicId, subtopicId });
  };

  const handleAddSelectedQuestions = async () => {
    if (!allocatingTestId || selectedQuestionIds.length === 0) {
      toast.error('Select questions to add to test');
      return;
    }
    try {
      const tk = getToken();
      const res = await apiFetch(`/faculty/tests/${allocatingTestId}/questions`, {
        method: 'POST',
        headers: (tk ? { Authorization: `Bearer ${tk}` } : {}),
        body: JSON.stringify({ questionIds: selectedQuestionIds }),
      });
      if (res?.success) {
        toast.success(res.message || 'Questions added to test');
        setIsQuestionAllocOpen(false);
        setAllocatingTestId(null);
        setSelectedQuestionIds([]);
        await fetchTests();
      } else {
        toast.error(res?.message || 'Failed to add questions');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to add questions');
    }
  };

  const [reportData, setReportData] = useState<ReportData | null>(null);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [publishingMarks, setPublishingMarks] = useState(false);
    const [publishingMarksId, setPublishingMarksId] = useState<string | null>(null);

    const handlePublishMarks = async () => {
      if (!selectedTestForReport || !reportData) return;
      const currentlyPublished = !!reportData.test.mark_publish;
      const target = currentlyPublished ? 0 : 1;
      const confirmMsg = currentlyPublished ? 'Unpublish marks for this test? This will hide marks from students.' : 'Publish marks for this test? This will make marks visible to students.';
      if (!window.confirm(confirmMsg)) return;
      setPublishingMarks(true);
      try {
        const res = await apiFetch(`/faculty/tests/${selectedTestForReport}`, { method: 'PUT', headers: (getToken() ? { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), body: JSON.stringify({ markPublish: target }) });
        if (res?.success) {
          toast.success(target ? 'Marks published' : 'Marks unpublished');
          // update local report state so UI updates immediately
          setReportData(prev => prev ? ({ ...prev, test: { ...prev.test, mark_publish: target } }) : prev);
          // refresh test list to show updated state elsewhere
          await fetchTests();
        } else {
          toast.error(res?.message || 'Failed to update mark publishing');
        }
      } catch (err) {
        console.error('Publish/unpublish marks failed', err);
        toast.error('Failed to update mark publishing');
      } finally {
        setPublishingMarks(false);
      }
    };

    const handleTogglePublishForTest = async (testId: string, currentlyPublished: boolean | number | undefined) => {
      const target = currentlyPublished ? 0 : 1;
      if (!window.confirm(target ? 'Publish marks for this test?' : 'Unpublish marks for this test?')) return;
      try {
        setPublishingMarksId(testId);
        const res = await apiFetch(`/faculty/tests/${testId}`, { method: 'PUT', headers: (getToken() ? { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), body: JSON.stringify({ markPublish: target }) });
        if (res?.success) {
          toast.success(target ? 'Marks published' : 'Marks unpublished');
          // update tests list locally
          setTests(prev => prev.map(t => t.id === testId ? ({ ...t, mark_publish: target }) : t));
          // if report open for same test, update reportData
          if (selectedTestForReport === testId) setReportData(prev => prev ? ({ ...prev, test: { ...prev.test, mark_publish: target } }) : prev);
        } else {
          toast.error(res?.message || 'Failed to update mark publishing');
        }
      } catch (err) {
        console.error('Toggle publish for test failed', err);
        toast.error('Failed to update mark publishing');
      } finally {
        setPublishingMarksId(null);
      }
    };

    const handleSendEmails = async () => {
      if (!selectedTestForReport) return;
      if (!window.confirm('Send report PDFs to all students who attended this test?')) return;
      setSendingEmails(true);
      try {
        const res = await apiFetch(`/faculty/tests/${selectedTestForReport}/send-report-emails`, { method: 'POST', headers: (getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });
        if (res?.success) {
          const sent = (res.results || []).filter((r: any) => r.status === 'sent').length;
          const failed = (res.results || []).filter((r: any) => r.status !== 'sent').length;
          toast.success(`Emails sent: ${sent}${failed ? `, failed: ${failed}` : ''}`);
        } else {
          toast.error(res?.message || 'Failed to send emails');
        }
      } catch (err) {
        console.error('Send emails failed', err);
      // Show server-provided message if available
      if (err && err.message) toast.error(err.message as string);
      else toast.error('Failed to send emails');
      } finally {
        setSendingEmails(false);
      }
    };
  useEffect(() => {
    const loadReport = async () => {
      if (!selectedTestForReport) return;
      try {
        const res = await apiFetch(`/faculty/tests/${selectedTestForReport}/report`, { headers: (getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });
        if (res?.success) {
          // handle different backend shapes (admin returns { report: { ... } }, faculty returns top-level)
          const payload = res.report || res;
          // For easier debugging during development, log the report payload
          if (process.env.NODE_ENV !== 'production') console.debug('Report payload:', payload);
          setReportData(payload as ReportData);
        }
      } catch (err) {
        console.warn('Failed to fetch test report', err);
      }
    };
    loadReport();
  }, [selectedTestForReport]);

  const stats = {
    total: tests.length,
    byExamType: {
      neet: tests.filter(t => t.examType === 'NEET').length,
      jee: tests.filter(t => t.examType === 'JEE').length
    }
  };

  const fetchExams = React.useCallback(async () => {
    try {
      const tk = getToken();
      const res = await apiFetch('/faculty/exams', { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success) setExams(res.exams || []);
    } catch (err) {
      console.warn('Failed to fetch exams', err);
    }
  }, []);

  const fetchBatches = React.useCallback(async () => {
    // fetch all batches (optionally filter by examId)
    if (!getToken()) {
      setLoadingBatches(false);
      return;
    }
    try {
      setLoadingBatches(true);
      const res = await apiFetch('/faculty/batches?active=true', { headers: (getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });
      if (res?.success && res.batches) setBatches(res.batches);
      else setBatches([]);
    } catch (err) {
      console.error('Error fetching batches:', err);
      toast.error('Failed to load batches');
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const fetchBatchesForExam = React.useCallback(async (examId?: string | number) => {
    if (!getToken()) return;
    try {
      setLoadingBatches(true);
      let url = '/faculty/batches?active=true';
      if (examId) url += `&examId=${examId}`;
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && res.batches) {
        setDialogBatches(res.batches);
        // keep the global batches list in sync so the Edit dialog (which reads `batches`) shows options
        setBatches(res.batches);
        return res.batches;
      } else setDialogBatches([]);
      return [];
    } catch (err) {
      console.warn('Failed to fetch batches for exam', err);
      setDialogBatches([]);
      return [];
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const fetchTopics = React.useCallback(async (subjectId?: string) => {
    try {
      let url = '/faculty/topics';
      if (subjectId) url += `?subjectId=${subjectId}`;
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.topics)) {
        setTopics(res.topics);
      }
    } catch (err) {
      console.warn('Failed to fetch topics', err);
    }
  }, []);

  // Update dialog-derived lists when relevant selections change
  useEffect(() => {
    // derive dialog subjects from allocatedSubjects
    setDialogSubjects(allocatedSubjects.map(s => ({ id: Number(s.id), name: s.subjectName })));
  }, [allocatedSubjects]);

  useEffect(() => {
    // Only sync dialog batches with the global list when there is no selected exam filter.
    // When an exam is selected we fetch filtered batches and should not overwrite them.
    if (!dialogExam) {
      setDialogBatches(batches);
    }
  }, [dialogExam, batches]);

  // When the exam selection in the create dialog changes, fetch batches filtered by that exam
  useEffect(() => {
    if (dialogExam) {
      fetchBatchesForExam(dialogExam);
    } else {
      // load unfiltered batches
      fetchBatches();
    }
  }, [dialogExam, fetchBatchesForExam, fetchBatches]);

  const fetchAvailableQuestionsCount = React.useCallback(async (subjectId?: string, topicId?: string, subtopicId?: string, examId?: string | number) => {
    try {
      let url = '/faculty/available-questions?';
      if (subtopicId) url += `subtopicId=${subtopicId}`;
      else if (topicId) url += `topicId=${topicId}`;
      else if (subjectId) url += `subjectId=${subjectId}`;
      else if (examId) url += `examId=${examId}`;
      const tk = getToken();
      const res = await apiFetch(url, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success) {
        setAvailableQuestionsCount(res.total ?? (Array.isArray(res.questions) ? res.questions.length : 0));
      }
    } catch (err) {
      console.warn('Failed to fetch available question count', err);
      setAvailableQuestionsCount(0);
    }
  }, []);

  // derive dialog topics when a subject is selected (moved here so fetchAvailableQuestionsCount is defined)
  useEffect(() => {
    const fetchDialogSubtopics = async () => {
      if (!dialogTopic) {
        setDialogSubtopics([]);
        return;
      }
      try {
        const tk = getToken();
        const res = await apiFetch(`/admin/subtopics?topicId=${dialogTopic}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
        if (res?.success && Array.isArray(res.subtopics)) {
          setDialogSubtopics(res.subtopics.map((s: any) => ({ id: String(s.id), name: s.name })));
        } else {
          setDialogSubtopics([]);
        }
      } catch (err) {
        console.warn('Failed to fetch dialog subtopics', err);
        setDialogSubtopics([]);
      }
    };

    if (dialogSubject) {
      const ts = topics.filter(t => String(t.subjectId) === String(dialogSubject));
      setDialogTopics(ts.map(t => ({ id: String(t.id), name: t.name })));
      // Update available question count for preview (prioritize subtopic > topic > subject)
      fetchAvailableQuestionsCount(String(dialogSubject), dialogTopic ? String(dialogTopic) : undefined, dialogSubtopic ? String(dialogSubtopic) : undefined);
    } else {
      setDialogTopics([]);
      setDialogSubtopics([]);
    }

    fetchDialogSubtopics();
  }, [dialogSubject, dialogTopic, dialogSubtopic, topics, fetchAvailableQuestionsCount]);

  const fetchTests = React.useCallback(async () => {
    if (!getToken()) return;
    setLoadingProposals(true);
    try {
      const tk = getToken();
      const res = await apiFetch('/faculty/tests', { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
      if (res?.success && Array.isArray(res.tests)) {
          // filter tests created by this faculty, but ALSO include combined tests (parent/combined created globally)
          const myTests = res.tests.filter(t => {
            const isCombined = Number(t.all_subjects || 0) === 1;
            return isCombined || String(t.createdBy) === String(faculty?.id || '');
          });
          // Map to Test shape used locally (include status)
          const mapped = myTests.map((t) => ({
            // Preserve server's all_subjects flag so UI and filters work reliably
            id: String(t.id),
            title: t.title || '',
            examId: t.examId || null,
            examType: t.examType,
            subjectId: String(t.subjectId),
            subjectName: t.subject || '',
            topicId: String(t.topicId),
            topicName: t.topicName || '',
            batchId: t.batchId ? String(t.batchId) : '',
            batchName: t.batchName || '',
            startTime: t.startTime || '',
            endTime: t.endTime || '',
            // keep raw server values in case we need to re-normalize
            startTimeRaw: t.startTime || '',
            endTimeRaw: t.endTime || '',
            questionCount: t.questionCount || 0,
            suggestedDuration: t.duration || 45,
            notes: t.notes || '',
            status: t.status || 'draft',
            mark_publish: t.mark_publish || 0,
            parent_test_id: t.parent_test_id || null,
            subtopicName: t.subtopicName || '',
            all_subjects: t.all_subjects || 0,
            totalMarks: t.totalMarks || ((t.questionCount || 0) * 4),
            createdAtRaw: t.createdAt
          }));
          setTests(mapped);
        }
    } catch (err) {
      console.warn('Failed to fetch tests', err);
    } finally {
      setLoadingProposals(false);
    }
  }, [faculty?.id]);

  // Reset preview edit flags when preview closes
  useEffect(() => {
    if (!isPreviewOpen) {
      setIsPreviewFromEdit(false);
      setPreviewDesiredCount(0);
    }
  }, [isPreviewOpen]);

  // Top-level status update handler (optimistic UI + server synchronization)
  const updateTestStatus = async (testId: string, status: 'draft' | 'published' | 'unpublished') => {
    // avoid unnecessary call
    const current = tests.find(t => t.id === testId);
    if (current && current.status === status) return;

    // optimistic update
    setStatusUpdatingId(testId);
    const previous = tests;
    setTests(prev => prev.map(t => t.id === testId ? { ...t, status } : t));
    try {
      const tk = getToken();
      const res = await apiFetch(`/faculty/tests/${testId}`, {
        method: 'PUT',
        headers: (tk ? { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (res?.success) {
        toast.success(`Test status updated to ${status}`);
        // refresh from server to ensure consistency
        await fetchTests();
      } else {
        // revert optimistic update
        setTests(previous);
        toast.error(res?.message || 'Failed to update status');
      }
    } catch (err) {
      setTests(previous);
      console.error('Status update failed', err);
      toast.error('Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchTests();
    fetchBatches();
    // load all topics to start
    fetchTopics();
  }, [fetchExams, fetchTests, fetchBatches, fetchTopics]);



  // Update available question count when subject or topic changes in the create dialog
  useEffect(() => {
    if (newTest.subjectId || newTest.topicId || newTest.subtopicId) {
      fetchAvailableQuestionsCount(newTest.subjectId || undefined, newTest.topicId || undefined, newTest.subtopicId || undefined);
    }
    // Also fetch topics for the subject
    if (newTest.subjectId) fetchTopics(newTest.subjectId);
  }, [newTest.subjectId, newTest.topicId, newTest.subtopicId, fetchTopics, fetchAvailableQuestionsCount]);

  useEffect(() => {
    if (selectedSubject) fetchTopics(selectedSubject);
  }, [selectedSubject, fetchTopics]);

  // Load topics for create dialog when subject selected inside it
  useEffect(() => {
    if (newTest.subjectId) fetchTopics(newTest.subjectId);
  }, [newTest.subjectId, fetchTopics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Test Management</h1>
          <p className="text-muted-foreground">Create and manage your tests</p>
        </div>
        {/* Top-right rounded total badge and mode toggle */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-semibold text-primary">{listMode === 'online' ? (stats.total ?? 0) : offlinePapers.length}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1 hidden sm:block">{listMode === 'online' ? 'Total Tests' : 'Offline Papers'}</span>
          </div>

          {/* Compact mode selector placed by the totals */}
          <div className="flex items-center">
            <Select value={listMode} onValueChange={(v: 'online' | 'offline') => setListMode(v)}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online Tests</SelectItem>
                <SelectItem value="offline">Offline Papers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
      </div>

     

      {/* Subject and Topic Filter Cards */}
      <div className="grid gap-4">
        {/* Subject Filter Cards */}
        <div>
          <div className="flex items-center justify-end gap-2 mb-2">
            <Button variant="secondary" disabled={selectedTestIds.length === 0} onClick={() => {
              // prefill multi clone form subject based on first selected test
              const first = tests.find(t => t.id === selectedTestIds[0]);
              if (first) {
                const totalQ = selectedTestIds.reduce((s, id) => s + (tests.find(t => t.id === id)?.questionCount || 0), 0);
                setMultiCloneForm({ title: `Combined Test - ${new Date().toLocaleDateString()}`, examId: String(first.examId || ''), subjectId: String(first.subjectId), topicId: String(first.topicId || ''), questionCount: totalQ, duration: 45, combine: true, batchId: String(first.batchId || ''), startTime: first.startTime ? toDateTimeLocal(first.startTime) : '', endTime: first.endTime ? toDateTimeLocal(first.endTime) : '' });
              }
              setIsMultiCloneDialogOpen(true);
            }}>
              Create from Selected ({selectedTestIds.length})
            </Button>
          </div>
        {/* Tests List */}
        <div className="space-y-4">
        </div>
        </div>
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-2/3">
                      <Input
                          placeholder="Search by title, subject, topic or notes..."
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        />
              <Select value={statusFilter} onValueChange={(v: 'all' | 'draft' | 'published' | 'unpublished') => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                </SelectContent>
              </Select>

              {/* Test Type Filter */}
              <Select value={testTypeFilter} onValueChange={(v: 'all' | 'combined' | 'child' | 'single') => { setTestTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="combined">Combined Tests</SelectItem>
                  <SelectItem value="child">Child Tests</SelectItem>
                  <SelectItem value="single">Single Tests</SelectItem>
                </SelectContent>
              </Select>

              {/* List Mode: Online Tests / Offline Papers */}
              

              <Select value={sortBy} onValueChange={(v: 'newest' | 'oldest' | 'title') => setSortBy(v)}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v: string) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
              <Button variant="outline" onClick={() => openCreatePaperDialog()}>
                <FileText className="h-4 w-4 mr-2" />
                Create Paper
              </Button>
              
            </div>
          </div>

          {/* List (table) */}
          {listMode === 'online' ? (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={selectedTestIds.length === paginatedTests.length && paginatedTests.length > 0}
                        onCheckedChange={(v) => {
                          if (v) setSelectedTestIds(paginatedTests.map(t => t.id));
                          else setSelectedTestIds([]);
                        }}
                      />
                    </TableHead>
                    <TableHead className="text-left">Test</TableHead>
                    <TableHead className="text-left">Questions</TableHead>
                    <TableHead className="text-left">Marks</TableHead>
                    <TableHead className="text-left">Duration</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-left">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <Checkbox checked={selectedTestIds.includes(test.id)} onCheckedChange={(v) => {
                          if (v) setSelectedTestIds(prev => Array.from(new Set([...prev, test.id])));
                          else setSelectedTestIds(prev => prev.filter(id => id !== test.id));
                        }} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={test.examType === 'NEET' ? 'default' : 'secondary'}>{test.examType}</Badge>
                          <div className="min-w-0">
                            <div className="font-semibold truncate text-foreground">{test.title || `${test.subjectName} ${test.topicName ? `— ${test.topicName}` : ''}`}</div>
                            {Number(test.all_subjects || 0) === 1 ? (
                              <div className="text-sm text-muted-foreground truncate mt-1 max-w-xl">Combined (All Subjects){test.notes ? ` • ${test.notes}` : ''}</div>
                            ) : (
                              <div className="text-sm text-muted-foreground truncate mt-1 max-w-xl">{test.subjectName}{test.topicName ? ` — ${test.topicName}` : ''}{test.subtopicName ? ` • ${test.subtopicName}` : ''}{test.notes ? ` • ${test.notes}` : ''}</div>
                            )}
                            {test.parent_test_id ? (
                              <div className="text-xs text-muted-foreground mt-1">Parent: <button type="button" className="text-primary underline" onClick={() => handleViewParent(String(test.parent_test_id))}>{tests.find(p => String(p.id) === String(test.parent_test_id))?.title || `Test #${test.parent_test_id}`}</button></div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{test.questionCount}</TableCell>
                      <TableCell>{test.totalMarks || ((test.questionCount || 0) * 4)}</TableCell>
                      <TableCell>{test.suggestedDuration} mins</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select value={test.status || 'draft'} onValueChange={v => updateTestStatus(test.id, v as 'draft' | 'published' | 'unpublished')} disabled={statusUpdatingId === test.id}>
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="unpublished">Unpublished</SelectItem>
                            </SelectContent>
                          </Select>
                          {statusUpdatingId === test.id && <Clock className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(test.createdAt || (test as any).createdAtRaw).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewReport(test.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Report</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleEditTest(test)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Button variant="destructive" size="sm" onClick={() => { setTestToDelete(test.id); setIsDeleteDialogOpen(true); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {test.attemptsCount > 0 && (
                                  <Badge variant="outline" className="text-xs">{test.attemptsCount} attempts</Badge>
                                )}
                                {test.parent_test_id ? (
                                  <Badge variant="outline" className="text-xs">Child</Badge>
                                ) : null}

                                {getChildrenFor(test.id).length > 0 && (
                                  <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => openChildrenDialog(test.id)}>{getChildrenFor(test.id).length} children</Badge>
                                )}
                                {test.mark_publish ? (
                                  <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Marks Published</Badge>
                                ) : null}

                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>

                          {/* Publish / Unpublish Marks */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Button variant={test.mark_publish ? 'destructive' : 'ghost'} size="sm" onClick={() => handleTogglePublishForTest(test.id, test.mark_publish)} disabled={publishingMarksId === test.id}>
                                  {publishingMarksId === test.id ? (<Clock className="h-4 w-4 animate-spin" />) : (test.mark_publish ? (<XCircle className="h-4 w-4" />) : (<CheckCircle2 className="h-4 w-4" />))}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{test.mark_publish ? 'Unpublish Marks' : 'Publish Marks'}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>

                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Paper</TableHead>
                    <TableHead className="text-left">Questions</TableHead>
                    <TableHead className="text-left">Marks</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-left">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offlinePapers.map((paper) => (
                    <TableRow key={paper.id}>
                      <TableCell>
                        <div className="font-semibold truncate">{paper.title || `Paper #${paper.id}`}</div>
                        <div className="text-sm text-muted-foreground truncate">{paper.description}</div>
                      </TableCell>
                      <TableCell>{paper.total_questions ?? '-'}</TableCell>
                      <TableCell>{paper.total_marks ?? ((paper.total_questions || 0) * 4)}</TableCell>
                      <TableCell>{paper.status || 'draft'}</TableCell>
                      <TableCell>{paper.created_at ? new Date(paper.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {paper.question_pdf_path ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => {
                                const base = import.meta.env.VITE_API_URL || '';
                                const url = paper.question_pdf_path?.startsWith('http') ? paper.question_pdf_path : `${base}${paper.question_pdf_path}`;
                                window.open(url, '_blank');
                              }}>
                                Open PDF
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                const base = import.meta.env.VITE_API_URL || '';
                                const url = paper.question_pdf_path?.startsWith('http') ? paper.question_pdf_path : `${base}${paper.question_pdf_path}`;
                                downloadFile(url, `paper_${paper.id}_questions.pdf`);
                              }}>
                                Download PDF
                              </Button>
                            </>
                          ) : null}

                          {paper.answer_pdf_path ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => {
                                const base = import.meta.env.VITE_API_URL || '';
                                const url = paper.answer_pdf_path?.startsWith('http') ? paper.answer_pdf_path : `${base}${paper.answer_pdf_path}`;
                                window.open(url, '_blank');
                              }}>
                                Open Answers
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                const base = import.meta.env.VITE_API_URL || '';
                                const url = paper.answer_pdf_path?.startsWith('http') ? paper.answer_pdf_path : `${base}${paper.answer_pdf_path}`;
                                downloadFile(url, `paper_${paper.id}_answers.pdf`);
                              }}>
                                Download Answers
                              </Button>
                            </>
                          ) : null}

                          <Button size="sm" variant="ghost" onClick={async () => {
                            setPreviewLoading(true);
                            try {
                              const tk = getToken();
                              const res = await apiFetch(`/admin/offline-papers/${paper.id}/preview-generate`, { method: 'POST', headers: (tk ? { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), body: JSON.stringify({}) });
                              if (res) {
                                setPreviewData({ selectedQuestions: (res.selectedQuestions || []).map((q: any) => ({ id: String(q.id), text: q.question_text, optionA: q.option_a, optionB: q.option_b, optionC: q.option_c, optionD: q.option_d, marks: q.marks, answer: q.answer })), totalQuestions: res.totalQuestions, totalMarks: res.totalMarks, questionPdfUrl: res.questionPdfUrl, questionDocUrl: res.questionDocUrl });
                                setIsPreviewDialogOpen(true);
                              } else {
                                toast.error('Failed to generate preview');
                              }
                            } catch (err) {
                              console.error('Preview generate error', err);
                              toast.error('Failed to generate preview');
                            } finally {
                              setPreviewLoading(false);
                            }
                          }}>
                            Preview
                          </Button>

                          {/* Edit */}
                          <Button size="sm" variant="ghost" onClick={async () => {
                            setEditingPaper(paper);
                            // Fetch full paper with questions to populate form and allocated count
                            try {
                              const res = await apiFetch(`/admin/offline-papers/${paper.id}`);
                              setEditPaperForm({
                                title: res.paper.title,
                                description: res.paper.description,
                                total_questions: res.paper.total_questions ?? null,
                                total_marks: res.paper.total_marks ?? null,
                                status: res.paper.status,
                                subject_id: res.paper.subject_id ? String(res.paper.subject_id) : '',
                                topic_id: res.paper.topic_id ? String(res.paper.topic_id) : '',
                                subtopic_id: res.paper.subtopic_id ? String(res.paper.subtopic_id) : ''
                              });
                              setAllocatedCount(Array.isArray(res.questions) ? res.questions.length : 0);
                            setEditDialogQuestions(Array.isArray(res.questions) ? res.questions : []);
                              // load subjects if not loaded
                              if (subjectsList.length === 0) {
                                const sres = await apiFetch('/admin/subjects');
                                setSubjectsList(Array.isArray(sres) ? sres : (sres?.subjects || []));
                              }
                              // load topics/subtopics accordingly
                              if (res.paper.subject_id) {
                                const tk = getToken();
                                const tRes = await apiFetch(`/faculty/topics?subjectId=${res.paper.subject_id}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
                                setEditDialogTopics(Array.isArray(tRes.topics) ? tRes.topics.map((t:{ id: number | string; name: string })=>({ id: String(t.id), name: t.name })) : []);
                              } else {
                                setEditDialogTopics([]);
                              }
                              if (res.paper.topic_id) {
                                const tk = getToken();
                                const st = await apiFetch(`/admin/subtopics?topicId=${res.paper.topic_id}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
                                setEditDialogSubtopics(Array.isArray(st.subtopics) ? st.subtopics.map((s:{ id: number | string; name: string })=>({ id: String(s.id), name: s.name })) : []);
                              } else {
                                setEditDialogSubtopics([]);
                              }
                            } catch (err) {
                              console.warn('Failed to load paper details', err);
                              setAllocatedCount(0);
                              setEditPaperForm({ title: paper.title, description: paper.description, total_questions: paper.total_questions ?? null, total_marks: paper.total_marks ?? null, status: paper.status, subject_id: String(paper.subject_id || ''), topic_id: String(paper.topic_id || ''), subtopic_id: String(paper.subtopic_id || '') });
                            }

                            setIsEditPaperDialogOpen(true);
                          }}>
                            Edit
                          </Button>

                          {/* Delete */}
                          <Button size="sm" variant="destructive" onClick={() => { setPaperToDelete(paper.id); setIsPaperDeleteDialogOpen(true); }}>
                            Delete
                          </Button>

                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Edit Offline Paper Dialog */}
          <Dialog open={isEditPaperDialogOpen} onOpenChange={(open) => { setIsEditPaperDialogOpen(open); if (!open) setEditingPaper(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Offline Paper</DialogTitle>
                <DialogDescription>Update title, description, status or totals for this paper.</DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => { e.preventDefault(); if (!editingPaper) return; try { const tk = getToken(); const res = await apiFetch(`/admin/offline-papers/${editingPaper.id}`, { method: 'PUT', headers: (tk ? { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), body: JSON.stringify({ title: editPaperForm.title, description: editPaperForm.description, total_questions: editPaperForm.total_questions, status: editPaperForm.status, subject_id: editPaperForm.subject_id, topic_id: editPaperForm.topic_id, subtopic_id: editPaperForm.subtopic_id }) }); if (res?.success) { toast.success('Paper updated'); await fetchOfflinePapers(); setIsEditPaperDialogOpen(false); setEditingPaper(null); } else { toast.error(res?.message || 'Failed to update paper'); } } catch (err) { console.error('Update paper error', err); toast.error('Failed to update paper'); } }} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={editPaperForm.title || ''} onChange={(e) => setEditPaperForm(prev => ({ ...prev, title: e.target.value }))} />
                  <Label>Description</Label>
                  <Textarea value={editPaperForm.description || ''} onChange={(e) => setEditPaperForm(prev => ({ ...prev, description: e.target.value }))} />
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label>Subject</Label>
                      <Select value={String(editPaperForm.subject_id ?? 'none')} onValueChange={async (v: string) => {
                        // if there are allocated questions, confirm reset
                        if (allocatedCount > 0) {
                          setPendingScopeChange({ subject: v });
                          setIsResetConfirmOpen(true);
                          return;
                        }
                        const newSubject = v === 'none' ? '' : v;
                        setEditPaperForm(prev => ({ ...prev, subject_id: newSubject, topic_id: '', subtopic_id: '' }));
                        if (v && v !== 'none') {
                          const tk = getToken();
                          const res = await apiFetch(`/faculty/topics?subjectId=${v}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
                          setEditDialogTopics(Array.isArray(res.topics) ? res.topics.map((t:{ id: number | string; name: string })=>({ id: String(t.id), name: t.name })) : []);
                          setEditDialogSubtopics([]);
                        } else {
                          setEditDialogTopics([]); setEditDialogSubtopics([]);
                        }
                      }}>
                        <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">(none)</SelectItem>
                          {subjectsList.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Topic</Label>
                      <Select value={String(editPaperForm.topic_id ?? 'none')} onValueChange={async (v: string) => {
                        if (allocatedCount > 0) {
                          setPendingScopeChange({ topic: v });
                          setIsResetConfirmOpen(true);
                          return;
                        }
                        const newTopic = v === 'none' ? '' : v;
                        setEditPaperForm(prev => ({ ...prev, topic_id: newTopic, subtopic_id: '' }));
                        if (v && v !== 'none') {
                          const tk = getToken();
                          const res = await apiFetch(`/admin/subtopics?topicId=${v}`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
                          setEditDialogSubtopics(Array.isArray(res.subtopics) ? res.subtopics.map((s:{ id: number | string; name: string })=>({ id: String(s.id), name: s.name })) : []);
                        } else {
                          setEditDialogSubtopics([]);
                        }
                      }}>
                        <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">(none)</SelectItem>
                          {editDialogTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subtopic</Label>
                      <Select value={String(editPaperForm.subtopic_id ?? 'none')} onValueChange={(v:string) => {
                        if (allocatedCount > 0) {
                          setPendingScopeChange({ subtopic: v });
                          setIsResetConfirmOpen(true);
                          return;
                        }
                        const newSub = v === 'none' ? '' : v;
                        setEditPaperForm(prev => ({ ...prev, subtopic_id: newSub }));
                      }}>
                        <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">(none)</SelectItem>
                          {editDialogSubtopics.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Total Questions</Label>
                      <Input type="number" value={String(editPaperForm.total_questions ?? '')} onChange={(e) => setEditPaperForm(prev => ({ ...prev, total_questions: e.target.value ? Number(e.target.value) : null }))} />
                    </div>

                    {/* Allocated questions (read-only) */}
                    <div>
                      <Label>Allocated Questions ({allocatedCount})</Label>
                      {allocatedCount > 0 ? (
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-2 border rounded bg-card">
                          {editDialogQuestions.map((q) => (
                            <div key={q.question_id || q.id} className="p-2 rounded bg-background border">
                              <div className="text-sm font-medium line-clamp-2 break-words whitespace-pre-wrap">{q.question_text || q.text || q.question_text_short || ('Question ' + (q.question_id || q.id))}</div>
                              <div className="text-xs text-muted-foreground">Marks: {q.marks ?? 4}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No questions allocated.</div>
                      )}
                    </div>
                  </div>
                  <Label>Status</Label>
                  <Select value={editPaperForm.status || 'draft'} onValueChange={(v: string) => setEditPaperForm(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="unpublished">Unpublished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsEditPaperDialogOpen(false); setEditingPaper(null); }}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Reset allocations confirmation */}
          <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Allocations?</AlertDialogTitle>
                <AlertDialogDescription>Changing subject/topic/subtopic will remove existing allocated questions for this paper. Do you want to proceed and reset allocations?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsResetConfirmOpen(false); setPendingScopeChange(null); }}>Cancel</Button>
                <Button variant="destructive" onClick={async () => {
                  if (!editingPaper || !pendingScopeChange) { setIsResetConfirmOpen(false); setPendingScopeChange(null); return; }
                  try {
                    const tk = getToken();
                    const res = await apiFetch(`/admin/offline-papers/${editingPaper.id}/allocations`, { method: 'DELETE', headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
                    if (res?.success) {
                      toast.success('Allocations reset');
                      setAllocatedCount(0);
                      setEditDialogQuestions([]);
                      // apply pending scope changes
                      setEditPaperForm(prev => ({ ...prev, subject_id: pendingScopeChange?.subject ?? prev.subject_id, topic_id: pendingScopeChange?.topic ?? prev.topic_id, subtopic_id: pendingScopeChange?.subtopic ?? prev.subtopic_id, total_questions: 0 }));
                      // reload topics/subtopics accordingly
                      if (pendingScopeChange?.subject) {
                        const tRes = await apiFetch(`/faculty/topics?subjectId=${pendingScopeChange.subject}`);
                        setEditDialogTopics(Array.isArray(tRes.topics) ? tRes.topics.map((t:{ id: number | string; name: string })=>({ id: String(t.id), name: t.name })) : []);
                        setEditDialogSubtopics([]);
                      }
                      if (pendingScopeChange?.topic) {
                        const sRes = await apiFetch(`/admin/subtopics?topicId=${pendingScopeChange.topic}`);
                        setEditDialogSubtopics(Array.isArray(sRes.subtopics) ? sRes.subtopics.map((s:{ id: number | string; name: string })=>({ id: String(s.id), name: s.name })) : []);
                      }
                    } else {
                      toast.error(res?.message || 'Failed to reset allocations');
                    }
                  } catch (err) {
                    console.error('Reset allocations error', err);
                    toast.error('Failed to reset allocations');
                  } finally {
                    setIsResetConfirmOpen(false);
                    setPendingScopeChange(null);
                  }
                }}>Reset & Apply</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Preview Dialog */}
          <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => { setIsPreviewDialogOpen(open); if (!open) setPreviewData(null); }}>
            <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Preview Paper</DialogTitle>
                <DialogDescription>This preview shows a simulated allocation and generated preview files; you can open or download the PDF/DOC.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {previewLoading && <div className="text-muted-foreground">Generating preview...</div>}
                {previewData ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{previewData.totalQuestions ?? 0} Questions</div>
                        <div className="text-sm text-muted-foreground">Total Marks: {previewData.totalMarks ?? 0}</div>
                      </div>
                      <div className="flex gap-2">
                        {previewData.questionPdfUrl ? (<Button onClick={() => window.open(previewData.questionPdfUrl, '_blank')}>Open PDF</Button>) : null}
                        {previewData.questionPdfUrl ? (<Button variant="outline" onClick={() => downloadFile(previewData.questionPdfUrl!, `paper_preview_${editingPaper?.id}_questions.pdf`)}>Download PDF</Button>) : null}
                        {previewData.questionDocUrl ? (<Button onClick={() => window.open(previewData.questionDocUrl, '_blank')}>Open DOC</Button>) : null}
                        {previewData.questionDocUrl ? (<Button variant="outline" onClick={() => downloadFile(previewData.questionDocUrl!, `paper_preview_${editingPaper?.id}_questions.doc`)}>Download DOC</Button>) : null}
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      {(previewData.selectedQuestions || []).map(q => (
                        <div key={q.id} className="p-3 rounded border bg-background">
                          <div className="flex items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <p
                                className="font-medium text-sm sm:text-base leading-relaxed break-words max-w-full overflow-hidden overflow-x-hidden line-clamp-3 sm:line-clamp-none whitespace-pre-wrap"
                                style={{ wordBreak: 'break-word' }}
                              >
                                {q.text}
                              </p>
                            </div>
                            <div className="shrink-0 text-sm text-muted-foreground ml-2">Marks: {q.marks ?? 4}</div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.optionA ? (
                              <div className={`p-2 rounded ${q.answer === 'A' ? 'bg-green-50 border border-green-200' : 'bg-card'}`}>
                                <span className="font-semibold mr-2">A.</span>
                                <span className="whitespace-pre-wrap break-words text-sm">{q.optionA}</span>
                              </div>
                            ) : null}

                            {q.optionB ? (
                              <div className={`p-2 rounded ${q.answer === 'B' ? 'bg-green-50 border border-green-200' : 'bg-card'}`}>
                                <span className="font-semibold mr-2">B.</span>
                                <span className="whitespace-pre-wrap break-words text-sm">{q.optionB}</span>
                              </div>
                            ) : null}

                            {q.optionC ? (
                              <div className={`p-2 rounded ${q.answer === 'C' ? 'bg-green-50 border border-green-200' : 'bg-card'}`}>
                                <span className="font-semibold mr-2">C.</span>
                                <span className="whitespace-pre-wrap break-words text-sm">{q.optionC}</span>
                              </div>
                            ) : null}

                            {q.optionD ? (
                              <div className={`p-2 rounded ${q.answer === 'D' ? 'bg-green-50 border border-green-200' : 'bg-card'}`}>
                                <span className="font-semibold mr-2">D.</span>
                                <span className="whitespace-pre-wrap break-words text-sm">{q.optionD}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm">
                            <span className="font-semibold">Answer:</span>
                            <span className="ml-2 text-green-700">
                              {q.answer ? (`${q.answer} — ${q.answer === 'A' ? q.optionA : q.answer === 'B' ? q.optionB : q.answer === 'C' ? q.optionC : q.answer === 'D' ? q.optionD : ''}`) : 'N/A'}
                            </span>
                          </div>

                          {q.explanation ? (
                            <div className="mt-2 text-xs text-muted-foreground">Explanation: <span className="whitespace-pre-wrap break-words text-sm">{q.explanation}</span></div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">No preview data</div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsPreviewDialogOpen(false); setPreviewData(null); }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Child Tests Dialog */}
          <Dialog open={childrenDialogOpen} onOpenChange={(open) => { setChildrenDialogOpen(open); if (!open) setChildrenDialogParentId(null); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Child Tests {childrenDialogParentId ? `— Parent: ${tests.find(t => String(t.id) === String(childrenDialogParentId))?.title || ('Test #' + childrenDialogParentId)}` : ''}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {childrenDialogParentId && getChildrenFor(childrenDialogParentId).length > 0 ? (
                  getChildrenFor(childrenDialogParentId).map(child => (
                    <div key={child.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium truncate">{child.title || `${child.subjectName} ${child.topicName ? `— ${child.topicName}` : ''}`}</div>
                        <div className="text-xs text-muted-foreground">{child.questionCount} questions • {child.suggestedDuration} mins</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setChildrenDialogOpen(false); handleEditTest(child); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setChildrenDialogOpen(false); handleViewReport(child.id); }}><Eye className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">No child tests found</div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setChildrenDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Offline Paper Confirmation */}
          <AlertDialog open={isPaperDeleteDialogOpen} onOpenChange={setIsPaperDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Offline Paper</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete this offline paper? This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaperDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={async () => {
                  if (!paperToDelete) return;
                  try {
                    setIsDeletingPaper(true);
                    const tk = getToken();
                    const res = await apiFetch(`/admin/offline-papers/${paperToDelete}`, { method: 'DELETE', headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
                    if (res?.success) {
                      toast.success('Paper deleted');
                      await fetchOfflinePapers();
                    } else {
                      toast.error(res?.message || 'Failed to delete paper');
                    }
                  } catch (err) {
                    console.error('Delete paper error', err);
                    toast.error('Failed to delete paper');
                  } finally {
                    setIsDeletingPaper(false);
                    setIsPaperDeleteDialogOpen(false);
                    setPaperToDelete(null);
                  }
                }}>Delete</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-muted-foreground">Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, sortedTests.length)} of {sortedTests.length}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <div className="text-sm">Page {page} / {totalPages}</div>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>

          {/* Edit Test Dialog (single instance) */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetEditForm(); setIsEditDialogOpen(open); }}>
            <DialogContent className="w-full max-w-[calc(100vw-48px)] sm:max-w-7xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Edit Test</DialogTitle>
              </DialogHeader>
              <form onSubmit={async (e) => { e.preventDefault(); await handleUpdateTest(); }} className="space-y-6 py-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Basic Information */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 pb-2 border-b mb-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Basic Information</h3>
                    </div>

                    {/* Notice for combined tests (prominent) */}
                    {editingTest && Number(editingTest.all_subjects || 0) === 1 && (
                      <div className="mb-3">
                        <Card className="border-yellow-200 bg-yellow-50">
                          <CardContent className="p-3">
                            <div className="text-sm text-yellow-800">This is a <strong>combined (All Subjects)</strong> test. Subject, Topic, Subtopic, Number of Questions and related marks cannot be edited here. To modify them, update the child tests individually.</div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Title</Label>
                        <Input value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Test title" className="mt-1.5" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Total Marks</Label>
                        <div className="flex items-center h-10 px-3 py-2 mt-1.5 rounded-md border border-input bg-gradient-to-r from-primary/5 to-primary/10">
                          <Target className="w-4 h-4 mr-2 text-primary" />
                          <span className="font-bold text-lg text-primary">{(editingTest && Number(editingTest.all_subjects || 0) === 1) ? (editingTest.totalMarks || ((editingTest.questionCount || 0) * 4)) : ((editForm.questionCount || 0) * 4)}</span>
                        </div>
                        {editingTest && Number(editingTest.all_subjects || 0) === 1 ? (
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground">Total from child tests</p>
                            <Button size="sm" variant="outline" onClick={async () => {
                              if (!editingTest) return;
                              try {
                                const tk = getToken();
                                const res = await apiFetch(`/faculty/tests/${editingTest.id}/recompute-totals`, { method: 'POST', headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
                                if (res?.success) {
                                  toast.success('Parent totals recomputed');
                                  await fetchTests();
                                  // refresh editing test details
                                  await handleEditTest({ id: String(editingTest.id) } as Test);
                                } else {
                                  toast.error(res?.message || 'Failed to recompute totals');
                                }
                              } catch (err) {
                                console.error('Recompute failed', err);
                                toast.error('Failed to recompute totals');
                              }
                            }}>Recompute totals</Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Auto: {editForm.questionCount} × 4</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-sm font-medium">Duration (minutes)</Label>
                        <Input type="number" min={10} max={180} value={editForm.suggestedDuration} onChange={(e) => { setEditForm({...editForm, suggestedDuration: parseInt(e.target.value) || 0}); setEditFormErrors(prev => { const c = { ...prev }; delete c.suggestedDuration; return c; }); }} className={editFormErrors.suggestedDuration ? 'border-destructive' : ''} />
                        {editFormErrors.suggestedDuration && <p role="alert" className="text-xs text-destructive mt-1">{editFormErrors.suggestedDuration}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Content Selection (hidden for combined tests) */}
                  {!(editingTest && Number(editingTest.all_subjects || 0) === 1) && (
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 pb-2 border-b mb-3">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Content Selection</h3>
                    </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Subject *</Label>
                          <Select value={editForm.subjectId} onValueChange={async (v) => {
                            setEditForm({...editForm, subjectId: v, topicId: '', batchId: ''});
                            setEditFormErrors(prev => { const c = { ...prev }; delete c.subject; return c; });
                            if (v) {
                              await fetchTopics(String(v));
                              await fetchAvailableQuestionsCount(String(v), undefined);
                              const subj = allocatedSubjects.find(s => String(s.id) === String(v));
                              if (subj && subj.examId) await fetchBatchesForExam(subj.examId);
                              else setDialogBatches(batches);
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {editingTest && editingTest.subjectId && !allocatedSubjects.some(s => String(s.id) === String(editingTest.subjectId)) && (
                                <SelectItem key={`current-subj-${editingTest.subjectId}`} value={editingTest.subjectId}>{editingTest.subjectName || 'Current Subject'}</SelectItem>
                              )}
                              {allocatedSubjects.map((subject) => (
                                <SelectItem key={subject.id} value={String(subject.id)}>{subject.subjectName} ({subject.examType})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {editFormErrors.subject && <p role="alert" className="text-xs text-destructive mt-1">{editFormErrors.subject}</p>}
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Topic *</Label>
                          <Select value={editForm.topicId} onValueChange={async (v) => { setEditForm({...editForm, topicId: v, subtopicId: ''}); if (editForm.subjectId) await fetchAvailableQuestionsCount(String(editForm.subjectId), v ? String(v) : undefined, undefined); if (v) { try { const tk = getToken(); const res = await apiFetch(`/admin/subtopics?topicId=${v}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) }); if (res?.success && Array.isArray(res.subtopics)) setEditSubtopics(res.subtopics.map((s: any) => ({ id: String(s.id), name: s.name }))); else setEditSubtopics([]); } catch (err) { console.warn('Failed to fetch edit subtopics', err); setEditSubtopics([]); } } }} disabled={!editForm.subjectId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Topic" />
                            </SelectTrigger>
                            <SelectContent>
                              {editingTest && editingTest.topicId && !getTopicsForSubject(editForm.subjectId).some(t => String(t.id) === String(editingTest.topicId)) && (
                                <SelectItem key={`current-topic-${editingTest.topicId}`} value={editingTest.topicId}>{editingTest.topicName || 'Current Topic'}</SelectItem>
                              )}
                              {getTopicsForSubject(editForm.subjectId).map((topic) => (
                                <SelectItem key={topic.id} value={String(topic.id)}>{topic.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Subtopic</Label>
                          <Select value={editForm.subtopicId ? String(editForm.subtopicId) : 'none'} onValueChange={(v) => setEditForm(prev => ({ ...prev, subtopicId: v === 'none' ? '' : v }))} disabled={!editForm.topicId}>
                            <SelectTrigger>
                              <SelectValue placeholder={editForm.topicId ? 'All Subtopics' : 'Select topic first'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">All Subtopics</SelectItem>
                              {editSubtopics.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="mt-4">
                        <Label className="text-sm font-medium">Number of Questions</Label>
                        <div className="flex items-center mt-1">
                          <Button type="button" size="sm" variant="outline" onClick={() => { setEditForm(prev => ({ ...prev, questionCount: Math.max(1, (prev.questionCount || 1) - 1) })); }} className="h-8 w-8 flex items-center justify-center">-</Button>
                          <Input type="number" min={1} max={availableQuestionsCount || 100} value={editForm.questionCount} onChange={(e) => { setEditForm({...editForm, questionCount: parseInt(e.target.value) || 0}); setEditFormErrors(prev => { const c = { ...prev }; delete c.questionCount; return c; }); }} className={`mx-2 text-center ${editFormErrors.questionCount ? 'border-destructive' : ''}`} style={{width: 80}} aria-label="Number of questions" />
                          <Button type="button" size="sm" variant="outline" onClick={() => { setEditForm(prev => ({ ...prev, questionCount: Math.min((availableQuestionsCount || 100), (prev.questionCount || 0) + 1) })); }} className="h-8 w-8 flex items-center justify-center">+</Button>
                          <Button type="button" size="sm" variant="outline" onClick={handlePreviewFromEdit} className="ml-3">Preview</Button>
                        </div>
                        {editFormErrors.questionCount && <p role="alert" className="text-xs text-destructive mt-1">{editFormErrors.questionCount}</p>}
                        {editForm.subjectId && (
                          <p className="text-xs text-muted-foreground mt-1">{availableQuestionsCount} available</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 pb-2 border-b mb-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Schedule & Batch</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="unpublished">Unpublished</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Batch </Label>
                        <Select value={editForm.batchId} onValueChange={(v) => setEditForm({...editForm, batchId: v})} disabled={loadingBatches}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingBatches ? "Loading batches..." : batches.length > 0 ? "Select Batch " : "No batches available"} />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Always expose the current test's batch as the first option when editing so the selected value is visible immediately */}
                            {editingTest && editingTest.batchId && (
                              <SelectItem key={`current-batch-${editingTest.batchId}`} value={String(editingTest.batchId)}>{editingTest.batchName || 'Current Batch'}</SelectItem>
                            )}
                            {batches
                              .filter(b => !(editingTest && editingTest.batchId && String(b.id) === String(editingTest.batchId)))
                              .map(b => (
                                <SelectItem key={b.id} value={String(b.id)}>{b.name} {b.examType ? `(${b.examType})` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-sm font-medium">Start Time</Label>
                        <Input type="datetime-local" value={editForm.startTime} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="mt-1.5" />
                        {editForm.startTime && <p className="text-xs text-muted-foreground mt-1">{formatReadableDate(editForm.startTime)}</p>}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">End Time</Label>
                        <Input type="datetime-local" value={editForm.endTime} min={editForm.startTime || undefined} onChange={(e) => setEditForm({...editForm, endTime: e.target.value})} className="mt-1.5" />
                        {editForm.endTime && <p className="text-xs text-muted-foreground mt-1">{formatReadableDate(editForm.endTime)}</p>}
                      </div>
                    </div>

                  </div>

                {/* Notes */}
                

                </div>

              <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); resetEditForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={editSubmitting || !isEditFormValid()}>{editSubmitting ? (<><Clock className="w-4 h-4 mr-2 animate-spin"/>Updating...</>) : 'Update Test'}</Button>
                </div>
                {!isEditFormValid() && !editSubmitting && (
                  <p className="text-xs text-muted-foreground">{(editingTest && Number(editingTest.all_subjects || 0) === 1) ? 'Please fill required fields (duration) to enable update.' : 'Please fill required fields (subject, questions, duration) to enable update.'}</p>
                )}
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
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
                    }}
                  />
                </Badge>
              )}
              {selectedTopic && (
                <Badge variant="secondary" className="gap-1">
                  {topics.find(t => t.id === selectedTopic)?.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedTopic('')}
                  />
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
                </Badge>
              )}
              {testTypeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {testTypeFilter === 'combined' ? 'Combined Tests' : testTypeFilter === 'child' ? 'Child Tests' : 'Single Tests'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setTestTypeFilter('all')} />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      

      {sortedTests.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Tests Found</h3>
            <p className="text-muted-foreground">
              No tests match your current filters. Try clearing filters or create a new test.
            </p>
          </CardContent>
        </Card>
      )}



      {/* Create Paper Dialog */}
      <Dialog open={isCreatePaperDialogOpen} onOpenChange={(open) => { if (!open) { if (creatingPaper && createPaperAbortRef.current) { createPaperAbortRef.current.abort(); cleanupCreatedPaper(createdPaperIdRef.current); setCreatingPaper(false); } resetDialog(); } setIsCreatePaperDialogOpen(open); }}>
        <DialogContent className="w-full max-w-[calc(100vw-48px)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Offline Paper</DialogTitle>
            <DialogDescription>Create a paper by selecting exam/subject and number of questions (will allocate randomly).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePaperSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={paperForm.title} onChange={(e) => setPaperForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Paper title" />
              </div>
              <div>
                <Label>Exam</Label>
                <Select value={String(paperForm.examId || 'none')} onValueChange={(v) => { setPaperForm(prev => ({ ...prev, examId: v === 'none' ? '' : v })); if (v && v !== 'none') fetchBatchesForExam(Number(v)); }}>
                  <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select exam</SelectItem>
                    {exams.map(ex => <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject </Label>
                <Select value={String(paperForm.subjectId || 'none')} onValueChange={(v) => setPaperForm(prev => ({ ...prev, subjectId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any Subject</SelectItem>
                    {allocatedSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjectName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Topic</Label>
                <Select value={String(paperForm.topicId || 'none')} onValueChange={(v) => setPaperForm(prev => ({ ...prev, topicId: v === 'none' ? '' : v }))} disabled={!paperForm.subjectId}>
                  <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any Topic</SelectItem>
                    {paperDialogTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subtopic</Label>
                <Select value={String(paperForm.subtopicId || 'none')} onValueChange={(v) => setPaperForm(prev => ({ ...prev, subtopicId: v === 'none' ? '' : v }))} disabled={!paperForm.topicId}>
                  <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any Subtopic</SelectItem>
                    {paperDialogSubtopics.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Batch</Label>
                <Select value={String(paperForm.batchId || 'none')} onValueChange={(v) => setPaperForm(prev => ({ ...prev, batchId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="w-full h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No batch</SelectItem>
                    {dialogBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name || (b as any).batch_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number of Questions</Label>
                <Input
                  type="number"
                  min={1}
                  max={paperAvailableQuestions !== null && paperAvailableQuestions >= 1 ? paperAvailableQuestions : undefined}
                  value={String(paperForm.numQuestions)}
                  onChange={(e) => {
                    let v = Number(e.target.value);
                    if (isNaN(v)) v = 1;
                    if (paperAvailableQuestions !== null && paperAvailableQuestions >= 1) {
                      v = Math.max(1, Math.min(v, paperAvailableQuestions));
                    } else {
                      v = Math.max(1, v);
                    }
                    setPaperForm(prev => ({ ...prev, numQuestions: v }));
                  }}
                />
                {paperAvailableQuestions !== null && (
                  <p className={`text-sm mt-1 ${paperAvailableQuestions === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Available questions{paperForm.subtopicId ? ' (subtopic)' : paperForm.topicId ? ' (topic)' : paperForm.subjectId ? ' (subject)' : ''}: {paperAvailableQuestions} {paperAvailableQuestions === 0 ? '— no questions available for selected scope' : ''}
                  </p>
                )}

                <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                  <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={handlePreviewPaperQuestions} disabled={loadingPreview || (paperAvailableQuestions !== null && paperAvailableQuestions === 0)}>Preview</Button>
                  <div className="rounded-md bg-orange-50 text-orange-700 px-3 py-1 text-sm font-semibold ml-0 sm:ml-2">Total Marks: {Number(paperForm.numQuestions || 0) * 4}</div>
                </div>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={String(paperForm.durationMinutes)} onChange={(e) => setPaperForm(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setIsCreatePaperDialogOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={creatingPaper || (paperAvailableQuestions !== null && paperAvailableQuestions === 0) || Number(paperForm.numQuestions) < 1 || (paperAvailableQuestions !== null && Number(paperForm.numQuestions) > paperAvailableQuestions)}
              >
                {creatingPaper ? 'Creating...' : 'Create Paper'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>Fill in the test details below</DialogDescription>
          </DialogHeader>

          <form onSubmit={async (e) => { e.preventDefault(); await handleCreateTest(); }} className="space-y-6">
            {/* Section 1: Basic Information */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 pb-2 border-b mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Basic Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Test Title</Label>
                    <Input
                      id="test-title"
                      placeholder="e.g., Physics Mock - Chapter 1"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave blank to use subject name as title</p>
                  </div>

                  <div className=" gap-4">
                   
                    <div>
                      <Label className="text-sm font-medium">Batch</Label>
                      <Select value={dialogBatch ? String(dialogBatch) : ""} onValueChange={(v) => setDialogBatch(v ? Number(v) : null)} disabled={batches.length === 0}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={batches.length > 0 ? "Select batch" : "No batches"} />
                        </SelectTrigger>
                        <SelectContent>
                          {dialogBatches.map(b => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Content Selection */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 pb-2 border-b mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Content Selection</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Subject *</Label>
                  <Select value={dialogSubject ? String(dialogSubject) : ""} onValueChange={(v) => { setDialogSubject(v ? Number(v) : null); setFormErrors(prev => { const c = { ...prev }; delete c.subject; return c; }); }}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {dialogSubjects.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.subject && <p role="alert" className="text-xs text-destructive mt-1">{formErrors.subject}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">Topics</Label>
                  <Select value={dialogTopic ? String(dialogTopic) : "none"} onValueChange={(v) => setDialogTopic(v === "none" ? null : Number(v))} disabled={!dialogSubject}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={dialogSubject ? "All topics" : "Select subject first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Topics</SelectItem>
                      {dialogTopics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subtopics</Label>
                  <Select value={dialogSubtopic ? String(dialogSubtopic) : "none"} onValueChange={(v) => setDialogSubtopic(v === "none" ? null : Number(v))} disabled={!dialogTopic}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={dialogTopic ? "All Subtopics" : "Select topic first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Subtopics</SelectItem>
                      {dialogSubtopics.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Test Configuration */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 pb-2 border-b mb-3">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Test Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Duration (minutes)</Label>
                  <Input 
                    type="number" 
                    min={1}
                    value={formData.duration} 
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) || 60 }))}
                    className="mt-1.5"
                    placeholder="60"
                    aria-label="Duration in minutes"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Number of Questions *</Label>
                  <Input 
                    type="number" 
                    min={1}
                    max={availableQuestionsCount || 100}
                    value={formData.numQuestions} 
                    onChange={(e) => { setFormErrors(prev => { const c = { ...prev }; delete c.numQuestions; return c; }); setFormData(prev => ({ ...prev, numQuestions: Number(e.target.value) || 0 })); }} 
                    disabled={!dialogSubject}
                    placeholder={dialogSubject ? "10" : "Select subject first"}
                    className={`mt-1.5 ${formErrors.numQuestions ? 'border-destructive' : ''}`}
                    aria-invalid={!!formErrors.numQuestions}
                    aria-describedby={formErrors.numQuestions ? 'numQuestions-error' : undefined}
                  />
                  {dialogSubject && (
                    <p className="text-xs text-muted-foreground mt-1">{availableQuestionsCount} available</p>
                  )}
                  {formErrors.numQuestions && <p id="numQuestions-error" role="alert" className="text-xs text-destructive mt-1">{formErrors.numQuestions}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Marks</Label>
                  <div className="flex items-center h-10 px-3 py-2 mt-1.5 rounded-md border border-input bg-gradient-to-r from-primary/5 to-primary/10">
                    <Target className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-bold text-lg text-primary">{calculateTotalMarks()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Auto: {formData.numQuestions} × 4</p>
                </div>
              </div>

              {dialogSubject && formData.numQuestions > availableQuestionsCount && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-3">
                  <p className="text-xs text-destructive font-medium">⚠️ Cannot allocate {formData.numQuestions} questions. Only {availableQuestionsCount} available.</p>
                </div>
              )}
            </div>

            {/* Section 4: Schedule */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Test Schedule</h3>
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
                  {formData.startTime && <p className="text-xs text-muted-foreground mt-1">{formatReadableDate(formData.startTime)}</p>}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    When test becomes available to students
                  </p>
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
                  {formData.endTime && <p className="text-xs text-muted-foreground mt-1">{formatReadableDate(formData.endTime)}</p>}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    When test closes and becomes unavailable
                  </p>
                </div>
              </div>
              
            </div>

            {/* Section 5: Question Preview */}
            {dialogSubject && availableQuestionsCount > 0 && (
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
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-400">
                            {availableQuestionsCount} Questions Available
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-500">
                            {dialogTopic ? `From topic: ${dialogTopics.find(t => t.id === String(dialogTopic))?.name}` : `From subject: ${dialogSubjects.find(s => s.id === Number(dialogSubject))?.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Will select:</span>
                          <span className="font-bold text-blue-900 dark:text-blue-400">{formData.numQuestions} questions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Total marks:</span>
                          <span className="font-bold text-blue-900 dark:text-blue-400">{calculateTotalMarks()}</span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700/80 dark:text-blue-500/80 flex items-center gap-1.5">
                        <span className="text-base">✨</span>
                        Questions will be randomly selected from the pool
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="default"
                      variant="outline"
                      onClick={async () => {
                        // Reuse preview logic but for dialog selections
                        if (!dialogSubject) { toast.error('Select subject first'); return; }
                        setLoadingPreview(true);
                        try {
                          let url = '/faculty/available-questions?';
                          if (dialogSubtopic) url += `subtopicId=${dialogSubtopic}`;
                          else if (dialogTopic) url += `topicId=${dialogTopic}`;
                          else if (dialogSubject) url += `subjectId=${dialogSubject}`;
                          const params = { subjectId: String(dialogSubject || ''), topicId: String(dialogTopic || ''), subtopicId: String(dialogSubtopic || ''), count: Number(formData.numQuestions || 0), source: 'dialog' };
                          if (isSamePreview(previewParams, params) && previewQuestions.length > 0) {
                            setIsPreviewOpen(true);
                            setLoadingPreview(false);
                            return;
                          }

                          const tk = getToken(); const res = await apiFetch(buildPreviewUrl(params), { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
                          if (res?.success && Array.isArray(res.questions)) {
                            const shuffled = [...res.questions].sort(() => Math.random() - 0.5);
                            const selected = shuffled.slice(0, formData.numQuestions).map((q: any) => ({ ...q, id: String(q.id) }));
                            try {
                              const detailed = await Promise.all(selected.map(async (sq: any) => {
                                try {
                                  const tk3 = getToken();
                                  const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk3 ? { Authorization: `Bearer ${tk3}` } : {}) });
                                  return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id) }) : sq;
                                } catch (err) {
                                  console.warn('Failed to fetch question detail', sq.id, err);
                                  return sq;
                                }
                              }));
                              setPreviewQuestions(detailed);
                            } catch (err) {
                              console.warn('Failed to fetch detailed preview questions', err);
                              setPreviewQuestions(selected);
                            }
                            setPreviewParams(params);
                            setExpandedPreview(new Set());
                            setIsPreviewOpen(true);
                          } else {
                            toast.error('No questions available');
                          }
                        } catch (err) {
                          console.error('Preview failed', err);
                          toast.error('Failed to load preview');
                        } finally {
                          setLoadingPreview(false);
                        }
                      }}
                      disabled={loadingPreview || formData.numQuestions <= 0 || formData.numQuestions > availableQuestionsCount}
                      className="bg-white dark:bg-blue-900 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-800 shrink-0"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {loadingPreview ? 'Loading...' : 'Preview Questions'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background py-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={(e) => { e?.preventDefault(); e?.stopPropagation(); if (isCreateFormDirty() && !window.confirm('Discard changes?')) return; setIsCreateDialogOpen(false); resetDialog(); }}
                size="lg"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || !dialogSubject || formData.numQuestions <= 0 || formData.numQuestions > availableQuestionsCount}
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

      {/* Clone Test Dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={(open) => { if (!open) resetCloneForm(); setIsCloneDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Test from Previous Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => { e.preventDefault(); await handleCloneSubmit(); }} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={cloneForm.title} onChange={(e) => setCloneForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={String(cloneForm.subjectId)} onValueChange={(v) => { setCloneForm(prev => ({ ...prev, subjectId: v })); fetchTopics(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {allocatedSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjectName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic</Label>
                <Select value={String(cloneForm.topicId)} onValueChange={(v) => setCloneForm(prev => ({ ...prev, topicId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Question Count</Label>
                <Input type="number" value={cloneForm.questionCount} onChange={(e) => setCloneForm(prev => ({ ...prev, questionCount: parseInt(e.target.value || '0') }))} />
              </div>
              <div>
                <Label>Duration (mins)</Label>
                <Input type="number" value={cloneForm.duration} onChange={(e) => setCloneForm(prev => ({ ...prev, duration: parseInt(e.target.value || '0') }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setIsCloneDialogOpen(false); resetCloneForm(); }}>Cancel</Button>
              <Button type="submit" disabled={cloneSubmitting}>{cloneSubmitting ? 'Creating...' : 'Create Test'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Multi-Select Clone Dialog */}
      <Dialog open={isMultiCloneDialogOpen} onOpenChange={(open) => { if (!open) { setSelectedTestIds([]); setIsMultiCloneDialogOpen(false); } else setIsMultiCloneDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Test from Selected Tests</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => { e.preventDefault();
            // submit selectedTestIds and multiCloneForm
            setMultiCloneSubmitting(true);
            try {
              const body = {
                sourceTestIds: selectedTestIds,
                title: multiCloneForm.title.trim() || undefined,
                combine: Boolean(multiCloneForm.combine),
                examId: multiCloneForm.combine ? (multiCloneForm.examId || undefined) : undefined,
                subjectId: multiCloneForm.combine ? undefined : (multiCloneForm.subjectId || undefined),
                topicId: multiCloneForm.combine ? undefined : (multiCloneForm.topicId || undefined),
                duration: multiCloneForm.duration || undefined,
                questionCount: multiCloneForm.combine && previewAggregatedPool.length > 0 ? Math.min(multiCloneForm.questionCount || 0, previewAggregatedPool.length) : (multiCloneForm.questionCount || undefined),
                deduplicate: multiCloneForm.combine ? true : undefined,
                batchId: multiCloneForm.batchId || undefined,
                startTime: multiCloneForm.startTime || undefined,
                endTime: multiCloneForm.endTime || undefined
              };
              const tk = getToken();
              const res = await apiFetch('/faculty/tests/clone-from', { method: 'POST', headers: (tk ? { Authorization: `Bearer ${tk}` } : {}), body: JSON.stringify(body) });
              if (res?.success && res.testId) {
                const markMsg = res.totalMarks !== undefined ? ` — Total Marks: ${res.totalMarks}` : '';
                toast.success(`Combined test created${markMsg}`);
                setIsMultiCloneDialogOpen(false);
                setSelectedTestIds([]);
                await fetchTests();
                await handleEditTest({ id: String(res.testId) } as Test);
              } else {
                toast.error(res?.message || 'Failed to create combined test');
              }
            } catch (err) {
              console.error('Multi-clone error', err);
              toast.error('Failed to create combined test');
            } finally {
              setMultiCloneSubmitting(false);
            }
          }} className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
            <div>Selected Tests: {selectedTestIds.length}</div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={selectedTestIds.length === 0} onClick={async () => {
                // Preview selected tests
                setLoadingPreview(true);
                try {
                  const agg: QuestionItem[] = [];
                  const meta: Array<{ id: string; title?: string; questionCount: number; marksTotal: number }> = [];
                  for (const id of selectedTestIds) {
                    const test = tests.find(t => t.id === id);
                    if (!test) continue;
                    try {
                      const tk = getToken();
                      const res = await apiFetch(`/faculty/tests/${id}/questions`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
                      const qs = Array.isArray(res?.questions) ? res.questions : [];
                      const marksTotal = qs.reduce((s: number, q: any) => s + (q.marks || 4), 0);
                      meta.push({ id, title: test.title, questionCount: qs.length, marksTotal });
                      const mapped = (qs as any[]).map(q => ({ ...q, id: String(q.id), sourceTestTitle: test.title, sourceTestId: String(test.id) }));
                      agg.push(...mapped as any);
                    } catch (err) {
                      console.warn('Failed to fetch questions for test', id, err);
                    }
                  }
                  setPreviewSourceTests(meta);
                  // deduplicate questions by id across selected tests
                  const uniqueMap = new Map<string, any>();
                  for (const q of agg) {
                    const key = String(q.id);
                    if (!uniqueMap.has(key)) uniqueMap.set(key, q);
                  }
                  const unique = Array.from(uniqueMap.values());

                  // store full unique pool for reshuffle
                  setPreviewAggregatedPool(unique as QuestionItem[]);
                  // report how many duplicates were removed across selected tests
                  setPreviewDuplicateCount(Math.max(0, agg.length - unique.length));

                  // decide how many to use based on requested questionCount
                  const requested = Number(multiCloneForm.questionCount || 0);
                  const useCount = requested > 0 ? Math.min(requested, unique.length) : unique.length;
                  if (requested > unique.length) {
                    toast.info(`Requested ${requested} questions but only ${unique.length} unique questions are available. Using ${unique.length}.`);
                  }

                  // shuffle and pick the slice to preview
                  const shuffledUnique = [...unique].sort(() => Math.random() - 0.5);
                  const chosen = shuffledUnique.slice(0, useCount);

                  // attempt to fetch detailed question objects for a richer preview (options, images, explanation)
                  try {
                    const detailed = await Promise.all((chosen as any[]).map(async (sq: any) => {
                      try {
                        const tk = getToken();
                        const r = await apiFetch(`/admin/questions/${sq.id}`, { headers: (tk ? { Authorization: `Bearer ${tk}` } : {}) });
                        return (r?.success && r.question) ? ({ ...r.question, id: String(r.question.id), sourceTestTitle: sq.sourceTestTitle, sourceTestId: sq.sourceTestId }) : sq;
                      } catch (err) {
                        return sq;
                      }
                    }));
                    setPreviewQuestions(detailed as QuestionItem[]);
                  } catch (err) {
                    setPreviewQuestions(chosen as QuestionItem[]);
                  }

                  // store params so shuffle knows to use the aggregated pool
                  setPreviewParams({ source: 'multi', count: useCount });
                  setExpandedPreview(new Set());
                  setIsPreviewOpen(true);
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to preview selected tests');
                } finally { setLoadingPreview(false); }
              }}>Preview Selected</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={multiCloneForm.title} onChange={(e) => setMultiCloneForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>

              {multiCloneForm.combine && (
                <div>
                  <Label>Exam</Label>
                  <Select value={String(multiCloneForm.examId || '')} onValueChange={(v) => setMultiCloneForm(prev => ({ ...prev, examId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map(ex => <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="flex items-center gap-2"><input className="inline-block" type="checkbox" checked={multiCloneForm.combine} onChange={(e) => setMultiCloneForm(prev => ({ ...prev, combine: e.target.checked }))} /> <span>Combine into parent test (covers all subjects)</span></Label>
              </div>

              {/* Quick selected-tests summary */}
              {selectedTestIds.length > 0 && (
                <div className="col-span-1 sm:col-span-2">
                  <div className="rounded-md border p-3 bg-muted-foreground/5 text-sm">
                    <div className="font-medium mb-2">Selected Tests Summary</div>
                    <div className="space-y-1">{selectedTestIds.map(id => { const t = tests.find(x => x.id === id); return t ? (<div key={id} className="flex items-center justify-between text-xs"><div className="truncate pr-2">{t.title}</div><div className="flex items-center gap-3 text-muted-foreground"><div>{t.questionCount} q</div><div>{(t.questionCount * 4)} marks</div></div></div>) : null })}</div>
                    <div className="mt-2 text-xs text-muted-foreground">Total (simple aggregate): {selectedTestIds.reduce((s, id) => s + (tests.find(t => t.id === id)?.questionCount || 0), 0)} questions — {selectedTestIds.reduce((s, id) => s + ((tests.find(t => t.id === id)?.questionCount || 0) * 4), 0)} marks</div>
                    {previewAggregatedPool.length > 0 && (
                      <div className="mt-2 text-xs">
                        <div className="text-muted-foreground">Available unique questions: <strong>{previewAggregatedPool.length}</strong></div>
                        <div className="text-muted-foreground">Using for combined: <strong>{previewQuestions.length}</strong> — <strong>{previewQuestions.reduce((s, q) => s + (q.marks || 4), 0)}</strong> marks</div>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">Note: &#8220;Preview Selected&#8221; computes unique questions and limits the preview to the requested question count for the combined test.</div>

                    {/* Highlighted preview total marks */}
                    {previewQuestions.length > 0 && (
                      <div className="mt-3 p-3 rounded-md border bg-muted-foreground/5 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">Preview Total Marks</div>
                        <div className="text-2xl font-bold text-foreground">{previewQuestions.reduce((s, q) => s + (q.marks || 4), 0)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!multiCloneForm.combine && (
                <div>
                  <Label>Subject</Label>
                  <Select value={String(multiCloneForm.subjectId)} onValueChange={(v) => { setMultiCloneForm(prev => ({ ...prev, subjectId: v })); fetchTopics(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {allocatedSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.subjectName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!multiCloneForm.combine && (
                <div>
                  <Label>Topic</Label>
                  <Select value={String(multiCloneForm.topicId)} onValueChange={(v) => setMultiCloneForm(prev => ({ ...prev, topicId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Question Count</Label>
                <Input type="number" value={multiCloneForm.questionCount} onChange={(e) => {
                    let v = parseInt(e.target.value || '0');
                    if (multiCloneForm.combine && previewAggregatedPool.length > 0) {
                      v = Math.max(0, Math.min(v, previewAggregatedPool.length));
                    } else {
                      v = Math.max(0, v);
                    }
                    setMultiCloneForm(prev => ({ ...prev, questionCount: v }));
                  }} />
                {/* Info line: available unique and computed total marks for the effective count */}
                {multiCloneForm.combine && previewAggregatedPool.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Using <strong>{Math.min(multiCloneForm.questionCount || 0, previewAggregatedPool.length)}</strong> of <strong>{previewAggregatedPool.length}</strong> unique questions — Total Marks: <strong>{previewAggregatedPool.slice(0, Math.min(multiCloneForm.questionCount || 0, previewAggregatedPool.length)).reduce((s, q) => s + (q.marks || 4), 0)}</strong>
                  </div>
                )}
              </div>

              <div>
                <Label>Duration (mins)</Label>
                <Input type="number" value={multiCloneForm.duration} onChange={(e) => setMultiCloneForm(prev => ({ ...prev, duration: parseInt(e.target.value || '0') }))} />
              </div>

              {/* When pool changes ensure questionCount doesn't exceed available unique */}
              {multiCloneForm.combine && previewAggregatedPool.length > 0 && (
                <div className="col-span-1 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">Note: you can use up to <strong>{previewAggregatedPool.length}</strong> unique questions for this combined test.</div>
                </div>
              )}

              <div>
                <Label>Batch</Label>
                <Select value={String(multiCloneForm.batchId)} onValueChange={(v) => setMultiCloneForm(prev => ({ ...prev, batchId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {dialogBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name || (b as any).batch_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Time</Label>
                <Input type="datetime-local" value={multiCloneForm.startTime} onChange={(e) => setMultiCloneForm(prev => ({ ...prev, startTime: e.target.value }))} />
              </div>

              <div>
                <Label>End Time</Label>
                <Input type="datetime-local" value={multiCloneForm.endTime} onChange={(e) => setMultiCloneForm(prev => ({ ...prev, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setIsMultiCloneDialogOpen(false); setSelectedTestIds([]); }}>Cancel</Button>
              <Button type="submit" disabled={multiCloneSubmitting || selectedTestIds.length === 0}>{multiCloneSubmitting ? (multiCloneForm.combine ? 'Creating combined...' : 'Creating...') : (multiCloneForm.combine ? 'Create Combined Test' : 'Create Test')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="flex items-center justify-between">
            <div>
              <DialogTitle>Question Preview - {previewQuestions.length} Questions</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShufflePreview} disabled={loadingPreview || !previewParams}>Shuffle</Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {previewQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions to preview
              </div>
            ) : (
              <>
                {/* Highlighted preview marks */}
                <div className={`${previewParams?.source === 'create-paper' ? 'rounded-md border p-3 bg-orange-50 flex items-center justify-between' : 'rounded-md border p-3 bg-muted-foreground/5 flex items-center justify-between'}`}>
                  <div className={`${previewParams?.source === 'create-paper' ? 'text-sm text-orange-700' : 'text-sm text-muted-foreground'}`}>Preview Total Questions</div>
                  <div className={`${previewParams?.source === 'create-paper' ? 'text-2xl font-bold text-orange-700' : 'text-2xl font-bold text-foreground'}`}>{previewQuestions.length} q</div>
                  <div className={`${previewParams?.source === 'create-paper' ? 'text-2xl font-bold text-orange-700' : 'text-2xl font-bold text-foreground'}`}>{previewQuestions.reduce((s, q) => s + (q.marks || 4), 0)} marks</div>
                </div>

                {/* If preview is from multi-selected tests, show per-test info */}
                {previewSourceTests.length > 0 && (
                  <div className="rounded-md border p-3 bg-muted-foreground/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Selected Tests ({previewSourceTests.length})</div>
                      <div className="text-sm text-muted-foreground">Total: {previewQuestions.length} q — {previewQuestions.reduce((s, q) => s + (q.marks || 4), 0)} marks</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {previewSourceTests.map(t => (
                        <div key={t.id} className="flex items-center justify-between">
                          <div className="truncate pr-2">{t.title}</div>
                          <div className="flex items-center gap-3 text-muted-foreground text-xs"><div>{t.questionCount} q</div><div>{t.marksTotal} marks</div></div>
                        </div>
                      ))}
                    </div>
                    {previewDuplicateCount > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">Duplicates removed: <strong>{previewDuplicateCount}</strong></div>
                    )}
                  </div>
                )}

                <div className={`${previewParams?.source === 'create-paper' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'} rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <div className={`${previewParams?.source === 'create-paper' ? 'p-2 bg-orange-100 rounded-lg' : 'p-2 bg-blue-100 rounded-lg'}`}>
                      <FileQuestion className={`h-5 w-5 ${previewParams?.source === 'create-paper' ? 'text-orange-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`${previewParams?.source === 'create-paper' ? 'font-semibold text-orange-900 mb-1' : 'font-semibold text-blue-900 mb-1'}`}>
                        {previewQuestions.length} questions will be randomly allocated
                      </h4>
                      <p className={`${previewParams?.source === 'create-paper' ? 'text-sm text-orange-700' : 'text-sm text-blue-700'}`}>
                        Total Marks: {previewQuestions.reduce((sum, q) => sum + (q.marks || 4), 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {previewQuestions.map((question, index) => (
                    <Card key={question.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="md:flex md:items-start md:gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 mb-3 md:mb-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 w-full">
                                  <p
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePreviewExpand(question.id); }}
                                    onClick={() => togglePreviewExpand(question.id)}
                                    aria-expanded={expandedPreview.has(question.id)}
                                    aria-controls={`preview-options-${question.id}`}
                                    className={`block w-full text-sm sm:text-base leading-relaxed font-medium mb-2 min-w-0 max-w-full whitespace-normal overflow-hidden overflow-x-hidden pr-12 sm:pr-3 ${expandedPreview.has(question.id) ? '' : 'line-clamp-1'} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded break-all sm:break-words`}
                                  >
                                    {question.text}
                                  </p>

                                  <button
                                    type="button"
                                    aria-label={expandedPreview.has(question.id) ? 'Collapse' : 'Expand'}
                                    onClick={() => togglePreviewExpand(question.id)}
                                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 ml-3 shrink-0"
                                  >
                                    {expandedPreview.has(question.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    <span className="ml-1">{expandedPreview.has(question.id) ? 'Less' : 'More'}</span>
                                  </button>
                                </div>

                                {/* Options */}
                                <div id={`preview-options-${question.id}`} aria-hidden={!expandedPreview.has(question.id)} className={`grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-hidden transition-all duration-200 ${expandedPreview.has(question.id) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`} >
                                  {question.optionA && (
                                    <div className="p-2 border rounded-md">
                                      <div className="text-xs font-semibold mb-1">A</div>
                                      <div className="text-sm break-words">{question.optionA}</div>
                                      {question.optionAImage && (
                                        <ImageWithFallback src={question.optionAImage} alt="Option A" className="max-w-full sm:max-w-xs rounded mt-2" clickToZoom={true} />
                                      )}
                                    </div>
                                  )}
                                  {question.optionB && (
                                    <div className="p-2 border rounded-md">
                                      <div className="text-xs font-semibold mb-1">B</div>
                                      <div className="text-sm break-words">{question.optionB}</div>
                                      {question.optionBImage && (
                                        <ImageWithFallback src={question.optionBImage} alt="Option B" className="max-w-full sm:max-w-xs rounded mt-2" clickToZoom={true} />
                                      )}
                                    </div>
                                  )}
                                  {question.optionC && (
                                    <div className="p-2 border rounded-md">
                                      <div className="text-xs font-semibold mb-1">C</div>
                                      <div className="text-sm break-words">{question.optionC}</div>
                                      {question.optionCImage && (
                                        <ImageWithFallback src={question.optionCImage} alt="Option C" className="max-w-full sm:max-w-xs rounded mt-2" clickToZoom={true} />
                                      )}
                                    </div>
                                  )}
                                      {question.optionD && (
                                    <div className="p-2 border rounded-md">
                                      <div className="text-xs font-semibold mb-1">D</div>
                                      <div className="text-sm break-words">{question.optionD}</div>
                                      {question.optionDImage && (
                                        <ImageWithFallback src={question.optionDImage} alt="Option D" className="max-w-xs rounded mt-2" clickToZoom={true} />
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Question image (only visible when expanded) */}
                                {expandedPreview.has(question.id) && question.questionImage && (
                                  <div className="mt-3">
                                    <ImageWithFallback src={question.questionImage} alt="Question image" className="w-full max-h-48 object-contain rounded-md" clickToZoom={true} maxHeight="192" />
                                  </div>
                                )}

                                {/* Explanation (only when expanded) */}
                                {expandedPreview.has(question.id) && question.explanation && (
                                  <div className="mt-2 text-sm text-muted-foreground"><strong>Explanation:</strong> {question.explanation}</div>
                                )}

                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs mt-3 items-center">
                              {question.sourceTestTitle && (
                                <Badge variant="outline">Test: {question.sourceTestTitle}</Badge>
                              )}
                              {question.subjectName && (
                                <Badge variant="outline">{question.subjectName}</Badge>
                              )}
                              {question.topicName && (
                                <Badge variant="secondary">{question.topicName}</Badge>
                              )}
                              <Badge className="bg-green-100 text-green-700 border-green-300">
                                {question.marks || 4} marks
                              </Badge>
                              {expandedPreview.has(question.id) && question.answer && (
                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">Answer: {question.answer}</Badge>
                              )}
                            </div>

                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Questions will be randomly shuffled for each student during the test</span>
                  </p>
                </div>

                {/* Image zoom dialog used by ImageWithFallback */}
                <Dialog open={isImageZoomOpen} onOpenChange={(open) => { if (!open) setZoomImageUrl(null); setIsImageZoomOpen(open); }}>
                  <DialogContent className="max-w-3xl max-h-[90vh]">
                    <div className="w-full h-full flex items-center justify-center">
                      {zoomImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={zoomImageUrl} alt="Zoom" className="w-full h-auto object-contain" />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {/* Edit-specific preview controls */}
            {isPreviewFromEdit && editingTest && (
              <div className="p-3 border-t flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewDesiredCount(prev => Math.max(1, prev - 1))}>-</Button>
                  <div className="text-sm">Desired Questions: <span className="font-semibold ml-2">{previewDesiredCount}</span></div>
                  <Button size="sm" variant="ghost" onClick={() => setPreviewDesiredCount(prev => Math.min(availableQuestionsCount || 100, prev + 1))}>+</Button>
                  <div className="text-sm text-muted-foreground ml-4">Total Marks: <span className="font-semibold ml-1">{(previewDesiredCount || 0) * 4}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => {
                    // apply desired count locally to edit form (no server call)
                    setEditForm(prev => ({ ...prev, questionCount: previewDesiredCount }));
                    toast.success('Desired question count applied to form. Click Update to save changes.');
                    setIsPreviewOpen(false);
                    setIsPreviewFromEdit(false);
                  }}>Apply to Form</Button>
                  <Button onClick={async () => {
                    // attempt immediate allocation for increases
                    try {
                      if (!editingTest) return;
                      const prevCount = Number(editingTest.questionCount) || 0;
                      const desired = Number(previewDesiredCount) || 0;
                      const delta = desired - prevCount;
                      if (delta <= 0) {
                        toast.error('Allocation only available for increasing questions. Use Update to decrease.');
                        return;
                      }
                      // do not allocate more than available
                      const allow = Number(availableQuestionsCount) || 0;
                      const effectiveDelta = Math.min(delta, allow);
                      if (effectiveDelta <= 0) {
                        toast.error(`No available questions to allocate (available: ${allow})`);
                        return;
                      }
                      const q = editForm.topicId ? `?topicId=${editForm.topicId}` : editForm.subjectId ? `?subjectId=${editForm.subjectId}` : '';
                      const tk = getToken();
                      const res = await apiFetch(`/faculty/tests/${editingTest.id}/allocate${q}`, { method: 'POST', headers: (tk ? { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }), body: JSON.stringify({ numQuestions: effectiveDelta }) });
                      if (res?.success) {
                        const added = res.addedCount || effectiveDelta;
                        toast.success(`Allocated ${added} questions to test`);
                        // update local form & editingTest to reflect allocation
                        setEditForm(prev => ({ ...prev, questionCount: (Number(prev.questionCount) || 0) + added }));
                        setEditingTest(prev => prev ? ({ ...prev, questionCount: (Number(prev.questionCount) || 0) + added }) : prev);
                        await fetchTests();
                          if (editForm.subjectId) await fetchAvailableQuestionsCount(String(editForm.subjectId), editForm.topicId ? String(editForm.topicId) : undefined);
                        setIsPreviewOpen(false);
                        setIsPreviewFromEdit(false);
                      } else {
                        toast.error(res?.message || 'Allocation failed');
                      }
                    } catch (err) {
                      console.error('Allocation failed', err);
                      toast.error('Allocation failed');
                    }
                  }}>Allocate Now</Button>
                  <Button variant="ghost" onClick={() => { setIsPreviewOpen(false); setIsPreviewFromEdit(false); }}>Close</Button>
                </div>
              </div>
            )}
            {!isPreviewFromEdit && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close Preview
                </Button>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>

      

      {/* Test Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Test Report - {reportData?.test.title || reportData?.test.topicName}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSendEmails} disabled={Boolean(sendingEmails || !reportData)}>
                  {sendingEmails ? (<><Clock className="w-4 h-4 mr-2 animate-spin"/>Sending...</>) : (<><Mail className="w-4 h-4 mr-2"/>Send Emails</>)}
                </Button>
                <Button variant={reportData?.test?.mark_publish ? 'destructive' : 'secondary'} size="sm" onClick={handlePublishMarks} disabled={Boolean(!reportData || publishingMarks)}>
                  {publishingMarks ? (
                    <><Clock className="w-4 h-4 mr-2 animate-spin"/>Updating...</>
                  ) : (
                    reportData?.test?.mark_publish ? (<><XCircle className="w-4 h-4 mr-2"/>Unpublish Marks</>) : (<><CheckCircle2 className="w-4 h-4 mr-2"/>Publish Marks</>)
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {reportData && (
            <div className="space-y-6 py-4">
              {/* Test Overview */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{reportData.test.title || `${reportData.test.subjectName}${reportData.test.topicName ? ' — ' + reportData.test.topicName : ''}`}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{reportData.test.subjectName}{reportData.test.topicName ? ` • ${reportData.test.topicName}` : ''}</p>
                      {reportData.test.mark_publish ? (<Badge className="bg-green-100 text-green-800 border-green-200">Marks Published</Badge>) : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={reportData.test.examType === 'NEET' ? 'default' : 'secondary'}>
                      {reportData.test.examType}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {reportData.test.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Key Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Total Attempts</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{reportData.statistics.totalAttempts}</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-600">Average Score</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{reportData.statistics.averageScore}%</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">Pass Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">{reportData.statistics.passRate}%</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-medium text-orange-600">Avg Time</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">{reportData.statistics.averageTimeTaken} min</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Score Range */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Highest Score</p>
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-4 w-4 text-chart-2" />
                          <span className="text-xl font-bold text-chart-2">{reportData.statistics.highestScore}%</span>
                        </div>
                      </div>
                      <Separator orientation="vertical" className="mx-auto h-12" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Average Score</p>
                        <span className="text-xl font-bold">{reportData.statistics.averageScore}%</span>
                      </div>
                      <Separator orientation="vertical" className="mx-auto h-12" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lowest Score</p>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xl font-bold text-destructive">{reportData.statistics.lowestScore}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Score Distribution */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Score Distribution
                </h4>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {reportData.scoreDistribution.map((dist, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{dist.range}%</span>
                            <span className="text-muted-foreground">
                              {dist.count} students ({dist.percentage}%)
                            </span>
                          </div>
                          <Progress 
                            value={dist.percentage} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Difficulty Breakdown */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Question Difficulty Analysis
                </h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {reportData.difficultyBreakdown.map((diff, index) => (
                    <Card key={index} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          
                          <span className="text-xs text-muted-foreground">{diff.count} questions</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Accuracy</span>
                            <span className="font-semibold">{diff.avgAccuracy}%</span>
                          </div>
                          <Progress 
                            value={diff.avgAccuracy} 
                            className={`h-2 ${
                              diff.avgAccuracy >= 75 ? '[&>div]:bg-chart-2' : 
                              diff.avgAccuracy >= 60 ? '[&>div]:bg-chart-4' : '[&>div]:bg-destructive'
                            }`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Top Performers */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Top 5 Performers
                </h4>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Roll No</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Percentage</TableHead>
                          <TableHead className="text-center">Time Taken</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topPerformers.map((student) => (
                          <TableRow key={student.rank}>
                            <TableCell>
                              <Badge 
                                variant={student.rank === 1 ? 'default' : 'outline'}
                                className="gap-1"
                              >
                                {student.rank === 1 && <Award className="h-3 w-3" />}
                                #{student.rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-muted-foreground">{student.rollNo}</TableCell>
                            <TableCell className="text-center font-semibold">{student.score}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={student.percentage >= 90 ? 'default' : 'secondary'}>
                                {student.percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {student.timeTaken} mins
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* All Student Attempts */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Student Attempts
                </h4>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {reportData.attempts && reportData.attempts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Roll No</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-center">%</TableHead>
                            <TableHead className="text-center">Time Taken</TableHead>
                            <TableHead className="text-right">Started / Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.attempts.map((a, idx) => (
                            <TableRow key={`${a.studentId}-${idx}`}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell className="font-medium">{a.name}</TableCell>
                              <TableCell className="text-muted-foreground">{a.rollNo}</TableCell>
                              <TableCell>{a.status}</TableCell>
                              <TableCell className="text-center font-semibold">{a.score}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={a.percentage >= 90 ? 'default' : 'secondary'}>{a.percentage}%</Badge>
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">{a.timeTaken} mins</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                <div>{a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</div>
                                <div>{a.completedAt ? new Date(a.completedAt).toLocaleString() : '-'}</div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">No student attempts yet</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Test Details */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" />
                  Test Configuration
                </h4>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Questions</span>
                          <span className="font-semibold">{reportData.test.questionCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Duration</span>
                          <span className="font-semibold">{reportData.test.suggestedDuration} minutes</span>
                        </div>
                      
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Completion Rate</span>
                          <span className="font-semibold">{reportData.statistics.completionRate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Created On</span>
                          <span className="font-semibold">
                            {new Date(reportData.test.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                      </div>
                    </div>
                    {reportData.test.notes && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Notes / Instructions</p>
                          <p className="text-sm">{reportData.test.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => toast.success('Report exported successfully')}>
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Test?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this test? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmDeleteTest}>Delete</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {/* Delete Blocked Dialog */}
    <AlertDialog open={isDeleteBlockedDialogOpen} onOpenChange={setIsDeleteBlockedDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cannot delete test</AlertDialogTitle>
          <AlertDialogDescription>
            This test has existing student attempts. Deleting it will remove all attempts and cannot be undone. You can either unpublish the test to prevent further attempts or force delete (this will remove all attempts).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="p-4">
          {deleteBlockedInfo && (
            <p className="text-sm text-muted-foreground">There are <strong>{deleteBlockedInfo.attempts}</strong> attempts recorded for this test.</p>
          )}
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => { setIsDeleteBlockedDialogOpen(false); setDeleteBlockedInfo(null); }}>Cancel</Button>
          <Button variant="secondary" onClick={() => deleteBlockedInfo && handleUnpublishTest(deleteBlockedInfo.testId)}>Unpublish</Button>
          <Button variant="destructive" onClick={() => deleteBlockedInfo && handleForceDelete(deleteBlockedInfo.testId)} disabled={isForceDeleting}>
            {isForceDeleting ? 'Deleting...' : 'Force Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete Children Dialog */}
    <AlertDialog open={isDeleteChildrenDialogOpen} onOpenChange={setIsDeleteChildrenDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete parent and child tests</AlertDialogTitle>
          <AlertDialogDescription>
            This is a combined parent test and has <strong>{deleteChildrenInfo?.childCount}</strong> child tests.
            You can either unlink the children (children remain, parent is deleted) or delete parent and all children (complete removal). Both actions cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Choose an action to perform:</p>
          <ul className="mt-2 text-sm list-disc list-inside text-muted-foreground">
            <li><strong>Unlink children & delete parent</strong> — children remain independent tests without a parent.</li>
            <li><strong>Delete parent and children</strong> — removes parent and all child tests and their associated data.</li>
          </ul>
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => { setIsDeleteChildrenDialogOpen(false); setDeleteChildrenInfo(null); }}>Cancel</Button>
          <Button variant="secondary" onClick={() => deleteChildrenInfo && handleUncombineTest(deleteChildrenInfo.testId)} disabled={isUncombining}>
            {isUncombining ? 'Processing...' : 'Unlink children & Delete Parent'}
          </Button>
          <Button variant="destructive" onClick={() => deleteChildrenInfo && handleForceDelete(deleteChildrenInfo.testId)} disabled={isForceDeleting}>
            {isForceDeleting ? 'Deleting...' : 'Delete Parent and Children'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  </div>
  );
}
