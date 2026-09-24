import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  X,
  Key,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/lib/api';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type UserRole = 'admin' | 'faculty' | 'student';
type UserStatus = 'active' | 'inactive';

type User = {
  id: string;
  userid?: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  batchId?: string;
  createdAt?: Date;
};

type Batch = {
  id: string;
  name: string;
  examType: 'NEET' | 'JEE' | ''; 
  status?: 'active' | 'inactive';
  studentCount?: number;
};

type ApiUser = {
  id: number;
  userid?: string;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  batchName?: string | null;
  batch_id?: number | null;
  created_at?: string;
};

type ApiBatch = {
  id: number;
  batch_name?: string | null;
  exam_name?: 'NEET' | 'JEE' | null;
  status?: number | null;
  total_students?: number | null;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    userid: '',
    name: '',
    role: 'student' as UserRole,
    email: '',
    phone: '',
    batchId: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [selectedForEdit, setSelectedForEdit] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole>('student');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [examFilter, setExamFilter] = useState<'all' | 'NEET' | 'JEE'>('all');
  const [batchFilter, setBatchFilter] = useState<'all' | string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ name: '', examType: 'NEET' as 'NEET' | 'JEE' });
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-primary/10 text-primary border-primary/20',
    faculty: 'bg-info/10 text-info border-info/20',
    student: 'bg-success/10 text-success border-success/20',
  };

  const extractYear = (batchName: string): string => {
    const yearMatch = batchName.match(/(20\d{2}|\d{4})/);
    return yearMatch ? yearMatch[0] : '';
  };

  useEffect(() => {
    const init = async () => {
      await fetchBatches();
      await loadUsers();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure batches are fresh when opening the Create User dialog
  useEffect(() => {
    if (!isCreateOpen) return;
    // re-fetch to ensure latest batches are available for selection
    fetchBatches().catch((err) => console.warn('Failed to refresh batches on dialog open', err));
  }, [isCreateOpen]);

  const fetchBatches = async () => {
    try {
      let res: any;
      try {
        res = await apiFetch('/batches');
      } catch (err) {
        // fallback to explicit /api path (useful when VITE_API_URL is not set)
        const fallback = await fetch('/api/batches');
        res = await fallback.json();
      }

      if (res?.success && Array.isArray(res.batches)) {
        const normalized: Batch[] = res.batches.map((b: ApiBatch) => {
          const batchName = String(b.batch_name || '').toLowerCase();
          let examType: 'NEET' | 'JEE' | '' = '';
          if (batchName.includes('neet')) examType = 'NEET';
          else if (batchName.includes('jee')) examType = 'JEE';
          // if API provides exam_id or exam type, prefer that
          if (b.exam_name && (b.exam_name === 'NEET' || b.exam_name === 'JEE')) {
            examType = b.exam_name;
          }
          return {
            id: String(b.id),
            name: b.batch_name || `batch-${b.id}`,
            examType,
            status: b.status === 1 ? 'active' : 'inactive',
            studentCount: b.total_students ?? 0,
          };
        });
        setBatches(normalized);
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      setBatches([]);
    }
  };

  // Load users and map into our local User type
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await apiFetch('/admin/users');
      if (data?.success && Array.isArray(data.users)) {
        const mapped: User[] = data.users.map((u: ApiUser) => {
          let batchId: string | undefined;
          
          // First try to use batch_id from API
          if (u.batch_id !== null && u.batch_id !== undefined) {
            batchId = String(u.batch_id);
          } else if (u.batchName) {
            // Fallback: try to map batchName to batchId
            const found = batches.find((b) => b.name === u.batchName);
            batchId = found ? found.id : undefined;
          }

          return {
            id: String(u.id),
            userid: u.userid,
            name: u.name || 'Unknown',
            email: u.email || '',
            phone: u.phone || '',
            role: (u.role || 'student').toLowerCase() as UserRole,
            status: 'active',
            batchId,
            createdAt: u.created_at ? new Date(u.created_at) : new Date(),
          };
        });
        setUsers(mapped);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to load users', err);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchExamTypes = async () => {
    try {
      const res = await apiFetch('/admin/meta/exams');
      if (res?.success && Array.isArray(res.exams)) setExamTypes(res.exams || []);
      else setExamTypes([]);
    } catch (err) {
      console.error('Failed to fetch exam types', err);
      setExamTypes([]);
    }
  };

  const refreshUsers = async () => {
    await fetchBatches();
    await loadUsers();
  };

  const getBatchById = useCallback((id?: string) => batches.find((b) => b.id === id), [batches]);

  const userCounts = useMemo(() => ({
    all: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    faculty: users.filter((u) => u.role === 'faculty').length,
    student: users.filter((u) => u.role === 'student').length,
  }), [users]);

  const statusCounts = useMemo(() => ({
    all: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
  }), [users]);

  // Filtering logic:
  // - roleFilter (admin/faculty/student)
  // - statusFilter (all/active/inactive)
  // - searchQuery (name/email/phone)
  // - examFilter (only used when role=student) - evaluates via batch examType
  // - batchFilter (only used when role=student)
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      if (q) {
        const inName = user.name.toLowerCase().includes(q);
        const inEmail = (user.email || '').toLowerCase().includes(q);
        const inPhone = (user.phone || '').includes(q);
        if (!inName && !inEmail && !inPhone) return false;
      }

      if (user.role === 'student') {
        // Determine exam type from batch
        const batch = getBatchById(user.batchId);
        const batchExam = batch?.examType ?? '';
        if (examFilter !== 'all' && batchExam !== examFilter) return false;
        if (batchFilter !== 'all' && user.batchId !== batchFilter) return false;
      }
      // for admin/faculty we ignore exam/batch filters
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter, examFilter, batchFilter, getBatchById]);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('student');
    setStatusFilter('all');
    setExamFilter('all');
    setBatchFilter('all');
  };

  // Create / Edit user handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!createForm.name.trim()) {
      alert('Name is required');
      return;
    }
    
    if (!createForm.userid.trim()) {
      alert('User ID is required');
      return;
    }
    
    // Check for duplicate User ID
    const duplicateUser = users.find(
      (u) => u.userid === createForm.userid && (!selectedForEdit || u.id !== selectedForEdit.id)
    );
    
    if (duplicateUser) {
      alert(`User ID "${createForm.userid}" is already taken by ${duplicateUser.name}. Please use a different User ID.`);
      return;
    }
    
    // Validate batch for students
    if (createForm.role === 'student' && !createForm.batchId) {
      alert('Batch is required for students');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const body = {
        userid: createForm.userid,
        name: createForm.name,
        role: createForm.role,
        email: createForm.email || null,
        phone: createForm.phone || null,
        password: selectedForEdit ? null : '203040', // Default password only for new users
        batchId: createForm.batchId ? Number(createForm.batchId) : null,
        status: createForm.status || 'active',
      };

      let res;
      if (selectedForEdit) {
        res = await apiFetch(`/admin/users/${selectedForEdit.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        res = await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(body) });
      }

      if (res?.success) {
        setIsCreateOpen(false);
        setCreateForm({ userid: '', name: '', role: 'student', email: '', phone: '', batchId: '', status: 'active' });
        setSelectedForEdit(null);
        await refreshUsers();
        alert(`User ${selectedForEdit ? 'updated' : 'created'} successfully!${!selectedForEdit ? ' Default password: 203040' : ''}`);
      } else {
        console.error('User create/edit failed', res);
        alert(res?.message || `Failed to ${selectedForEdit ? 'update' : 'create'} user. Please try again.`);
      }
    } catch (err) {
      console.error('Create/Edit error', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to save user. Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Delete user ${user.name}? This action cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/admin/users/${user.id}`, { method: 'DELETE' });
      if (res?.success) {
        alert(`User ${user.name} deleted successfully!`);
        await refreshUsers();
      } else {
        alert(res?.message || 'Failed to delete user. Please try again.');
      }
    } catch (err) {
      console.error('Delete user failed', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to delete user. Please try again.'}`);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.name} to default (203040)?`)) return;
    try {
      const res = await apiFetch(`/admin/users/${user.id}/reset-password`, {
        method: 'PUT',
      });
      if (res?.success) {
        alert('Password reset to 203040 successfully!');
        await refreshUsers();
      } else {
        alert(res?.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password failed', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to reset password'}`);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name.trim()) {
      alert('Batch name is required');
      return;
    }
    setIsBatchSubmitting(true);
    try {
      const res = await apiFetch('/batches', {
        method: 'POST',
        body: JSON.stringify({
          batch_name: batchForm.name,
          exam_name: batchForm.examType,
          status: 1,
        }),
      });
      if (res?.success) {
        await fetchBatches();
        setIsBatchDialogOpen(false);
        setBatchForm({ name: '', examType: '' });
      } else {
        console.error('Batch creation failed', res);
        alert('Failed to create batch');
      }
    } catch (err) {
      console.error('Create batch error', err);
      alert('Failed to create batch');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batch: Batch) => {
    if (!confirm(`Delete batch "${batch.name}"? This action cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/batches/${batch.id}`, { method: 'DELETE' });
      if (res?.success) {
        await fetchBatches();
        await refreshUsers();
      } else {
        alert('Failed to delete batch');
      }
    } catch (err) {
      console.error('Delete batch failed', err);
      alert('Failed to delete batch');
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      roleFilter !== 'student' ||
      statusFilter !== 'all' ||
      batchFilter !== 'all' ||
      examFilter !== 'all'
    );
  }, [searchQuery, roleFilter, statusFilter, batchFilter, examFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage admins, faculty, and students</p>
          </div>

          <div className="flex gap-2">
              {/* Batch Management removed from User Management header */}

            {/* Add User Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedForEdit ? 'Edit User' : 'Create New User'}</DialogTitle>
                <DialogDescription>
                  {selectedForEdit ? 'Update user details' : 'Add a new user to the system'}
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4 mt-4" onSubmit={handleCreateUser}>
                <div className="space-y-2">
                  <Label htmlFor="userid">User ID <span className="text-destructive">*</span></Label>
                  <Input
                    id="userid"
                    placeholder="e.g., 333, STU001, etc."
                    value={createForm.userid}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setCreateForm((p) => ({ ...p, userid: value }));
                      const duplicate = users.find(
                        (u) => u.userid === value && (!selectedForEdit || u.id !== selectedForEdit.id)
                      );
                      if (duplicate && value) {
                        e.target.setCustomValidity(`User ID already taken by ${duplicate.name}`);
                      } else {
                        e.target.setCustomValidity('');
                      }
                    }}
                    required
                    className={createForm.userid && users.find(
                      (u) => u.userid === createForm.userid && (!selectedForEdit || u.id !== selectedForEdit.id)
                    ) ? 'border-destructive' : ''}
                  />
                  {createForm.userid && users.find(
                    (u) => u.userid === createForm.userid && (!selectedForEdit || u.id !== selectedForEdit.id)
                  ) && (
                    <p className="text-xs text-destructive">⚠️ This User ID is already in use</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(v: UserRole) => setCreateForm((p) => ({ ...p, role: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                {createForm.role === 'student' && (
                  <div className="space-y-2">
                    <Label htmlFor="batch">Batch <span className="text-destructive">*</span></Label>
                    <Select
                      value={createForm.batchId}
                      onValueChange={(v) => setCreateForm((p) => ({ ...p, batchId: v }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.length === 0 ? (
                          <SelectItem value="__none" disabled>No batches available</SelectItem>
                        ) : (
                          batches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.name} {batch.examType ? `(${batch.examType})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {batches.length === 0 && (
                      <p className="text-xs text-muted-foreground">Create a batch first using "Manage Batches" button</p>
                    )}
                  </div>
                )}

                {!selectedForEdit && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      <Key className="w-4 h-4 inline mr-1" />
                      Default password will be set to: <strong className="text-foreground">203040</strong>
                    </p>
                  </div>
                )}

                {selectedForEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={createForm.status} onValueChange={(v: 'active'|'inactive') => setCreateForm((p)=>({...p,status:v}))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setSelectedForEdit(null);
                      setCreateForm({
                        userid: '',
                        name: '',
                        role: 'student',
                        email: '',
                        phone: '',
                        batchId: '',
                        status: 'active',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {selectedForEdit ? 'Save' : 'Create User'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center py-2">
          <div className="flex gap-2">
            {[
              { label: 'Admin', value: 'admin' as UserRole, count: userCounts.admin },
              { label: 'Faculty', value: 'faculty' as UserRole, count: userCounts.faculty },
              { label: 'Student', value: 'student' as UserRole, count: userCounts.student },
            ].map((r) => (
              <Button
                key={r.value}
                variant={roleFilter === r.value ? 'default' : 'outline'}
                className={`rounded-xl px-5 py-3 font-semibold shadow-sm border ${roleFilter === r.value ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setRoleFilter(r.value);
                  setExamFilter('all');
                  setBatchFilter('all');
                }}
              >
                {r.label} <span className="ml-2 text-xs font-normal">({r.count})</span>
              </Button>
            ))}
          </div>

          {roleFilter === 'student' && (
            <>
              <div className="flex gap-2">
                        {[
                            { label: 'All', value: 'all' as const, count: userCounts.student },
                            { label: 'NEET', value: 'NEET' as const, count: users.filter((u) => u.role === 'student' && getBatchById(u.batchId)?.examType === 'NEET').length },
                            { label: 'JEE', value: 'JEE' as const, count: users.filter((u) => u.role === 'student' && getBatchById(u.batchId)?.examType === 'JEE').length },
                          ].map((e) => (
                            <Button
                              key={e.value}
                              variant={examFilter === e.value ? 'default' : 'outline'}
                              className={`rounded-xl px-5 py-3 font-semibold shadow-sm border ${examFilter === e.value ? 'ring-2 ring-primary' : ''}`}
                              onClick={() => setExamFilter(e.value)}
                            >
                              {e.label} <span className="ml-2 text-xs font-normal">({e.count})</span>
                            </Button>
                          ))}
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Batch:</Label>
                <Select value={batchFilter} onValueChange={(v) => setBatchFilter(v)}>
                  <SelectTrigger className="w-[320px]">
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                       All Batches ({users.filter((u) => u.role === 'student').length} students)
                    </SelectItem>
                    {batches
                      .filter((b) => (examFilter === 'all' ? true : b.examType === examFilter))
                      .sort((a, b) => {
                        const yearA = extractYear(a.name);
                        const yearB = extractYear(b.name);
                        if (yearA !== yearB) return yearB.localeCompare(yearA);
                        return a.examType.localeCompare(b.examType);
                      })
                      .map((batch) => {
                        const batchStudentCount = users.filter((u) => u.role === 'student' && u.batchId === batch.id).length;
                        const year = extractYear(batch.name);
                        const icon = batch.examType === 'NEET' ? '🩺' : batch.examType === 'JEE' ? '⚙️' : '📖';
                        return (
                          <SelectItem key={batch.id} value={batch.id}>
                            {icon} {batch.name.toUpperCase()} {year && `(${year})`} • {batch.examType} • {batchStudentCount} students
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Search & Status */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(v: 'all' | UserStatus) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
                <SelectItem value="inactive">Inactive ({statusCounts.inactive})</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" size="icon" onClick={clearFilters} title="Clear all filters" className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-background/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {roleFilter !== 'student' && (
              <Badge variant="secondary" className="gap-1">
                Role: {roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                <button onClick={() => setRoleFilter('student')} className="ml-1 hover:bg-background/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <button onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-background/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {examFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Exam: {examFilter}
                <button onClick={() => setExamFilter('all')} className="ml-1 hover:bg-background/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {batchFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Batch: {getBatchById(batchFilter)?.name || batchFilter}
                <button onClick={() => setBatchFilter('all')} className="ml-1 hover:bg-background/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              ({filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'})
            </span>
          </div>
        )}

        {/* Users Table */}
        <div className="table-container overflow-x-auto">
          {isLoadingUsers ? (
            <div className="py-16">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                {hasActiveFilters
                  ? 'No users match your current filters. Try adjusting your search criteria.'
                  : 'No users have been added yet. Click "Add User" to create one.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">User</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">User ID</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Contact</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Role</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Status</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Batch</th>
                  <th className="text-right text-sm font-medium text-muted-foreground px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm">
                        <Badge variant="secondary" className="font-mono">
                          {user.userid || user.id}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {user.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={roleColors[user.role]}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                        className={
                          user.status === 'active'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {user.status === 'active' ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.batchId ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {getBatchById(user.batchId)?.name || user.batchId}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedForEdit(user);
                                      setCreateForm({
                                        userid: user.userid || user.id,
                                        name: user.name,
                                        role: user.role,
                                        email: user.email || '',
                                        phone: user.phone || '',
                                        batchId: user.batchId || '',
                                        status: user.status || 'active',
                                      });
                              setIsCreateOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={async () => {
                              const newStatus = user.status === 'active' ? 'inactive' : 'active';
                              try {
                                await apiFetch(`/admin/users/${user.id}/status`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ status: newStatus }),
                                });
                                await refreshUsers();
                              } catch (err) {
                                console.error('Toggle status failed', err);
                              }
                            }}
                          >
                            {user.status === 'active' ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Disable
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Enable
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>

                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
