import { useState, useEffect, useMemo } from 'react';
import StudentLayout from '@/components/layout/StudentLayout';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BookMarked,
  Search,
  Download,
  Eye,
  FileText,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  X,
  BookOpen,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface StudentEBook {
  id: number;
  title: string;
  exam_name?: string;
  subject_name?: string;
  class_grade?: string;
  description?: string;
  file_url: string;
  cover_url?: string;
  file_size?: string;
  file_type?: string;
  download_count: number;
  created_at: string;
}

export default function StudentEBooks() {
  const { t } = useLanguage();
  const [ebooks, setEbooks] = useState<StudentEBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('ALL');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState('ALL');
  const [nmmsFilterExpanded, setNmmsFilterExpanded] = useState(false);

  // Preview modal state
  const [previewBook, setPreviewBook] = useState<StudentEBook | null>(null);

  // Fetch student ebooks
  const fetchEBooks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; ebooks: StudentEBook[] }>('/student/ebooks');
      if (res?.success) {
        setEbooks(res.ebooks || []);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEBooks();
  }, []);

  // Extract unique exams and subjects from ebooks
  const uniqueExams = useMemo(() => {
    const exams = new Set(ebooks.map(b => b.exam_name).filter(Boolean));
    return Array.from(exams).sort();
  }, [ebooks]);

  const getSubjectsForExam = (exam: string) => {
    const subjects = new Set(ebooks.filter(b => b.exam_name === exam).map(b => b.subject_name).filter(Boolean));
    return Array.from(subjects).sort();
  };

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
        b.subject_name === selectedPaperFilter;

      return matchesSearch && matchesExam && matchesPaper;
    });
  }, [ebooks, searchQuery, selectedExamFilter, selectedPaperFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = ebooks.length;
    return { total };
  }, [ebooks]);

  // Handle download & increment
  const handleDownload = async (book: StudentEBook) => {
    try {
      await apiFetch(`/student/ebooks/${book.id}/download`, { method: 'POST' });
      setEbooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, download_count: b.download_count + 1 } : b))
      );
      toast.success(`Downloading ${book.title}...`);
      window.open(book.file_url, '_blank');
    } catch {
      window.open(book.file_url, '_blank');
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6 pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {t('E-Books & Study Materials')}
            </h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
              {t('Explore official syllabus books and question banks')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEBooks}
            disabled={loading}
            className="gap-2 self-start sm:self-auto h-9 text-xs sm:text-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('Refresh')}</span>
          </Button>
        </div>

        {/* Step 1: Exam Containers */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            1. Select Exam
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card
              className={`cursor-pointer transition-all border-2 ${selectedExamFilter === 'ALL' ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}
              onClick={() => { setSelectedExamFilter('ALL'); setSelectedPaperFilter('ALL'); }}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-base sm:text-lg text-foreground leading-tight">All Materials</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">{stats.total} Books Available</p>
                </div>
              </CardContent>
            </Card>

            {uniqueExams.map(ex => {
              const count = ebooks.filter(b => b.exam_name === ex).length;
              const isSelected = selectedExamFilter === ex;
              return (
                <Card
                  key={ex as string}
                  className={`cursor-pointer transition-all border-2 ${isSelected ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}
                  onClick={() => { setSelectedExamFilter(ex as string); setSelectedPaperFilter('ALL'); }}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-base sm:text-lg text-foreground leading-tight">{ex as string}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">{count} Books Available</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Step 2: Subject Containers */}
        {selectedExamFilter !== 'ALL' && getSubjectsForExam(selectedExamFilter).length > 0 && (
          <div className="space-y-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-secondary" />
              2. Select Paper / Subject
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card
                className={`cursor-pointer transition-all border-2 ${selectedPaperFilter === 'ALL' ? 'border-secondary bg-secondary/5 shadow-sm scale-[1.02]' : 'border-border hover:border-secondary/40 hover:bg-muted/30'}`}
                onClick={() => setSelectedPaperFilter('ALL')}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="font-bold text-sm sm:text-base text-foreground">All Papers</p>
                </CardContent>
              </Card>

              {getSubjectsForExam(selectedExamFilter).map(sub => {
                const count = ebooks.filter(b => b.exam_name === selectedExamFilter && b.subject_name === sub).length;
                const isSelected = selectedPaperFilter === sub;
                return (
                  <Card
                    key={sub as string}
                    className={`cursor-pointer transition-all border-2 ${isSelected ? 'border-secondary bg-secondary/5 shadow-sm scale-[1.02]' : 'border-border hover:border-secondary/40 hover:bg-muted/30'}`}
                    onClick={() => setSelectedPaperFilter(sub as string)}
                  >
                    <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-1">
                      <p className="font-bold text-sm sm:text-base text-foreground">{sub as string}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{count} Books</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Section: Cards Grid */}
        <div className="space-y-4 mb-4 mt-2">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-500" />
            {selectedExamFilter === 'ALL' ? '3. All Study Materials' : '3. Study Materials'}
          </h2>
        </div>
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading study materials...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card className="border border-dashed p-12 text-center bg-muted/20">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No E-Books Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              {searchQuery || selectedExamFilter !== 'ALL' || selectedPaperFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clear the filters.'
                : 'No study materials have been published yet. Please check back soon!'}
            </p>
            {(searchQuery || selectedExamFilter !== 'ALL' || selectedPaperFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedExamFilter('ALL');
                  setSelectedPaperFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map((book) => {
              const isNMMS = book.exam_name === 'NMMS';
              const isMAT = book.subject_name === 'MAT';
              const isTRUST = book.exam_name === 'TRUST';
              const isSAT = book.subject_name === 'SAT';

              return (
                <Card
                  key={book.id}
                  className="border shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden bg-card group"
                >
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Header Badges */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {book.exam_name && (
                            <Badge
                              variant="secondary"
                              className={
                                isNMMS
                                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-semibold'
                                  : isTRUST
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-xs font-semibold'
                                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 text-xs font-semibold'
                              }
                            >
                              {book.exam_name}
                            </Badge>
                          )}
                          {book.subject_name && (
                            <Badge
                              variant="outline"
                              className={
                                isMAT
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-xs font-semibold'
                                  : isSAT
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 text-xs font-semibold'
                                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 text-xs font-semibold'
                              }
                            >
                              {book.subject_name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Title & Icon */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-base leading-snug">
                            {book.title}
                          </h3>
                        </div>
                      </div>

                      {/* Description */}
                      {book.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {book.description}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 italic">
                          Official digital study material & syllabus notes.
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="uppercase font-semibold tracking-wider text-[11px]">
                          {book.file_type || 'PDF'} • {book.file_size || 'Document'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Download className="w-3 h-3" />
                          {book.download_count} {book.download_count === 1 ? 'download' : 'downloads'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => setPreviewBook(book)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Read Online
                        </Button>

                        <Button
                          size="sm"
                          className="w-full text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => handleDownload(book)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* IN-APP PDF READER MODAL */}
        <Dialog open={!!previewBook} onOpenChange={() => setPreviewBook(null)}>
          <DialogContent className="w-[95vw] sm:max-w-5xl h-[88vh] sm:h-[90vh] flex flex-col p-3 sm:p-5 bg-white">
            <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 sm:pb-4 gap-2">
              <div className="min-w-0 pr-6 sm:pr-0">
                <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 truncate">
                  {previewBook?.title}
                </DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                  {previewBook?.exam_name && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {previewBook.exam_name}
                    </Badge>
                  )}
                  {previewBook?.exam_name === 'NMMS' && previewBook?.subject_name && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {previewBook.subject_name}
                    </Badge>
                  )}
                  <span>•</span>
                  <span>{previewBook?.class_grade || 'Class 8'}</span>
                  {previewBook?.file_size && (
                    <>
                      <span>•</span>
                      <span>{previewBook.file_size}</span>
                    </>
                  )}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto sm:mr-6">
                {previewBook && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 px-2.5"
                      onClick={() => handleDownload(previewBook)}
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 px-2.5"
                      onClick={() => window.open(previewBook.file_url, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                    </Button>
                  </>
                )}
              </div>
            </DialogHeader>

            {/* Document Iframe Viewer */}
            <div className="flex-1 w-full bg-slate-100 rounded-xl overflow-hidden border mt-2 sm:mt-3 flex items-center justify-center">
              {previewBook?.file_url ? (
                <iframe
                  src={previewBook.file_url}
                  className="w-full h-full border-0"
                  title={previewBook.title}
                />
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Document preview unavailable</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
