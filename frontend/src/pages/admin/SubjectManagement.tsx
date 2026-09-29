import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  GraduationCap,
  Stethoscope,
  FlaskConical,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
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
import { Subject } from '@/types/admin';
interface FacultyUser { id: string; name: string; email: string; specialization?: string; role?: string }
interface AllocationRow { id?: string | number; subjectId: string; facultyId: string; facultyName?: string; facultyEmail?: string; createdAt?: string }
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Switch removed as exam-settings tab removed
import { Checkbox } from '@/components/ui/checkbox';

// Note: faculty and allocations are loaded via API
// will store allocations as { subjectId, facultyId }

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<FacultyUser[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [examTab, setExamTab] = useState<string>('');
  const [exams, setExams] = useState<Array<{ id: number; name: string }>>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mainTab, setMainTab] = useState<string>('subjects');
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [createFormName, setCreateFormName] = useState('');
  const [createFormExam, setCreateFormExam] = useState<string>('');
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [viewAssignedSubjectId, setViewAssignedSubjectId] = useState<string | null>(null);
  const [isAssignedListOpen, setIsAssignedListOpen] = useState(false);

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = subject.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesExam = subject.examType === examTab;
    return matchesSearch && matchesExam;
  });

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Fetch subjects
        const subRes = await apiFetch('/admin/subjects');
        if (subRes?.success) {
          setSubjects(subRes.subjects || []);
        }

        try {
          const exRes = await apiFetch('/admin/meta/exams');
          if (exRes?.success && Array.isArray(exRes.exams)) {
            const cleaned = (exRes.exams || []).map((e: any) => ({ id: e.id, name: (e.name || '').toString().trim().toUpperCase() })).filter((e: any) => e.name);
            setExams(cleaned);
            // default selected createFormExam to first exam if present
            if (cleaned.length > 0) setCreateFormExam(cleaned[0].name);
          }
        } catch (err) {
          console.debug('Could not fetch exams list', err);
        }

        try {
          const allAllocRes = await apiFetch('/admin/subjects/allocations');
          if (allAllocRes?.success) {
            const fetched: AllocationRow[] = (allAllocRes.allocations || []).map((a: { id?: number; subjectId: string, facultyId: string, facultyName?: string, facultyEmail?: string, created_at?: string, createdAt?: string }) => ({ id: a.id, subjectId: String(a.subjectId), facultyId: String(a.facultyId), facultyName: a.facultyName, facultyEmail: a.facultyEmail, createdAt: (a.created_at || a.createdAt) }));
            setAllocations(fetched);
          }
        } catch (err) {
          console.debug('Could not fetch allocations list', err);
        }

        try {
          const facRes = await apiFetch('/admin/subjects/faculty/list');
          if (facRes?.success) setFaculty(facRes.faculty || []);
        } catch (err) {
          console.debug('Could not fetch faculty list, falling back to /admin/users', err);
          const usersRes = await apiFetch('/admin/users');
          if (usersRes?.success) setFaculty(usersRes.users.filter((u: FacultyUser) => (u.role || '').toLowerCase() === 'faculty'));
        }
      } catch (err) {
        console.error('Failed to load subjects/faculty', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!openDialogId) {
      setSelectedFacultyIds([]);
      return;
    }
    let cancelled = false;
    const fetchAlloc = async () => {
      try {
        const res = await apiFetch(`/admin/subjects/${openDialogId}/allocations`);
        if (res?.success && !cancelled) {
          const ids = (res.allocations || []).map((a: { subjectId?: string, facultyId: string, facultyName?: string, facultyEmail?: string }) => String(a.facultyId));
          setSelectedFacultyIds(ids);
          setAllocations((cur) => {
            const without = cur.filter((a) => a.subjectId !== openDialogId);
            // prefer the name/email returned from the per-subject fetch
            const newRows = (res.allocations || []).map((a: { facultyId: string, facultyName?: string, facultyEmail?: string }) => ({ subjectId: openDialogId, facultyId: String(a.facultyId), facultyName: a.facultyName, facultyEmail: a.facultyEmail }));
            return [...without, ...newRows];
          });
        }
      } catch (err) {
        console.error('Failed to fetch allocations', err);
      }
    };
    fetchAlloc();
    return () => { cancelled = true; };
  }, [openDialogId]);

  // If exams list changes make sure active tab is valid
  useEffect(() => {
    if (exams.length === 0) return;
    const names = exams.map(e => e.name);
    if (!names.includes(examTab)) {
      setExamTab(names[0]);
    }
  }, [exams]);

  const refreshSubjects = async () => {
    try {
      const res = await apiFetch('/admin/subjects');
      if (res?.success) setSubjects(res.subjects || []);
    } catch (err) {
      console.error('Failed to refresh subjects', err);
    }
  };

  const refreshAllocations = async () => {
    try {
      const res = await apiFetch('/admin/subjects/allocations');
      if (res?.success) {
        setAllocations((res.allocations || []).map((a: { subjectId: string; facultyId: string }) => ({ subjectId: String(a.subjectId), facultyId: String(a.facultyId) })));
      }
    } catch (err) {
      console.debug('Failed to refresh allocations', err);
    }
  };

  const handleOpenEdit = (s: Subject) => {
    setEditSubject(s);
    setIsEditOpen(true);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject) return;
    try {
      await apiFetch(`/admin/subjects/${editSubject.id}`, { method: 'PUT', body: JSON.stringify({ name: editSubject.name, status: editSubject.status }) });
      setIsEditOpen(false);
      setEditSubject(null);
      await refreshSubjects();
      await refreshAllocations();
    } catch (err) {
      console.error('Failed to update subject', err);
      alert(err.message || 'Failed to update subject');
    }
  };

  const handleToggleStatus = async (s: Subject) => {
    const newStatus = s.status === 'active' ? 'inactive' : 'active';
    try {
      await apiFetch(`/admin/subjects/${s.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      await refreshSubjects();
      await refreshAllocations();
    } catch (err) {
      console.error('Failed to toggle status', err);
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteSubject = async (s: Subject) => {
    if (!confirm(`Delete subject ${s.name}? This is permanent.`)) return;
    try {
      await apiFetch(`/admin/subjects/${s.id}`, { method: 'DELETE' });
      await refreshSubjects();
      await refreshAllocations();
    } catch (err) {
      console.error('Failed to delete subject', err);
      alert(err.message || 'Failed to delete subject');
    }
  };

  const handleSaveAllocations = async () => {
    if (!openDialogId) return;
    setIsAllocating(true);
    try {
      const unique = Array.from(new Set(selectedFacultyIds.map(String)));
      await apiFetch(`/admin/subjects/${openDialogId}/allocations`, {
        method: 'POST',
        body: JSON.stringify({ facultyIds: unique }),
      });
      setAllocations((cur) => {
        const without = cur.filter((a) => a.subjectId !== openDialogId);
        const newRows = unique.map((fid) => ({ subjectId: openDialogId, facultyId: fid }));
        return [...without, ...newRows];
      });
      setOpenDialogId(null);
      try {
        const allAllocRes = await apiFetch('/admin/subjects/allocations');
        if (allAllocRes?.success) {
          setAllocations((allAllocRes.allocations || []).map((a: { subjectId: string, facultyId: string }) => ({ subjectId: String(a.subjectId), facultyId: String(a.facultyId) })));
        }
      } catch (err) {
        console.debug('Failed to refresh allocations after save', err);
      }
    } catch (err) {
      console.error('Failed to save allocations', err);
      alert(err.message || 'Failed to save allocations');
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Subject & Exam Management</h1>
          <p className="page-subtitle">Manage subjects and exam configurations for Exams</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Manage and organize subjects for different exam types
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </Button>
                  </DialogTrigger>

                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Subject</DialogTitle>
                    <DialogDescription>
                      Create a new subject and link it to an exam
                    </DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4 mt-4" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!createFormName.trim()) return alert('Subject name is required');
                    if (!createFormExam || !exams.length) return alert('Please add and select an exam before creating a subject');
                    try {
                      await apiFetch('/admin/subjects', {
                        method: 'POST',
                        body: JSON.stringify({ name: createFormName, examType: createFormExam }),
                      });
                      setIsCreateOpen(false);
                      // refresh
                      const subRes = await apiFetch('/admin/subjects');
                      if (subRes?.success) setSubjects(subRes.subjects || []);
                      await refreshAllocations();
                      setCreateFormName('');
                    } catch (err) {
                      console.error('Error creating subject', err);
                      alert(err.message || 'Failed to create subject');
                    }
                  }}>
                    <div className="space-y-2">
                      <Label htmlFor="subjectName">Subject Name</Label>
                      <Input id="subjectName" placeholder="e.g., Physics" value={createFormName} onChange={(e) => setCreateFormName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="examType">Exam Type</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/admin/exams')}>Manage Exams</Button>
                      </div>
                      <Select value={createFormExam} onValueChange={(v) => setCreateFormExam(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                        <SelectContent>
                          {exams.length > 0 ? (
                            exams.map((e) => (
                              <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>No exams defined — add one</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Add Subject</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/admin/exams')}>Add / Manage Exams</Button>
            </div>

              {/* Edit Subject Dialog */}
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit Subject</DialogTitle>
                    <DialogDescription>Modify subject name or status</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4 mt-4" onSubmit={handleUpdateSubject}>
                    <div className="space-y-2">
                      <Label htmlFor="editSubjectName">Subject Name</Label>
                      <Input id="editSubjectName" value={editSubject?.name || ''} onChange={(e) => setEditSubject((s) => s ? ({ ...s, name: e.target.value }) : s)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editSubjectStatus">Status</Label>
                      <Select value={editSubject?.status} onValueChange={(v) => setEditSubject((s) => s ? ({ ...s, status: v as 'active' | 'inactive' }) : s)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Subjects</p>
                    <h3 className="text-2xl font-bold text-foreground">{subjects.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-success/10 to-success/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Subjects</p>
                    <h3 className="text-2xl font-bold text-foreground">
                      {subjects.filter((s) => s.status === 'active').length}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                    <ToggleRight className="w-6 h-6 text-success" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-info/10 to-info/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Topics</p>
                    <h3 className="text-2xl font-bold text-foreground">
                      {subjects.reduce((acc, s) => acc + s.topicCount, 0)}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-info" />
                  </div>
                </div>
              </div>
            </div>

        {/* Tabs */}
        <Tabs value={examTab} onValueChange={setExamTab}>
          <TabsList className="grid w-full max-w-md" style={{ gridTemplateColumns: `repeat(${Math.max( (exams.length || 2), 2)}, minmax(0, 1fr))` }}>
            {exams.length > 0 ? (
              exams.map((e) => (
                <TabsTrigger key={e.id} value={e.name} className="gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {e.name}
                </TabsTrigger>
              ))
            ) : (
              <TabsTrigger value="" className="gap-2" disabled>
                <span className="w-2 h-2 rounded-full bg-muted"></span>
                No exams defined
              </TabsTrigger>
            )}
          </TabsList>

          <div className="mt-6">
            {/* Search */}
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject) => {
                return (
                <div
                  key={subject.id}
                  className={`rounded-xl border p-6 hover:shadow-elevated transition-all duration-300 bg-card`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(subject)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(subject)}>
                          {subject.status === 'active' ? (
                            <>
                              <ToggleLeft className="w-4 h-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-4 h-4 mr-2" />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSubject(subject)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-display font-semibold text-xl text-foreground">
                      {subject.name}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {subject.topicCount ?? 0} Topics
                  </p>

                  <Badge
                    variant={subject.status === 'active' ? 'default' : 'secondary'}
                    className={
                      subject.status === 'active'
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {subject.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              )})}
            </div>
          </div>
        </Tabs>
      </div>
      </div>
    </AdminLayout>
  );
}
