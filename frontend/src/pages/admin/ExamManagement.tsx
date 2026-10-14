import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/lib/api';
import { GraduationCap, Plus, Trash2, Loader2, AlertTriangle, BookOpen } from 'lucide-react';

export default function ExamManagement() {
  const [exams, setExams] = useState<Array<{ id: number; name: string }>>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [linkedSubjects, setLinkedSubjects] = useState<Array<{ id: number; name: string }>>([]);

  const fetchExams = async () => {
    try {
      const data = await apiFetch('/admin/meta/exams');
      if (data?.success) {
        setExams(data.exams || []);
      }
    } catch (err: any) {
      console.error('Failed to load exams', err);
      setMessage(err.message || 'Failed to load exams');
      setMessageType('error');
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage('Exam name is required');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const data = await apiFetch('/admin/meta/exams', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim().toUpperCase() }),
      });
      if (data?.success) {
        setMessage('Exam created successfully');
        setMessageType('success');
        setName('');
        await fetchExams();
      } else {
        setMessage(data?.message || 'Failed to create exam');
        setMessageType('error');
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Server error creating exam');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, examName: string, force = true) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the exam "${examName}"?\n\nWARNING: This will permanently delete the exam along with ALL associated subjects, topics, subtopics, questions, offline papers, and tests.`
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    setMessage('');
    try {
      const data = await apiFetch(`/admin/meta/exams/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });
      if (data?.success) {
        setMessage(data.message || 'Exam deleted successfully');
        setMessageType('success');
        await fetchExams();
        setLinkedSubjects([]);
      } else {
        setMessage(data?.message || 'Failed to delete exam');
        setMessageType('error');
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Server error deleting exam');
      setMessageType('error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              Exam Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage examination categories (e.g., NMMS, TRUST, NTSE).
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            {exams.length} {exams.length === 1 ? 'Exam' : 'Exams'} Configured
          </span>
        </div>

        {/* Create Exam Card */}
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add New Exam
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 border rounded-lg px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Exam name (e.g. NMMS, TRUST)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Exam
                </>
              )}
            </button>
          </form>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-lg text-sm flex items-start gap-3 border ${
              messageType === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            {messageType === 'error' && <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
            <span className="flex-1">{message}</span>
          </div>
        )}

        {/* Exam List Card */}
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              All Registered Exams
            </h3>
            <span className="text-xs text-muted-foreground">{exams.length} total</span>
          </div>

          <div className="divide-y">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {ex.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{ex.name}</h4>
                    <p className="text-xs text-muted-foreground">Exam ID: #{ex.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors disabled:opacity-50"
                    onClick={() => handleDelete(ex.id, ex.name)}
                    disabled={deletingId === ex.id}
                  >
                    {deletingId === ex.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}

            {exams.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No exams found. Add your first exam category above.
              </div>
            )}
          </div>
        </div>

        {/* Linked Subjects Warning */}
        {linkedSubjects.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Subjects linked to this exam:
            </h4>
            <ul className="list-disc list-inside text-xs mt-2 space-y-1">
              {linkedSubjects.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-3">
              <a
                href="/admin/subjects"
                className="text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                Go to Subject Management &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
