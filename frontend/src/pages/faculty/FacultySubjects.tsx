import React, { useState } from 'react';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExams } from '@/lib/useExams';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FacultyTopic } from '@/types/faculty';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Layers,
  FileQuestion,
  Calendar,
  BarChart3,
  Atom,
  FlaskConical,
  Brain,
  Calculator,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  User,
  List
} from 'lucide-react';
import { toast } from 'sonner';

interface Subtopic {
  id: string;
  name: string;
  description: string;
  topicId: string;
  createdBy: string;
  createdById: string;
  createdAt: string;
}

// Raw subtopic shape returned by the API (may have topicId or topic_id)
type RawSubtopic = {
  id: number | string;
  name: string;
  description?: string | null;
  topicId?: number | string;
  topic_id?: number | string;
  createdAt?: string | null;
};
export default function FacultySubjects() {
  const { allocatedSubjects, faculty } = useFacultyAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<FacultyTopic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [facultyNames, setFacultyNames] = useState<Record<string, string>>({});
  const [createdTopicIds, setCreatedTopicIds] = useState<Set<string>>(new Set());
  const [createdSubtopicIds, setCreatedSubtopicIds] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [loadedSubtopicTopicIds, setLoadedSubtopicTopicIds] = useState<Set<string>>(new Set());
  const loadedSubtopicTopicIdsRef = React.useRef<Set<string>>(loadedSubtopicTopicIds);
  React.useEffect(() => { loadedSubtopicTopicIdsRef.current = loadedSubtopicTopicIds; }, [loadedSubtopicTopicIds]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const questionCountsRef = React.useRef<Record<string, number>>({});
  React.useEffect(() => { questionCountsRef.current = questionCounts; }, [questionCounts]);
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [subtopicFilter, setSubtopicFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddSubtopicDialogOpen, setIsAddSubtopicDialogOpen] = useState(false);
  const [isEditSubtopicDialogOpen, setIsEditSubtopicDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<FacultyTopic | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [newTopic, setNewTopic] = useState({ name: '', description: '', subjectId: '' });
  const [newSubtopic, setNewSubtopic] = useState({ name: '', description: '', topicId: '' });
  const [selectedSubjectForAdd, setSelectedSubjectForAdd] = useState<string>('');
  const [selectedTopicForAdd, setSelectedTopicForAdd] = useState<string>('');
  const [topicSubtopicsMap, setTopicSubtopicsMap] = useState<Record<string, Subtopic[]>>({});
  const [subtopicLoadingMap, setSubtopicLoadingMap] = useState<Record<string, boolean>>({});
  const [topicSubtopicCounts, setTopicSubtopicCounts] = useState<Record<string, number>>({});
  const topicSubtopicCountsRef = React.useRef<Record<string, number>>({});
  React.useEffect(() => { topicSubtopicCountsRef.current = topicSubtopicCounts; }, [topicSubtopicCounts]);
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;
  // Load faculty names with dedupe and fallback endpoints
  const fetchNamesInProgressRef = React.useRef<Set<string>>(new Set());
  const loadFacultyNames = React.useCallback(async (facultyIds: string[]) => {
    try {
      const uniqueIds = [...new Set(facultyIds.filter(id => id && id !== 'admin'))];
      if (uniqueIds.length === 0) return;

      // Determine which ids still need names
      const idsToFetch = uniqueIds.filter(id => !facultyNames[id] && !fetchNamesInProgressRef.current.has(id));
      if (idsToFetch.length === 0) return;

      // mark as in-progress
      idsToFetch.forEach(id => fetchNamesInProgressRef.current.add(id));

      const namesMap: Record<string, string> = { ...facultyNames };

      for (const id of idsToFetch) {
        try {
          // Prefer admin users endpoint
          // apiFetch throws on non-ok; use it so 404s are caught
          const data = await apiFetch(`/admin/users/${id}`);
          if (data && data.success && data.user) {
            namesMap[id] = data.user.name || `Faculty ${id}`;
            continue; // next id
          }

          // If admin endpoint didn't return a name, fallback to a default label
          namesMap[id] = `Faculty ${id}`;
        } catch (err) {
          console.warn(`Failed to load faculty name for ${id} using admin endpoint`, err);
          namesMap[id] = `Faculty ${id}`;
        } finally {
          fetchNamesInProgressRef.current.delete(id);
        }
      }

      setFacultyNames(prev => ({ ...prev, ...namesMap }));
    } catch (err) {
      console.warn('Failed to load faculty names', err);
    }
  }, [facultyNames]);

  // In-flight request deduper to avoid duplicate concurrent fetches
  const inflightRequestsRef = React.useRef(new Map<string, Promise<Response>>());
  const lastLoadRef = React.useRef<number>(0);
  // Simple in-memory cache for topics to avoid repeated fetches (TTL = 10s)
  const topicsCacheRef = React.useRef<{ ts: number; topics: FacultyTopic[] }>({ ts: 0, topics: [] });

  function fetchOnceRaw(input: string, init?: RequestInit) {
    const key = `${input}|${init ? JSON.stringify(init) : ''}`;
    const existing = inflightRequestsRef.current.get(key);
    if (existing) return existing;
    const p = (async () => {
      try {
        const res = await fetch(input, init);
        return res;
      } finally {
        inflightRequestsRef.current.delete(key);
      }
    })();
    inflightRequestsRef.current.set(key, p);
    return p;
  }

  // Load question counts for topics and subtopics (optimized with batching)
  const loadQuestionCounts = React.useCallback(async (topicIds: string[], subtopicIds: string[]) => {
    const currentToken = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;
    try {
      // Snapshot current counts from ref to avoid creating callback dependencies
      const counts: Record<string, number> = { ...questionCountsRef.current };

      // Filter out already loaded topic IDs
      const unloadedTopicIds = topicIds.filter(id => counts[`topic_${id}`] === undefined);
      // Filter out already loaded subtopic IDs
      const unloadedSubtopicIds = subtopicIds.filter(id => counts[`subtopic_${id}`] === undefined);

      if (unloadedTopicIds.length === 0 && unloadedSubtopicIds.length === 0) return;

      // Load topic question counts in batches to reduce requests
      const batchSize = 3; // Smaller batch size to avoid overwhelming
      for (let i = 0; i < unloadedTopicIds.length; i += batchSize) {
        const batch = unloadedTopicIds.slice(i, i + batchSize);
        await Promise.all(batch.map(async (topicId) => {
          try {
            const res = await fetchOnceRaw(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topicId}`, {
              headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
            });
            if (res.ok) {
              const data = await res.json();
              counts[`topic_${topicId}`] = data.total || 0;
            } else {
              counts[`topic_${topicId}`] = 0;
            }
          } catch (err) {
            console.warn(`Failed to load question count for topic ${topicId}`, err);
            counts[`topic_${topicId}`] = 0;
          }
        }));
        // Small delay between batches to reduce server load
        if (i + batchSize < unloadedTopicIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Load subtopic question counts in batches
      for (let i = 0; i < unloadedSubtopicIds.length; i += batchSize) {
        const batch = unloadedSubtopicIds.slice(i, i + batchSize);
        await Promise.all(batch.map(async (subtopicId) => {
          try {
            const res = await fetchOnceRaw(`${import.meta.env.VITE_API_URL}/admin/questions?subtopicId=${subtopicId}`, {
              headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
            });
            if (res.ok) {
              const data = await res.json();
              counts[`subtopic_${subtopicId}`] = data.total || 0;
            } else {
              counts[`subtopic_${subtopicId}`] = 0;
            }
          } catch (err) {
            console.warn(`Failed to load question count for subtopic ${subtopicId}`, err);
            counts[`subtopic_${subtopicId}`] = 0;
          }
        }));
        // Small delay between batches
        if (i + batchSize < unloadedSubtopicIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Merge counts into state using functional update to avoid race conditions
      setQuestionCounts(prev => ({ ...prev, ...counts }));
    } catch (err) {
      console.warn('Failed to load question counts', err);
    }
  }, []);

  // Load subtopic counts for topics (batched)
  const loadSubtopicCounts = React.useCallback(async (topicIds: string[]) => {
    const currentToken = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;
    try {
      const counts: Record<string, number> = { ...topicSubtopicCountsRef.current };
      const unloaded = topicIds.filter(id => counts[id] === undefined);
      if (unloaded.length === 0) return;
      const batchSize = 5;
      for (let i = 0; i < unloaded.length; i += batchSize) {
        const batch = unloaded.slice(i, i + batchSize);
        await Promise.all(batch.map(async (topicId) => {
          try {
            const res = await fetchOnceRaw(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${topicId}`, {
              headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
            });
            if (res.ok) {
              const data = await res.json();
              counts[topicId] = Array.isArray(data.subtopics) ? data.subtopics.length : 0;
            } else {
              counts[topicId] = 0;
            }
          } catch (err) {
            console.warn(`Failed to load subtopics for topic ${topicId}`, err);
            counts[topicId] = 0;
          }
        }));
        if (i + batchSize < unloaded.length) await new Promise(r => setTimeout(r, 100));
      }
      setTopicSubtopicCounts(prev => ({ ...prev, ...counts }));
    } catch (err) {
      console.warn('Failed to load subtopic counts', err);
    }
  }, []);

  // Load subtopics for a single topic (lazy, cached per topic)
  const loadSubtopicsForTopic = React.useCallback(async (topicId: string) => {
    if (!topicId) return [] as Subtopic[];

    // Hard-cache guard using ref to avoid stale closures
    if (loadedSubtopicTopicIdsRef.current.has(topicId)) {
      return subtopics.filter(s => String(s.topicId) === topicId);
    }

    // Mark as loaded immediately to prevent duplicate concurrent loads
    setLoadedSubtopicTopicIds(prev => {
      const n = new Set(prev);
      n.add(topicId);
      loadedSubtopicTopicIdsRef.current = n;
      return n;
    });

    const currentToken = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;
    try {
      const res = await fetchOnceRaw(`${import.meta.env.VITE_API_URL}/admin/subtopics?topicId=${topicId}`, { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.subtopics)) {
        const mapped: Subtopic[] = data.subtopics.map((s: RawSubtopic) => ({
          id: String(s.id),
          name: s.name,
          description: s.description || '',
          topicId: String(s.topicId || s.topic_id),
          createdBy: createdSubtopicIds.has(String(s.id)) ? 'faculty' : 'admin',
          createdById: createdSubtopicIds.has(String(s.id)) ? faculty?.id || '' : 'admin',
          createdAt: s.createdAt || ''
        }));

        // Merge unique
        setSubtopics(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          for (const m of mapped) map.set(m.id, m);
          return Array.from(map.values());
        });

        // Load question counts for these subtopics
        const ids = mapped.map(m => String(m.id));
        if (ids.length > 0) {
          await loadQuestionCounts([], ids);
        }

        // Load faculty names for creators if needed
        const fIds = mapped.map(m => m.createdById).filter(id => id && id !== 'admin');
        if (fIds.length > 0) await loadFacultyNames(fIds);

        return mapped;
      }
    } catch (err) {
      console.warn('Failed to load subtopics for topic', topicId, err);
      // Keep the topic marked as loaded to avoid retry storms; consider adding a retry mechanism if needed
    }

    return [] as Subtopic[];
  }, [createdSubtopicIds, faculty?.id, loadQuestionCounts, loadFacultyNames, subtopics]);

  const getCreatorDisplayName = (createdBy: string, createdById: string) => {
    // Admins should always display as 'Admin' immediately
    if (createdBy === 'admin' || createdById === 'admin') {
      return 'Admin';
    }

    // If it's the current faculty, prefer the current user's name (or 'You')
    if (createdById === faculty?.id) {
      return faculty?.name || 'You';
    }

    // If we already resolved the name, show it
    if (createdById && facultyNames[createdById]) {
      return facultyNames[createdById];
    }

    // If a fetch for this id is in progress, show a loading placeholder
    if (createdById && fetchNamesInProgressRef.current.has(createdById)) {
      return 'Loading…';
    }

    if (createdById) return 'Faculty';

    return 'Unknown';
  };
  const getTopicTotalQuestions = (topicId: string) => {
    const topicKey = `topic_${topicId}`;
    // Prefer authoritative topic-level count (includes subtopic questions). If it's present use it.
    if (Object.prototype.hasOwnProperty.call(questionCounts, topicKey)) {
      return questionCounts[topicKey] || 0;
    }

    // Fallback: sum any known per-subtopic counts we have locally
    const subCount = subtopics.filter(s => String(s.topicId) === String(topicId)).reduce((acc, s) => acc + (questionCounts[`subtopic_${s.id}`] || 0), 0);
    return subCount;
  };
  React.useEffect(() => {
    const load = async () => {
      try {
        // Throttle quick successive runs to avoid duplicate requests (covers StrictMode double-invoke and rapid state flips)
        const now = Date.now();
        if (now - lastLoadRef.current < 250) return;
        lastLoadRef.current = now;

        if (!allocatedSubjects || allocatedSubjects.length === 0) {
          setTopics([]);
          setSubtopics([]);
          return;
        }

        // Precompute allowed subject ids
        const allowedSubjectIds = new Set(allocatedSubjects.map(s => String(s.id)));

        // Use cached topics when recent to avoid repeated requests
        const cacheNow = Date.now();
        let mappedTopics: FacultyTopic[] = [];
        if (topicsCacheRef.current.ts && (cacheNow - topicsCacheRef.current.ts) < 10000) {
          const cached = topicsCacheRef.current.topics.filter(t => allowedSubjectIds.has(String(t.subjectId)));
          setTopics(cached);
          mappedTopics = cached;
        } else {
          // Load topics first
          const topicRes = await fetchOnceRaw(`${import.meta.env.VITE_API_URL}/admin/topics`, { 
            headers: token ? { Authorization: `Bearer ${token}` } : {} 
          });
          const topicData = await topicRes.json();
          if (topicData.success && Array.isArray(topicData.topics)) {
            mappedTopics = topicData.topics.map((t: Record<string, unknown>) => ({
              id: String(t.id),
              name: t.name as string,
              description: (t.description as string) || '',
              subjectId: String(t.subjectId || t.subject_id),
              subjectName: (t.subjectName || t.subject_name || '') as string,
              createdBy: createdTopicIds.has(String(t.id)) ? 'faculty' : 'admin',
              createdById: createdTopicIds.has(String(t.id)) ? faculty?.id || '' : 'admin',
              createdAt: (t.createdAt || '') as string
            })).filter((t) => allowedSubjectIds.has(String(t.subjectId)));
            setTopics(mappedTopics);
            topicsCacheRef.current = { ts: Date.now(), topics: mappedTopics };
          }
        }

        // NOTE: Removed fetching ALL subtopics here to avoid repeated global loads.
        // Subtopics are lazy-loaded per-topic via `loadSubtopicsForTopic(topicId)` so we only fetch
        // `/admin/subtopics?topicId=...` when a topic is expanded or explicitly requested.

        const topicIdsSet = new Set(mappedTopics.map(t => String(t.id)));
        const allFacultyIds = [
          ...mappedTopics.map(t => t.createdById).filter(id => id !== 'admin'),
          ...subtopics.filter(s => topicIdsSet.has(String(s.topicId))).map(s => s.createdById).filter(id => id !== 'admin')
        ];
        if (allFacultyIds.length > 0) {
          await loadFacultyNames(allFacultyIds);
        }

        // Load question counts for topics only initially
        const topicIds = mappedTopics.map(t => String(t.id));
        if (topicIds.length > 0) {
          await loadQuestionCounts(topicIds, []);
          // Also prefetch subtopic counts so the UI can show counts without expanding
          loadSubtopicCounts(topicIds).catch(err => console.warn('Failed to load subtopic counts', err));
        }
      } catch (err) {
        console.warn('Failed to load topics/subtopics', err);
      }
    };
    load();

    const storedTopics = localStorage.getItem('faculty_created_topics');
    if (storedTopics) {
      try {
        const arr: string[] = JSON.parse(storedTopics);
        setCreatedTopicIds(new Set(arr));
      } catch (e) {
        // Ignore parse errors
      }
    }

    const storedSubtopics = localStorage.getItem('faculty_created_subtopics');
    if (storedSubtopics) {
      try {
        const arr: string[] = JSON.parse(storedSubtopics);
        setCreatedSubtopicIds(new Set(arr));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [allocatedSubjects, token, faculty?.id, createdTopicIds, subtopics, loadFacultyNames, loadQuestionCounts, loadSubtopicCounts]);

  // Load faculty names when topics/subtopics change
  React.useEffect(() => {
    const allFacultyIds = [
      ...topics.map(t => t.createdById).filter(id => id && id !== 'admin' && id !== faculty?.id),
      ...subtopics.map(s => s.createdById).filter(id => id && id !== 'admin' && id !== faculty?.id)
    ];
    if (allFacultyIds.length > 0) {
      loadFacultyNames(allFacultyIds);
    }
  }, [topics, subtopics, faculty?.id, loadFacultyNames]);

  // Auto-expand subjects that have topics and prefetch subtopics so lists appear without clicking
  React.useEffect(() => {
    if (!topics || topics.length === 0) return;

    const subjectIds = new Set(topics.map(t => String(t.subjectId)));

    setExpandedSubjects(prev => {
      const next = new Set(prev);
      subjectIds.forEach(id => next.add(id));
      return next;
    });

    // Prefetch subtopics for topics that likely have subtopics (count/referral exists)
    topics.forEach((topic) => {
      const id = String(topic.id);
      if (topicSubtopicsMap[id]) return; // already loaded
      const hasCount = (topicSubtopicCounts[id] ?? 0) > 0;
      const fallbackExists = subtopics.some(s => String(s.topicId) === id);
      if (hasCount || fallbackExists) {
        setSubtopicLoadingMap(prev => ({ ...prev, [id]: true }));
        loadSubtopicsForTopic(id)
          .then(loaded => setTopicSubtopicsMap(prev => ({ ...prev, [id]: loaded })))
          .catch(err => console.warn('Failed to prefetch subtopics for topic', id, err))
          .finally(() => setSubtopicLoadingMap(prev => ({ ...prev, [id]: false })));
      }
    });
  }, [topics, topicSubtopicCounts, subtopics, loadSubtopicsForTopic]);

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

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    const willExpand = !newExpanded.has(subjectId);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);

    // When a subject is expanded, prefetch subtopics for its topics so subtopic lists
    // are visible without requiring an additional click.
    if (willExpand) {
      const subjectTopics = topics.filter(t => String(t.subjectId) === String(subjectId));
      subjectTopics.forEach((topic) => {
        const id = String(topic.id);
        const already = topicSubtopicsMap[id];
        const hasCount = (topicSubtopicCounts[id] ?? 0) > 0;
        const fallbackExists = subtopics.some(s => String(s.topicId) === id);
        if (!already && (hasCount || fallbackExists)) {
          setSubtopicLoadingMap(prev => ({ ...prev, [id]: true }));
          loadSubtopicsForTopic(id).then(loaded => {
            setTopicSubtopicsMap(prev => ({ ...prev, [id]: loaded }));
          }).catch(err => console.warn('Failed to prefetch subtopics for topic', id, err)).finally(() => {
            setSubtopicLoadingMap(prev => ({ ...prev, [id]: false }));
          });
        }
      });
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.name || !newTopic.subjectId) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/topics`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ 
          subjectId: newTopic.subjectId, 
          name: newTopic.name, 
          description: newTopic.description 
        })
      });
      const data = await res.json();
      if (data.success && data.topic) {
        const subject = allocatedSubjects.find(s => String(s.id) === newTopic.subjectId);
        const created: FacultyTopic = {
          id: String(data.topic.id),
          name: data.topic.name,
          description: data.topic.description || '',
          subjectId: String(data.topic.subjectId || data.topic.subject_id),
          subjectName: subject?.subjectName || '',
          createdBy: 'faculty',
          createdById: faculty?.id || '',
          createdAt: new Date().toISOString()
        };
        setTopics(prev => [...prev, created]);
        const newSet = new Set(createdTopicIds);
        newSet.add(String(data.topic.id));
        setCreatedTopicIds(newSet);
        localStorage.setItem('faculty_created_topics', JSON.stringify(Array.from(newSet)));
        
        // Load question count for new topic
        try {
          const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${data.topic.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (qRes.ok) {
            const qData = await qRes.json();
            setQuestionCounts(prev => ({ ...prev, [`topic_${data.topic.id}`]: qData.total || 0 }));
          }
        } catch (err) {
          console.warn('Failed to load question count for new topic', err);
        }
        
        toast.success('Topic added successfully');
      } else {
        toast.error(data.message || 'Failed to create topic');
      }
    } catch (err) {
      console.warn('Failed to create topic', err);
      toast.error('Failed to create topic');
    }
    
    setNewTopic({ name: '', description: '', subjectId: '' });
    setIsAddDialogOpen(false);
    setSelectedSubjectForAdd('');
  };

  const handleEditTopic = async () => {
    if (!editingTopic) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/topics/${editingTopic.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ 
          subjectId: editingTopic.subjectId, 
          name: editingTopic.name, 
          description: editingTopic.description 
        })
      });
      const data = await res.json();
      if (data.success && data.topic) {
        setTopics(topics.map(t => t.id === data.topic.id ? {
          ...data.topic,
          id: String(data.topic.id),
          subjectId: String(data.topic.subjectId || data.topic.subject_id),
          createdBy: createdTopicIds.has(String(data.topic.id)) ? 'faculty' : 'admin',
          createdById: createdTopicIds.has(String(data.topic.id)) ? faculty?.id || '' : 'admin'
        } : t));
        toast.success('Topic updated successfully');
      } else {
        toast.error(data.message || 'Failed to update topic');
      }
    } catch (err) {
      console.warn('Failed to update topic', err);
      toast.error('Failed to update topic');
    }
    
    setEditingTopic(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteTopic = async (topic: FacultyTopic) => {
    if (!(topic.createdBy === 'faculty' && String(topic.createdById) === String(faculty?.id))) {
      toast.error('You can only delete topics you created');
      return;
    }

    try {
      // Check dependent counts (subtopics handling disabled, we only check questions)
      const subCount = 0;
      const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?topicId=${topic.id}`);
      const qData = await qRes.json();
      const qCount = qData?.total || 0;

      if ((subCount > 0 || qCount > 0) && !confirm(`Deleting "${topic.name}" will also delete ${subCount} subtopic(s) and ${qCount} question(s). Proceed?`)) return;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/topics/${topic.id}${(subCount>0 || qCount>0) ? '?force=true' : ''}`, { 
        method: 'DELETE', 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      });
      const data = await res.json();
      if (data.success) {
        setTopics(prev => prev.filter(t => t.id !== topic.id));
        const newSet = new Set(createdTopicIds);
        newSet.delete(String(topic.id));
        setCreatedTopicIds(newSet);
        localStorage.setItem('faculty_created_topics', JSON.stringify(Array.from(newSet)));
        
        // Remove question count
        setQuestionCounts(prev => {
          const updated = { ...prev };
          delete updated[`topic_${topic.id}`];
          return updated;
        });
        
        toast.success('Topic deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete topic');
      }
    } catch (err) {
      console.warn('Failed to delete topic', err);
      toast.error('Failed to delete topic');
    }
  };

  const canEditTopic = (topic: FacultyTopic) => {
    // Faculty can edit topics in subjects they are allocated to
    const isAllocatedSubject = allocatedSubjects.some(s => String(s.id) === topic.subjectId);
    return isAllocatedSubject;
  };

  const canEditSubtopic = (subtopic: Subtopic) => {
    // Faculty can edit subtopics in topics they can edit
    const topic = topics.find(t => String(t.id) === subtopic.topicId);
    return topic ? canEditTopic(topic) : false;
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    const wasExpanded = newExpanded.has(topicId);

    if (wasExpanded) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
      // Load subtopics for this topic if not already loaded
      if (!loadedSubtopicTopicIdsRef.current.has(topicId)) {
        loadSubtopicsForTopic(topicId).then((loaded) => {
          const ids = loaded.map(s => String(s.id));
          if (ids.length > 0) loadQuestionCounts([], ids);
        }).catch(err => console.warn('Error loading subtopics on expand', err));
      }
    }
    setExpandedTopics(newExpanded);
  };

  const handleAddSubtopic = async () => {
    if (!newSubtopic.name || !newSubtopic.topicId) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ 
          topicId: newSubtopic.topicId, 
          name: newSubtopic.name, 
          description: newSubtopic.description 
        })
      });
      const data = await res.json();
      if (data.success && data.subtopic) {
        const created: Subtopic = {
          id: String(data.subtopic.id),
          name: data.subtopic.name,
          description: data.subtopic.description || '',
          topicId: String(data.subtopic.topicId || data.subtopic.topic_id),
          createdBy: 'faculty',
          createdById: faculty?.id || '',
          createdAt: new Date().toISOString()
        };
        setSubtopics(prev => [...prev, created]);
        const newSet = new Set(createdSubtopicIds);
        newSet.add(String(data.subtopic.id));
        setCreatedSubtopicIds(newSet);
        localStorage.setItem('faculty_created_subtopics', JSON.stringify(Array.from(newSet)));
        // mark topic as loaded so it shows immediately
        setLoadedSubtopicTopicIds(prev => {
          const n = new Set(prev);
          n.add(String(created.topicId));
          loadedSubtopicTopicIdsRef.current = n;
          return n;
        });

        // Load question count for new subtopic
        try {
          const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subtopicId=${data.subtopic.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (qRes.ok) {
            const qData = await qRes.json();
            setQuestionCounts(prev => ({ ...prev, [`subtopic_${data.subtopic.id}`]: qData.total || 0 }));
          }
        } catch (err) {
          console.warn('Failed to load question count for new subtopic', err);
        }

        toast.success('Subtopic added successfully');
      } else {
        toast.error(data.message || 'Failed to create subtopic');
      }
    } catch (err) {
      console.warn('Failed to create subtopic', err);
      toast.error('Failed to create subtopic');
    }

    setNewSubtopic({ name: '', description: '', topicId: '' });
    setIsAddSubtopicDialogOpen(false);
    setSelectedTopicForAdd('');
  };

  const handleEditSubtopic = async () => {
    if (!editingSubtopic) return;

    const oldTopicId = String(editingSubtopic.topicId);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics/${editingSubtopic.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ 
          topicId: editingSubtopic.topicId, 
          name: editingSubtopic.name, 
          description: editingSubtopic.description 
        })
      });
      const data = await res.json();
      if (data.success && data.subtopic) {
        const updatedSubtopic = {
          id: String(data.subtopic.id),
          name: data.subtopic.name,
          description: data.subtopic.description || '',
          topicId: String(data.subtopic.topicId || data.subtopic.topic_id),
          createdBy: createdSubtopicIds.has(String(data.subtopic.id)) ? 'faculty' : 'admin',
          createdById: createdSubtopicIds.has(String(data.subtopic.id)) ? faculty?.id || '' : 'admin',
          createdAt: data.subtopic.createdAt || ''
        };

        setSubtopics(prev => prev.map(s => s.id === updatedSubtopic.id ? updatedSubtopic : s));

        // If topic reassigned, ensure new topic is marked loaded and refresh counts
        const newTopicId = String(data.subtopic.topicId || data.subtopic.topic_id);
        if (newTopicId && newTopicId !== oldTopicId) {
          // mark new topic as loaded
          setLoadedSubtopicTopicIds(prev => {
            const n = new Set(prev);
            n.add(newTopicId);
            loadedSubtopicTopicIdsRef.current = n;
            return n;
          });

          // Refresh question counts: topic counts for old and new, and subtopic count
          try {
            await loadQuestionCounts([oldTopicId, newTopicId], [String(data.subtopic.id)]);
          } catch (err) {
            console.warn('Failed to refresh counts after subtopic move', err);
          }
        } else {
          // Still refresh subtopic count in case its questions changed
          try {
            await loadQuestionCounts([], [String(data.subtopic.id)]);
          } catch (err) {
            console.warn('Failed to refresh subtopic count after edit', err);
          }
        }

        toast.success('Subtopic updated successfully');
      } else {
        toast.error(data.message || 'Failed to update subtopic');
      }
    } catch (err) {
      console.warn('Failed to update subtopic', err);
      toast.error('Failed to update subtopic');
    }

    setEditingSubtopic(null);
    setIsEditSubtopicDialogOpen(false);
  };

  const handleDeleteSubtopic = async (subtopic: Subtopic) => {
    if (!(subtopic.createdBy === 'faculty' && String(subtopic.createdById) === String(faculty?.id))) {
      toast.error('You can only delete subtopics you created');
      return;
    }

    try {
      // Check dependent counts
      const qRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/questions?subtopicId=${subtopic.id}`);
      const qData = await qRes.json();
      const qCount = qData?.total || 0;

      if (qCount > 0 && !confirm(`Deleting "${subtopic.name}" will also delete ${qCount} question(s). Proceed?`)) return;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subtopics/${subtopic.id}${qCount>0 ? '?force=true' : ''}`, { 
        method: 'DELETE', 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      });
      const data = await res.json();
      if (data.success) {
        setSubtopics(prev => prev.filter(s => s.id !== subtopic.id));
        const newSet = new Set(createdSubtopicIds);
        newSet.delete(String(subtopic.id));
        setCreatedSubtopicIds(newSet);
        localStorage.setItem('faculty_created_subtopics', JSON.stringify(Array.from(newSet)));

        // Remove question count
        setQuestionCounts(prev => {
          const updated = { ...prev };
          delete updated[`subtopic_${subtopic.id}`];
          return updated;
        });

        toast.success('Subtopic deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete subtopic');
      }
    } catch (err) {
      console.warn('Failed to delete subtopic', err);
      toast.error('Failed to delete subtopic');
    }
  };

  const openAddSubtopicDialog = (topicId: string) => {
    setSelectedTopicForAdd(topicId);
    setNewSubtopic({ name: '', description: '', topicId });
    setIsAddSubtopicDialogOpen(true);
  };

  const { exams } = useExams();

  const openAddDialog = (subjectId: string) => {
    setSelectedSubjectForAdd(subjectId);
    setNewTopic({ name: '', description: '', subjectId });
    setIsAddDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Allocated Subjects</h1>
        <p className="text-muted-foreground">View and manage subjects and their topics</p>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Filter by Exam:</Label>
          <Select value={examTypeFilter} onValueChange={(v) => { setExamTypeFilter(v); setTopicFilter('all'); setSubtopicFilter('all'); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.length > 0 ? exams.map(e => (
                <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
              )) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Filter by Topic:</Label>
          <Select value={topicFilter} onValueChange={(v) => { setTopicFilter(v); setSubtopicFilter('all'); if (v !== 'all' && !loadedSubtopicTopicIdsRef.current.has(v)) loadSubtopicsForTopic(v); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {topics
                .filter(t => allocatedSubjects.some(s => String(s.id) === String(t.subjectId)) && (examTypeFilter === 'all' || allocatedSubjects.find(s => String(s.id) === String(t.subjectId))?.examType === examTypeFilter))
                .map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.subjectName})</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Filter by Subtopic:</Label>
          <Select value={subtopicFilter} onValueChange={setSubtopicFilter} disabled={topicFilter === 'all'}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={topicFilter === 'all' ? 'Select topic first' : 'All Subtopics'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subtopics</SelectItem>
              {subtopics.filter(s => String(s.topicId) === String(topicFilter)).map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {allocatedSubjects
          .filter(subject => examTypeFilter === 'all' || subject.examType === examTypeFilter)
          .filter(subject => {
            if (topicFilter === 'all') return true;
            // subject matches if it contains the selected topic
            return topics.some(t => String(t.subjectId) === String(subject.id) && String(t.id) === String(topicFilter));
          })
          .filter(subject => {
            if (subtopicFilter === 'all') return true;
            // subject matches selected subtopic if that subtopic exists and belongs to one of its topics
            return subtopics.some(s => String(s.id) === String(subtopicFilter) && topics.some(t => String(t.id) === String(s.topicId) && String(t.subjectId) === String(subject.id)));
          })
          .map((subject) => {
          const SubjectIcon = getSubjectIcon(subject.subjectName);
          const isExpanded = expandedSubjects.has(String(subject.id));
          const subjectTopics = topics.filter(t => String(t.subjectId) === String(subject.id));
          
          return (
            <Card key={subject.id} className="border-0 shadow-sm">
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
               
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getSubjectColor(subject.subjectName)} flex items-center justify-center shadow-lg`}>
                      <SubjectIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{subject.subjectName}</CardTitle>
                        <Badge variant={subject.examType === 'NEET' ? 'default' : 'secondary'}>
                          {subject.examType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{subjectTopics.length} Topics</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <FileQuestion className="h-3.5 w-3.5" />
                          <span>{subjectTopics.reduce((total, topic) => total + getTopicTotalQuestions(String(topic.id)), 0)} Questions</span>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/faculty/questions');
                      }}
                    >
                      <FileQuestion className="h-4 w-4 mr-1" />
                      Questions
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/faculty/performance');
                      }}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Topics</h3>
                      <Button 
                        size="sm" 
                        onClick={() => openAddDialog(String(subject.id))}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Topic
                      </Button>
                    </div>
                    
                    {subjectTopics.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No topics yet. Click "Add Topic" to create one.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted/50 border-b">
                            <tr>
                              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Topic</th>

                              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Description</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Created By</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Subtopics</th>
                              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Questions</th>
                              <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {subjectTopics.map((topic) => {
                              const isExpanded = expandedTopics.has(String(topic.id));
                              const topicSubtopics = topicSubtopicsMap[topic.id] || [];
                              // Show subtopic count immediately using global `subtopics` as fallback
                              const fallbackSubtopicCount = subtopics.filter(s => String(s.topicId) === String(topic.id)).length;
                              const visibleSubtopicCount = topicSubtopics.length > 0 ? topicSubtopics.length : (topicSubtopicCounts[topic.id] ?? fallbackSubtopicCount);
                              const handleExpandClick = async () => {
                                const newSet = new Set(expandedTopics);
                                if (isExpanded) {
                                  newSet.delete(String(topic.id));
                                  setExpandedTopics(newSet);
                                } else {
                                  newSet.add(String(topic.id));
                                  setExpandedTopics(newSet);
                                  if (!topicSubtopicsMap[topic.id]) {
                                    setSubtopicLoadingMap(prev => ({ ...prev, [topic.id]: true }));
                                    try {
                                      const loaded = await loadSubtopicsForTopic(topic.id);
                                      setTopicSubtopicsMap(prev => ({ ...prev, [topic.id]: loaded }));
                                    } catch (err) {
                                      console.warn('Failed to load subtopics for topic', topic.id, err);
                                    } finally {
                                      setSubtopicLoadingMap(prev => ({ ...prev, [topic.id]: false }));
                                    }
                                  }
                                }
                              };
                              return (
                                <React.Fragment key={topic.id}>
                                  <tr className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                                      <Button variant="ghost" size="icon" onClick={handleExpandClick} aria-label={isExpanded ? 'Hide subtopics' : 'View subtopics'} title={isExpanded ? 'Hide subtopics' : 'View subtopics'}>
                                        <List className="w-4 h-4" />
                                      </Button>
                                      <span className="cursor-pointer hover:text-primary" onClick={() => navigate(`/faculty/questions?subjectId=${topic.subjectId}&topicId=${topic.id}`)}>{topic.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">
                                      {topic.description || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                      <div className="text-sm">{getCreatorDisplayName(topic.createdBy, topic.createdById)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                                        {visibleSubtopicCount}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                                        {questionCounts[`topic_${topic.id}`] || 0}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                      <Button variant="outline" size="sm" onClick={() => openAddSubtopicDialog(String(topic.id))}>
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Subtopic
                                      </Button>
                                      {(topic.createdBy === 'faculty' && String(topic.createdById) === String(faculty?.id)) && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                              setEditingTopic(topic);
                                              setIsEditDialogOpen(true);
                                            }}>
                                              <Pencil className="w-4 h-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTopic(topic)}>
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={6} className="bg-muted/5 px-8 py-6 border-t border-border">
                                        <div className="mb-2 font-semibold text-sm text-primary flex items-center gap-2">
                                          <List className="w-4 h-4" />
                                          Subtopics for: <span className="font-bold">{topic.name}</span>
                                        </div>
                                        {subtopicLoadingMap[topic.id] ? (
                                          <div className="text-muted-foreground text-xs italic py-2">Loading subtopics...</div>
                                        ) : (topicSubtopics.length === 0 ? (
                                          <div className="text-muted-foreground text-xs italic py-2">No subtopics for this topic.</div>
                                        ) : (
                                          <div className="overflow-x-auto rounded-lg border border-border bg-white">
                                            <table className="w-full min-w-[700px] text-xs">
                                              <thead className="bg-muted/30">
                                                <tr>
                                                  <th className="text-left px-3 py-2">Subtopic</th>
                                                  <th className="text-left px-3 py-2">Description</th>
                                                  <th className="text-left px-3 py-2">Created By</th>
                                                  <th className="text-left px-3 py-2">Questions</th>
                                                  <th className="text-right px-3 py-2">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {topicSubtopics.map(sub => (
                                                  <tr key={sub.id} className="hover:bg-muted/20">
                                                    <td className="px-3 py-2 font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/faculty/questions?subjectId=${topic.subjectId}&topicId=${topic.id}&subtopicId=${sub.id}`)}>{sub.name}</td>
                                                    <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">{sub.description || '—'}</td>
                                                    <td className="px-3 py-2 text-sm text-muted-foreground">{getCreatorDisplayName(sub.createdBy, sub.createdById)}</td>
                                                    <td className="px-3 py-2">{questionCounts[`subtopic_${sub.id}`] || 0}</td>
                                                    <td className="px-3 py-2 text-right flex gap-2 justify-end">
                                                      {(sub.createdBy === 'faculty' && String(sub.createdById) === String(faculty?.id)) && (
                                                        <>
                                                          <Button variant="outline" size="sm" onClick={() => { setEditingSubtopic(sub); setIsEditSubtopicDialogOpen(true); }}>Edit</Button>
                                                          <Button variant="destructive" size="sm" onClick={() => handleDeleteSubtopic(sub)}>Delete</Button>
                                                        </>
                                                      )}
                                                    </td> 
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ))}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {allocatedSubjects.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Subjects Allocated</h3>
            <p className="text-muted-foreground">
              Contact the admin to get subjects assigned to you.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Topic Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Topic</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Provide a name and optional description for the topic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select 
                value={newTopic.subjectId} 
                onValueChange={(v) => setNewTopic({...newTopic, subjectId: v})}
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
              <p className="text-xs text-muted-foreground">
                Selected: {allocatedSubjects.find(s => String(s.id) === newTopic.subjectId)?.subjectName || 'None selected'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Topic Name *</Label>
              <Input
                value={newTopic.name}
                onChange={(e) => setNewTopic({...newTopic, name: e.target.value})}
                placeholder="Enter topic name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTopic.description}
                onChange={(e) => setNewTopic({...newTopic, description: e.target.value})}
                placeholder="Brief description of the topic"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTopic}>Add Topic</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Update topic details such as name, subject or description.</DialogDescription>
          </DialogHeader>
          {editingTopic && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select 
                  value={editingTopic.subjectId} 
                  onValueChange={(v) => setEditingTopic({...editingTopic, subjectId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {allocatedSubjects.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.subjectName} ({s.examType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current: {allocatedSubjects.find(s => String(s.id) === editingTopic.subjectId)?.subjectName || 'Unknown'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Topic Name</Label>
                <Input
                  value={editingTopic.name}
                  onChange={(e) => setEditingTopic({...editingTopic, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingTopic.description}
                  onChange={(e) => setEditingTopic({...editingTopic, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Created by: {getCreatorDisplayName(editingTopic.createdBy, editingTopic.createdById)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTopic}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subtopic Dialog */}
      <Dialog open={isAddSubtopicDialogOpen} onOpenChange={setIsAddSubtopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subtopic</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Provide a name and optional description for the subtopic.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Topic *</Label>
              <Select 
                value={newSubtopic.topicId} 
                onValueChange={(v) => setNewSubtopic({...newSubtopic, topicId: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.filter(t => allocatedSubjects.some(s => String(s.id) === t.subjectId)).map((topic) => (
                    <SelectItem key={topic.id} value={String(topic.id)}>
                      {topic.name} ({topic.subjectName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selected: {topics.find(t => String(t.id) === newSubtopic.topicId)?.name || 'None selected'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Subtopic Name *</Label>
              <Input
                value={newSubtopic.name}
                onChange={(e) => setNewSubtopic({...newSubtopic, name: e.target.value})}
                placeholder="Enter subtopic name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newSubtopic.description}
                onChange={(e) => setNewSubtopic({...newSubtopic, description: e.target.value})}
                placeholder="Brief description of the subtopic"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubtopicDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubtopic}>Add Subtopic</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subtopic Dialog */}
      <Dialog open={isEditSubtopicDialogOpen} onOpenChange={setIsEditSubtopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subtopic</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Update subtopic name, description or move it to another topic.</DialogDescription>
          </DialogHeader>
          {editingSubtopic && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select 
                  value={editingSubtopic.topicId} 
                  onValueChange={(v) => setEditingSubtopic({...editingSubtopic, topicId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.filter(t => allocatedSubjects.some(s => String(s.id) === t.subjectId)).map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} ({t.subjectName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current: {topics.find(t => String(t.id) === editingSubtopic.topicId)?.name || 'Unknown'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Subtopic Name</Label>
                <Input
                  value={editingSubtopic.name}
                  onChange={(e) => setEditingSubtopic({...editingSubtopic, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingSubtopic.description}
                  onChange={(e) => setEditingSubtopic({...editingSubtopic, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Created by: {getCreatorDisplayName(editingSubtopic.createdBy, editingSubtopic.createdById)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubtopicDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubtopic}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
async function apiFetch(url: string, options?: RequestInit) {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('token') || localStorage.getItem('jwt_token'))
    : null;
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${import.meta.env.VITE_API_URL}${url.startsWith('/') ? url : `/${url}`}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Request failed: ${res.status}`);
  }
  return res.json();
}

