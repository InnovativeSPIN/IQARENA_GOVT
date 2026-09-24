import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { AdminLayout } from '@/components/layout/AdminLayout';

type Batch = { id: number; name: string; status?: number; exam_name?: string };

export default function BatchManagement() {
  const [batchName, setBatchName] = useState('');
  const [examId, setExamId] = useState('');
  const [exams, setExams] = useState<Array<{ id: number; name: string }>>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [blockedBatchId, setBlockedBatchId] = useState<number | null>(null);
  const [blockedReason, setBlockedReason] = useState('');

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: batchName,
          examId: examId ? Number(examId) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✅ Batch added successfully');
        setBatchName('');
        setExamId('');
        fetchBatches().catch((err) => console.warn('Failed to refresh batches', err));
      } else {
        // Show server message and any error details returned
        const errMsg = data.message || '❌ Failed to add batch';
        setMessage(errMsg);
        if (data.error) {
          console.error('Server error details:', data.error);
          // attach details for user visibility
          setMessage(`${errMsg}: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
        }
      }
    } catch (error) {
      console.error(error);
      setMessage('❌ Server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch('/admin/meta/exams');
        if (mounted && res?.success && Array.isArray(res.exams)) {
          setExams(res.exams);
        }
      } catch (err) {
        console.warn('Failed to load exams', err);
      }
    })();
    // load batches for listing
    fetchBatches().catch((err) => console.warn('Failed to load batches', err));

    return () => { mounted = false; };
  }, []);

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await apiFetch('/admin/batches');
      if (res?.success && Array.isArray(res.batches)) {
        setBatches(res.batches);
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error('Failed to fetch batches', err);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Batch Management</h2>

        <form onSubmit={handleAddBatch} className="space-y-4">
        <input
          type="text"
          className="w-full border px-3 py-2 rounded"
          placeholder="Batch Name (e.g. neet_2025)"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          required
        />

        <select
          className="w-full border px-3 py-2 rounded"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          required
        >
          <option value="">Select exam</option>
          {exams.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{ex.name}</option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Batch'}
        </button>
      </form>

        {message && (
          <p className="mt-4 text-center text-sm font-medium">{message}</p>
        )}
      </div>

      <div className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Existing Batches</h3>
        {loadingBatches ? (
          <p>Loading batches...</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1">ID</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Exam</th>
                  <th className="px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-2 py-2">{b.id}</td>
                    <td className="px-2 py-2">{b.name}</td>
                    <td className="px-2 py-2">{(b as any).exam_name || (b as any).examName || '-'}</td>
                    <td className="px-2 py-2">
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete batch "${b.name}"? This cannot be undone.`)) return;
                          try {
                            await apiFetch(`/admin/batches/${b.id}`, { method: 'DELETE' });
                            setMessage('✅ Batch deleted');
                            setBlockedBatchId(null);
                            setBlockedReason('');
                            fetchBatches().catch((err) => console.warn('Failed to refresh batches', err));
                          } catch (err:any) {
                            console.error('Delete failed', err);
                            // Check for block reasons (students, etc.)
                            const blockReason = err?.data?.blockReason;
                            const blockDetails = err?.data?.blockDetails || '';
                            if (blockReason === 'students') {
                              setBlockedBatchId(b.id);
                              setBlockedReason(blockDetails);
                              setMessage(`❌ Cannot delete: ${blockDetails}`);
                            } else {
                              const detailed = err?.data?.error || err?.data?.message || err?.message;
                              setMessage(detailed || 'Failed to delete batch');
                            }
                          }
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {blockedBatchId && blockedReason && (
        <div className="max-w-3xl mx-auto mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold text-yellow-800">Cannot Delete - Batch In Use</h4>
          <p className="text-sm mt-2 text-yellow-700">{blockedReason}</p>
          <p className="text-sm mt-2 text-yellow-700">Remove or reassign these students to another batch before deleting.</p>
          <a href="/admin/users" className="text-sm text-primary hover:underline mt-2 inline-block">
            Go to User Management →
          </a>
        </div>
      )}
    </AdminLayout>
  );
}
