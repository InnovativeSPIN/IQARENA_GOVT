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

  // Filter books
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

  // Statistics
  const stats = useMemo(() => {
    const total = ebooks.length;
    const nmmsCount = ebooks.filter((b) => b.exam_name === 'NMMS').length;
    const trustCount = ebooks.filter((b) => b.exam_name === 'TRUST').length;
    return { total, nmmsCount, trustCount };
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
              {t('Explore official NMMS (MAT & SAT) and TRUST syllabus books and question banks')}
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

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('Total Books')}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{stats.total}</p>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  NMMS (MAT & SAT)
                </p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 sm:mt-1">
                  {stats.nmmsCount}
                </p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0 flex items-center justify-center">
                NMMS
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card sm:col-span-2 lg:col-span-1">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  TRUST
                </p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">
                  {stats.trustCount}
                </p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0 flex items-center justify-center">
                TRUST
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search books by title, topics, exam, or paper..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 bg-background border-input text-xs sm:text-sm h-9"
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

              {/* Filters */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Unified Exam & Paper Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-3 gap-2 font-normal text-xs sm:text-sm bg-background border-input hover:bg-accent w-full sm:w-auto justify-between sm:justify-start"
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
                  <DropdownMenuContent className="w-60 p-1.5" align="start">
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

                    <div className="my-1 border-t border-border" />

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

                    <div className="my-1 border-t border-border" />

                    {/* TRUST - Direct selection */}
                    <DropdownMenuItem
                      className="cursor-pointer py-2 px-3 rounded-md flex items-center justify-between hover:bg-amber-50/70 dark:hover:bg-amber-950/40"
                      onClick={() => {
                        setSelectedExamFilter('TRUST');
                        setSelectedPaperFilter('ALL');
                      }}
                    >
                      <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                        TRUST
                      </span>
                      {selectedExamFilter === 'TRUST' && (
                        <Check className="w-4 h-4 text-amber-600 ml-2" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {(searchQuery || selectedExamFilter !== 'ALL' || selectedPaperFilter !== 'ALL') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
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

        {/* Content Section: Cards Grid */}
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
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-xs font-semibold'
                              }
                            >
                              {book.exam_name}
                            </Badge>
                          )}
                          {isNMMS && book.subject_name && (
                            <Badge
                              variant="outline"
                              className={
                                isMAT
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-xs font-semibold'
                                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 text-xs font-semibold'
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
