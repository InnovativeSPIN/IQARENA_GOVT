import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FacultyQuestion } from '@/types/faculty';
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  Pencil,
  Eye,
  CheckCircle2,
  XCircle,
  BookOpen,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  X,
  Image as ImageIcon,
  MoreHorizontal,
  Trash2,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { getUploadUrl } from '@/lib/utils';


export default function FacultyQuestions() {
  const { allocatedSubjects, faculty } = useFacultyAuth();
  const [questions, setQuestions] = useState<FacultyQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [searchParams] = useSearchParams();
  const [filterExam, setFilterExam] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState<FacultyQuestion | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '' as 'A' | 'B' | 'C' | 'D' | '',
    explanation: '',
    marks: 4,
    examType: '' as 'NEET' | 'JEE' | '',
    subjectId: '',
    topicId: '',
    subtopicId: 'none'
  });
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [editDialogSubtopics, setEditDialogSubtopics] = useState<any[]>([]);
  const [dialogTopics, setDialogTopics] = useState<any[]>([]);
  const [useImages, setUseImages] = useState(false);
  const [editUseImages, setEditUseImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editQuestionForm, setEditQuestionForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '' as 'A'|'B'|'C'|'D'|'',
    explanation: '',
    marks: 4,
    subjectId: '',
    topicId: '',
    subtopicId: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [isFormPreviewOpen, setIsFormPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<FacultyQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<FacultyQuestion | null>(null);
  const [testsContaining, setTestsContaining] = useState<Array<{id: string; title: string}>>([]);
  
  const [formImages, setFormImages] = useState({
    questionImage: '',
    optionAImage: '',
    optionBImage: '',
    optionCImage: '',
    optionDImage: '',
    explanationImage: ''
  });
  
  const [localPreviews, setLocalPreviews] = useState({
    questionImage: '',
    optionAImage: '',
    optionBImage: '',
    optionCImage: '',
    optionDImage: '',
    explanationImage: ''
  });

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;
  const navigate = useNavigate();
  
  // Auto-select first subject on mount
  useEffect(() => {
    if (allocatedSubjects && allocatedSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(String(allocatedSubjects[0].id));
    }
  }, [allocatedSubjects]);

  // Image component with fallback and zoom
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
            <Eye className="w-3 h-3" />
            View Full
          </div>
        )}
      </div>
    );
  };
  
  const handleImageUpload = async (file: File, field: keyof typeof formImages) => {
    if (!file) return;
    
    try {
      const localUrl = URL.createObjectURL(file);
      setLocalPreviews(prev => {
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
        const serverUrl = data.url || data.filename || '';
        setFormImages((prev) => ({ ...prev, [field]: serverUrl }));
        
        if (isAddDialogOpen) setUseImages(true);
        if (isEditDialogOpen) setEditUseImages(true);
      } else {
        toast.error('Failed to upload image');
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
      toast.error('Failed to upload image');
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
  
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const [scriptValue, setScriptValue] = useState('');

  const insertAtCursor = (field: 'questionText' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation', text: string) => {
    const el = inputRefs.current[field as string] as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && 'selectionStart' in el) {
      const start = (el as any).selectionStart || 0;
      const end = (el as any).selectionEnd || 0;
      const value = (el as any).value || '';
      const newVal = value.slice(0, start) + text + value.slice(end);
      setNewQuestion(prev => ({ ...prev, [field]: newVal } as any));
      setTimeout(() => {
        try {
          (el as any).selectionStart = (el as any).selectionEnd = start + text.length;
          el.focus();
        } catch (_) {}
      }, 0);
      return;
    }
    setNewQuestion(prev => ({ ...prev, [field]: `${prev[field] || ''}${text}` } as any));
  };

  const insertSuper = (field: 'questionText' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation', sup: number | string) => {
    insertAtCursor(field, `^{${sup}}`);
  };

  const insertSub = (field: 'questionText' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation', sub: number | string) => {
    insertAtCursor(field, `_{${sub}}`);
  };

  const renderSupSubTools = (field: 'questionText' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation') => {
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
      if (typeof window !== 'undefined' && (window as any).katex) {
        return (window as any).katex.renderToString(text || '', { throwOnError: false });
      }
    } catch (err) {
      console.warn('KaTeX render error', err);
    }

    const replaced = String(text)
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
      .replace(/\^([^\s\{]+)/g, '<sup>$1</sup>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
      .replace(/_([^\s\{]+)/g, '<sub>$1</sub>');
    return replaced;
  };  
  const renderOptionContent = (question: Partial<FacultyQuestion> | Record<string, string | number | null | undefined>, opt: 'A' | 'B' | 'C' | 'D', includeLocalPreview = false) => {
    const imgKey = `option${opt}Image`;
    const textKey = `option${opt}`;
    const localKey = `option${opt}Image` as keyof typeof localPreviews;
    const record = question as Record<string, string | number | null | undefined>;
    
    const imageValue = record[imgKey];
    const textValue = record[textKey];
    const image = imageValue ? String(imageValue) : '';
    const text = textValue ? String(textValue) : '';
    const localImg = includeLocalPreview ? (localPreviews[localKey] || '') : '';
    
    const hasImage = image && image.trim() !== '';
    const hasText = text && text.trim() !== '';
    
    if (hasImage && hasText) {
      return (
        <div className="space-y-2">
          <ImageWithFallback src={image} localSrc={localImg} alt={`Option ${opt}`} className="max-w-xs rounded shadow-sm border" clickToZoom={true} />
          <div><span dangerouslySetInnerHTML={{ __html: renderMathSafe(text) }} /></div>
        </div>
      );
    } else if (hasImage) {
      return <ImageWithFallback src={image} localSrc={localImg} alt={`Option ${opt}`} className="max-w-xs rounded shadow-sm border" clickToZoom={true} />;
    } else if (hasText) {
      return <span dangerouslySetInnerHTML={{ __html: renderMathSafe(text) }} />;
    }
    
    return <span className="text-gray-400">No content</span>;
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
  
  const hasQuestionImages = (question: FacultyQuestion) => {
    const qrec = question as Partial<FacultyQuestion> & Record<string, unknown>;
    return Boolean(
      (qrec.questionImage as string | undefined) ||
      (qrec.optionAImage as string | undefined) ||
      (qrec.optionBImage as string | undefined) ||
      (qrec.optionCImage as string | undefined) ||
      (qrec.optionDImage as string | undefined) ||
      (qrec.explanationImage as string | undefined)
    );
  };
  
  const resetDialogState = (keepContext = false) => {
    if (!keepContext) {
      setFormImages({
        questionImage: '',
        optionAImage: '',
        optionBImage: '',
        optionCImage: '',
        optionDImage: '',
        explanationImage: ''
      });
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
      // Complete reset - clear everything including subject and topic
      setNewQuestion({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: '',
        explanation: '',
        marks: 4,
        examType: '',
        subjectId: '',
        topicId: '',
        subtopicId: 'none'
      });
    } else {
      // Keep context (subject/topic) but reset form fields for next question
      setNewQuestion(prev => ({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: '',
        explanation: '',
        marks: 4,
        examType: prev.examType, // Keep exam type
        subjectId: prev.subjectId, // Keep subject
        topicId: prev.topicId, // Keep topic
        subtopicId: prev.subtopicId // Keep subtopic
      }));
      // Clear images for next question
      setFormImages({
        questionImage: '',
        optionAImage: '',
        optionBImage: '',
        optionCImage: '',
        optionDImage: '',
        explanationImage: ''
      });
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
    }
  };

  // Initialize filters from query params (subjectId, topicId, subtopicId)
  useEffect(() => {
    const s = searchParams.get('subjectId') || '';
    const t = searchParams.get('topicId') || '';
    const st = searchParams.get('subtopicId') || '';
    if (s) setSelectedSubject(s);
    if (t) setSelectedTopic(t);
    // treat 'none' as empty
    if (st && st !== 'none') setSelectedSubtopic(st);

    // Fetch questions based on selected filters (subject/topic/subtopic)
    const fetchQuestions = async () => {
      // Don't fetch if no subject selected
      if (!selectedSubject) {
        setQuestions([]);
        setLoadingQuestions(false);
        return;
      }

      setLoadingQuestions(true);
      try {
        const query = new URLSearchParams();
        query.append('subjectId', selectedSubject);
        if (selectedTopic) query.append('topicId', selectedTopic);
        if (selectedSubtopic) query.append('subtopicId', selectedSubtopic);
        if (searchQuery) query.append('search', searchQuery);
        
        const url = '/admin/questions' + (query.toString() ? `?${query.toString()}` : '');
        console.log('Fetching questions from:', url);
        
        const data = await apiFetch(url, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        if (data?.success && Array.isArray(data.questions)) {
          // Map backend response to frontend format
          const mappedQuestions = data.questions.map((q: any) => ({
            id: q.id,
            questionText: q.text || q.questionText || '',
            questionImage: q.questionImage || null,
            optionA: q.optionA || '',
            optionAImage: q.optionAImage || null,
            optionB: q.optionB || '',
            optionBImage: q.optionBImage || null,
            optionC: q.optionC || '',
            optionCImage: q.optionCImage || null,
            optionD: q.optionD || '',
            optionDImage: q.optionDImage || null,
            correctAnswer: q.correctAnswer || q.answer,
            explanation: q.explanation || '',
            explanationImage: q.explanationImage || null,
            marks: q.marks || 4,
            examType: q.examType,
            subjectId: q.subjectId,
            subjectName: q.subjectName,
            topicId: q.topicId,
            topicName: q.topicName,
            subtopicId: q.subtopicId,
            subtopicName: q.subtopicName,
            status: q.status || 'active',
            createdBy: q.createdBy || 'Unknown',
            createdAt: q.createdAt
          }));
          
          if (mappedQuestions.length > 0) {
            console.log('Sample question:', {
              id: mappedQuestions[0].id,
              questionText: mappedQuestions[0].questionText?.substring(0, 50),
              topicId: mappedQuestions[0].topicId,
              subtopicId: mappedQuestions[0].subtopicId
            });
          }
          setQuestions(mappedQuestions);
        } else {
          console.warn('No questions in response');
          setQuestions([]);
        }
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        setQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [selectedSubject, selectedTopic, selectedSubtopic, searchQuery, token]);

  useEffect(() => {
    // fetch topics for selected subject in filter
    const fetchTopics = async () => {
      if (!selectedSubject) {
        setTopics([]);
        return;
      }
      try {
        const res = await apiFetch(`/admin/topics?subjectId=${selectedSubject}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.topics)) setTopics(res.topics);
      } catch (err) {
        console.warn('Failed to fetch topics', err);
        setTopics([]);
      }
    };
    fetchTopics();
  }, [selectedSubject, token]);

  // fetch subtopics for selected topic in filter
  useEffect(() => {
    const fetchSubtopics = async () => {
      if (!selectedTopic) {
        setSubtopics([]);
        return;
      }

      try {
        const res = await apiFetch(`/admin/subtopics?topicId=${selectedTopic}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.subtopics)) {
          setSubtopics(res.subtopics);
        } else {
          setSubtopics([]);
        }
      } catch (err) {
        console.warn('Failed to fetch subtopics', err);
        setSubtopics([]);
      }
    };
    fetchSubtopics();
  }, [selectedTopic, token]);

  useEffect(() => {
    // fetch topics for selected subject in dialog
    const fetchDialogTopics = async () => {
      if (!newQuestion.subjectId) {
        setDialogTopics([]);
        return;
      }
      try {
        const res = await apiFetch(`/admin/topics?subjectId=${newQuestion.subjectId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.topics)) {
          console.log('Dialog topics loaded:', res.topics);
          setDialogTopics(res.topics);
        } else {
          console.warn('No topics in response:', res);
          setDialogTopics([]);
        }
      } catch (err) {
        console.warn('Failed to fetch dialog topics', err);
        setDialogTopics([]);
      }
    };
    fetchDialogTopics();
  }, [newQuestion.subjectId, token]);

  // fetch subtopics for selected topic in dialog
  useEffect(() => {
    const fetchDialogSubtopics = async () => {
      if (!newQuestion.topicId) {
        setSubtopics([]);
        return;
      }
      try {
        const res = await apiFetch(`/admin/subtopics?topicId=${newQuestion.topicId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.subtopics)) {
          setSubtopics(res.subtopics);
        } else {
          setSubtopics([]);
        }
      } catch (err) {
        console.warn('Failed to fetch dialog subtopics', err);
        setSubtopics([]);
      }
    };
    fetchDialogSubtopics();
  }, [newQuestion.topicId, token]);

  // fetch subtopics for edit dialog topic
  useEffect(() => {
    const fetchEditDialogSubtopics = async () => {
      if (!editQuestionForm.topicId) {
        setEditDialogSubtopics([]);
        return;
      }
      try {
        const res = await apiFetch(`/admin/subtopics?topicId=${editQuestionForm.topicId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.subtopics)) {
          setEditDialogSubtopics(res.subtopics);
        } else {
          setEditDialogSubtopics([]);
        }
      } catch (err) {
        console.warn('Failed to fetch edit dialog subtopics', err);
        setEditDialogSubtopics([]);
      }
    };
    fetchEditDialogSubtopics();
  }, [editQuestionForm.topicId, token]);

  // When viewingQuestion changes, fetch tests that include this question
  useEffect(() => {
    if (!viewingQuestion) {
      setTestsContaining([]);
      return;
    }
    const fetchTests = async () => {
      try {
        const res = await apiFetch(`/admin/questions/${viewingQuestion.id}/tests`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.tests)) {
          setTestsContaining(res.tests.map((t: any) => ({ id: String(t.id), title: t.title })));
        } else {
          setTestsContaining([]);
        }
      } catch (err) {
        console.warn('Failed to fetch tests containing question', err);
        setTestsContaining([]);
      }
    };
    fetchTests();
  }, [viewingQuestion, token]);

  // fetch topics for edit dialog when edit subject changes
  useEffect(() => {
    const fetchEditDialogTopics = async () => {
      if (!editQuestionForm.subjectId) {
        return;
      }
      try {
        const res = await apiFetch(`/admin/topics?subjectId=${editQuestionForm.subjectId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res?.success && Array.isArray(res.topics)) {
          setDialogTopics(res.topics);
        }
      } catch (err) {
        console.warn('Failed to fetch edit dialog topics', err);
      }
    };
    fetchEditDialogTopics();
  }, [editQuestionForm.subjectId, token]);

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

  const filteredQuestions = questions.filter(q => {
    // First check if question is complete - has all required fields
    const isComplete = q.questionText && 
                       q.questionText.trim() !== '' && 
                       q.optionA && q.optionA.trim() !== '' && 
                       q.optionB && q.optionB.trim() !== '' && 
                       q.optionC && q.optionC.trim() !== '' && 
                       q.optionD && q.optionD.trim() !== '' && 
                       q.correctAnswer && 
                       q.topicId;
    
    if (!isComplete) return false;
    
    // Then apply filters
    const sq = (searchQuery || '').toLowerCase();
    const matchesSearch = (q.questionText || '').toLowerCase().includes(sq) ||
                          (q.optionA || '').toLowerCase().includes(sq) ||
                          (q.optionB || '').toLowerCase().includes(sq) ||
                          (q.optionC || '').toLowerCase().includes(sq) ||
                          (q.optionD || '').toLowerCase().includes(sq);
    const matchesSubject = !selectedSubject || String(q.subjectId) === String(selectedSubject);
    const matchesTopic = !selectedTopic || String(q.topicId) === String(selectedTopic);
    const matchesSubtopic = !selectedSubtopic || String(q.subtopicId) === String(selectedSubtopic);
    const matchesExam = filterExam === 'all' || q.examType === filterExam;
    return matchesSearch && matchesSubject && matchesTopic && matchesSubtopic && matchesExam;
  });

  const getTopicsForSubject = (subjectId: string) => {
    // For filter section, use topics state which is fetched based on selectedSubject
    return topics.filter(t => String(t.subjectId) === String(subjectId));
  };

  const clearFilters = () => {
    setSelectedSubject('');
    setSelectedTopic('');
    setFilterExam('all');
    setSearchQuery('');
  };

  const activeFiltersCount = [selectedSubject, selectedTopic, selectedSubtopic, filterExam !== 'all'].filter(Boolean).length;

  const handleAddQuestion = async (saveAndNext = false) => {
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Full newQuestion state:', newQuestion);
    console.log('Subject ID:', newQuestion.subjectId);
    console.log('Topic ID:', newQuestion.topicId);
    console.log('Topic ID type:', typeof newQuestion.topicId);
    console.log('Dialog Topics:', dialogTopics);
    
    if (!newQuestion.questionText || !newQuestion.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }
    
    if (!newQuestion.topicId || newQuestion.topicId.trim() === '') {
      toast.error('Please select a topic');
      console.error('Topic ID is missing or empty:', newQuestion.topicId);
      return;
    }
    
    if (!newQuestion.correctAnswer) {
      toast.error('Please select the correct answer');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        topicId: String(newQuestion.topicId).trim(),
        subtopicId: (newQuestion.subtopicId && newQuestion.subtopicId !== 'none') ? String(newQuestion.subtopicId).trim() : null,
        questionText: newQuestion.questionText.trim(),
        questionImage: formImages.questionImage || null,
        optionA: newQuestion.optionA?.trim() || '',
        optionAImage: formImages.optionAImage || null,
        optionB: newQuestion.optionB?.trim() || '',
        optionBImage: formImages.optionBImage || null,
        optionC: newQuestion.optionC?.trim() || '',
        optionCImage: formImages.optionCImage || null,
        optionD: newQuestion.optionD?.trim() || '',
        optionDImage: formImages.optionDImage || null,
        correctAnswer: newQuestion.correctAnswer,
        explanation: newQuestion.explanation?.trim() || '',
        explanationImage: formImages.explanationImage || null,
        marks: newQuestion.marks || 4,
        useImageMode: useImages || false
      };
  
      const res = await apiFetch('/admin/questions', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: JSON.stringify(body) 
      });
      
    
      if (res?.success) {
        if (saveAndNext) {
          resetDialogState(true);
          toast.success('Question added! Add another.');
        } else {
          setIsAddDialogOpen(false);
          resetDialogState(false);
          toast.success('Question added successfully');
        }
        
        // Refresh questions list
        const query = new URLSearchParams();
        if (selectedTopic) {
          query.append('topicId', selectedTopic);
        } else if (selectedSubject) {
          query.append('subjectId', selectedSubject);
        }
        if (searchQuery) query.append('search', searchQuery);
        
        const qRes = await apiFetch('/admin/questions' + (query.toString() ? `?${query.toString()}` : ''), { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        if (qRes?.success && Array.isArray(qRes.questions)) {
          const mappedQuestions = qRes.questions.map((q: any) => ({
            id: q.id,
            questionText: q.text || q.questionText || '',
            questionImage: q.questionImage || null,
            optionA: q.optionA || '',
            optionAImage: q.optionAImage || null,
            optionB: q.optionB || '',
            optionBImage: q.optionBImage || null,
            optionC: q.optionC || '',
            optionCImage: q.optionCImage || null,
            optionD: q.optionD || '',
            optionDImage: q.optionDImage || null,
            correctAnswer: q.correctAnswer || q.answer,
            explanation: q.explanation || '',
            explanationImage: q.explanationImage || null,
            marks: q.marks || 4,
            examType: q.examType,
            subjectId: q.subjectId,
            subjectName: q.subjectName,
            topicId: q.topicId,
            topicName: q.topicName,
            status: q.status || 'active',
            createdBy: q.createdBy || 'Unknown',
            createdAt: q.createdAt
          }));
          setQuestions(mappedQuestions);
        }
      } else {
        toast.error(res?.message || 'Failed to add question');
      }
    } catch (err) {
      console.warn('Failed to add question', err);
      toast.error('Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };



  const resetEditState = () => {
    setEditQuestionForm({
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '' as 'A'|'B'|'C'|'D'|'',
      explanation: '',
      marks: 4,
      subjectId: '',
      topicId: '',
      subtopicId: ''
    });
    // clear form images and local previews
    setFormImages({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' });
    setLocalPreviews({ questionImage: '', optionAImage: '', optionBImage: '', optionCImage: '', optionDImage: '', explanationImage: '' });
    setEditUseImages(false);
    setEditingQuestion(null);
    setEditDialogSubtopics([]);
  };

  // Open edit dialog and populate form
  const openEditDialog = (question: FacultyQuestion) => {
    setEditingQuestion(question);
    setEditQuestionForm({
      questionText: question.questionText || '',
      optionA: question.optionA || '',
      optionB: question.optionB || '',
      optionC: question.optionC || '',
      optionD: question.optionD || '',
      correctAnswer: question.correctAnswer || '' as 'A'|'B'|'C'|'D'|'',
      explanation: question.explanation || '',
      marks: question.marks || 4,
      subjectId: String(question.subjectId || ''),
      topicId: String(question.topicId || ''),
      subtopicId: question.subtopicId ? String(question.subtopicId) : 'none'
    });
    setFormImages({
      questionImage: (question as any).questionImage || '',
      optionAImage: (question as any).optionAImage || '',
      optionBImage: (question as any).optionBImage || '',
      optionCImage: (question as any).optionCImage || '',
      optionDImage: (question as any).optionDImage || '',
      explanationImage: (question as any).explanationImage || ''
    });
    setEditUseImages(Boolean((question as any).questionImage));
    // close view dialog if open and open edit dialog
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setQuestionToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    const id = questionToDelete.id;
    setDeletingQuestionId(id);
    try {
      const res = await apiFetch(`/admin/questions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res?.success) {
        setQuestions(prev => prev.filter(q => q.id !== id));
        setExpandedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        toast.success('Question deleted');
        closeDeleteDialog();
      } else {
        toast.error(res?.message || 'Failed to delete question');
      }
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Failed to delete question');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Question Management</h1>
          <p className="text-muted-foreground">Create and manage MCQ questions</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Question List</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filter Cards */}
          <div className="grid gap-4">
            {/* Subject Filter Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Filter by Subject</h3>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All ({activeFiltersCount})
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {allocatedSubjects.map((subject) => {
                  const SubjectIcon = getSubjectIcon(subject.subjectName);
                  const isSelected = String(selectedSubject) === String(subject.id);
                  // Only show count for selected subject to avoid loading all questions
                  const subjectQuestionCount = isSelected ? questions.filter(q => 
                    String(q.subjectId) === String(subject.id) && 
                    q.questionText && q.questionText.trim() !== '' &&
                    q.optionA && q.optionA.trim() !== '' &&
                    q.optionB && q.optionB.trim() !== '' &&
                    q.optionC && q.optionC.trim() !== '' &&
                    q.optionD && q.optionD.trim() !== ''
                  ).length : null;
                  
                  return (
                    <Card
                      key={subject.id}
                      className={`cursor-pointer transition-all duration-300 border-2 ${
                        isSelected
                          ? 'border-orange-500 shadow-lg shadow-orange-500/20 scale-105'
                          : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                      }`}
                      onClick={() => {
                        setSelectedSubject(isSelected ? '' : String(subject.id));
                        if (!isSelected) {
                          setSelectedTopic('');
                          setSelectedSubtopic('');
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getSubjectColor(subject.subjectName)} flex items-center justify-center shadow-lg`}>
                            <SubjectIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="w-full">
                            <p className="font-semibold text-sm text-gray-900">{subject.subjectName}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {subject.examType}
                            </Badge>
                            {isSelected && subjectQuestionCount !== null && (
                              <p className="text-xs text-gray-500 mt-1">
                                {subjectQuestionCount} question{subjectQuestionCount !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Topic Filters - Show when subject is selected and questions are loaded */}
            {selectedSubject && topics.length > 0 && questions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Filter by Topic
                    {(selectedTopic || selectedSubtopic) && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        (Showing {filteredQuestions.length} of {questions.length} questions)
                      </span>
                    )}
                  </h3>
                  {selectedTopic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTopic('')}
                      className="h-8 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filter
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {topics.map((topic) => {
                    const isSelected = String(selectedTopic) === String(topic.id);
                    const selectedSubjectData = allocatedSubjects.find(s => String(s.id) === String(selectedSubject));
                    // Show count from currently loaded questions (subject-level)
                    const topicQuestionCount = questions.filter(q => 
                      String(q.topicId) === String(topic.id) &&
                      q.questionText && q.questionText.trim() !== '' &&
                      q.optionA && q.optionA.trim() !== '' &&
                      q.optionB && q.optionB.trim() !== '' &&
                      q.optionC && q.optionC.trim() !== '' &&
                      q.optionD && q.optionD.trim() !== ''
                    ).length;
                    
                    return (
                      <Badge
                        key={topic.id}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-2 justify-start h-auto text-left transition-all ${
                          isSelected
                            ? 'bg-orange-500 hover:bg-orange-600'
                            : topicQuestionCount > 0
                            ? 'hover:bg-blue-50 border-blue-200'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (topicQuestionCount > 0) {
                            setSelectedTopic(isSelected ? '' : String(topic.id));
                            if (!isSelected) setSelectedSubtopic('');
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1 text-xs line-clamp-1">{topic.name}</span>
                          <span className={`text-xs font-semibold ${isSelected ? 'text-white' : topicQuestionCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {topicQuestionCount}
                          </span>
                        </div>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subtopic Filters - Show when topic is selected and subtopics are loaded */}
            {selectedTopic && subtopics.length > 0 && questions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Filter by Subtopic
                    {selectedSubtopic && (
                      <span className="ml-2 text-xs font-normal text-green-600">
                        (Showing {filteredQuestions.length} of {questions.length} questions)
                      </span>
                    )}
                  </h3>
                  {selectedSubtopic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSubtopic('')}
                      className="h-8 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filter
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {subtopics.map((subtopic) => {
                    const isSelected = String(selectedSubtopic) === String(subtopic.id);
                    // Show count from currently loaded questions (subject-level)
                    const subtopicQuestionCount = questions.filter(q => 
                      String(q.subtopicId) === String(subtopic.id) &&
                      q.questionText && q.questionText.trim() !== '' &&
                      q.optionA && q.optionA.trim() !== '' &&
                      q.optionB && q.optionB.trim() !== '' &&
                      q.optionC && q.optionC.trim() !== '' &&
                      q.optionD && q.optionD.trim() !== ''
                    ).length;
                    
                    return (
                      <Badge
                        key={subtopic.id}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-2 justify-start h-auto text-left transition-all ${
                          isSelected
                            ? 'bg-green-500 hover:bg-green-600'
                            : subtopicQuestionCount > 0
                            ? 'hover:bg-green-50 border-green-200'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (subtopicQuestionCount > 0) {
                            setSelectedSubtopic(isSelected ? '' : String(subtopic.id));
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-1 text-xs line-clamp-1">{subtopic.name}</span>
                          <span className={`text-xs font-semibold ${isSelected ? 'text-white' : subtopicQuestionCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {subtopicQuestionCount}
                          </span>
                        </div>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Active Filters:</span>
                  {selectedSubject && (
                    <Badge variant="secondary" className="gap-1">
                      {allocatedSubjects.find(s => String(s.id) === String(selectedSubject))?.subjectName}
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
                      {topics.find(t => String(t.id) === String(selectedTopic))?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          setSelectedTopic('');
                          setSelectedSubtopic('');
                        }}
                      />
                    </Badge>
                  )}
                  {selectedSubtopic && (
                    <Badge variant="secondary" className="gap-1">
                      {subtopics.find(s => String(s.id) === String(selectedSubtopic))?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedSubtopic('')}
                      />
                    </Badge>
                  )}
                  {filterExam !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {filterExam}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setFilterExam('all')}
                      />
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Additional Filters */}
          {(selectedSubject || selectedTopic) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Search & Filter Questions</h3>
                  {(searchQuery || filterExam !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterExam('all');
                      }}
                      className="h-8 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                
                </div>
                {(searchQuery || filterExam !== 'all') && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Showing {filteredQuestions.length} of {questions.length} questions
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loadingQuestions && (selectedSubject || selectedTopic) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions List Header */}
          {!loadingQuestions && selectedSubject && filteredQuestions.length > 0 && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {allocatedSubjects.find(s => String(s.id) === String(selectedSubject))?.subjectName || 'Subject'} Questions
                {selectedTopic && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    • Filtered by: {topics.find(t => String(t.id) === String(selectedTopic))?.name}
                  </span>
                )}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredQuestions.length}{selectedTopic && questions.length > filteredQuestions.length ? ` of ${questions.length}` : ''} questions)
                </span>
              </h3>
            </div>
          )}

          {/* Questions List */}
          {!loadingQuestions && selectedSubject && filteredQuestions.length > 0 && (
            <div className="space-y-4">
              {filteredQuestions.map((question, index) => (
                <Card key={question.id} className="border-0 shadow-sm">
                  <CardContent className="p-3 sm:p-4 flex flex-col">
                    <div className="flex flex-col space-y-4">
                      <div className="flex-1">
                      {/* Header with badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={question.examType === 'NEET' ? 'default' : 'secondary'} className="text-xs">
                          {question.examType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.subjectName}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.topicName}
                        </Badge>
                        {question.subtopicName && (
                          <Badge variant="outline" className="text-xs">
                            {question.subtopicName}
                          </Badge>
                        )}
                      </div>

                      {/* Question text */}
                      <div className="space-y-3">
                        <p
                          className="font-medium text-sm sm:text-base leading-relaxed break-words max-w-full overflow-hidden overflow-x-hidden text-ellipsis line-clamp-3 sm:line-clamp-none"
                          style={{ wordBreak: 'break-word' }}
                        >
                          Q{index + 1}. {question.questionText}
                        </p>

                        {/* Question image (thumbnail by default, larger when expanded) */}
                        {question.questionImage && (
                          <div className="mt-2">
                            {expandedQuestions.has(String(question.id)) ? (
                              <ImageWithFallback src={question.questionImage} alt="Question image" className="w-full max-h-[56vh] object-contain rounded-md" clickToZoom={true} />
                            ) : (
                              <ImageWithFallback src={question.questionImage} alt="Question thumbnail" className="max-w-xs rounded shadow-sm mt-2" clickToZoom={true} />
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-sm sm:text-base">
                          <span className="font-semibold text-foreground">Answer:</span>
                          <span className="font-bold text-green-700">{question.correctAnswer}</span>
                          <div className="ml-2 text-sm text-gray-700 break-words">
                            {question.correctAnswer && renderOptionContent(question, question.correctAnswer as 'A'|'B'|'C'|'D', false)}
                          </div>
                        </div>

                        <div className="mt-2">
                          {!expandedQuestions.has(String(question.id)) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => setExpandedQuestions(prev => { const next = new Set(prev); next.add(String(question.id)); return next; })}
                              aria-expanded={false}
                              aria-controls={`question-details-${question.id}`}
                            >
                              View More
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => setExpandedQuestions(prev => { const next = new Set(prev); next.delete(String(question.id)); return next; })}
                              aria-expanded={true}
                              aria-controls={`question-details-${question.id}`}
                            >
                              View Less
                            </Button>
                          )}
                        </div>

                        {/* Options grid - responsive (flexible items, supports images/text) */}
                        {expandedQuestions.has(String(question.id)) && (
                          <div id={`question-details-${question.id}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-3">
                          {(['A','B','C','D'] as const).map((opt) => {
                            const isCorrect = question.correctAnswer === opt;
                            return (
                              <div key={opt} className={`p-2 sm:p-3 rounded-md text-xs sm:text-sm transition-colors flex items-start gap-3 min-h-[44px] ${isCorrect ? 'bg-orange-50 text-orange-700 font-medium border border-orange-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                                <span className="font-semibold flex-shrink-0">{opt}.</span>
                                <div className="flex-1 break-words">
                                  {renderOptionContent(question, opt as 'A'|'B'|'C'|'D', false)}
                                </div>
                                {isCorrect && (
                                  <div className="ml-2 flex items-center"><CheckCircle2 className="h-4 w-4 text-orange-600" /></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        )}
                      </div>

                      </div>
                       {expandedQuestions.has(String(question.id)) && question.explanation && (
                          <div className="mt-2 text-xs sm:text-sm text-blue-700 bg-blue-50 rounded p-2 break-words">
                            <span className="font-semibold">Explanation:</span> {question.explanation}
                          </div>
                        )}
                
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground">{question.marks}</span> marks
                          </div>
                          {question.createdAt && (
                            <div className="hidden sm:flex items-center gap-1">
                              <span>Created {new Date(question.createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2">

                          {/* Inline actions for sm+ */}
                          <div className="hidden sm:flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewingQuestion(question);
                                setIsViewDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(question)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setQuestionToDelete(question);
                                setIsDeleteDialogOpen(true);
                              }}
                              aria-label="Delete question"
                              disabled={deletingQuestionId === question.id}
                              title={deletingQuestionId === question.id ? 'Deleting...' : 'Delete'}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Compact menu for xs screens */}
                          <div className="flex sm:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setViewingQuestion(question); setIsViewDialogOpen(true); }}>
                                  <Eye className="w-4 h-4 mr-2" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(question)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { setQuestionToDelete(question); setIsDeleteDialogOpen(true); }}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!selectedSubject && !loadingQuestions && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Subjects Allocated</h3>
                <p className="text-muted-foreground">
                  No subjects have been allocated to you yet. Please contact your administrator.
                </p>
              </CardContent>
            </Card>
          )}

          {!loadingQuestions && selectedSubject && filteredQuestions.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Questions Found</h3>
                <p className="text-muted-foreground">
                  {selectedTopic 
                    ? `No questions match the selected topic filter. Try selecting a different topic or clear the filter.` 
                    : `No questions in ${allocatedSubjects.find(s => String(s.id) === String(selectedSubject))?.subjectName} yet. Add your first question to get started.`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        
      </Tabs>

      {/* Add Question Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetDialogState(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Create a new MCQ question with optional images</DialogDescription>
          </DialogHeader>
          <form className="space-y-4 mt-4" onSubmit={(e) => {
            e.preventDefault();
            handleAddQuestion(false);
          }}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select 
                  value={newQuestion.subjectId} 
                  onValueChange={(v) => {
                    const subject = allocatedSubjects.find(s => String(s.id) === String(v));
                    console.log('Subject selected:', v, 'Found:', subject);
                    setNewQuestion({
                      ...newQuestion, 
                      subjectId: v, 
                      topicId: '',
                      subtopicId: 'none',
                      examType: (subject?.examType || '') as 'NEET' | 'JEE' | ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {allocatedSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.subjectName} ({subject.examType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic * {dialogTopics.length > 0 && <span className="text-xs text-gray-500">({dialogTopics.length} available)</span>}</Label>
                <Select 
                  value={newQuestion.topicId} 
                  onValueChange={(v) => setNewQuestion({...newQuestion, topicId: v, subtopicId: 'none'})}
                  disabled={!newQuestion.subjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !newQuestion.subjectId 
                        ? "Select subject first" 
                        : dialogTopics.length === 0 
                        ? "Loading topics..." 
                        : "Select Topic"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {dialogTopics.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-gray-500">
                        {newQuestion.subjectId ? "No topics available for this subject" : "Select a subject first"}
                      </div>
                    ) : (
                      dialogTopics.map((topic) => (
                        <SelectItem key={topic.id} value={String(topic.id)}>
                          {topic.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subtopic</Label>
                <Select 
                  value={newQuestion.subtopicId} 
                  onValueChange={(v) => setNewQuestion({...newQuestion, subtopicId: v})}
                  disabled={!newQuestion.topicId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !newQuestion.topicId 
                        ? "Select topic first" 
                        : "Select Subtopic"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subtopic</SelectItem>
                    {subtopics
                      .filter(subtopic => String(subtopic.topicId) === newQuestion.topicId)
                      .map((subtopic) => (
                        <SelectItem key={subtopic.id} value={String(subtopic.id)}>
                          {subtopic.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attach Images (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Use Images</span>
                  <Switch checked={useImages} onCheckedChange={setUseImages} />
                </div>
              </div>
              {useImages && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="space-y-2">
                    <Label>Question Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'questionImage'); }} />
                    {(localPreviews.questionImage || formImages.questionImage) && (
                      <ImageWithFallback src={formImages.questionImage} localSrc={localPreviews.questionImage} alt="question" className="w-full max-w-xs mt-2 rounded" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Option A Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionAImage'); }} />
                    {(localPreviews.optionAImage || formImages.optionAImage) && (
                      <ImageWithFallback src={formImages.optionAImage} localSrc={localPreviews.optionAImage} alt="optA" className="w-full max-w-xs mt-2 rounded" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Option B Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionBImage'); }} />
                    {(localPreviews.optionBImage || formImages.optionBImage) && (
                      <ImageWithFallback src={formImages.optionBImage} localSrc={localPreviews.optionBImage} alt="optB" className="w-full max-w-xs mt-2 rounded" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Option C Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionCImage'); }} />
                    {(localPreviews.optionCImage || formImages.optionCImage) && (
                      <ImageWithFallback src={formImages.optionCImage} localSrc={localPreviews.optionCImage} alt="optC" className="w-full max-w-xs mt-2 rounded" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Option D Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionDImage'); }} />
                    {(localPreviews.optionDImage || formImages.optionDImage) && (
                      <ImageWithFallback src={formImages.optionDImage} localSrc={localPreviews.optionDImage} alt="optD" className="w-full max-w-xs mt-2 rounded" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Explanation Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'explanationImage'); }} />
                    {(localPreviews.explanationImage || formImages.explanationImage) && (
                      <ImageWithFallback src={formImages.explanationImage} localSrc={localPreviews.explanationImage} alt="explanation" className="w-full max-w-xs mt-2 rounded" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label>Marks *</Label>
                <Input 
                  type="number" 
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({...newQuestion, marks: parseInt(e.target.value) || 4})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Question Text *</Label>
                <div className="flex items-center gap-2">
                  {renderSupSubTools('questionText')}
                </div>
              </div>
              <Textarea
                value={newQuestion.questionText}
                onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                placeholder="Enter the question..."
                className="min-h-[80px]"
                required
                ref={(el) => (inputRefs.current['questionText'] = el)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Option A *</Label>
                  <div className="flex items-center gap-2">
                    {renderSupSubTools('optionA')}
                  </div>
                </div>
                <Input
                  value={newQuestion.optionA}
                  onChange={(e) => setNewQuestion({...newQuestion, optionA: e.target.value})}
                  required={!useImages}
                  ref={(el) => (inputRefs.current['optionA'] = el)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Option B *</Label>
                  <div className="flex items-center gap-2">
                    {renderSupSubTools('optionB')}
                  </div>
                </div>
                <Input
                  value={newQuestion.optionB}
                  onChange={(e) => setNewQuestion({...newQuestion, optionB: e.target.value})}
                  required={!useImages}
                  ref={(el) => (inputRefs.current['optionB'] = el)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Option C *</Label>
                  <div className="flex items-center gap-2">
                    {renderSupSubTools('optionC')}
                  </div>
                </div>
                <Input
                  value={newQuestion.optionC}
                  onChange={(e) => setNewQuestion({...newQuestion, optionC: e.target.value})}
                  required={!useImages}
                  ref={(el) => (inputRefs.current['optionC'] = el)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Option D *</Label>
                  <div className="flex items-center gap-2">
                    {renderSupSubTools('optionD')}
                  </div>
                </div>
                <Input
                  value={newQuestion.optionD}
                  onChange={(e) => setNewQuestion({...newQuestion, optionD: e.target.value})}
                  required={!useImages}
                  ref={(el) => (inputRefs.current['optionD'] = el)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Correct Answer *</Label>
              <RadioGroup 
                value={newQuestion.correctAnswer}
                onValueChange={(v: 'A'|'B'|'C'|'D') => setNewQuestion({...newQuestion, correctAnswer: v})}
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
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({...newQuestion, explanation: e.target.value})}
                placeholder="Explain the answer..."
                className="min-h-[60px]"
                ref={(el) => (inputRefs.current['explanation'] = el)}
              />
            </div>

            <div className="flex justify-between items-center gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (newQuestion.questionText) {
                    setIsFormPreviewOpen(true);
                  }
                }}
                disabled={!newQuestion.questionText}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetDialogState(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => handleAddQuestion(true)}
                  disabled={submitting || !newQuestion.topicId}
                >
                  {submitting ? 'Saving...' : 'Save & Next'}
                </Button>
                <Button type="submit" disabled={submitting || !newQuestion.topicId}>
                  {submitting ? 'Adding...' : 'Add Question'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

        {/* Edit Question Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetEditState();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>Update the question and explanation. You can attach images if needed.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4 mt-4" onSubmit={async (e) => { e.preventDefault();
              if (!editingQuestion) return; 
              setEditSubmitting(true);
              try {
                const body = {
                  topicId: String(editQuestionForm.topicId).trim(),
                  subtopicId: (editQuestionForm.subtopicId && editQuestionForm.subtopicId !== 'none') ? String(editQuestionForm.subtopicId).trim() : null,
                  questionText: editQuestionForm.questionText.trim(),
                  questionImage: formImages.questionImage || null,
                  optionA: editQuestionForm.optionA?.trim() || '',
                  optionAImage: formImages.optionAImage || null,
                  optionB: editQuestionForm.optionB?.trim() || '',
                  optionBImage: formImages.optionBImage || null,
                  optionC: editQuestionForm.optionC?.trim() || '',
                  optionCImage: formImages.optionCImage || null,
                  optionD: editQuestionForm.optionD?.trim() || '',
                  optionDImage: formImages.optionDImage || null,
                  correctAnswer: editQuestionForm.correctAnswer,
                  explanation: editQuestionForm.explanation?.trim() || '',
                  explanationImage: formImages.explanationImage || null,
                  marks: editQuestionForm.marks || 4,
                  useImageMode: editUseImages || false
                };
                const res = await apiFetch(`/admin/questions/${editingQuestion.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
                if (res?.success) {
                  // Update local list
                  setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? ({
                    ...q,
                    questionText: body.questionText,
                    optionA: body.optionA,
                    optionB: body.optionB,
                    optionC: body.optionC,
                    optionD: body.optionD,
                    correctAnswer: body.correctAnswer as 'A'|'B'|'C'|'D',
                    explanation: body.explanation,
                    marks: body.marks,
                    questionImage: body.questionImage,
                    optionAImage: body.optionAImage,
                    optionBImage: body.optionBImage,
                    optionCImage: body.optionCImage,
                    optionDImage: body.optionDImage,
                    explanationImage: body.explanationImage,
                    topicId: body.topicId
                  }) : q));
                  toast.success('Question updated successfully');
                  setIsEditDialogOpen(false);
                  resetEditState();
                } else {
                  toast.error(res?.message || 'Failed to update question');
                }
              } catch (err) {
                console.error('Failed to update question', err);
                toast.error('Failed to update question');
              } finally {
                setEditSubmitting(false);
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Select 
                    value={String(editQuestionForm.subjectId)} 
                    onValueChange={(v) => setEditQuestionForm(prev => ({ ...prev, subjectId: v, topicId: '', subtopicId: 'none' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {allocatedSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={String(subject.id)}>
                          {subject.subjectName} ({subject.examType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Topic *</Label>
                  <Select 
                    value={String(editQuestionForm.topicId)} 
                    onValueChange={(v) => setEditQuestionForm(prev => ({ ...prev, topicId: v, subtopicId: 'none' }))}
                    disabled={!editQuestionForm.subjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!editQuestionForm.subjectId ? 'Select subject first' : dialogTopics.length === 0 ? 'Loading topics...' : 'Select Topic'} />
                    </SelectTrigger>
                    <SelectContent>
                      {dialogTopics.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-gray-500">{editQuestionForm.subjectId ? 'No topics available for this subject' : 'Select a subject first'}</div>
                      ) : (
                        dialogTopics.map((topic) => (
                          <SelectItem key={topic.id} value={String(topic.id)}>{topic.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subtopic</Label>
                  <Select 
                    value={String(editQuestionForm.subtopicId || 'none')} 
                    onValueChange={(v) => setEditQuestionForm(prev => ({ ...prev, subtopicId: v }))}
                    disabled={!editQuestionForm.topicId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!editQuestionForm.topicId ? 'Select topic first' : 'Select Subtopic'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subtopic</SelectItem>
                      {editDialogSubtopics
                        .filter(subtopic => String(subtopic.topicId) === editQuestionForm.topicId)
                        .map((subtopic) => (
                          <SelectItem key={subtopic.id} value={String(subtopic.id)}>
                            {subtopic.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image Mode Toggle for Edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attach Images (optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Use Images</span>
                    <Switch checked={editUseImages} onCheckedChange={setEditUseImages} />
                  </div>
                </div>
                {editUseImages && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="space-y-2">
                      <Label>Question Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'questionImage'); }} />
                      {(localPreviews.questionImage || formImages.questionImage) && (
                        <ImageWithFallback src={formImages.questionImage} localSrc={localPreviews.questionImage} alt="question" className="w-full max-w-xs mt-2 rounded" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option A Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionAImage'); }} />
                      {(localPreviews.optionAImage || formImages.optionAImage) && (
                        <ImageWithFallback src={formImages.optionAImage} localSrc={localPreviews.optionAImage} alt="optA" className="w-full max-w-xs mt-2 rounded" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option B Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionBImage'); }} />
                      {(localPreviews.optionBImage || formImages.optionBImage) && (
                        <ImageWithFallback src={formImages.optionBImage} localSrc={localPreviews.optionBImage} alt="optB" className="w-full max-w-xs mt-2 rounded" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option C Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionCImage'); }} />
                      {(localPreviews.optionCImage || formImages.optionCImage) && (
                        <ImageWithFallback src={formImages.optionCImage} localSrc={localPreviews.optionCImage} alt="optC" className="w-full max-w-xs mt-2 rounded" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Option D Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'optionDImage'); }} />
                      {(localPreviews.optionDImage || formImages.optionDImage) && (
                        <ImageWithFallback src={formImages.optionDImage} localSrc={localPreviews.optionDImage} alt="optD" className="w-full max-w-xs mt-2 rounded" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Explanation Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'explanationImage'); }} />
                      {(localPreviews.explanationImage || formImages.explanationImage) && (
                        <ImageWithFallback src={formImages.explanationImage} localSrc={localPreviews.explanationImage} alt="explanation" className="w-full max-w-xs mt-2 rounded" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea value={editQuestionForm.questionText} onChange={(e) => setEditQuestionForm(prev => ({ ...prev, questionText: e.target.value }))} className="min-h-[80px]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Option A *</Label>
                  <Input value={editQuestionForm.optionA} onChange={(e) => setEditQuestionForm(prev => ({ ...prev, optionA: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Option B *</Label>
                  <Input value={editQuestionForm.optionB} onChange={(e) => setEditQuestionForm(prev => ({ ...prev, optionB: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Option C *</Label>
                  <Input value={editQuestionForm.optionC} onChange={(e) => setEditQuestionForm(prev => ({ ...prev, optionC: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Option D *</Label>
                  <Input value={editQuestionForm.optionD} onChange={(e) => setEditQuestionForm(prev => ({ ...prev, optionD: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correct Answer *</Label>
                <RadioGroup value={editQuestionForm.correctAnswer} onValueChange={(v: 'A'|'B'|'C'|'D') => setEditQuestionForm(prev => ({ ...prev, correctAnswer: v }))} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="A" id="EA" /><Label htmlFor="EA">A</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="B" id="EB" /><Label htmlFor="EB">B</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="C" id="EC" /><Label htmlFor="EC">C</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="D" id="ED" /><Label htmlFor="ED">D</Label></div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea value={editQuestionForm.explanation} onChange={(e) => setEditQuestionForm(prev => ({ ...prev, explanation: e.target.value }))} className="min-h-[60px]" />
              </div>

              <div className="flex justify-between items-center gap-3 pt-4">
                <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetEditState(); }} disabled={editSubmitting}>Cancel</Button>
                <div className="flex gap-3">
                  <Button type="submit" disabled={editSubmitting || !editQuestionForm.topicId || !editQuestionForm.correctAnswer}>{editSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
          setIsDeleteDialogOpen(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Question</DialogTitle>
              <DialogDescription>Are you sure you want to delete this question? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground break-words max-w-full overflow-hidden overflow-x-hidden line-clamp-3">{questionToDelete?.questionText}</p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeDeleteDialog} disabled={Boolean(deletingQuestionId)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingQuestionId)}
              >
                {deletingQuestionId ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* View Question Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Question Details</DialogTitle>
            </DialogHeader>
            {viewingQuestion && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                {/* Left: Main content - spans 2 columns on large screens */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={viewingQuestion.examType === 'NEET' ? 'default' : 'secondary'}>
                      {viewingQuestion.examType}
                    </Badge>
                    <Badge variant="outline">{viewingQuestion.subjectName}</Badge>
                    <Badge variant="outline">{viewingQuestion.topicName}</Badge>
                  </div>

                  {/* Question Image (if available) */}
                  {viewingQuestion.questionImage && (
                    <div className="rounded overflow-hidden">
                      <ImageWithFallback src={viewingQuestion.questionImage} alt="Question image" className="w-full max-h-[56vh] object-contain rounded-md" clickToZoom={true} />
                    </div>
                  )}

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium text-base sm:text-lg leading-relaxed break-words">{viewingQuestion.questionText}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <div 
                        key={option}
                        className={`p-3 rounded-lg border ${
                          viewingQuestion.correctAnswer === option 
                            ? 'bg-orange-50 border-orange-200 text-orange-600' 
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-medium">{option}.</span>
                          <div className="flex-1 break-words">
                            {renderOptionContent(viewingQuestion, option as 'A'|'B'|'C'|'D', false)}
                          </div>
                          {viewingQuestion.correctAnswer === option && (
                            <div className="ml-2 flex items-center"><CheckCircle2 className="h-4 w-4 text-orange-600" /></div>
                        )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(viewingQuestion.explanation || viewingQuestion.explanationImage) && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-2">
                      <Label className="text-primary">Explanation</Label>
                      {viewingQuestion.explanation && <p className="text-sm mt-1">{viewingQuestion.explanation}</p>}
                      {viewingQuestion.explanationImage && (
                        <div className="mt-2">
                          <ImageWithFallback src={viewingQuestion.explanationImage} alt="Explanation image" className="w-full max-h-72 object-contain rounded" clickToZoom={true} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Meta & actions */}
                <div className="lg:col-span-1 space-y-4">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Marks</div>
                        <div className="text-lg font-medium">{viewingQuestion.marks}</div>
                      </div>
                      <hr className="my-3" />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div>Created by: <span className="font-medium text-foreground">{viewingQuestion.createdBy}</span></div>
                        <div>Topic: <span className="font-medium text-foreground">{viewingQuestion.topicName}</span></div>
                        <div>Subject: <span className="font-medium text-foreground">{viewingQuestion.subjectName}</span></div>
                      </div>
                            {testsContaining.length > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-muted-foreground">Included in Tests</div>
                                  <div className="text-xs text-muted-foreground">{testsContaining.length}</div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                  {testsContaining.map(t => (
                                    <Button
                                      key={t.id}
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start w-full text-left truncate"
                                      title={t.title}
                                      onClick={() => navigate(`/faculty/tests/${t.id}`)}
                                    >
                                      <span className="truncate block">{t.title}</span>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-3">
                              <div className="text-sm text-muted-foreground">Correct Answer</div>
                              <div className="text-lg font-semibold text-orange-600">{viewingQuestion.correctAnswer}</div>
                            </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={() => openEditDialog(viewingQuestion)}>Edit</Button>
                        <Button variant="ghost" onClick={() => { setIsViewDialogOpen(false); setEditingQuestion(null); }}>Close</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
