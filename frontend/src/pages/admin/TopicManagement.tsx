import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  BookOpen,
  Filter,
  X,
  Layers,
  List,
  Check,
  XCircle,
} from 'lucide-react';
// ...existing code...
type SubtopicEditState = Subtopic & { isEditing?: boolean };
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Subject, Topic } from '@/types/admin';

type Subtopic = {
  id: string;
  topicId: string;
  name: string;
  description: string;
  topicName?: string;
};

type SubtopicFormState = {
  topicId: string;
  name: string;
  description: string;
};

const defaultSubtopicForm: SubtopicFormState = {
  topicId: '',
  name: '',
  description: '',
};
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

type TopicFormState = {
  subjectId: string;
  name: string;
  description: string;
  examType?: 'ALL' | string;
};

const defaultTopicForm: TopicFormState = {
  subjectId: '',
  name: '',
  description: '',
  examType: 'ALL',
};

// Local types for exams and allocation rows fetched from backend
type Exam = { id: number; name: string };

type AllocationRow = {
  id?: number;
  subjectId: string;
  facultyId: string;
  facultyName?: string;
  facultyEmail?: string;
  createdAt?: string;
};

// Exams are fetched from backend in fetchAll (do not hardcode NEET/JEE) 

const SUBJECT_COLOR_MAP: Record<string, string> = {
  physics: 'bg-blue-500',
  chemistry: 'bg-green-500',
  biology: 'bg-emerald-500',
  mathematics: 'bg-purple-500',
  maths: 'bg-purple-500',
  botany: 'bg-teal-500',
  zoology: 'bg-lime-500',
};

const getSubjectColor = (subject: string) => {
  const key = subject?.toLowerCase().trim() || '';
  return SUBJECT_COLOR_MAP[key] || 'bg-orange-500';
};

const normalizeSubjects = (rows: any[]): Subject[] =>
  rows.map((subject) => ({
    ...subject,
    id: String(subject.id),
    examType: (subject.examType || subject.exam_type || '') as Subject['examType'],
    status: (subject.status === 'inactive' ? 'inactive' : 'active') as Subject['status'],
    topicCount: Number(subject.topicCount ?? subject.topic_count ?? 0),
  }));

const normalizeTopics = (rows: any[]): Topic[] =>
  rows.map((topic) => ({
    id: String(topic.id),
    name: topic.name || 'Untitled Topic',
    description: topic.description ? String(topic.description) : '',
    subjectId: String(topic.subjectId ?? topic.subject_id),
    subjectName: topic.subjectName ?? topic.subject_name ?? 'Unknown Subject',
  }));

export default function TopicManagement() {

    // Subtopic list dialog state
    const [isSubtopicListOpen, setIsSubtopicListOpen] = useState(false);
    const [subtopicListForTopic, setSubtopicListForTopic] = useState<Topic | null>(null);
    const [subtopicEditStates, setSubtopicEditStates] = useState<Record<string, SubtopicEditState>>({});
    const [subtopicEditLoading, setSubtopicEditLoading] = useState<string | null>(null);
    // Open subtopic list dialog for a topic
    const handleOpenSubtopicList = (topic: Topic) => {
      setSubtopicListForTopic(topic);
      setIsSubtopicListOpen(true);
      // Reset edit states
      const subtopicStates: Record<string, SubtopicEditState> = {};
      subtopics.filter(st => st.topicId === topic.id).forEach(st => {
        subtopicStates[st.id] = { ...st, isEditing: false };
      });
      setSubtopicEditStates(subtopicStates);
    };

    // Start editing a subtopic
    const handleEditSubtopic = (subId: string) => {
      setSubtopicEditStates(prev => ({
        ...prev,
        [subId]: { ...prev[subId], isEditing: true },
      }));
    };

    // Cancel editing a subtopic
    const handleCancelEditSubtopic = (subId: string) => {
      setSubtopicEditStates(prev => ({
        ...prev,
        [subId]: { ...prev[subId], isEditing: false, name: subtopics.find(st => st.id === subId)?.name || '', description: subtopics.find(st => st.id === subId)?.description || '' },
      }));
    };

    // Update subtopic field
    const handleChangeSubtopicField = (subId: string, field: keyof Subtopic) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSubtopicEditStates(prev => ({
        ...prev,
        [subId]: { ...prev[subId], [field]: e.target.value },
      }));
    };

    // Save subtopic update
    const handleSaveSubtopic = async (subId: string) => {
      const sub = subtopicEditStates[subId];
      if (!sub.name.trim()) {
        alert('Subtopic name required');
        return;
      }
      if (!sub.topicId) {
        alert('Please select a parent topic');
        return;
      }
      setSubtopicEditLoading(subId);
      try {
        await apiFetch(`/admin/subtopics/${subId}`, {
          method: 'PUT',
          body: JSON.stringify({
            topicId: sub.topicId,
            name: sub.name.trim(),
            description: sub.description.trim() || null,
          }),
        });
        await fetchAll();
        setSubtopicEditStates(prev => ({ ...prev, [subId]: { ...prev[subId], isEditing: false } }));
      } catch (error: any) {
        alert(error.message || 'Failed to update subtopic');
      } finally {
        setSubtopicEditLoading(null);
      }
    };

    // Delete subtopic
    const handleDeleteSubtopic = async (subId: string) => {
      if (!window.confirm('Delete this subtopic permanently?')) return;
      setSubtopicEditLoading(subId);
      try {
        await apiFetch(`/admin/subtopics/${subId}`, { method: 'DELETE' });
        await fetchAll();
        setSubtopicEditStates(prev => {
          const copy = { ...prev };
          delete copy[subId];
          return copy;
        });
      } catch (error: any) {
        alert(error.message || 'Failed to delete subtopic');
      } finally {
        setSubtopicEditLoading(null);
      }
    };
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'all' | string>('all');
  const [examFilter, setExamFilter] = useState<'ALL' | string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubtopicOpen, setIsSubtopicOpen] = useState(false);
  const [isMoveSubtopicOpen, setIsMoveSubtopicOpen] = useState(false);
  const [moveSubtopicId, setMoveSubtopicId] = useState<string | null>(null);
  const [moveTargetTopicId, setMoveTargetTopicId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<TopicFormState>(defaultTopicForm);
  const [createErrors, setCreateErrors] = useState<{ name?: string }>({});
  const [editForm, setEditForm] = useState<TopicFormState & { id?: string }>(defaultTopicForm);
  const [subtopicForm, setSubtopicForm] = useState<SubtopicFormState>(defaultSubtopicForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingSubtopic, setIsSavingSubtopic] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  // Exams and allocations fetched from backend
  const [exams, setExams] = useState<Exam[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [topicOrSubtopicFilter, setTopicOrSubtopicFilter] = useState<'all' | 'topics' | 'subtopics'>('all');
  const [selectedParentTopic, setSelectedParentTopic] = useState<Topic | null>(null);

  const normalizeSubtopics = (rows: any[]): Subtopic[] =>
    rows.map((sub: any) => ({
      id: String(sub.id),
      topicId: String(sub.topicId ?? sub.topic_id),
      name: sub.name || 'Untitled Subtopic',
      description: sub.description ? String(sub.description) : '',
      topicName: sub.topicName ?? sub.topic_name ?? '',
    }));

  const fetchAll = async () => {
    try {
      const [subjectsRes, topicsRes, subtopicsRes] = await Promise.all([
        apiFetch('/admin/subjects'),
        apiFetch('/admin/topics'),
        apiFetch('/admin/subtopics'),
      ]);

      if (subjectsRes?.success) {
        setSubjects(normalizeSubjects(subjectsRes.subjects || []));
      }
      if (topicsRes?.success) {
        setTopics(normalizeTopics(topicsRes.topics || []));
      }
      if (subtopicsRes?.success) {
        setSubtopics(normalizeSubtopics(subtopicsRes.subtopics || []));
      }

      // Fetch exams list from backend
      try {
        const exRes = await apiFetch('/admin/meta/exams');
        if (exRes?.success && Array.isArray(exRes.exams)) {
          const cleaned = (exRes.exams || []).map((e: any) => ({ id: e.id, name: (e.name || '').toString().trim().toUpperCase() })).filter((e: any) => e.name);
          setExams(cleaned);
        }
      } catch (err) {
        console.debug('Could not fetch exams list', err);
      }

      // Fetch all subject allocations (optional, used elsewhere)
      try {
        const allAllocRes = await apiFetch('/admin/subjects/allocations');
        if (allAllocRes?.success) {
          const fetched: AllocationRow[] = (allAllocRes.allocations || []).map((a: { id?: number; subjectId: string, facultyId: string, facultyName?: string, facultyEmail?: string, created_at?: string, createdAt?: string }) => ({ id: a.id, subjectId: String(a.subjectId), facultyId: String(a.facultyId), facultyName: a.facultyName, facultyEmail: a.facultyEmail, createdAt: (a.created_at || a.createdAt) }));
          setAllocations(fetched);
        }
      } catch (err) {
        console.debug('Could not fetch allocations list', err);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchAll();
      setIsLoading(false);
    };
    load();
  }, []);

  // Reset forms when dialogs close
  useEffect(() => {
    if (!isCreateOpen) setCreateForm(defaultTopicForm);
    if (!isEditOpen) setEditForm(defaultTopicForm);
    if (!isSubtopicOpen) setSubtopicForm(defaultSubtopicForm);
  }, [isCreateOpen, isEditOpen, isSubtopicOpen]);

  // When opening Create dialog, default exam selection from current examFilter (unless ALL)
  useEffect(() => {
    if (!isCreateOpen) return;
    setCreateForm(prev => ({ ...prev, examType: examFilter !== 'ALL' ? examFilter : 'ALL', subjectId: '' }));
  }, [isCreateOpen, examFilter]);

  // Compute subject cards with topic counts
  const subjectCards = useMemo(() => {
    const topicCountMap = topics.reduce((acc, topic) => {
      acc[topic.subjectId] = (acc[topic.subjectId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cards = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      count: topicCountMap[subject.id] ?? 0,
      examType: subject.examType,
      color: getSubjectColor(subject.name),
    }));

    // Add subjects from topics that might not be in subjects list (fallback)
    const subjectIdsInTopics = new Set(topics.map(t => t.subjectId));
    subjectIdsInTopics.forEach(id => {
      if (!cards.some(c => c.id === id)) {
        const topic = topics.find(t => t.subjectId === id);
        if (topic) {
          cards.push({
            id,
            name: topic.subjectName,
            count: topicCountMap[id] || 1,
            examType: 'Unknown',
            color: getSubjectColor(topic.subjectName),
          });
        }
      }
    });

    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, topics]);

  // Filtering logic for topics and subtopics
  const filteredTopics = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (topicOrSubtopicFilter === 'subtopics') return [];
    // build quick lookup for subjects by id
    const subjectMap = subjects.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<string, Subject>);

    return topics.filter((topic) => {
      const matchesSearch =
        !query ||
        topic.name.toLowerCase().includes(query) ||
        topic.description.toLowerCase().includes(query);
      const matchesSubject = subjectFilter === 'all' || topic.subjectId === subjectFilter;
      const subj = subjectMap[topic.subjectId];
      const matchesExam = examFilter === 'ALL' || (subj && subj.examType === examFilter);
      return matchesSearch && matchesSubject && matchesExam;
    });
  }, [topics, searchQuery, subjectFilter, topicOrSubtopicFilter, examFilter, subjects]);

  const filteredSubtopics = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (topicOrSubtopicFilter === 'topics') return [];
    const topicMap = topics.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, Topic>);
    const subjectMap = subjects.reduce((acc, s) => { acc[s.id] = s; return acc; }, {} as Record<string, Subject>);

    return subtopics.filter((sub) => {
      const matchesSearch =
        !query ||
        sub.name.toLowerCase().includes(query) ||
        sub.description.toLowerCase().includes(query);
      const parentTopic = topicMap[sub.topicId];
      const matchesSubject = subjectFilter === 'all' || (parentTopic && parentTopic.subjectId === subjectFilter);
      const subj = parentTopic && subjectMap[parentTopic.subjectId];
      const matchesExam = examFilter === 'ALL' || (subj && subj.examType === examFilter);
      return matchesSearch && matchesSubject && matchesExam;
    });
  }, [subtopics, searchQuery, subjectFilter, topics, topicOrSubtopicFilter, examFilter, subjects]);

  // Map of topicId -> number of subtopics
  const subtopicCountMap = useMemo(() => {
    return subtopics.reduce((acc: Record<string, number>, s) => {
      acc[s.topicId] = (acc[s.topicId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [subtopics]);

  // Auto-select a subject when exam filter changes for easier browsing
  useEffect(() => {
    if (examFilter === 'ALL') return;
    // If current subject matches exam, keep it
    const current = subjects.find(s => s.id === subjectFilter && s.examType === examFilter);
    if (current) return;
    // Otherwise pick the first subject for that exam
    const first = subjects.find(s => s.examType === examFilter);
    if (first) setSubjectFilter(first.id);
  }, [examFilter, subjects, subjectFilter]);

  const isSub = topicOrSubtopicFilter === 'subtopics';
  const noItemsMessage = isSub ? 'No subtopics have been created yet.' : 'No topics have been created yet.';

  const hasActiveFilters = searchQuery.trim() !== '' || subjectFilter !== 'all' || topicOrSubtopicFilter !== 'all';
  // Add Subtopic handlers
  const handleOpenAddSubtopic = (topic?: Topic) => {
    if (topic) {
      setSubtopicForm({ ...defaultSubtopicForm, topicId: topic.id });
      setSelectedParentTopic(topic);
    } else {
      setSubtopicForm(defaultSubtopicForm);
      setSelectedParentTopic(null);
    }
    setIsSubtopicOpen(true);
  };

  const handleCreateSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtopicForm.topicId || !subtopicForm.name.trim()) {
      alert('Please select a parent topic and enter a subtopic name.');
      return;
    }
    setIsSavingSubtopic(true);
    try {
      await apiFetch('/admin/subtopics', {
        method: 'POST',
        body: JSON.stringify({
          topicId: subtopicForm.topicId,
          name: subtopicForm.name.trim(),
          description: subtopicForm.description.trim() || null,
        }),
      });
      await fetchAll();
      setIsSubtopicOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to create subtopic');
    } finally {
      setIsSavingSubtopic(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSubjectFilter('all');
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    // Require topic name; selecting a subject alone is not sufficient
    if (!createForm.name.trim()) {
      setCreateErrors({ name: 'Please enter a topic name.' });
      return;
    }
    setCreateErrors({});

    setIsSaving(true);
    try {
      await apiFetch('/admin/topics', {
        method: 'POST',
        body: JSON.stringify({
          subjectId: createForm.subjectId || null,
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
        }),
      });
      await fetchAll();
      setIsCreateOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to create topic');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (topic: Topic) => {
    setEditForm({
      id: topic.id,
      subjectId: topic.subjectId,
      name: topic.name,
      description: topic.description,
    });
    setIsEditOpen(true);
  };

  const handleUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id || !editForm.subjectId || !editForm.name.trim()) return;

    setIsUpdating(true);
    try {
      await apiFetch(`/admin/topics/${editForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          subjectId: editForm.subjectId,
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
        }),
      });
      await fetchAll();
      setIsEditOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to update topic');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    try {
      // Check dependent data
      const subRes = await apiFetch(`/admin/subtopics?topicId=${topic.id}`);
      const qRes = await apiFetch(`/admin/questions?topicId=${topic.id}`);
      const subCount = subRes?.subtopics ? subRes.subtopics.length : 0;
      const qCount = qRes?.total || 0;

      if (subCount > 0 || qCount > 0) {
        const confirmMsg = `Deleting "${topic.name}" will also delete ${subCount} subtopic(s) and ${qCount} question(s). This action is permanent. Do you want to proceed and delete all dependent data?`;
        if (!confirm(confirmMsg)) return;
      } else {
        if (!confirm(`Delete "${topic.name}" permanently?`)) return;
      }

      setDeletingTopicId(topic.id);

      // Use force flag when dependent data exists
      const force = subCount > 0 || qCount > 0;
      const res = await apiFetch(`/admin/topics/${topic.id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
      if (res && res.success) {
        if (res.deleted) {
          alert(`Deleted topic. Subtopics removed: ${res.deleted.subtopicCount}, Questions removed: ${res.deleted.questionCount}`);
        }
        await fetchAll();
      } else {
        throw new Error(res?.message || 'Failed to delete topic');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete topic');
    } finally {
      setDeletingTopicId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Topic Management</h1>
            <p className="text-muted-foreground">Organize and manage topics under each subject</p>
          </div>

          <div className="flex gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={subjectCards.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Add Topic
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Topic</DialogTitle>
                <DialogDescription>Create a topic under an existing subject</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTopic} className="space-y-4 mt-4">
                {/* Exam selector - pick exam first, then subject list is filtered */}
                <div className="space-y-2">
                  <Label>Exam</Label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={createForm.examType === 'ALL' ? 'default' : 'ghost'} onClick={() => setCreateForm(prev => ({ ...prev, examType: 'ALL', subjectId: '' }))}>
                      All
                    </Button>
                    {exams.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Loading exams...</div>
                    ) : (
                      exams.map((e) => (
                        <Button key={e.id} size="sm" variant={createForm.examType === e.name ? 'default' : 'ghost'} onClick={() => setCreateForm(prev => ({ ...prev, examType: e.name, subjectId: '' }))}>
                          {e.name}
                        </Button>
                      ))
                    )}
                  </div>
                </div>

                {/* Move Subtopic Dialog */}
                <Dialog open={isMoveSubtopicOpen} onOpenChange={setIsMoveSubtopicOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Move Subtopic</DialogTitle>
                      <DialogDescription>Select a new parent topic for the subtopic</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">New Parent Topic</Label>
                        <Select value={moveTargetTopicId || ''} onValueChange={(v) => setMoveTargetTopicId(String(v))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map(t => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsMoveSubtopicOpen(false)}>Cancel</Button>
                        <Button onClick={async () => {
                          if (!moveSubtopicId || !moveTargetTopicId) { alert('Select a parent topic'); return; }
                          try {
                            await apiFetch(`/admin/subtopics/${moveSubtopicId}`, { method: 'PUT', body: JSON.stringify({ topicId: moveTargetTopicId }) });
                            setIsMoveSubtopicOpen(false);
                            setMoveSubtopicId(null);
                            setMoveTargetTopicId(null);
                            await fetchAll();
                          } catch (err: any) {
                            alert(err.message || 'Failed to move subtopic');
                          }
                        }}>Move</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="space-y-2">
                  <Label htmlFor="create-subject">Subject</Label>
                  <Select
                    value={createForm.subjectId}
                    onValueChange={(v) => setCreateForm(prev => ({ ...prev, subjectId: v }))}
                  >
                    <SelectTrigger disabled={!createForm.examType || createForm.examType === 'ALL'}>
                      <SelectValue placeholder={createForm.examType && createForm.examType !== 'ALL' ? 'Choose a subject' : 'Select an exam first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectCards
                        .filter(s => !createForm.examType || createForm.examType === 'ALL' ? true : s.examType === createForm.examType)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-name">Topic Name</Label>
                  <Input
                    id="create-name"
                    placeholder="e.g., Thermodynamics"
                    value={createForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateForm(prev => ({ ...prev, name: val }));
                      if (createErrors.name && val.trim()) setCreateErrors(prev => ({ ...prev, name: undefined }));
                    }}
                  />
                  {createErrors.name && <p className="text-destructive text-sm mt-1">{createErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-desc">Description (Optional)</Label>
                  <Textarea
                    id="create-desc"
                    placeholder="Brief description..."
                    className="min-h-24"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Creating...' : 'Create Topic'}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
            <Dialog open={isSubtopicOpen} onOpenChange={setIsSubtopicOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subtopic
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Subtopic</DialogTitle>
                  <DialogDescription>Create a subtopic under a topic</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSubtopic} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="subtopic-topic">Parent Topic</Label>
                    <Select
                      value={subtopicForm.topicId}
                      onValueChange={(v) => setSubtopicForm(prev => ({ ...prev, topicId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtopic-name">Subtopic Name</Label>
                    <Input
                      id="subtopic-name"
                      placeholder="e.g., Laws of Thermodynamics"
                      value={subtopicForm.name}
                      onChange={(e) => setSubtopicForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtopic-desc">Description (Optional)</Label>
                    <Textarea
                      id="subtopic-desc"
                      placeholder="Brief description..."
                      className="min-h-24"
                      value={subtopicForm.description}
                      onChange={(e) => setSubtopicForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsSubtopicOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSavingSubtopic}>
                      {isSavingSubtopic ? 'Creating...' : 'Create Subtopic'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Subtopic List Dialog */}
        <Dialog open={isSubtopicListOpen} onOpenChange={setIsSubtopicListOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subtopics for: {subtopicListForTopic?.name}</DialogTitle>
              <DialogDescription>Manage subtopics for this topic</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {subtopicListForTopic && Object.values(subtopicEditStates).length === 0 && (
                <div className="text-muted-foreground">No subtopics for this topic.</div>
              )}
              {subtopicListForTopic && Object.values(subtopicEditStates).length > 0 && (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Description</th>
                      <th className="text-left px-4 py-2">Parent Topic</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(subtopicEditStates).map(sub => (
                      <tr key={sub.id}>
                        <td className="px-4 py-2">
                          {sub.isEditing ? (
                            <input
                              className="border rounded px-2 py-1 w-full"
                              value={sub.name}
                              onChange={handleChangeSubtopicField(sub.id, 'name')}
                              disabled={subtopicEditLoading === sub.id}
                            />
                          ) : (
                            sub.name
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {sub.isEditing ? (
                            <textarea
                              className="border rounded px-2 py-1 w-full min-h-[32px]"
                              value={sub.description}
                              onChange={handleChangeSubtopicField(sub.id, 'description')}
                              disabled={subtopicEditLoading === sub.id}
                            />
                          ) : (
                            sub.description || '—'
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {sub.isEditing ? (
                            <Select value={sub.topicId?.toString() || ''} onValueChange={(v) => setSubtopicEditStates(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], topicId: String(v) } }))}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select parent topic" />
                              </SelectTrigger>
                              <SelectContent>
                                {topics.map(t => (
                                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            sub.topicName || '—'
                          )}
                        </td>
                        <td className="px-4 py-2 text-right flex gap-2 justify-end">
                          {sub.isEditing ? (
                            <>
                              <Button size="icon" variant="success" onClick={() => handleSaveSubtopic(sub.id)} disabled={subtopicEditLoading === sub.id} title="Save">
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => handleCancelEditSubtopic(sub.id)} disabled={subtopicEditLoading === sub.id} title="Cancel">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="outline" onClick={() => handleEditSubtopic(sub.id)} title="Edit">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="destructive" onClick={() => handleDeleteSubtopic(sub.id)} disabled={subtopicEditLoading === sub.id} title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Subject Filter Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />
            <div className="flex items-center gap-3">
              <span>Filter by Subject</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={examFilter === 'ALL' ? 'default' : 'ghost'} onClick={() => setExamFilter('ALL')}>All</Button>
                {exams.map((e) => (
                  <Button key={e.id} size="sm" variant={examFilter === e.name ? 'default' : 'ghost'} onClick={() => setExamFilter(e.name)}>{e.name}</Button>
                ))}
              </div>
            </div>
          </div>

          {subjectCards.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No subjects found. Create subjects first to add topics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <button
                onClick={() => setSubjectFilter('all')}
                className={cn(
                  'rounded-xl border-2 p-5 transition-all hover:shadow-md',
                  subjectFilter === 'all'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card'
                )}
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-sm">All Subjects</p>
                  <p className="text-xs text-muted-foreground mt-1">{topics.length} topics</p>
                </div>
              </button>

              {subjectCards.filter(c => examFilter === 'ALL' || c.examType === examFilter).map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSubjectFilter(subject.id)}
                  className={cn(
                    'rounded-xl border-2 p-5 transition-all hover:shadow-md relative',
                    subjectFilter === subject.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="text-center ">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white',
                        subject.color
                      )}
                    >
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-sm">{subject.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subject.count} {subject.count === 1 ? 'topic' : 'topics'}
                    </p>
                  </div>
                  {subjectFilter === subject.id && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter: Topics/Subtopics */}
        <div className="flex gap-2 items-center">
          <Label>Show:</Label>
          <Select value={topicOrSubtopicFilter as string} onValueChange={(v: string) => setTopicOrSubtopicFilter(v as 'all' | 'topics' | 'subtopics')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="topics">Topics Only</SelectItem>
              <SelectItem value="subtopics">Subtopics Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search & Results */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search topics by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {filteredTopics.length} result{filteredTopics.length !== 1 ? 's' : ''}
              </Badge>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Topics/Subtopics Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Layers className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (isSub ? filteredSubtopics.length === 0 : filteredTopics.length === 0) ? (
            <div className="p-16 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No {isSub ? 'subtopics' : 'topics'} found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters ? 'Try adjusting your search or filter settings.' : noItemsMessage}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">{topicOrSubtopicFilter === 'subtopics' ? 'Subtopic' : 'Topic'}</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">{topicOrSubtopicFilter === 'subtopics' ? 'Parent Topic' : 'Subject'}</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topicOrSubtopicFilter === 'subtopics'
                    ? filteredSubtopics.map((sub) => {
                        const parentTopic = topics.find(t => t.id === sub.topicId);
                        return (
                          <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn('p-2 rounded-lg bg-orange-100')}>
                                  <Layers className="w-4 h-4 text-orange-500" />
                                </div>
                                <span className="font-medium">{sub.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="border-2 border-orange-300 bg-orange-50">
                                <FileText className="w-3 h-3 mr-1 text-orange-500" />
                                {parentTopic ? parentTopic.name : sub.topicName || '—'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">
                              {sub.description || '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setMoveSubtopicId(sub.id); setMoveTargetTopicId(sub.topicId); setIsMoveSubtopicOpen(true); }}>Move</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : filteredTopics.map((topic) => {
                        const color = getSubjectColor(topic.subjectName);
                        const textColor = color.replace('bg-', 'text-');
                        const bgLight = color + '/10';
                        const borderColor = color + '/30';
                        return (
                          <tr key={topic.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn('p-2 rounded-lg', bgLight)}>
                                  <FileText className={cn('w-4 h-4', textColor)} />
                                </div>
                                <span className="font-medium">{topic.name}</span>
                                <Badge title={`${subtopicCountMap[topic.id] ?? 0} subtopics`} variant="outline" className="ml-2 text-xs px-2 py-0.5">
                                  {subtopicCountMap[topic.id] ?? 0}
                                </Badge>
                                <Button variant="ghost" size="icon" className="ml-2" title="Show subtopics" onClick={e => { e.stopPropagation(); handleOpenSubtopicList(topic); }}>
                                  <List className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={cn('border-2', borderColor, bgLight)}>
                                <BookOpen className={cn('w-3 h-3 mr-1', textColor)} />
                                {topic.subjectName}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">
                              {topic.description || '—'}
                            </td>
                            <td className="px-6 py-4 text-right flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); handleOpenAddSubtopic(topic); }}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Subtopic
                              </Button>
                              <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleOpenSubtopicList(topic); }}>
                                <List className="w-4 h-4 mr-2" />
                                View Subtopics
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(topic)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteTopic(topic)}
                                    disabled={deletingTopicId === topic.id}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {deletingTopicId === topic.id ? 'Deleting...' : 'Delete'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                              {/* Subtopic List Dialog (moved out of loop) */}
                      })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Topic</DialogTitle>
              <DialogDescription>Update topic details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTopic} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={editForm.subjectId}
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, subjectId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectCards.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  className="min-h-24"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}