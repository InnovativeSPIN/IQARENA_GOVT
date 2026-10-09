import { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
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
  Upload,
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
  schoolId?: string;
  schoolName?: string;
  standard?: string;
  section?: string;
  batchYear?: string;
  examId?: string;
  examName?: string;
  emisNo?: string;
  isUnlinked?: boolean; // true = CSV-imported, no user account yet
  createdAt?: Date;
};



type ApiUser = {
  id: number | string | null;
  userid?: string;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  school_id?: number | null;
  school_name?: string | null;
  standard?: string | null;
  section?: string | null;
  batch_year?: string | null;
  exam_id?: number | null;
  exam_name?: string | null;
  emis_no?: string | null;
  is_unlinked?: number | null;
  created_at?: string;
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
    school_id: '',
    standard: '',
    section: '',
    batchYear: '',
    examId: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [selectedForEdit, setSelectedForEdit] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole>('student');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [examFilter, setExamFilter] = useState<'all' | string>('all');
  const [classFilter, setClassFilter] = useState<'all' | string>('all');
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  
  const [schools, setSchools] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadTab, setBulkUploadTab] = useState<'student' | 'faculty'>('student');
  const [bulkForm, setBulkForm] = useState({ school_id: '', standard: '', section: '', batch_year: '', exam_id: '' });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
      await fetchSchools();
      await fetchExamTypes();
      await loadUsers();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // Load users and map into our local User type
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await apiFetch('/admin/users');
      if (data?.success && Array.isArray(data.users)) {
        const mapped: User[] = data.users.map((u: ApiUser) => {
          return {
            id: String(u.id ?? `ss_${u.emis_no}`),
            userid: u.userid,
            name: u.name || 'Unknown',
            email: u.email || '',
            phone: u.phone || '',
            role: (u.role || 'student').toLowerCase() as UserRole,
            status: (u.status as UserStatus) || 'active',
            schoolId: u.school_id ? String(u.school_id) : undefined,
            schoolName: u.school_name || undefined,
            standard: u.standard || undefined,
            section: u.section || undefined,
            batchYear: u.batch_year || undefined,
            examId: u.exam_id ? String(u.exam_id) : undefined,
            examName: u.exam_name || undefined,
            emisNo: u.emis_no || undefined,
            isUnlinked: !!u.is_unlinked,
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

  const fetchSchools = async () => {
    try {
      const res = await apiFetch('/admin/schools');
      if (res?.success) setSchools(res.schools || []);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    }
  };

  const refreshUsers = async () => {
    await loadUsers();
  };

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
        if (examFilter !== 'all' && user.examId !== examFilter) return false;
        if (classFilter !== 'all' && user.standard !== classFilter) return false;
        if (schoolFilter !== 'all' && user.schoolId !== schoolFilter) return false;
      }
      // for admin/faculty we ignore exam/class filters, but faculty might have schoolFilter
      if (user.role === 'faculty') {
        if (schoolFilter !== 'all' && user.schoolId !== schoolFilter) return false;
      }
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter, examFilter, classFilter, schoolFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('student');
    setStatusFilter('all');
    setExamFilter('all');
    setClassFilter('all');
    setSchoolFilter('all');
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
    
    // Validate student
    if (createForm.role === 'student' && (!createForm.school_id || !createForm.standard || !createForm.batchYear || !createForm.examId)) {
      alert('School, Class, Batch Year, and Exam are required for students');
      return;
    }

    if (createForm.role === 'faculty' && !createForm.school_id) {
      alert('School is required for Faculty');
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
        password: selectedForEdit ? null : '203040', // Default password for new users
        school_id: createForm.school_id ? Number(createForm.school_id) : null,
        standard: createForm.standard || null,
        section: createForm.section || null,
        batch_year: createForm.batchYear || null,
        exam_id: createForm.examId ? Number(createForm.examId) : null,
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
        setCreateForm({ userid: '', name: '', role: 'student', email: '', phone: '', school_id: '', standard: '', section: '', batchYear: '', examId: '', status: 'active' });
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



  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkUploadTab === 'student') {
      if (!bulkFile || !bulkForm.school_id || !bulkForm.standard || !bulkForm.batch_year || !bulkForm.exam_id) {
        alert('Please fill all required fields and select a CSV file');
        return;
      }
    } else {
      if (!bulkFile) {
        alert('Please select a CSV file for Faculty upload');
        return;
      }
    }

    Papa.parse(bulkFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          console.error(results.errors);
          alert('Error parsing CSV file');
          return;
        }
        
        let processedData = results.data;
        if (bulkUploadTab === 'student') {
           const school = schools.find(s => String(s.id) === bulkForm.school_id);
           processedData = results.data.map((row: any) => ({
             ...row,
             emis_no: row.emis_no || row.EMIS || row.emis || '',
             student_name: row.student_name || row.name || row.Name || '',
             school_name: school ? school.school_name : '',
             class: bulkForm.standard,
             phone: row.phone || ''
           }));
        }
        
        setBulkPreviewData(processedData);
        setIsBulkUploadOpen(false);
        setIsPreviewOpen(true);
      }
    });
  };

  const confirmBulkUpload = async () => {
    setIsBulkUploading(true);
    try {
      // Unparse the preview data back to CSV
      const csvString = Papa.unparse(bulkPreviewData);
      const newBlob = new Blob([csvString], { type: 'text/csv' });
      const newFile = new File([newBlob], bulkFile?.name || 'edited.csv', { type: 'text/csv' });

      const form = new FormData();
      form.append('file', newFile);
      
      if (bulkUploadTab === 'student') {
        form.append('standard', bulkForm.standard);
        if (bulkForm.section) form.append('section', bulkForm.section);
        form.append('batch_year', bulkForm.batch_year);
        form.append('exam_id', bulkForm.exam_id);
      }
      
      const token = localStorage.getItem('token');
      const endpoint = bulkUploadTab === 'student' 
        ? `/api/admin/schools/${bulkForm.school_id}/students/import`
        : `/api/admin/users/import-faculty`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setIsPreviewOpen(false);
        setBulkFile(null);
        setBulkForm({ school_id: '', standard: '', section: '', batch_year: '', exam_id: '' });
        loadUsers();
      } else {
        alert(data.message || 'Bulk upload failed');
      }
    } catch (err) {
      console.error('Bulk upload error', err);
      alert('Bulk upload failed');
    } finally {
      setIsBulkUploading(false);
    }
  };



  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      roleFilter !== 'student' ||
      statusFilter !== 'all' ||
      classFilter !== 'all' ||
      examFilter !== 'all' ||
      schoolFilter !== 'all'
    );
  }, [searchQuery, roleFilter, statusFilter, classFilter, examFilter, schoolFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage admins, faculty, and students</p>
          </div>

          <div className="flex gap-2">
            {/* Bulk Upload Dialog */}
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload Users
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Users</DialogTitle>
                  <DialogDescription asChild>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div className="flex gap-2 mb-4">
                        <Button 
                          type="button"
                          variant={bulkUploadTab === 'student' ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setBulkUploadTab('student')}
                          className="rounded-full px-6"
                        >
                          Students
                        </Button>
                        <Button 
                          type="button"
                          variant={bulkUploadTab === 'faculty' ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setBulkUploadTab('faculty')}
                          className="rounded-full px-6"
                        >
                          Faculty
                        </Button>
                      </div>
                      
                      {bulkUploadTab === 'student' ? (
                        <>
                          Upload a CSV file to add multiple students at once. <br />
                          <a 
                            href="data:text/csv;charset=utf-8,emis_no,student_name,phone,section\n" 
                            download="student_template.csv"
                            className="text-primary underline hover:text-primary/80 mt-1 inline-block"
                          >
                            Download Student Template
                          </a>
                        </>
                      ) : (
                        <>
                          Upload a CSV file to add multiple faculty members to a school. <br />
                          <a 
                            href="data:text/csv;charset=utf-8,udise_code,faculty_name,phone,email\n" 
                            download="faculty_template.csv"
                            className="text-primary underline hover:text-primary/80 mt-1 inline-block"
                          >
                            Download Faculty Template
                          </a>
                        </>
                      )}
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePreview} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {bulkUploadTab === 'student' && (
                      <div className="space-y-2 col-span-2">
                        <Label>School *</Label>
                        <Select value={bulkForm.school_id} onValueChange={(v) => setBulkForm(p => ({ ...p, school_id: v }))} required>
                          <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                          <SelectContent>
                            {schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.school_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {bulkUploadTab === 'student' && (
                      <div className="space-y-2 col-span-2">
                        <Label>Exam Type *</Label>
                        <Select value={bulkForm.exam_id} onValueChange={(v) => setBulkForm(p => ({ ...p, exam_id: v }))} required>
                          <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                          <SelectContent>
                            {examTypes.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {bulkUploadTab === 'student' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Class/Standard *</Label>
                          <Input value={bulkForm.standard} onChange={(e) => setBulkForm(p => ({ ...p, standard: e.target.value }))} placeholder="e.g., 12" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Section</Label>
                          <Input value={bulkForm.section} onChange={(e) => setBulkForm(p => ({ ...p, section: e.target.value }))} placeholder="e.g., A" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Batch Year *</Label>
                        <Input value={bulkForm.batch_year} onChange={(e) => setBulkForm(p => ({ ...p, batch_year: e.target.value }))} placeholder="e.g., 2025" required />
                      </div>
                    </>
                  )}
                  <div className="space-y-2 pt-2">
                    <Label>CSV File * {bulkUploadTab === 'student' ? '(Columns: emis_no, student_name)' : '(Columns: udise_code, faculty_name)'}</Label>
                    <Input type="file" accept=".csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} required />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit">Preview Data</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Preview & Edit Upload Data</DialogTitle>
                  <DialogDescription>
                    Verify and edit the data before confirming the upload.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-auto border rounded-md mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted sticky top-0 text-muted-foreground">
                      <tr>
                        {bulkPreviewData.length > 0 && Object.keys(bulkPreviewData[0]).map((key) => (
                          <th key={key} className="px-4 py-2 font-medium capitalize">
                            {key.replace('_', ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreviewData.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                          {Object.keys(row).map((key) => (
                            <td key={key} className="px-4 py-2">
                              <Input 
                                value={row[key]} 
                                onChange={(e) => {
                                  const newData = [...bulkPreviewData];
                                  newData[i][key] = e.target.value;
                                  setBulkPreviewData(newData);
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {bulkPreviewData.length === 0 && (
                        <tr>
                          <td className="px-4 py-4 text-center text-muted-foreground">No data found in CSV</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end pt-4 mt-auto">
                  <Button onClick={confirmBulkUpload} disabled={isBulkUploading || bulkPreviewData.length === 0}>
                    {isBulkUploading ? 'Uploading...' : 'Confirm & Upload'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add User Dialog */}
            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  setSelectedForEdit(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setSelectedForEdit(null);
                    setCreateForm({
                      userid: '',
                      name: '',
                      role: roleFilter === 'admin' ? 'admin' : (roleFilter === 'faculty' ? 'faculty' : 'student'),
                      email: '',
                      phone: '',
                      school_id: schools.length > 0 ? String(schools[0].id) : '',
                      standard: '',
                      section: '',
                      batchYear: new Date().getFullYear().toString(),
                      examId: examTypes.length > 0 ? String(examTypes[0].id) : '',
                      status: 'active',
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
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
                  <Label htmlFor="userid">User ID / UDISE ID <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                      required
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

                {createForm.role === 'faculty' && (
                  <div className="space-y-2">
                    <Label htmlFor="school">School (SPOC) <span className="text-destructive">*</span></Label>
                    <Select
                      value={createForm.school_id}
                      onValueChange={(v) => setCreateForm((p) => ({ ...p, school_id: v }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.length === 0 ? (
                          <SelectItem value="__none" disabled>No schools available</SelectItem>
                        ) : (
                          schools.map((school) => (
                            <SelectItem key={school.id} value={String(school.id)}>
                              {school.school_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {createForm.role === 'student' && (
                  <div className="space-y-4 border-t pt-4 mt-4 border-b pb-4">
                    <h3 className="font-semibold text-sm">Student Details</h3>
                    <div className="space-y-2">
                      <Label>School <span className="text-destructive">*</span></Label>
                      <Select value={createForm.school_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, school_id: v }))} required>
                        <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                        <SelectContent>
                          {schools.length === 0 ? <SelectItem value="__none" disabled>No schools</SelectItem> : schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.school_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Exam Type <span className="text-destructive">*</span></Label>
                        <Select value={createForm.examId} onValueChange={(v) => setCreateForm(p => ({ ...p, examId: v }))} required>
                          <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                          <SelectContent>
                            {examTypes.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Batch Year <span className="text-destructive">*</span></Label>
                        <Input value={createForm.batchYear} onChange={(e) => setCreateForm(p => ({ ...p, batchYear: e.target.value }))} placeholder="e.g., 2025" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Class/Standard <span className="text-destructive">*</span></Label>
                        <Input value={createForm.standard} onChange={(e) => setCreateForm(p => ({ ...p, standard: e.target.value }))} placeholder="e.g., 12" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Input value={createForm.section} onChange={(e) => setCreateForm(p => ({ ...p, section: e.target.value }))} placeholder="e.g., A" />
                      </div>
                    </div>
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
                        school_id: '',
                        standard: '',
                        section: '',
                        batchYear: '',
                        examId: '',
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
        <div className="flex flex-wrap gap-4 items-center bg-white/50 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100">
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
                }}
              >
                {r.label} <span className="ml-2 text-xs font-normal">({r.count})</span>
              </Button>
            ))}
          </div>

          {(roleFilter === 'student' || roleFilter === 'faculty') && (
            <div className="flex items-center gap-2">
              <Select value={schoolFilter} onValueChange={(v) => setSchoolFilter(v)}>
                <SelectTrigger className="w-[250px] rounded-xl border-gray-200 bg-white shadow-sm">
                  <SelectValue placeholder="Filter by School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={String(school.id)}>
                      {school.school_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {roleFilter === 'student' && (
            <>
              <div className="flex gap-2 flex-wrap">
                        {[{ label: 'All', value: 'all', count: users.filter(u => u.role === 'student' && (schoolFilter === 'all' || u.schoolId === schoolFilter)).length },
                          ...examTypes.map((et: any) => ({
                            label: et.name,
                            value: String(et.id),
                            count: users.filter((u) => u.role === 'student' && u.examId === String(et.id) && (schoolFilter === 'all' || u.schoolId === schoolFilter)).length
                          }))
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

              <div className="flex items-center gap-2 mt-2">
                <Label className="text-sm font-medium">Class:</Label>
                <Select value={classFilter} onValueChange={(v) => setClassFilter(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                       All Classes ({users.filter((u) => u.role === 'student').length} students)
                    </SelectItem>
                    {Array.from(new Set(users.filter(u => u.role === 'student' && u.standard).map(u => u.standard))).sort().map(std => (
                      <SelectItem key={String(std)} value={String(std)}>
                         Class {std}
                      </SelectItem>
                    ))}
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
            {classFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Class: {classFilter}
                <button onClick={() => setClassFilter('all')} className="ml-1 hover:bg-background/50 rounded-full p-0.5">
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
                  <th className="text-left text-sm font-medium text-muted-foreground px-6 py-4">Class/Exam</th>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{user.name}</p>
                            {user.isUnlinked && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">No Account</Badge>
                            )}
                          </div>
                          {user.schoolName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{user.schoolName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm">
                        <Badge variant="secondary" className="font-mono">
                          {user.emisNo || user.userid || user.id}
                        </Badge>
                        {user.isUnlinked && (
                          <p className="text-xs text-muted-foreground mt-1">EMIS No</p>
                        )}
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
                      {user.role === 'student' && user.standard ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-fit">
                            Class {user.standard} {user.section ? `- ${user.section}` : ''}
                          </Badge>
                          {user.examName && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 w-fit text-xs">
                              {user.examName}
                            </Badge>
                          )}
                        </div>
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
                                        school_id: user.schoolId || '',
                                        standard: user.standard || '',
                                        section: user.section || '',
                                        batchYear: user.batchYear || '',
                                        examId: String(user.examId) || '',
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
