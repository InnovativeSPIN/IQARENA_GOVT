import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function ExamManagement() {
  const [exams, setExams] = useState<Array<{ id: number; name: string }>>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [linkedSubjects, setLinkedSubjects] = useState<Array<{ id: number; name: string }>>([]);

  const BASE = import.meta.env.VITE_API_URL || '';

  const fetchExams = async () => {
    try {
      const res = await fetch(`${BASE}/admin/meta/exams`);
      const data = await res.json();
      if (data?.success) setExams(data.exams || []);
    } catch (err) {
      console.error('Failed to load exams', err);
    }
  };

  useEffect(() => { fetchExams(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setMessage('Exam name is required');
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${BASE}/admin/meta/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data?.success) {
        setMessage('Exam created');
        setName('');
        await fetchExams();
      } else {
        setMessage(data?.message || 'Failed to create exam');
      }
    } catch (err) {
      console.error(err);
      setMessage('Server error');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this exam?')) return;
    try {
      const res = await fetch(`${BASE}/admin/meta/exams/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.success) {
        setMessage('Deleted');
        fetchExams();
        setLinkedSubjects([]);
      } else setMessage(data?.message || 'Failed to delete');
      // If deletion blocked due to linked subjects, fetch and show subjects
      if (data && data.message && data.message.toLowerCase().includes('subjects are associated')) {
        try {
          const subjRes = await fetch(`${BASE}/admin/meta/subjects?examId=${id}`);
          const subjData = await subjRes.json();
          if (subjData?.success && Array.isArray(subjData.subjects)) {
            setLinkedSubjects(subjData.subjects);
            setMessage('Cannot delete exam: subjects are associated. See list below.');
          }
        } catch (err) {
          console.error('Failed to fetch linked subjects', err);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage('Server error');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Exams</h2>

        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            className="flex-1 border px-3 py-2 rounded"
            placeholder="Exam name (e.g. NEET)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="bg-primary text-white px-4 py-2 rounded" disabled={loading}>
            {loading ? 'Creating...' : 'Add Exam'}
          </button>
        </form>

        {message && <p className="mb-4 text-sm">{message}</p>}

        <div className="bg-white rounded shadow p-3">
          <h3 className="font-semibold mb-2">All Exams ({exams.length})</h3>
          <ul className="space-y-2">
            {exams.map((ex) => (
              <li key={ex.id} className="flex justify-between items-center">
                <span>{ex.name}</span>
                <div className="flex gap-2">
                  <button className="text-sm text-red-600" onClick={() => handleDelete(ex.id)}>Delete</button>
                </div>
              </li>
            ))}
            {exams.length === 0 && <li className="text-sm text-muted-foreground">No exams found</li>}
          </ul>
        </div>
        {linkedSubjects.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded">
            <h4 className="font-semibold">Subjects linked to this exam</h4>
            <ul className="list-disc list-inside text-sm mt-2">
              {linkedSubjects.map((s) => <li key={s.id}>{s.name}</li>)}
            </ul>
            <p className="mt-2 text-sm">Remove or reassign these subjects before deleting the exam.</p>
            <a href="/admin/subjects" className="text-sm text-primary hover:underline">Open Subject Management</a>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
