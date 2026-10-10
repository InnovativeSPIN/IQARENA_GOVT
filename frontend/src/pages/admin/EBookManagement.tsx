import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BookMarked,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Edit,
  FileText,
  ExternalLink,
  CheckCircle2,
  UploadCloud,
  X,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface EBook {
  id: number;
  title: string;
  author?: string;
  class_grade?: string;
  subject_name?: string;
  exam_name?: string;
  description?: string;
  file_url: string;
  cover_url?: string;
  file_size?: string;
  file_type?: string;
  status: number | boolean;
  download_count: number;
  created_at: string;
}

export default function EBookManagement() {
  const { t } = useLanguage();
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('ALL');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState('ALL');
  const [nmmsFilterExpanded, setNmmsFilterExpanded] = useState(false);
  const [nmmsModalExpanded, setNmmsModalExpanded] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<EBook | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview modal
  const [previewBook, setPreviewBook] = useState<EBook | null>(null);

  // Form State: starts with empty exam, subject, and class so placeholders show
  const [formData, setFormData] = useState({
    title: '',
    exam_name: '',
    subject_name: '',
    class_grade: '',
    description: '',
    status: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string>('');

  // Fetch EBooks
  const fetchEBooks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/ebooks');
      if (res.success) {
        setEbooks(res.ebooks || []);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to load E-Books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEBooks();
  }, []);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return ebooks.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.exam_name && b.exam_name.toLowerCase().includes(q)) ||
        (b.subject_name && b.subject_name.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q));

      const matchesExam = selectedExamFilter === 'ALL' || b.exam_name === selectedExamFilter;
      const matchesPaper =
        selectedPaperFilter === 'ALL' ||
        (b.exam_name === 'NMMS' && b.subject_name === selectedPaperFilter);

      return matchesSearch && matchesExam && matchesPaper;
    });
  }, [ebooks, searchQuery, selectedExamFilter, selectedPaperFilter]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = ebooks.length;
    const nmmsCount = ebooks.filter((b) => b.exam_name === 'NMMS').length;
    const trustCount = ebooks.filter((b) => b.exam_name === 'TRUST').length;
    return { total, nmmsCount, trustCount };
  }, [ebooks]);

  const handleOpenAddModal = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      exam_name: '',
      subject_name: '',
      class_grade: '',
      description: '',
      status: true,
    });
    setSelectedFile(null);
    setExistingFileUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: EBook) => {
    setEditingBook(book);
    setFormData({
      title: book.title || '',
      exam_name: book.exam_name || '',
      subject_name: book.exam_name === 'TRUST' ? '' : (book.subject_name || ''),
      class_grade: book.class_grade || '',
      description: book.description || '',
      status: book.status === 1 || book.status === true,
    });
    setSelectedFile(null);
    setExistingFileUrl(book.file_url || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this E-Book?')) return;
    try {
      await apiFetch(`/admin/ebooks/${id}`, { method: 'DELETE' });
      toast.success('E-Book deleted successfully');
      setEbooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to delete E-Book');
    }
  };

  const handleDownload = async (book: EBook) => {
    try {
      await apiFetch(`/admin/ebooks/${book.id}/download`, { method: 'POST' });
      setEbooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, download_count: b.download_count + 1 } : b))
      );
      window.open(book.file_url, '_blank');
    } catch {
      window.open(book.file_url, '_blank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('E-Book title is required');
      return;
    }

    if (!formData.exam_name) {
      toast.error('Please choose Exam (NMMS or TRUST)');
      return;
    }

    if (formData.exam_name === 'NMMS' && !formData.subject_name) {
      toast.error('Please choose Paper (MAT or SAT) for NMMS');
      return;
    }

    if (!formData.class_grade) {
      toast.error('Please select Class');
      return;
    }

    if (!selectedFile && !existingFileUrl && !editingBook) {
      toast.error('Please select an E-Book PDF file to upload');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append('title', formData.title.trim());
      body.append('exam_name', formData.exam_name);
      body.append('subject_name', formData.exam_name === 'TRUST' ? '' : (formData.subject_name || ''));
      body.append('class_grade', formData.class_grade);
      body.append('description', formData.description.trim());
      body.append('status', formData.status ? '1' : '0');

      if (selectedFile) {
        body.append('file', selectedFile);
      }

      if (editingBook) {
        await apiFetch(`/admin/ebooks/${editingBook.id}`, {
          method: 'PUT',
          body,
        });
        toast.success('E-Book updated successfully');
      } else {
        await apiFetch('/admin/ebooks', {
          method: 'POST',
          body,
        });
        toast.success('E-Book added successfully');
      }

      setIsModalOpen(false);
      fetchEBooks();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Error saving E-Book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                <BookMarked className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground font-display truncate">
                {t('E-Book Management')}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Upload and manage NMMS & TRUST study materials, question banks, and syllabus guides.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEBooks}
              disabled={loading}
              className="gap-1.5 text-xs sm:text-sm h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Add E-Book</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total E-Books
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
                <BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card hover:shadow-sm transition-shadow">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  NMMS Materials
                </p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-0.5 sm:mt-1">{stats.nmmsCount}</p>
              </div>
              <div className="px-2.5 py-1 sm:p-3 bg-indigo-500/10 text-indigo-600 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center">
                NMMS
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card hover:shadow-sm transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  TRUST Materials
                </p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 sm:mt-1">{stats.trustCount}</p>
              </div>
              <div className="px-2.5 py-1 sm:p-3 bg-amber-500/10 text-amber-600 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center">
                TRUST
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Control Bar */}
        <Card className="border shadow-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by title, exam, paper, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 text-xs sm:text-sm h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Unified Exam & Paper Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-3 gap-2 font-normal text-xs sm:text-sm bg-background border-input hover:bg-accent/40"
                    >
                      {selectedExamFilter === 'ALL' ? (
                        <span className="text-muted-foreground">All Exams</span>
                      ) : selectedExamFilter === 'TRUST' ? (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-xs py-0 px-1.5"
                          >
                            TRUST
                          </Badge>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Badge
                            variant="secondary"
                            className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs py-0 px-1.5"
                          >
                            NMMS
                          </Badge>
                          {selectedPaperFilter !== 'ALL' && (
                            <span className="text-xs text-foreground font-semibold">
                              ({selectedPaperFilter})
                            </span>
                          )}
                        </span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60 p-1.5" align="end">
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-3 rounded-md flex items-center justify-between"
                      onClick={() => {
                        setSelectedExamFilter('ALL');
                        setSelectedPaperFilter('ALL');
                      }}
                    >
                      <span className="font-medium text-sm">All Exams</span>
                      {selectedExamFilter === 'ALL' && (
                        <Check className="w-4 h-4 text-primary ml-2" />
                      )}
                    </DropdownMenuItem>

                    <div className="my-1 border-t border-border/50" />

                    {/* NMMS Downward Hover Container: opens on hover, closes when hover removed */}
                    <div
                      onMouseEnter={() => setNmmsFilterExpanded(true)}
                      onMouseLeave={() => setNmmsFilterExpanded(false)}
                      className="relative rounded-md transition-colors"
                    >
                      <div
                        className="flex items-center justify-between py-2 px-3 rounded-md cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors"
                        onClick={() => {
                          setSelectedExamFilter('NMMS');
                          setSelectedPaperFilter('ALL');
                          setNmmsFilterExpanded(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                            NMMS
                          </span>
                        </div>
                        {selectedExamFilter === 'NMMS' && selectedPaperFilter === 'ALL' && (
                          <Check className="w-4 h-4 text-indigo-600 ml-auto mr-1.5" />
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-indigo-600 transition-transform duration-200 ${
                            nmmsFilterExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>

                      {/* NMMS downward sub-items: only MAT and SAT */}
                      {nmmsFilterExpanded && (
                        <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4 my-1">
                          <DropdownMenuItem
                            className="cursor-pointer py-1.5 px-2.5 rounded-md text-xs flex items-center justify-between"
                            onClick={() => {
                              setSelectedExamFilter('NMMS');
                              setSelectedPaperFilter('MAT');
                              setNmmsFilterExpanded(false);
                            }}
                          >
                            <span className="font-medium">MAT (Mental Ability Test)</span>
                            {selectedExamFilter === 'NMMS' && selectedPaperFilter === 'MAT' && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 ml-2" />
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer py-1.5 px-2.5 rounded-md text-xs flex items-center justify-between"
                            onClick={() => {
                              setSelectedExamFilter('NMMS');
                              setSelectedPaperFilter('SAT');
                              setNmmsFilterExpanded(false);
                            }}
                          >
                            <span className="font-medium">SAT (Scholastic Aptitude Test)</span>
                            {selectedExamFilter === 'NMMS' && selectedPaperFilter === 'SAT' && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 ml-2" />
                            )}
                          </DropdownMenuItem>
                        </div>
                      )}
                    </div>

                    <div className="my-1 border-t border-border/50" />

                    {/* TRUST - Direct item below NMMS */}
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-3 rounded-md flex items-center justify-between hover:bg-amber-50/70 dark:hover:bg-amber-950/40"
                      onClick={() => {
                        setSelectedExamFilter('TRUST');
                        setSelectedPaperFilter('ALL');
                      }}
                    >
                      <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                        TRUST
                      </span>
                      {selectedExamFilter === 'TRUST' && (
                        <Check className="w-4 h-4 text-amber-600 ml-2" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedExamFilter !== 'ALL' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedExamFilter('ALL');
                      setSelectedPaperFilter('ALL');
                    }}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Section: Mobile Cards on <md, Clean Table on >=md */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading E-Books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card className="border border-dashed p-8 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">No E-Books Found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              {searchQuery || selectedExamFilter !== 'ALL' || selectedPaperFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clear the filters.'
                : 'Get started by uploading your first NMMS or TRUST study material.'}
            </p>
            <Button onClick={handleOpenAddModal} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add E-Book
            </Button>
          </Card>
        ) : (
          <>
            {/* Mobile Cards View (<md) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
              {filteredBooks.map((book) => (
                <Card key={book.id} className="border shadow-xs bg-card flex flex-col justify-between">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {book.exam_name && (
                        <Badge
                          variant="secondary"
                          className={
                            book.exam_name === 'NMMS'
                              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-semibold'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-xs font-semibold'
                          }
                        >
                          {book.exam_name}
                        </Badge>
                      )}
                      {book.exam_name === 'NMMS' && book.subject_name && (
                        <Badge
                          variant="outline"
                          className={
                            book.subject_name === 'MAT'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-xs font-semibold'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 text-xs font-semibold'
                          }
                        >
                          {book.subject_name}
                        </Badge>
                      )}
                      {book.class_grade && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {book.class_grade}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center text-primary mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                          {book.title}
                        </h4>
                        {book.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {book.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1"
                          onClick={() => setPreviewBook(book)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleDownload(book)}
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditModal(book)}
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(book.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View (>=md) */}
            <div className="hidden md:block bg-card rounded-xl border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Book Details</th>
                      <th className="py-3.5 px-4">Exam & Paper</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredBooks.map((book) => {
                      return (
                        <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                          {/* Title & Icon */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center text-primary shadow-xs">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate max-w-sm">
                                  {book.title}
                                </p>
                                {book.description && (
                                  <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5 max-w-md">
                                    {book.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Exam & Paper */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {book.exam_name && (
                                  <Badge
                                    variant="secondary"
                                    className={
                                      book.exam_name === 'NMMS'
                                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-semibold'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-xs font-semibold'
                                    }
                                  >
                                    {book.exam_name}
                                  </Badge>
                                )}
                                {book.exam_name === 'NMMS' && book.subject_name && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      book.subject_name === 'MAT'
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-xs font-semibold'
                                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 text-xs font-semibold'
                                    }
                                  >
                                    {book.subject_name}
                                  </Badge>
                                )}
                              </div>
                              {book.class_grade && (
                                <span className="text-xs text-muted-foreground">
                                  {book.class_grade}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => setPreviewBook(book)}
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => handleDownload(book)}
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditModal(book)}
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(book.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ADD / EDIT MODAL */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-display">
                <BookMarked className="w-5 h-5 text-primary" />
                {editingBook ? 'Edit E-Book' : 'Add New E-Book'}
              </DialogTitle>
              <DialogDescription>
                {editingBook
                  ? 'Update book metadata, replacement document, or publication status.'
                  : 'Upload digital syllabus books and question banks up to 500MB.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  E-Book Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. NMMS MAT Mental Ability Practice Guide"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Exam / Scheme and Class Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cascading Choose Exam Dropdown */}
                <div className="space-y-1.5">
                  <Label>
                    Exam / Scheme <span className="text-destructive">*</span>
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between font-normal h-10 px-3 bg-background border-input hover:bg-accent/40"
                      >
                        {formData.exam_name ? (
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            <Badge
                              variant="secondary"
                              className={
                                formData.exam_name === 'NMMS'
                                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200'
                              }
                            >
                              {formData.exam_name}
                            </Badge>
                            {formData.exam_name === 'NMMS' && formData.subject_name ? (
                              <span>{formData.subject_name}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Choose Exam</span>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-1.5" align="start">
                      {/* NMMS Downward Hover Container */}
                      <div
                        onMouseEnter={() => setNmmsModalExpanded(true)}
                        onMouseLeave={() => setNmmsModalExpanded(false)}
                        className="relative rounded-md transition-colors"
                      >
                        <div
                          className="flex items-center justify-between py-2 px-3 rounded-md cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors"
                          onClick={() => setNmmsModalExpanded(!nmmsModalExpanded)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm">
                              NMMS
                            </span>
                            <span className="text-[10px] text-indigo-500/80 bg-indigo-500/10 px-1.5 py-0.5 rounded-full font-medium">
                              Choose Paper
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-indigo-500 transition-transform duration-200 ${
                              nmmsModalExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>

                        {/* NMMS downward items */}
                        {nmmsModalExpanded && (
                          <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4 my-1">
                            <DropdownMenuItem
                              className="cursor-pointer py-1.5 px-2.5 rounded-md text-xs flex items-center justify-between"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  exam_name: 'NMMS',
                                  subject_name: 'MAT',
                                });
                                setNmmsModalExpanded(false);
                              }}
                            >
                              <span>MAT (Mental Ability Test)</span>
                              {formData.exam_name === 'NMMS' && formData.subject_name === 'MAT' && (
                                <Check className="w-3.5 h-3.5 text-indigo-600 ml-2" />
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer py-1.5 px-2.5 rounded-md text-xs flex items-center justify-between"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  exam_name: 'NMMS',
                                  subject_name: 'SAT',
                                });
                                setNmmsModalExpanded(false);
                              }}
                            >
                              <span>SAT (Scholastic Aptitude Test)</span>
                              {formData.exam_name === 'NMMS' && formData.subject_name === 'SAT' && (
                                <Check className="w-3.5 h-3.5 text-indigo-600 ml-2" />
                              )}
                            </DropdownMenuItem>
                          </div>
                        )}
                      </div>

                      <div className="my-1 border-t border-border/50" />

                      {/* TRUST - Direct item */}
                      <DropdownMenuItem
                        className="cursor-pointer py-2 px-3 rounded-md flex items-center justify-between hover:bg-amber-50/70 dark:hover:bg-amber-950/40"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            exam_name: 'TRUST',
                            subject_name: '',
                          });
                        }}
                      >
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                          TRUST
                        </span>
                        {formData.exam_name === 'TRUST' && (
                          <Check className="w-4 h-4 text-amber-600 ml-2" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Class / Grade */}
                <div className="space-y-1.5">
                  <Label htmlFor="class_grade">Class / Grade</Label>
                  <Select
                    value={formData.class_grade || undefined}
                    onValueChange={(val) => setFormData({ ...formData, class_grade: val })}
                  >
                    <SelectTrigger id="class_grade">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Class 7">Class 7</SelectItem>
                      <SelectItem value="Class 8">Class 8</SelectItem>
                      <SelectItem value="Class 9">Class 9</SelectItem>
                      <SelectItem value="Class 10">Class 10</SelectItem>
                      <SelectItem value="General">General / All Grades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Document File Upload (Up to 500MB) */}
              <div className="space-y-1.5 pt-1">
                <Label>
                  Upload PDF File {!editingBook && <span className="text-destructive">*</span>}
                </Label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
                  <input
                    type="file"
                    id="ebookFile"
                    accept=".pdf,.epub,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 500 * 1024 * 1024) {
                          toast.error('File size exceeds 500MB limit');
                          return;
                        }
                        setSelectedFile(file);
                      }
                    }}
                  />
                  <label htmlFor="ebookFile" className="cursor-pointer block">
                    <UploadCloud className="w-10 h-10 text-primary mx-auto mb-2.5" />
                    <span className="text-sm font-semibold text-foreground block">
                      {selectedFile
                        ? selectedFile.name
                        : existingFileUrl
                        ? 'Replace existing document'
                        : 'Click to browse PDF file'}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Supports PDF, EPUB up to 500MB
                    </span>
                  </label>
                  {selectedFile && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-xs font-mono text-emerald-600 bg-emerald-500/10 py-1 px-2.5 rounded-md inline-flex items-center gap-1.5 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  {!selectedFile && existingFileUrl && (
                    <p className="mt-2 text-xs text-muted-foreground truncate max-w-sm mx-auto">
                      Current: {existingFileUrl.split('/').pop()}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="desc">Brief Description / Syllabus Topics</Label>
                <textarea
                  id="desc"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Summary of chapters, key concepts..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Publication Status</p>
                  <p className="text-xs text-muted-foreground">
                    Active e-books are immediately accessible to students.
                  </p>
                </div>
                <Switch
                  checked={formData.status}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : editingBook ? (
                    'Update E-Book'
                  ) : (
                    'Save & Publish'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* PREVIEW MODAL */}
        <Dialog open={!!previewBook} onOpenChange={() => setPreviewBook(null)}>
          <DialogContent className="w-[95vw] sm:max-w-4xl h-[88vh] sm:h-[85vh] flex flex-col p-3 sm:p-4 gap-2">
            <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
              <div className="min-w-0 pr-6 sm:pr-0">
                <DialogTitle className="text-base sm:text-lg font-bold truncate">
                  {previewBook?.title}
                </DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {previewBook?.exam_name || 'NMMS'}
                  </Badge>
                  {previewBook?.exam_name === 'NMMS' && previewBook?.subject_name && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {previewBook.subject_name}
                      </Badge>
                    </>
                  )}
                  <span>•</span>
                  <span>{previewBook?.class_grade || 'Class 8'}</span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto sm:mr-6">
                {previewBook && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-8 px-2.5"
                      onClick={() => handleDownload(previewBook)}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-8 px-2.5"
                      onClick={() => window.open(previewBook.file_url, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                    </Button>
                  </>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border mt-1 flex items-center justify-center">
              {previewBook?.file_url ? (
                <iframe
                  src={previewBook.file_url}
                  className="w-full h-full border-0"
                  title={previewBook.title}
                />
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Document preview unavailable</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
