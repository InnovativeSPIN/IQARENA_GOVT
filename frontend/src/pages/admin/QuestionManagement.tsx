import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  BookOpen,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Question, Subject, Topic } from '@/types/admin';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { getUploadUrl } from '@/lib/utils';

declare global {
  interface Window {
    katex?: { renderToString: (text: string, opts?: { throwOnError?: boolean }) => string };
  }
}


// Subject mapping (case-insensitive matching in the getters below)
const subjectIcons = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Brain,
  mathematics: Calculator,
};

const subjectColors = {
  physics: 'from-orange-500 via-orange-600 to-orange-700',
  chemistry: 'from-orange-400 via-orange-500 to-orange-600',
  biology: 'from-orange-600 via-orange-700 to-orange-800',
  mathematics: 'from-orange-500 via-amber-600 to-orange-700',
};

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFormPreviewOpen, setIsFormPreviewOpen] = useState(false); // Separate preview for form data
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [keepDialogOpen, setKeepDialogOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Dialog form state for Add/Edit
  const [dialogExam, setDialogExam] = useState<number | null>(null);
  const [dialogSubject, setDialogSubject] = useState<number | null>(null);
  const [dialogTopic, setDialogTopic] = useState<number | null>(null);
  const [dialogSubjects, setDialogSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [dialogTopics, setDialogTopics] = useState<Array<{ id: number; name: string }>>([]);
  const [dialogSubtopic, setDialogSubtopic] = useState<number | null>(null);
  const [dialogSubtopics, setDialogSubtopics] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingDialogSubtopics, setLoadingDialogSubtopics] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
    marks: number;
  }>({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
    marks: 4,
  });
  const [formImages, setFormImages] = useState({
    questionImage: '',
    optionAImage: '',
    optionBImage: '',
    optionCImage: '',
    optionDImage: '',
    explanationImage: '' // <-- add explanation image field
  });
  // Local preview URLs for files selected by the user before upload completes
  const [localPreviews, setLocalPreviews] = useState({
    questionImage: '',
    optionAImage: '',
    optionBImage: '',
    optionCImage: '',
    optionDImage: '',
    explanationImage: '' // <-- add explanation image field
  });
  // Track images that are pending removal on Save (Edit flow)
  const [pendingRemoval, setPendingRemoval] = useState<Record<keyof typeof formImages, boolean>>({
    questionImage: false,
    optionAImage: false,
    optionBImage: false,
    optionCImage: false,
    optionDImage: false,
    explanationImage: false
  });

  // Snapshot of original images when opening Edit dialog so we can undo pending removal
  const [originalImages, setOriginalImages] = useState<typeof formImages>({
    questionImage: '',
    optionAImage: '',
    optionBImage: '',
    optionCImage: '',
    optionDImage: '',
    explanationImage: ''
  });

  // Image component that prioritizes local blob URL (for instant preview), then server URL
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
    // Priority: local blob URL > server URL
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
      // Check if image is taller than max height
      if (imgRef.current && maxHeight) {
        const maxHeightPx = parseInt(maxHeight);
        if (imgRef.current.naturalHeight > maxHeightPx) {
          setIsOverflowing(true);
        }
      }
    }, [imgSrc, maxHeight]);
    
    const handleError = () => {
      console.warn('Failed to load image:', imgSrc, 'for alt:', alt);
      
      // If local blob failed, try server URL
      if (imgSrc.startsWith('blob:') && src) {
        setImgSrc(getUploadUrl(src));
        return;
      }
      
      // Try alternative server path
      if (src && !String(imgSrc).startsWith('http') && !String(imgSrc).startsWith('blob:')) {
        const attempt = getUploadUrl(src.startsWith('/') ? src : `/uploads/${src}`);
        if (attempt !== imgSrc) {
          setImgSrc(attempt);
          return;
        }
      }
      
      // Fallback: hide the image on final failure
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
            <Eye className="w-3 h-3" />
            View Full
          </div>
        )}
      </div>
    );
  };
  const [uploadingImage, setUploadingImage] = useState(false);
  const [useImages, setUseImages] = useState(false); // for Add dialog
  const [editUseImages, setEditUseImages] = useState(false); // for Edit dialog
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetched data from backend
  const [examTypes, setExamTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string; examType: string }>>([]);
  const [topics, setTopics] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [subjectCounts, setSubjectCounts] = useState<Record<number, number>>({});
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({});
  const [subtopicCounts, setSubtopicCounts] = useState<Record<number, number>>({});
  // Bulk upload state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [applyTopicToAll, setApplyTopicToAll] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Fetch exams on mount
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/exams`);
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setExamTypes(data.exams);
        }
      } catch (err) {
        console.error('Error fetching exams:', err);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  // Fetch subjects when exam changes
  useEffect(() => {
    if (!selectedExam) {
      setSubjects([]);
      setSelectedSubject(null);
      setSelectedTopic(null);
      setSubjectCounts({});
      return;
    }
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${selectedExam}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.subjects)) {
          setSubjects(data.subjects);
          
          // Fetch question counts for each subject (use pagination.total if available, otherwise fallback to questions array length)
          const counts: Record<number, number> = {};
          await Promise.all(
            data.subjects.map(async (subject: Subject) => {
              try {
                const countRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${subject.id}`);
                const countData = await countRes.json();
                // Prefer total from pagination, fallback to questions array length
                const total = (countData && countData.pagination && (countData.pagination.total ?? null)) ?? (Array.isArray(countData.questions) ? countData.questions.length : 0);
                counts[subject.id] = Number(total) || 0;
              } catch (err) {
                console.error(`Error fetching count for subject ${subject.id}:`, err);
                counts[subject.id] = 0;
              }
            })
          );
          setSubjectCounts(counts);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [selectedExam]);

  // Fetch topics when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setTopics([]);
      setSelectedTopic(null);
      setTopicCounts({});
      return;
    }
    const fetchTopics = async () => {
      setLoadingTopics(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${selectedSubject}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.topics)) {
          setTopics(data.topics);
          
          // Fetch question counts for each topic (use pagination.total if available, otherwise fallback to questions array length)
          const counts: Record<number, number> = {};
          await Promise.all(
            data.topics.map(async (topic: Topic) => {
              try {
                const countRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topic.id}`);
                const countData = await countRes.json();
                const total = (countData && countData.pagination && (countData.pagination.total ?? null)) ?? (Array.isArray(countData.questions) ? countData.questions.length : 0);
                counts[topic.id] = Number(total) || 0;
              } catch (err) {
                console.error(`Error fetching count for topic ${topic.id}:`, err);
                counts[topic.id] = 0;
              }
            })
          );
          setTopicCounts(counts);
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopics();
  }, [selectedSubject]);

  // Fetch subjects for dialog when dialog exam changes
  useEffect(() => {
    if (!dialogExam) {
      setDialogSubjects([]);
      setDialogSubject(null);
      setDialogTopics([]);
      setDialogTopic(null);
      return;
    }
    const fetchDialogSubjects = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${dialogExam}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.subjects)) {
          setDialogSubjects(data.subjects);
        }
      } catch (err) {
        console.error('Error fetching dialog subjects:', err);
      }
    };
    fetchDialogSubjects();
  }, [dialogExam]);

  // Fetch topics for dialog when dialog subject changes
  useEffect(() => {
    if (!dialogSubject) {
      setDialogTopics([]);
      setDialogTopic(null);
      setDialogSubtopics([]);
      setDialogSubtopic(null);
      return;
    }
    const fetchDialogTopics = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${dialogSubject}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.topics)) {
          setDialogTopics(data.topics);
        }
      } catch (err) {
        console.error('Error fetching dialog topics:', err);
      }
    };
    fetchDialogTopics();
  }, [dialogSubject]);

  // Fetch subtopics for selected topic in dialog
  useEffect(() => {
    if (!dialogTopic) {
      setDialogSubtopics([]);
      setDialogSubtopic(null);
      return;
    }
    const fetchDialogSubtopics = async () => {
      setLoadingDialogSubtopics(true);
      // reset previously selected subtopic when topic changes
      setDialogSubtopic(null);
      console.log('Fetching subtopics for topic', dialogTopic);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${dialogTopic}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.subtopics)) {
          const mapped = data.subtopics.map((s: any) => ({ id: Number(s.id), name: s.name }));
          setDialogSubtopics(mapped);
          if (!mapped.length) console.log('No subtopics found for topic', dialogTopic);

          // Fetch question counts for each subtopic (fallback to questions.length when pagination missing)
          const scounts: Record<number, number> = {};
          await Promise.all(
            mapped.map(async (s) => {
              try {
                const r = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subtopicId=${s.id}`);
                const d = await r.json();
                const total = (d && d.pagination && (d.pagination.total ?? null)) ?? (Array.isArray(d.questions) ? d.questions.length : 0);
                scounts[s.id] = Number(total) || 0;
              } catch (err) {
                console.error(`Error fetching count for subtopic ${s.id}:`, err);
                scounts[s.id] = 0;
              }
            })
          );
          setSubtopicCounts(scounts);
        }
      } catch (err) {
        console.error('Error fetching dialog subtopics:', err);
      }
      setLoadingDialogSubtopics(false);
    };
    fetchDialogSubtopics();
  }, [dialogTopic]);

  // Download template helpers
  const handleDownloadCsvTemplate = () => {
    const csv = 'examId,subjectId,topicId,subtopicId,questionText,questionImage,optionA,optionAImage,optionB,optionBImage,optionC,optionCImage,optionD,optionDImage,correctAnswer,explanation,explanationImage,marks\n1,2,3,10,"What is 2+2?",,,"3",,"4",,"5",,"6",,"B","Basic addition",,4';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonTemplate = () => {
    const json = [{ examId:1, subjectId:2, topicId:3, subtopicId:10, questionText:'What is 2+2?', questionImage:null, optionA:'3', optionAImage:null, optionB:'4', optionBImage:null, optionC:'5', optionCImage:null, optionD:'6', optionDImage:null, correctAnswer:'B', explanation:'Basic addition', explanationImage:null, marks:4 }];
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk upload handler
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert('Please choose a CSV or JSON file to upload');
      return;
    }

    const form = new FormData();
    form.append('file', bulkFile);
    if (applyTopicToAll && dialogTopic) {
      form.append('topicId', String(dialogTopic));
    }
    if (applyTopicToAll && dialogSubtopic) {
      form.append('subtopicId', String(dialogSubtopic));
    }
    if (dialogExam) form.append('examId', String(dialogExam));
    if (dialogSubject) form.append('subjectId', String(dialogSubject));

    try {
      setBulkUploading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions/bulk-upload`, {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Bulk upload successful');
        setIsBulkUploadOpen(false);
        setBulkFile(null);
        // Optionally refresh questions
        const fetchUrl = selectedTopic 
          ? `${import.meta.env.VITE_API_URL}/admin/questions?topicId=${selectedTopic}`
          : selectedSubject
          ? `${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${selectedSubject}`
          : selectedExam
          ? `${import.meta.env.VITE_API_URL}/admin/questions?examId=${selectedExam}`
          : `${import.meta.env.VITE_API_URL}/admin/questions`;
        const refreshRes = await fetch(fetchUrl);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setQuestions(refreshData.questions);
      } else {
        alert(data.message || 'Bulk upload failed');
      }
    } catch (err) {
      console.error('Bulk upload error', err);
      alert('Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  // Fetch questions when filters change
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      try {
        let url = `${import.meta.env.VITE_API_URL}/admin/questions?`;
        if (selectedTopic) {
          url += `topicId=${selectedTopic}`;
        } else if (selectedSubject) {
          url += `subjectId=${selectedSubject}`;
        } else if (selectedExam) {
          url += `examId=${selectedExam}`;
        }
        if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.questions)) {
          setQuestions(data.questions);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [selectedExam, selectedSubject, selectedTopic, searchQuery]);

  // Use questions directly from API (already filtered)
  const filteredQuestions = questions;

  // Keep counts in sync when the questions list changes (e.g., after create/update/delete)
  useEffect(() => {
    const refreshCounts = async () => {
      try {
        if (selectedSubject) {
          // Recompute topic counts for this subject
          const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${selectedSubject}`);
          const data = await res.json();
          if (data && Array.isArray(data.topics)) {
            const counts: Record<number, number> = {};
            await Promise.all(
              data.topics.map(async (topic: Topic) => {
                try {
                  const r = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topic.id}`);
                  const d = await r.json();
                  const total = (d && d.pagination && (d.pagination.total ?? null)) ?? (Array.isArray(d.questions) ? d.questions.length : 0);
                  counts[topic.id] = Number(total) || 0;
                } catch (err) {
                  counts[topic.id] = 0;
                }
              })
            );
            setTopicCounts(counts);
          }
        } else if (selectedExam) {
          // Recompute subject counts for this exam
          const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${selectedExam}`);
          const data = await res.json();
          if (data && Array.isArray(data.subjects)) {
            const counts: Record<number, number> = {};
            await Promise.all(
              data.subjects.map(async (subject: Subject) => {
                try {
                  const r = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${subject.id}`);
                  const d = await r.json();
                  const total = (d && d.pagination && (d.pagination.total ?? null)) ?? (Array.isArray(d.questions) ? d.questions.length : 0);
                  counts[subject.id] = Number(total) || 0;
                } catch (err) {
                  counts[subject.id] = 0;
                }
              })
            );
            setSubjectCounts(counts);
          }
        }
      } catch (err) {
        console.warn('Failed to refresh counts on questions change', err);
      }
    };

    refreshCounts();
  }, [questions, selectedSubject, selectedExam]);

  const clearFilters = () => {
    setSelectedExam(null);
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSearchQuery('');
  };

  const handleExamChange = (examId: number | null) => {
    setSelectedExam(examId);
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  const handleSubjectChange = (subjectId: number | null) => {
    setSelectedSubject(subjectId);
    setSelectedTopic(null);
  };

  const handleTopicChange = (topicId: number | null) => {
    setSelectedTopic(topicId);
  };

  const resetDialogState = (keepContext = false) => {
    if (!keepContext) {
      setDialogExam(null);
      setDialogSubject(null);
      setDialogTopic(null);
      setDialogSubjects([]);
      setDialogTopics([]);
      setDialogSubtopics([]);
      setDialogSubtopic(null);
      setFormImages({
        questionImage: '',
        optionAImage: '',
        optionBImage: '',
        optionCImage: '',
        optionDImage: '',
        explanationImage: ''
      });
      // Revoke all blob URLs to prevent memory leaks
      Object.values(localPreviews).forEach((url) => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.warn('Failed to revoke blob URL', e);
          }
        }
      });
      setLocalPreviews({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' });
      setUseImages(false);
      // Clear any pending removals
      setPendingRemoval({ questionImage: false, optionAImage: false, optionBImage: false, optionCImage: false, optionDImage: false, explanationImage: false });
      setOriginalImages({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' });
    }
    setFormData({
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      explanation: '',
      marks: 4,
    });
  };

  const handleCreateQuestion = async (e: React.FormEvent, saveAndNext = false) => {
    e.preventDefault();
    if (!dialogTopic) {
      alert('Please select a topic');
      return;
    }
    if (!formData.questionText || formData.questionText.trim() === '') {
      alert('Question text is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: dialogTopic,
          subtopicId: dialogSubtopic ?? undefined,
          questionText: formData.questionText,
          questionImage: formImages.questionImage || undefined,
          optionA: formData.optionA,
          optionAImage: formImages.optionAImage || undefined,
          optionB: formData.optionB,
          optionBImage: formImages.optionBImage || undefined,
          optionC: formData.optionC,
          optionCImage: formImages.optionCImage || undefined,
          optionD: formData.optionD,
          optionDImage: formImages.optionDImage || undefined,
          correctAnswer: formData.correctAnswer,
          explanation: formData.explanation,
          explanationImage: formImages.explanationImage || undefined, // <-- add explanation image
          marks: formData.marks,
          useImageMode: useImages // <-- send image mode flag
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        if (saveAndNext) {
          // Keep dialog open, only reset form data
          resetDialogState(true);
          setKeepDialogOpen(true);
        } else {
          setIsCreateOpen(false);
          resetDialogState(false);
        }
        // Refetch questions
        const fetchUrl = selectedTopic 
          ? `${import.meta.env.VITE_API_URL}/admin/questions?topicId=${selectedTopic}`
          : selectedSubject
          ? `${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${selectedSubject}`
          : selectedExam
          ? `${import.meta.env.VITE_API_URL}/admin/questions?examId=${selectedExam}`
          : `${import.meta.env.VITE_API_URL}/admin/questions`;
        
        const refreshRes = await fetch(fetchUrl);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setQuestions(refreshData.questions);
        }
      } else {
        alert(data.message || 'Failed to create question');
      }
    } catch (err) {
      console.error('Error creating question:', err);
      alert('Failed to create question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions/${questionId}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (data.success) {
        setQuestions(questions.filter(q => q.id !== questionId));
      } else {
        alert(data.message || 'Failed to delete question');
      }
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question');
    }
  };

  const handleToggleStatus = async (questionId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions/${questionId}/toggle-status`, {
        method: 'PATCH',
      });
      
      const data = await res.json();
      if (data.success) {
        setQuestions(questions.map(q => 
          q.id === questionId 
            ? { ...q, status: q.status === 'active' ? 'inactive' : 'active' }
            : q
        ));
      }
    } catch (err) {
      console.error('Error toggling question status:', err);
    }
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setIsPreviewOpen(true);
  };


  const handleImageUpload = async (file: File, field: keyof typeof formImages) => {
    if (!file) return;
    
    // Step 1: Create a local preview URL immediately for instant preview
    try {
      const localUrl = URL.createObjectURL(file);
      setLocalPreviews(prev => {
        // Revoke previous blob URL to prevent memory leaks
        const oldUrl = prev[field];
        if (oldUrl && oldUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(oldUrl);
          } catch (e) {
            console.warn('Failed to revoke old blob URL', e);
          }
        }
        return { ...prev, [field]: localUrl };
      });
    } catch (err) {
      console.warn('Failed to create local preview URL', err);
    }
    
    // Upload to server in background
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/upload-image`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        // Store the server URL (will be saved to DB on form submit)
        const serverUrl = data.url || data.filename || '';
        setFormImages((prev) => ({ ...prev, [field]: serverUrl }));
        
        if (isCreateOpen) setUseImages(true);
        if (isEditOpen) setEditUseImages(true);
        // Uploading a new image cancels any pending removal for that field
        setPendingRemoval(prev => ({ ...prev, [field]: false }));
      } else {
        alert('Failed to upload image');
        setLocalPreviews(prev => {
          const url = prev[field];
          if (url && url.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(url);
            } catch (e) {
              console.warn('Failed to revoke blob URL', e);
            }
          }
          return { ...prev, [field]: '' };
        });
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Failed to upload image');
      // Clear local preview on error
      setLocalPreviews(prev => {
        const url = prev[field];
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.warn('Failed to revoke blob URL', e);
          }
        }
        return { ...prev, [field]: '' };
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler to remove an image either locally or on the server for existing questions
  const handleRemoveImage = async (field: keyof typeof formImages) => {
    // If editing an existing question, mark the image for removal and close zoom — apply on Update
    if (isEditOpen && selectedQuestion && selectedQuestion.id) {
      // If already pending removal, treat as Undo
      if (pendingRemoval[field]) {
        setPendingRemoval(prev => ({ ...prev, [field]: false }));
        // Restore original image value if available
        setFormImages(prev => ({ ...prev, [field]: originalImages[field] }));
        return;
      }

      // Mark for removal
      setPendingRemoval(prev => ({ ...prev, [field]: true }));
      setFormImages(prev => ({ ...prev, [field]: '' }));
      setLocalPreviews(prev => ({ ...prev, [field]: '' }));
      // Close any open zoom when removing
      setIsImageZoomOpen(false);
      setZoomImageUrl(null);
      return;
    }

    // For create mode or local-only images: just clear local state immediately
    setFormImages(prev => ({ ...prev, [field]: '' }));
    setLocalPreviews(prev => ({ ...prev, [field]: '' }));
  };

  
  // getUploadUrl is imported from '@/lib/utils'

  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const [scriptValue, setScriptValue] = useState('');

  const insertAtCursor = (field: keyof typeof formData, text: string) => {
    const el = inputRefs.current[field as string] as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && 'selectionStart' in el) {
      const start = (el as any).selectionStart || 0;
      const end = (el as any).selectionEnd || 0;
      const value = (el as any).value || '';
      const newVal = value.slice(0, start) + text + value.slice(end);
      setFormData(prev => ({ ...prev, [field]: newVal } as typeof prev));
      setTimeout(() => {
        try {
          (el as any).selectionStart = (el as any).selectionEnd = start + text.length;
          el.focus();
        } catch (_) {}
      }, 0);
      return;
    }
    setFormData(prev => ({ ...prev, [field]: `${prev[field as keyof typeof prev] || ''}${text}` } as typeof prev));
  };

  const insertSuper = (field: keyof typeof formData, sup: number | string) => {
    insertAtCursor(field, `^{${sup}}`);
  };

  const insertSub = (field: keyof typeof formData, sub: number | string) => {
    insertAtCursor(field, `_{${sub}}`);
  };

  const renderSupSubTools = (field: keyof typeof formData) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="px-2 py-1 rounded bg-gray-100 text-sm">Sup/Sub</button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button type="button" className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => insertSuper(field, 2)}>x²</button>
              <button type="button" className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => insertSuper(field, 3)}>x³</button>
              <button type="button" className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => insertSub(field, 2)}>x₂</button>
              <button type="button" className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => insertSub(field, 3)}>x₃</button>
            </div>
            <div className="flex gap-2 items-center">
              <input value={scriptValue} onChange={(e) => setScriptValue(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Enter text" />
              <button type="button" className="px-3 py-1 rounded bg-blue-500 text-white text-sm" onClick={() => { if (scriptValue.trim()) { insertSuper(field, scriptValue.trim()); setScriptValue(''); } }}>Sup</button>
              <button type="button" className="px-3 py-1 rounded bg-gray-800 text-white text-sm" onClick={() => { if (scriptValue.trim()) { insertSub(field, scriptValue.trim()); setScriptValue(''); } }}>Sub</button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderMathSafe = (text: string | null | undefined) => {
    if (!text) return '';
    try {
      if (typeof window !== 'undefined' && window.katex) {
        return window.katex.renderToString(text || '', { throwOnError: false });
      }
    } catch (err) {
    
      console.warn('KaTeX render error', err);
      console.warn('KaTeX render error', err);
    }
    const replaced = String(text)
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
      .replace(/\^([^\s\{]+)/g, '<sup>$1</sup>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
      .replace(/_([^\s\{]+)/g, '<sub>$1</sub>');
    return replaced;
  };

  const renderOptionContent = (question: Partial<Question> | Record<string, string | number | null | undefined>, opt: 'A' | 'B' | 'C' | 'D', includeLocalPreview = false) => {
    const imgKey = `option${opt}Image`;
    const textKey = `option${opt}`;
    const localKey = `option${opt}Image` as keyof typeof localPreviews;
    const record = question as Record<string, string | number | null | undefined>;
    
    const imageValue = record[imgKey];
    const textValue = record[textKey];
    const image = imageValue ? String(imageValue) : '';
    const text = textValue ? String(textValue) : '';
    const localImg = includeLocalPreview ? (localPreviews[localKey] || '') : '';
    
    // Show both image and text if both are available
    const hasImage = image && image.trim() !== '';
    const hasText = text && text.trim() !== '';
    
    if (hasImage && hasText) {
      // Show both image and text
      return (
        <div className="space-y-2">
          <ImageWithFallback src={image} localSrc={localImg} alt={`Option ${opt}`} className="max-w-xs rounded shadow-sm border" clickToZoom={true} />
          <div><span dangerouslySetInnerHTML={{ __html: renderMathSafe(text) }} /></div>
        </div>
      );
    } else if (hasImage) {
      // Show only image
      return <ImageWithFallback src={image} localSrc={localImg} alt={`Option ${opt}`} className="max-w-xs rounded shadow-sm border" clickToZoom={true} />;
    } else if (hasText) {
      // Show only text
      return <span dangerouslySetInnerHTML={{ __html: renderMathSafe(text) }} />;
    }
    
    return <span className="text-gray-400">No content</span>;
  };

  const previewQuestion: Partial<Question> & Record<string, string | number | undefined> = { ...(selectedQuestion || {}), ...formData, ...formImages, ...localPreviews };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion) return;
    if (!formData.questionText || formData.questionText.trim() === '') {
      alert('Question text is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions/${selectedQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: formData.questionText,
          optionA: formData.optionA,
          optionAImage: formImages.optionAImage || undefined,
          optionB: formData.optionB,
          optionBImage: formImages.optionBImage || undefined,
          optionC: formData.optionC,
          optionCImage: formImages.optionCImage || undefined,
          optionD: formData.optionD,
          optionDImage: formImages.optionDImage || undefined,
          correctAnswer: formData.correctAnswer,
          explanation: formData.explanation,
          explanationImage: formImages.explanationImage || undefined, // <-- add explanation image
          marks: formData.marks,
          questionImage: formImages.questionImage || undefined,
          topicId: dialogTopic ?? selectedQuestion.topicId,
          subtopicId: dialogSubtopic ?? (selectedQuestion.subtopicId ?? undefined),
          useImageMode: editUseImages // <-- send image mode flag
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditOpen(false);
        // Refresh questions
        const fetchUrl = selectedTopic 
          ? `${import.meta.env.VITE_API_URL}/admin/questions?topicId=${selectedTopic}`
          : selectedSubject
          ? `${import.meta.env.VITE_API_URL}/admin/questions?subjectId=${selectedSubject}`
          : selectedExam
          ? `${import.meta.env.VITE_API_URL}/admin/questions?examId=${selectedExam}`
          : `${import.meta.env.VITE_API_URL}/admin/questions`;
        
        const refreshRes = await fetch(fetchUrl);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setQuestions(refreshData.questions);
          // Clear pending removals snapshot after successful update
          setPendingRemoval({ questionImage: false, optionAImage: false, optionBImage: false, optionCImage: false, optionDImage: false, explanationImage: false });
          setOriginalImages({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' });
        }
      } else {
        alert(data.message || 'Failed to update question');
      }
    } catch (err) {
      console.error('Error updating question:', err);
      alert('Failed to update question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (question: Question) => {
    setSelectedQuestion(question);
    
    let examId = question.examId ? Number(question.examId) : null;
    let subjectId = question.subjectId ? Number(question.subjectId) : null;
    const topicId = question.topicId ? Number(question.topicId) : null;
    
    console.log('Edit Question - Initial IDs:', { examId, subjectId, topicId });
    
    // If examId or subjectId is missing but we have topicId, work backwards through the hierarchy
    if (topicId && (!examId || !subjectId)) {
      try {
        // The topics endpoint requires subjectId, so we need to get it from the question's subjectName first
        // or fetch all subjects and find the one matching the topicId
        
        // Try getting subjectId and examId from the question's subjectName and examType
        if (question.subjectName && question.examType) {
          // First, get examId from examType
          if (!examId) {
            const matchingExam = examTypes.find(e => e.name === question.examType);
            if (matchingExam) {
              examId = Number(matchingExam.id);
              console.log('Got examId from examType:', examId);
            }
          }
          
          // Then fetch subjects for this exam and find the matching subject
          if (examId) {
            const subjectsRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${examId}`);
            const subjectsData = await subjectsRes.json();
            if (subjectsData.success && Array.isArray(subjectsData.subjects)) {
              const matchingSubject = subjectsData.subjects.find(
                (s: { id: number; name: string }) => s.name === question.subjectName
              );
              if (matchingSubject) {
                subjectId = Number(matchingSubject.id);
                console.log('Got subjectId from subject name:', subjectId);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching topic/subject details:', err);
      }
    }
    
    console.log('Edit Question - Final IDs:', { examId, subjectId, topicId });
    
    // Manually fetch subjects and topics before opening the dialog
    // This ensures the dropdowns are populated when the dialog opens
    let subjects: Array<{ id: number; name: string }> = [];
    let topics: Array<{ id: number; name: string }> = [];
    
    // Fetch subjects for this exam
    if (examId) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/subjects?examId=${examId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.subjects)) {
          subjects = data.subjects;
          console.log('Fetched subjects for edit:', subjects.length);
        }
      } catch (err) {
        console.error('Error fetching subjects for edit:', err);
      }
    }
    
    // Fetch topics for this subject
    if (subjectId) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/meta/topics?subjectId=${subjectId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.topics)) {
          topics = data.topics;
          console.log('Fetched topics for edit:', topics.length);
        }
      } catch (err) {
        console.error('Error fetching topics for edit:', err);
      }
    }
    
    // Set all state variables at once to prevent race conditions
    setDialogSubjects(subjects);
    setDialogTopics(topics);
    setDialogExam(examId);
    setDialogSubject(subjectId);
    setDialogTopic(topicId);
    // If editing and question has a subtopic, fetch and set it
    if (question.subtopicId) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${topicId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.subtopics)) {
          setDialogSubtopics(data.subtopics.map((s: any) => ({ id: Number(s.id), name: s.name })));
          setDialogSubtopic(Number(question.subtopicId));
        }
      } catch (err) {
        console.error('Error fetching subtopics for edit:', err);
      }
    } else {
      setDialogSubtopics([]);
      setDialogSubtopic(null);
    }
    
    // Populate form data for editing
    setFormData({
      questionText: question.text,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      marks: question.marks,
    });
    
    setFormImages({
      questionImage: (question as Partial<Question> & Record<string, string | number | undefined>).questionImage || ((question.text && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.text as string)) ? (question.text as string) : ''),
      optionAImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionAImage || ((question.optionA && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionA as unknown as string)) ? question.optionA as unknown as string : ''),
      optionBImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionBImage || ((question.optionB && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionB as unknown as string)) ? question.optionB as unknown as string : ''),
      optionCImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionCImage || ((question.optionC && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionC as unknown as string)) ? question.optionC as unknown as string : ''),
      optionDImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionDImage || ((question.optionD && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionD as unknown as string)) ? question.optionD as unknown as string : ''),
      explanationImage: ((question as Partial<Question> & Record<string, string | number | undefined>).explanationImage as string) || '',
    });
    // Keep a snapshot of original images so we can undo a pending removal
    setOriginalImages({
      questionImage: (question as Partial<Question> & Record<string, string | number | undefined>).questionImage || ((question.text && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.text as string)) ? (question.text as string) : ''),
      optionAImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionAImage || ((question.optionA && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionA as unknown as string)) ? question.optionA as unknown as string : ''),
      optionBImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionBImage || ((question.optionB && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionB as unknown as string)) ? question.optionB as unknown as string : ''),
      optionCImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionCImage || ((question.optionC && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionC as unknown as string)) ? question.optionC as unknown as string : ''),
      optionDImage: (question as Partial<Question> & Record<string, string | number | undefined>).optionDImage || ((question.optionD && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionD as unknown as string)) ? question.optionD as unknown as string : ''),
      explanationImage: ((question as Partial<Question> & Record<string, string | number | undefined>).explanationImage as string) || '',
    });
    // Clear and revoke local blob previews for edit
    Object.values(localPreviews).forEach((url) => {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to revoke blob URL', e);
        }
      }
    });
    setLocalPreviews({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' });
    // If any image exists in the question or if any option text suggests an image, enable editUseImages
    const qrec = question as Partial<Question> & Record<string, unknown>;
    const hasImages = Boolean(
      (qrec.questionImage as string | undefined) ||
      (qrec.optionAImage as string | undefined) ||
      (qrec.optionBImage as string | undefined) ||
      (qrec.optionCImage as string | undefined) ||
      (qrec.optionDImage as string | undefined) ||
      (typeof question.text === 'string' && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.text)) ||
      (typeof question.optionA === 'string' && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionA)) ||
      (typeof question.optionB === 'string' && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionB)) ||
      (typeof question.optionC === 'string' && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionC)) ||
      (typeof question.optionD === 'string' && /(\/uploads\/|\.(png|jpe?g|gif|webp|svg)$)/i.test(question.optionD))
    );
    setEditUseImages(hasImages);
    // form images already set above with fallbacks; no need to override here
    setIsEditOpen(true);
  };

  const getSubjectIcon = (subject: string) => {
    if (!subject) return BookOpen;
    const key = subject.toLowerCase();
    if (key.includes('physics')) return subjectIcons.physics;
    if (key.includes('chem')) return subjectIcons.chemistry;
    if (key.includes('bio')) return subjectIcons.biology;
    if (key.includes('math')) return subjectIcons.mathematics;
    return BookOpen;
  };

  const getSubjectColor = (subject: string) => {
    if (!subject) return subjectColors.physics;
    const key = subject.toLowerCase();
    if (key.includes('physics')) return subjectColors.physics;
    if (key.includes('chem')) return subjectColors.chemistry;
    if (key.includes('bio')) return subjectColors.biology;
    if (key.includes('math')) return subjectColors.mathematics;
    return subjectColors.physics;
  };

  const toggleQuestionExpand = (questionId: string) => {
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

  const hasQuestionImages = (question: Question) => {
    const qrec = question as Partial<Question> & Record<string, unknown>;
    return Boolean(
      (qrec.questionImage as string | undefined) ||
      (qrec.optionAImage as string | undefined) ||
      (qrec.optionBImage as string | undefined) ||
      (qrec.optionCImage as string | undefined) ||
      (qrec.optionDImage as string | undefined) ||
      (qrec.explanationImage as string | undefined)
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Question Bank</h1>
            <p className="page-subtitle">Manage MCQ questions for exams</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetDialogState(false);
            }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
                <DialogDescription>
                  Create a new MCQ question
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4 mt-4" onSubmit={handleCreateQuestion}>
                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select value={dialogExam?.toString()} onValueChange={(val) => {
                      const newExam = Number(val);
                      setDialogExam(newExam);
                      // Reset subject and topic when exam changes
                      setDialogSubject(null);
                      setDialogTopic(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id.toString()}>
                            {exam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select 
                      value={dialogSubject?.toString()} 
                      onValueChange={(val) => {
                        const newSubject = Number(val);
                        setDialogSubject(newSubject);
                        // Reset topic when subject changes
                        setDialogTopic(null);
                      }}
                      disabled={!dialogExam}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dialogExam ? "Select subject" : "Select exam first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Attach Images</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Use Images</span>
                      <Switch checked={useImages} onCheckedChange={(val) => setUseImages(Boolean(val))} />
                    </div>
                  </div>
                  {useImages && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Question Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'questionImage'); }} />
                      {(localPreviews.questionImage || formImages.questionImage) && (
                        <div className="flex items-start gap-3">
                          <ImageWithFallback src={formImages.questionImage} localSrc={localPreviews.questionImage} alt="question" className="w-full max-w-xs mt-2 rounded" />
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('questionImage')}>Remove</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option A Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionAImage'); }} />
                      {(localPreviews.optionAImage || formImages.optionAImage) && (
                        <div className="flex items-start gap-3">
                          <ImageWithFallback src={formImages.optionAImage} localSrc={localPreviews.optionAImage} alt="optA" className="w-full max-w-xs mt-2 rounded" />
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionAImage')}>Remove</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option B Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionBImage'); }} />
                      {(localPreviews.optionBImage || formImages.optionBImage) && (
                        <div className="flex items-start gap-3">
                          <ImageWithFallback src={formImages.optionBImage} localSrc={localPreviews.optionBImage} alt="optB" className="w-full max-w-xs mt-2 rounded" />
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionBImage')}>Remove</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option C Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionCImage'); }} />
                      {(localPreviews.optionCImage || formImages.optionCImage) && (
                        <div className="flex items-start gap-3">
                          <ImageWithFallback src={formImages.optionCImage} localSrc={localPreviews.optionCImage} alt="optC" className="w-full max-w-xs mt-2 rounded" />
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionCImage')}>Remove</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option D Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionDImage'); }} />
                      {(localPreviews.optionDImage || formImages.optionDImage) && (
                        <div className="flex items-start gap-3">
                          <ImageWithFallback src={formImages.optionDImage} localSrc={localPreviews.optionDImage} alt="optD" className="w-full max-w-xs mt-2 rounded" />
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionDImage')}>Remove</Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Explanation Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'explanationImage'); }} />
                      {(localPreviews.explanationImage || formImages.explanationImage) && (
                        <div className="flex items-start gap-3">
                          <ImageWithFallback src={formImages.explanationImage} localSrc={localPreviews.explanationImage} alt="explanation" className="w-full max-w-xs mt-2 rounded" />
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('explanationImage')}>Remove</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
                {/* Always show Topic and Marks fields, regardless of useImages */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Select 
                      value={dialogTopic?.toString()} 
                      onValueChange={(val) => setDialogTopic(Number(val))}
                      disabled={!dialogSubject}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dialogSubject ? "Select topic" : "Select subject first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id.toString()}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subtopic</Label>
                    <Select
                      value={dialogSubtopic?.toString()}
                      onValueChange={(val) => setDialogSubtopic(Number(val))}
                      disabled={!dialogTopic || dialogSubtopics.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={dialogTopic ? (dialogSubtopics.length ? 'Select subtopic' : 'No subtopics') : 'Select topic first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogSubtopics.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name} {subtopicCounts[s.id] !== undefined ? <span className="text-xs text-muted-foreground">({subtopicCounts[s.id]})</span> : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Marks</Label>
                    <Input 
                      type="number" 
                      placeholder="4" 
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Question Text</Label>
                    <div className="flex items-center gap-2">
                      {renderSupSubTools('questionText')}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Enter your question here..."
                    className="min-h-[80px]"
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    required
                    ref={(el) => (inputRefs.current['questionText'] = el)}
                  />
                </div>
                
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option A</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionA')}
                      </div>
                    </div>
                    <Input 
                      placeholder="Option A" 
                      value={formData.optionA}
                      onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                      required={!useImages}
                      ref={(el) => (inputRefs.current['optionA'] = el)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option B</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionB')}
                      </div>
                    </div>
                    <Input 
                      placeholder="Option B" 
                      value={formData.optionB}
                      onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                      required={!useImages}
                      ref={(el) => (inputRefs.current['optionB'] = el)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option C</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionC')}
                      </div>
                    </div>
                    <Input 
                      placeholder="Option C" 
                      value={formData.optionC}
                      onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                      required={!useImages}
                      ref={(el) => (inputRefs.current['optionC'] = el)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option D</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionD')}
                      </div>
                    </div>
                    <Input 
                      placeholder="Option D" 
                      value={formData.optionD}
                      onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                      required={!useImages}
                      ref={(el) => (inputRefs.current['optionD'] = el)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <RadioGroup 
                    value={formData.correctAnswer} 
                    onValueChange={(val: 'A'|'B'|'C'|'D') => setFormData({ ...formData, correctAnswer: val })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="A" />
                      <Label htmlFor="A">A</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="B" />
                      <Label htmlFor="B">B</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="C" />
                      <Label htmlFor="C">C</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="D" id="D" />
                      <Label htmlFor="D">D</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Explanation</Label>
                    <div>{renderSupSubTools('explanation')}</div>
                  </div>
                  <Textarea
                    placeholder="Explain why this is the correct answer..."
                    className="min-h-[60px]"
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    ref={(el) => (inputRefs.current['explanation'] = el)}
                  />
                </div>
                <div className="flex justify-between items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (formData.questionText) {
                        setIsFormPreviewOpen(true);
                      }
                    }}
                    disabled={!formData.questionText}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false);
                        resetDialogState(false);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={(e) => handleCreateQuestion(e, true)}
                      disabled={submitting || !dialogTopic}
                    >
                      {submitting ? 'Saving...' : 'Save & Next'}
                    </Button>
                    <Button type="submit" disabled={submitting || !dialogTopic}>
                      {submitting ? 'Adding...' : 'Add Question'}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
          
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions or options..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Exam Type Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Exam Type</h3>
            {(selectedExam || selectedSubject || selectedTopic || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            {loadingExams ? (
              <div className="text-muted-foreground">Loading exams...</div>
            ) : examTypes.length === 0 ? (
              <div className="text-muted-foreground">No exams found</div>
            ) : examTypes.map((exam) => {
              const count = questions.filter(q => q.examType === exam.name).length;
              const isSelected = selectedExam === exam.id;
              return (
                <button
                  key={exam.id}
                  onClick={() => handleExamChange(isSelected ? null : exam.id)}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-lg scale-105'
                      : 'border-border hover:border-orange-400 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className={`text-lg font-bold ${isSelected ? 'text-orange-600' : 'text-foreground'}`}>
                        {exam.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {count} question{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'
                    }`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Subjects</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loadingSubjects ? (
              <div className="text-muted-foreground">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="text-muted-foreground">{selectedExam ? 'No subjects found' : 'Select an exam first'}</div>
            ) : subjects.map((subject) => {
              const Icon = getSubjectIcon(subject.name);
              const gradient = getSubjectColor(subject.name);
              const count = subjectCounts[subject.id] || 0;
              const isSelected = selectedSubject === subject.id;
              
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectChange(isSelected ? null : subject.id)}
                  className={`relative p-6 rounded-2xl overflow-hidden transition-all duration-300 transform group ${
                    isSelected
                      ? 'shadow-2xl shadow-orange-500/40 scale-105 ring-4 ring-orange-400/50'
                      : 'shadow-lg hover:shadow-2xl hover:shadow-orange-400/30 hover:scale-[1.02]'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100`} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-xl transition-transform ${
                        isSelected ? 'scale-110' : 'group-hover:scale-110'
                      }`}>
                        <Icon className="w-7 h-7 text-white drop-shadow-lg" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge className="bg-orange-700/90 text-white border-orange-800/60 font-bold text-base px-3 py-1 shadow-lg backdrop-blur-sm">
                          {count}
                        </Badge>
                        <span className="text-xs text-white/90 mt-1 font-medium">questions</span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-white text-left tracking-wide drop-shadow-md">
                      {subject.name}
                    </p>
                  </div>
                
                  <div className={`absolute -inset-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl blur-xl opacity-0 transition-opacity duration-300 ${
                    isSelected ? 'opacity-30' : 'group-hover:opacity-20'
                  }`} style={{ zIndex: -1 }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic Filter */}
        {selectedSubject && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Topics</h3>
            <div className="flex flex-wrap gap-2">
              {loadingTopics ? (
                <div className="text-muted-foreground">Loading topics...</div>
              ) : topics.length === 0 ? (
                <div className="text-muted-foreground">No topics found</div>
              ) : topics.map((topic) => {
                const count = topicCounts[topic.id] || 0;
                const isSelected = selectedTopic === topic.id;
                
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicChange(isSelected ? null : topic.id)}
                    className={`px-5 py-3 rounded-full border-2 transition-all duration-300 transform hover:scale-105 ${
                      isSelected
                        ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50'
                        : 'border-orange-200 hover:border-orange-400 bg-card hover:bg-orange-50 dark:hover:bg-orange-950/20'
                    }`}
                  >
                    <span className="text-sm font-semibold">{topic.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`ml-2 font-bold ${
                        isSelected 
                          ? 'bg-white/30 text-white border-white/40' 
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                      }`}
                    >
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        
        {(selectedExam || selectedSubject || selectedTopic) && (
          <div className="flex flex-wrap items-center gap-2 p-4 rounded-lg bg-muted/50 border">
            <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
            {selectedExam && (
              <Badge variant="secondary" className="gap-1">
                {examTypes.find(e => e.id === selectedExam)?.name}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setSelectedExam(null)}
                />
              </Badge>
            )}
            {selectedSubject && (
              <Badge variant="secondary" className="gap-1">
                {subjects.find(s => s.id === selectedSubject)?.name}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => {
                    setSelectedSubject(null);
                    setSelectedTopic(null);
                  }}
                />
              </Badge>
            )}
            {selectedTopic && (
              <Badge variant="secondary" className="gap-1">
                {topics.find(t => t.id === selectedTopic)?.name}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => setSelectedTopic(null)}
                />
              </Badge>
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
            </span>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((question, index) => {
            const isExpanded = expandedQuestions.has(question.id);
            const hasImages = hasQuestionImages(question);
            
            return (
              <div
                key={question.id}
                className="relative rounded-xl border bg-card p-6 hover:shadow-elevated transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={
                          question.examType === 'NEET'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-info/10 text-info border-info/20'
                        }
                      >
                        {question.examType}
                      </Badge>
                      <Badge variant="outline" className="bg-muted">
                        {question.marks} Marks
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created by {question.createdBy}
                      </span>
                      {hasImages && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          Has Images
                        </Badge>
                      )}
                    </div>
                    
                    {/* Question Text - Always Visible */}
                    <p className="text-foreground font-medium mb-3">
                      <span className="inline-block sm:inline mr-2 font-semibold">Q{index + 1}.</span>
                      <span className="block sm:inline break-all md:break-words leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: renderMathSafe(question.text) }} />
                    </p>

                    {/* Correct Answer Preview - Always Visible */}
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/30">
                        <span className="min-w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-green-500 text-white">
                          {question.correctAnswer}
                        </span>
                        <span className="text-sm text-green-700 dark:text-green-400 font-semibold">
                          {renderOptionContent(question, question.correctAnswer as 'A' | 'B' | 'C' | 'D')}
                        </span>
                       
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionExpand(question.id)}
                      className="mb-3"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Show Full Question
                        </>
                      )}
                    </Button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="space-y-4 pt-4 border-t">
                        {/* Question Image */}
                        {question.questionImage && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold mb-2 text-muted-foreground">Question Image:</p>
                            <ImageWithFallback
                              src={question.questionImage as string}
                              localSrc={question.id === selectedQuestion?.id && localPreviews.questionImage ? localPreviews.questionImage : ''}
                              alt="question"
                              className="max-w-full w-auto rounded shadow-sm border"
                              clickToZoom={true}
                              maxHeight="300px"
                            />
                          </div>
                        )}

                        {/* All Options */}
                        <div>
                          <p className="text-sm font-semibold mb-3 text-muted-foreground">All Options:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                              const isCorrect = question.correctAnswer === opt;
                              return (
                                <div
                                  key={opt}
                                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                    isCorrect
                                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                                      : 'border-border bg-card'
                                  }`}
                                >
                                  <span
                                    className={`min-w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isCorrect
                                        ? 'bg-green-500 text-white'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                  <span className={isCorrect ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-foreground'}>
                                    {renderOptionContent(question, opt as 'A' | 'B' | 'C' | 'D')}
                                  </span>
                                  {isCorrect && (
                                    <Badge className="ml-auto bg-green-500 hover:bg-green-600 text-white">
                                      Correct
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Explanation */}
                        {question.explanation && (
                          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-400">💡 Explanation:</p>
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              <span dangerouslySetInnerHTML={{ __html: renderMathSafe(question.explanation) }} />
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Action Buttons at Bottom Right */}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(question)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(question)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-4 right-4">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(question)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(question)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Question Preview</DialogTitle>
              <DialogDescription>
                Complete question details with all information
              </DialogDescription>
            </DialogHeader>
            {selectedQuestion && (
              <div className="space-y-6 mt-4">
                {/* Meta Information Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Exam Type:</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300">
                        {selectedQuestion.examType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Subject:</span>
                      <span className="text-sm text-orange-800 dark:text-orange-300">{selectedQuestion.subjectName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Topic:</span>
                      <span className="text-sm text-orange-800 dark:text-orange-300">{selectedQuestion.topicName || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Marks:</span>
                      <Badge variant="default" className="bg-orange-600 text-white">
                        {selectedQuestion.marks} {selectedQuestion.marks === 1 ? 'Mark' : 'Marks'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Created By:</span>
                      <span className="text-sm text-orange-800 dark:text-orange-300">{selectedQuestion.createdBy}</span>
                    </div>
                    {selectedQuestion.createdAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-orange-900 dark:text-orange-400">Created:</span>
                        <span className="text-sm text-orange-800 dark:text-orange-300">
                          {new Date(selectedQuestion.createdAt).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Card */}
                <div className="p-5 rounded-lg bg-card border-2 border-border shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      Q
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-foreground leading-relaxed">
                        <span dangerouslySetInnerHTML={{ __html: renderMathSafe(selectedQuestion.text) }} />
                      </p>
                    </div>
                  </div>
                  {selectedQuestion.questionImage && (
                    <div className="mt-4 ml-11">
                      <ImageWithFallback
                        src={selectedQuestion.questionImage as string}
                        localSrc={localPreviews.questionImage}
                        alt="question"
                        className="max-w-full md:max-w-md rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
                        clickToZoom={true}
                      />
                    </div>
                  )}
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isCorrect = selectedQuestion.correctAnswer === opt;
                    return (
                      <div
                        key={opt}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                          isCorrect
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 shadow-lg shadow-green-500/20'
                            : 'border-gray-200 dark:border-gray-700 bg-card hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                              isCorrect
                                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                                : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {opt}
                          </div>
                          <div className="flex-1 min-w-0">
                            {renderOptionContent(selectedQuestion, opt, true)}
                          </div>
                          {isCorrect && (
                            <Badge className="absolute top-2 right-2 bg-green-600 text-white border-green-700 shadow-sm">
                              ✓ Correct
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Card */}
                {(selectedQuestion.explanation || selectedQuestion.explanationImage) && (
                  <div className="p-5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                        <span className="text-lg">💡</span>
                      </div>
                      <p className="text-base font-bold text-blue-900 dark:text-blue-400">
                        Explanation
                      </p>
                    </div>
                    {selectedQuestion.explanationImage && (
                      <div className="mb-3 ml-10">
                        <ImageWithFallback
                          src={selectedQuestion.explanationImage as string}
                          localSrc={localPreviews.explanationImage}
                          alt="explanation"
                          className="max-w-full md:max-w-md rounded-lg shadow-md border border-blue-200 dark:border-blue-700"
                          clickToZoom={true}
                        />
                      </div>
                    )}
                    {selectedQuestion.explanation && (
                      <div className="ml-10">
                        <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-300">
                          <span dangerouslySetInnerHTML={{ __html: renderMathSafe(selectedQuestion.explanation) }} />
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsPreviewOpen(false);
                    handleEdit(selectedQuestion);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Question
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setSelectedQuestion(null); setFormImages({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' }); setLocalPreviews({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' }); setFormData({ questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', explanation: '', marks: 4 }); setEditUseImages(false); setDialogSubtopic(null); setDialogSubtopics([]); setDialogTopics([]); setDialogSubjects([]); setDialogExam(null); setDialogTopic(null); setDialogSubject(null); setPendingRemoval({ questionImage: false, optionAImage: false, optionBImage: false, optionCImage: false, optionDImage: false, explanationImage: false }); setOriginalImages({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' }); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>
                Update the question details
              </DialogDescription>
            </DialogHeader>
            {selectedQuestion && (
              <form className="space-y-4 mt-4" onSubmit={handleUpdateQuestion}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select value={dialogExam?.toString() || ''} onValueChange={(val) => {
                      const newExam = val ? Number(val) : null;
                      setDialogExam(newExam);
                      // Reset subject and topic when exam changes
                      setDialogSubject(null);
                      setDialogTopic(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id.toString()}>
                            {exam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={dialogSubject?.toString() || ''} onValueChange={(val) => {
                      const newSubject = val ? Number(val) : null;
                      setDialogSubject(newSubject);
                      // Reset topic when subject changes
                      setDialogTopic(null);
                    }} disabled={!dialogExam}>
                      <SelectTrigger>
                        <SelectValue placeholder={dialogExam ? "Select subject" : "Select exam first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Select value={dialogTopic?.toString() || ''} onValueChange={(val) => setDialogTopic(val ? Number(val) : null)} disabled={!dialogSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder={dialogSubject ? "Select topic" : "Select subject first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id.toString()}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subtopic </Label>
                    <Select value={dialogSubtopic?.toString() || ''} onValueChange={(val) => setDialogSubtopic(val ? Number(val) : null)} disabled={!dialogTopic || dialogSubtopics.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder={dialogTopic ? (dialogSubtopics.length ? 'Select subtopic' : 'No subtopics') : 'Select topic first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogSubtopics.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Marks</Label>
                    <Input 
                      type="number" 
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                {/* Image Upload Section for Edit */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Attach Images</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Use Images</span>
                      <Switch checked={editUseImages} onCheckedChange={(val) => setEditUseImages(Boolean(val))} />
                    </div>
                  </div>
                  {editUseImages && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Question Image</Label>
                        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'questionImage'); }} />
                        {(localPreviews.questionImage || formImages.questionImage || pendingRemoval.questionImage) && (
                          <div className="flex items-start gap-3">
                            {!pendingRemoval.questionImage ? (
                              <ImageWithFallback src={formImages.questionImage} localSrc={localPreviews.questionImage} alt="question" className="w-full max-w-xs mt-2 rounded" />
                            ) : (
                              <div className="text-sm text-red-600 mt-2">Marked for removal</div>
                            )}
                            <div className="flex flex-col gap-1">
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('questionImage')}>{pendingRemoval.questionImage ? 'Undo' : 'Remove'}</Button>
                              {pendingRemoval.questionImage && <span className="text-xs text-muted-foreground">Will be removed on update</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Option A Image</Label>
                        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionAImage'); }} />
                        {(localPreviews.optionAImage || formImages.optionAImage || pendingRemoval.optionAImage) && (
                          <div className="flex items-start gap-3">
                            {!pendingRemoval.optionAImage ? (
                              <ImageWithFallback src={formImages.optionAImage} localSrc={localPreviews.optionAImage} alt="optA" className="w-full max-w-xs mt-2 rounded" />
                            ) : (
                              <div className="text-sm text-red-600 mt-2">Marked for removal</div>
                            )}
                            <div className="flex flex-col gap-1">
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionAImage')}>{pendingRemoval.optionAImage ? 'Undo' : 'Remove'}</Button>
                              {pendingRemoval.optionAImage && <span className="text-xs text-muted-foreground">Will be removed on update</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Option B Image</Label>
                        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionBImage'); }} />
                        {(localPreviews.optionBImage || formImages.optionBImage || pendingRemoval.optionBImage) && (
                          <div className="flex items-start gap-3">
                            {!pendingRemoval.optionBImage ? (
                              <ImageWithFallback src={formImages.optionBImage} localSrc={localPreviews.optionBImage} alt="optB" className="w-full max-w-xs mt-2 rounded" />
                            ) : (
                              <div className="text-sm text-red-600 mt-2">Marked for removal</div>
                            )}
                            <div className="flex flex-col gap-1">
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionBImage')}>{pendingRemoval.optionBImage ? 'Undo' : 'Remove'}</Button>
                              {pendingRemoval.optionBImage && <span className="text-xs text-muted-foreground">Will be removed on update</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Option C Image</Label>
                        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionCImage'); }} />
                        {(localPreviews.optionCImage || formImages.optionCImage || pendingRemoval.optionCImage) && (
                          <div className="flex items-start gap-3">
                            {!pendingRemoval.optionCImage ? (
                              <ImageWithFallback src={formImages.optionCImage} localSrc={localPreviews.optionCImage} alt="optC" className="w-full max-w-xs mt-2 rounded" />
                            ) : (
                              <div className="text-sm text-red-600 mt-2">Marked for removal</div>
                            )}
                            <div className="flex flex-col gap-1">
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionCImage')}>{pendingRemoval.optionCImage ? 'Undo' : 'Remove'}</Button>
                              {pendingRemoval.optionCImage && <span className="text-xs text-muted-foreground">Will be removed on update</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Option D Image</Label>
                        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionDImage'); }} />
                        {(localPreviews.optionDImage || formImages.optionDImage || pendingRemoval.optionDImage) && (
                          <div className="flex items-start gap-3">
                            {!pendingRemoval.optionDImage ? (
                              <ImageWithFallback src={formImages.optionDImage} localSrc={localPreviews.optionDImage} alt="optD" className="w-full max-w-xs mt-2 rounded" />
                            ) : (
                              <div className="text-sm text-red-600 mt-2">Marked for removal</div>
                            )}
                            <div className="flex flex-col gap-1">
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('optionDImage')}>{pendingRemoval.optionDImage ? 'Undo' : 'Remove'}</Button>
                              {pendingRemoval.optionDImage && <span className="text-xs text-muted-foreground">Will be removed on update</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Explanation Image</Label>
                        <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'explanationImage'); }} />
                        {(localPreviews.explanationImage || formImages.explanationImage || pendingRemoval.explanationImage) && (
                          <div className="flex items-start gap-3">
                            {!pendingRemoval.explanationImage ? (
                              <ImageWithFallback src={formImages.explanationImage} localSrc={localPreviews.explanationImage} alt="explanation" className="w-full max-w-xs mt-2 rounded" />
                            ) : (
                              <div className="text-sm text-red-600 mt-2">Marked for removal</div>
                            )}
                            <div className="flex flex-col gap-1">
                              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleRemoveImage('explanationImage')}>{pendingRemoval.explanationImage ? 'Undo' : 'Remove'}</Button>
                              {pendingRemoval.explanationImage && <span className="text-xs text-muted-foreground">Will be removed on update</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Question Text</Label>
                    <div className="flex items-center gap-2">
                      {renderSupSubTools('questionText')}
                    </div>
                  </div>
                  <Textarea
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    className="min-h-[80px]"
                    required
                    ref={(el) => (inputRefs.current['questionText'] = el)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option A</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionA')}
                      </div>
                    </div>
                    <Input 
                      value={formData.optionA}
                      onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                      required={!editUseImages}
                      ref={(el) => (inputRefs.current['optionA'] = el)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option B</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionB')}
                      </div>
                    </div>
                    <Input 
                      value={formData.optionB}
                      onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                      required={!editUseImages}
                      ref={(el) => (inputRefs.current['optionB'] = el)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option C</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionC')}
                      </div>
                    </div>
                    <Input 
                      value={formData.optionC}
                      onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                      required={!editUseImages}
                      ref={(el) => (inputRefs.current['optionC'] = el)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Option D</Label>
                      <div className="flex items-center gap-2">
                        {renderSupSubTools('optionD')}
                      </div>
                    </div>
                    <Input 
                      value={formData.optionD}
                      onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                      required={!editUseImages}
                      ref={(el) => (inputRefs.current['optionD'] = el)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <RadioGroup 
                    value={formData.correctAnswer}
                    onValueChange={(val: 'A'|'B'|'C'|'D') => setFormData({ ...formData, correctAnswer: val })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="edit-A" />
                      <Label htmlFor="edit-A">A</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="edit-B" />
                      <Label htmlFor="edit-B">B</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="edit-C" />
                      <Label htmlFor="edit-C">C</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="D" id="edit-D" />
                      <Label htmlFor="edit-D">D</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Explanation</Label>
                    <div>{renderSupSubTools('explanation')}</div>
                  </div>
                  <Textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    className="min-h-[60px]"
                    ref={(el) => (inputRefs.current['explanation'] = el)}
                  />
                </div>
               
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Form Preview Dialog (for Add/Edit form preview) */}
        <Dialog open={isFormPreviewOpen} onOpenChange={setIsFormPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Question Preview</DialogTitle>
              <DialogDescription>Preview how the question will appear to students</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              
              <div className="p-6 rounded-lg border-2 border-dashed bg-muted/30">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    Q
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-medium mb-4"><span dangerouslySetInnerHTML={{ __html: renderMathSafe(previewQuestion.text) }} /></p>
                    {(previewQuestion.questionImage || localPreviews.questionImage) && (
                      <div className="mb-4">
                        <ImageWithFallback
                          src={previewQuestion.questionImage as string}
                          localSrc={localPreviews.questionImage}
                          alt="question"
                          className="max-w-lg rounded shadow-sm"
                        />
                      </div>
                    )}
                    <div className="space-y-3">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const isCorrect = (formData.correctAnswer || selectedQuestion?.correctAnswer) === option;
                        return (
                          <div
                            key={option}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrect 
                                ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                                : 'border-border bg-background'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                                isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground'
                              }`}>
                                {option}
                              </div>
                              <span className={isCorrect ? 'font-medium text-green-700 dark:text-green-400' : ''}>
                                {renderOptionContent(previewQuestion, option as 'A' | 'B' | 'C' | 'D', true)}
                              </span>
                              {isCorrect && (
                                <Badge variant="default" className="ml-auto">Correct</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {((formData.explanation || selectedQuestion?.explanation) || (formImages.explanationImage || localPreviews.explanationImage)) && (
                      <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-400">📚 Explanation:</p>
                        {(formImages.explanationImage || localPreviews.explanationImage) && (
                          <div className="mb-2">
                            <ImageWithFallback
                              src={formImages.explanationImage}
                              localSrc={localPreviews.explanationImage}
                              alt="explanation"
                              className="max-w-xs rounded"
                            />
                          </div>
                        )}
                        {(formData.explanation || selectedQuestion?.explanation) && (
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            {formData.explanation || selectedQuestion?.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <span className="text-sm text-muted-foreground">
                  Marks: <strong>{formData.marks || selectedQuestion?.marks || 4}</strong>
                </span>
                <Button variant="outline" size="sm" onClick={() => setIsFormPreviewOpen(false)}>
                  Close Preview
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
                          
       {/* Bulk Upload Dialog */}
<Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
  <DialogContent
    className="
      w-[95vw] 
      max-w-5xl 
      max-h-[90vh] 
      overflow-y-auto 
      p-4 sm:p-6
    "
  >
    <DialogHeader>
      <DialogTitle>Bulk Upload Questions</DialogTitle>
      <DialogDescription>
        Upload multiple questions using CSV or JSON format
      </DialogDescription>
    </DialogHeader>

    <div className="mt-4 space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* responsive fields - will flow to 4 columns on large screens */}
        <div className="space-y-2 w-full">
          <Label>Exam Type</Label>
          <Select
            value={dialogExam?.toString() || ""}
            onValueChange={(val) => setDialogExam(val ? Number(val) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {examTypes.map((exam) => (
                <SelectItem key={exam.id} value={exam.id.toString()}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full min-w-0">
          <Label>Subject</Label>
          <Select
            value={dialogSubject?.toString() || ""}
            onValueChange={(val) => setDialogSubject(val ? Number(val) : null)}
            disabled={!dialogExam}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={dialogExam ? "Select subject" : "Select exam first"} />
            </SelectTrigger>
            <SelectContent>
              {dialogSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full min-w-0">
          <Label>Topic</Label>
          <Select
            value={dialogTopic?.toString() || ""}
            onValueChange={(val) => setDialogTopic(val ? Number(val) : null)}
            disabled={!dialogSubject}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={dialogSubject ? "Select topic" : "Select subject first"} />
            </SelectTrigger>
            <SelectContent>
              {dialogTopics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id.toString()}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full min-w-0">
          <Label>Subtopic</Label>
          <Select
            value={dialogSubtopic?.toString() || ""}
            onValueChange={(val) => setDialogSubtopic(val ? Number(val) : null)}
            disabled={!dialogTopic}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !dialogTopic
                    ? "Select topic first"
                    : loadingDialogSubtopics
                      ? "Loading subtopics..."
                      : dialogSubtopics.length
                        ? "Select subtopic"
                        : "No subtopics"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {loadingDialogSubtopics ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : dialogSubtopics.length === 0 ? (
                <SelectItem value="none" disabled>No subtopics</SelectItem>
              ) : (
                dialogSubtopics.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== File Upload ===== */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-3 
          flex flex-col sm:flex-row 
          items-start sm:items-center 
          justify-between gap-3
          transition-colors
          ${bulkFile ? 'border-green-300 bg-green-50/20' : 'bg-card'}
          w-full lg:max-w-[900px]
        `}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) setBulkFile(f);
        }}
      >
        <label className="flex-1 min-w-0 cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".csv,application/json,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setBulkFile(f);
            }}
          />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm">Choose file</span>
            <span className="text-sm text-muted-foreground truncate flex-1 overflow-hidden">
              {bulkFile ? bulkFile.name : 'No file chosen'}
            </span>
            <span className="hidden sm:inline-block text-xs text-muted-foreground ml-3">Tap to choose or drag & drop</span>
          </div>
        </label>

        {bulkFile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBulkFile(null)}
            className="self-end sm:self-auto"
          >
            Remove
          </Button>
        )}
      </div>

     
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={applyTopicToAll}
          onChange={(e) => setApplyTopicToAll(e.target.checked)}
          className="mt-1"
        />
        Apply selected Topic/Subtopic to all rows
      </label>

    
      <div className="border rounded-lg p-4">
        <p className="font-semibold mb-2">📋 CSV Format</p>
       
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadCsvTemplate}>
            Download CSV Template
          </Button>
        
        </div>
      </div>

     
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)}>
          Cancel
        </Button>
        <Button
          disabled={!bulkFile || bulkUploading}
          onClick={handleBulkUpload}
        >
          <FileText className="w-4 h-4 mr-2" />
          {bulkUploading ? 'Uploading...' : 'Upload Questions'}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>


        {/* Image Zoom Dialog */}
        <Dialog open={isImageZoomOpen} onOpenChange={setIsImageZoomOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-full flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden">
              {zoomImageUrl && (
                <img
                  src={zoomImageUrl}
                  alt="Zoomed view"
                  className="max-w-full max-h-[100vh] object-contain rounded"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                onClick={() => setIsImageZoomOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}