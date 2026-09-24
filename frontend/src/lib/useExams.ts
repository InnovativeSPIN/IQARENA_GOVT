import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from './api';

export type Exam = { id: number; name: string };

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/meta/exams');
      if (res?.success && Array.isArray(res.exams)) {
        setExams(res.exams);
      }
    } catch (err) {
      console.debug('Failed to fetch exams', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  return { exams, loading, refresh: fetchExams };
}
