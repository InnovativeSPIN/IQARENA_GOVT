import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { toast } from 'sonner';
import { Trash2, Edit, Upload, UserPlus } from 'lucide-react';

type School = {
  id: number;
  school_name: string;
  school_code?: string;
  udise_code?: string;
  state_emis_id?: string;
  district?: string;
  management?: 'Government' | 'Aided' | 'Private';
  contact_phone?: string;
};

export default function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editSchool, setEditSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    school_name: '', school_code: '', udise_code: '', state_emis_id: '', district: '', management: 'Government', contact_phone: ''
  });
  
  const [importModal, setImportModal] = useState(false);
  const [selectedSchoolForImport, setSelectedSchoolForImport] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/schools');
      if (res.success) setSchools(res.schools);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editSchool) {
        await apiFetch(`/admin/schools/${editSchool.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('School updated successfully');
      } else {
        await apiFetch('/admin/schools', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('School added successfully');
      }
      setShowModal(false);
      fetchSchools();
    } catch (err: any) {
      toast.error(err.message || 'Error saving school');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this school?')) return;
    try {
      await apiFetch(`/admin/schools/${id}`, { method: 'DELETE' });
      toast.success('School deleted');
      fetchSchools();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting school');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedSchoolForImport) return;
    
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/admin/schools/${selectedSchoolForImport}/students/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setImportModal(false);
      } else {
        toast.error(data.message);
        if (data.errors) {
            console.error(data.errors);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to import');
    } finally {
      setImporting(false);
      setFile(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">School Management</h2>
          <button 
            onClick={() => { setEditSchool(null); setFormData({ school_name: '', school_code: '', udise_code: '', state_emis_id: '', district: '', management: 'Government', contact_phone: '' }); setShowModal(true); }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
          >
            Add School
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UDISE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Management</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
              ) : schools.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4">No schools found</td></tr>
              ) : (
                schools.map(school => (
                  <tr key={school.id}>
                    <td className="px-6 py-4">{school.school_name}</td>
                    <td className="px-6 py-4">{school.udise_code || '-'}</td>
                    <td className="px-6 py-4">{school.management || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => { setSelectedSchoolForImport(school.id); setImportModal(true); }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Import Students"
                      >
                        <Upload className="w-5 h-5 inline" />
                      </button>
                      <button 
                        onClick={() => { 
                          setEditSchool(school); 
                          setFormData({ 
                            school_name: school.school_name || '', 
                            school_code: school.school_code || '', 
                            udise_code: school.udise_code || '', 
                            state_emis_id: school.state_emis_id || '', 
                            district: school.district || '', 
                            management: school.management || 'Government', 
                            contact_phone: school.contact_phone || '' 
                          }); 
                          setShowModal(true); 
                        }}
                        className="text-gray-600 hover:text-gray-800"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5 inline" />
                      </button>
                      <button 
                        onClick={() => handleDelete(school.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h3 className="text-xl font-bold mb-4">{editSchool ? 'Edit School' : 'Add School'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">School Name *</label>
                  <input required className="w-full border p-2 rounded" value={formData.school_name} onChange={e => setFormData({...formData, school_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">UDISE Code</label>
                    <input className="w-full border p-2 rounded" value={formData.udise_code} onChange={e => setFormData({...formData, udise_code: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Management</label>
                    <select className="w-full border p-2 rounded" value={formData.management} onChange={e => setFormData({...formData, management: e.target.value})}>
                      <option value="Government">Government</option>
                      <option value="Aided">Aided</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Students Modal */}
        {importModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h3 className="text-xl font-bold mb-4">Import Students (CSV)</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a CSV file containing columns: <strong>emis_no, student_name, standard</strong>. Optional: section, phone.
              </p>
              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CSV File *</label>
                  <input type="file" accept=".csv" required className="w-full border p-2 rounded" onChange={e => setFile(e.target.files?.[0] || null)} />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => { setImportModal(false); setFile(null); }} className="px-4 py-2 border rounded" disabled={importing}>Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded disabled:opacity-50" disabled={importing}>
                    {importing ? 'Importing...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
