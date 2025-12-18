import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI, impersonationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Teachers() {
  const { account, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const isSchool = useMemo(() => {
    return account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN';
  }, [account?.role]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const { data } = await teacherAPI.list();
      setTeachers(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSchool) {
      loadTeachers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSchool]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await teacherAPI.create(form);
      toast.success('Teacher account created');
      setForm({ name: '', email: '', password: '', phone: '' });
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create teacher');
    } finally {
      setCreating(false);
    }
  };

  const handleImpersonate = async (id: string) => {
    try {
      setImpersonatingId(id);
      const { data } = await impersonationAPI.start(id);
      if (!data.token) {
        toast.error('Impersonation failed: No authentication token received');
        return;
      }
      
      if (!data.account) {
        toast.error('Impersonation failed: No account data received');
        return;
      }
      
      setAuth(data.token, data.account);
      toast.success(`Now impersonating ${data.account.name}`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to impersonate');
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await teacherAPI.bulkUpload(formData);
      toast.success(`Uploaded: ${response.data.successful} successful, ${response.data.failed} failed`);
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Upload errors:', response.data.errors);
      }
      loadTeachers();
      setShowBulkUpload(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload teachers');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await teacherAPI.downloadTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'teacher-upload-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error('Failed to download template');
    }
  };

  const handleEdit = (teacher: any) => {
    setEditingId(teacher.id);
    setEditForm({
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', email: '', phone: '' });
  };

  const handleUpdate = async (id: string) => {
    setUpdating(true);
    try {
      await teacherAPI.update(id, editForm);
      toast.success('Teacher updated successfully');
      setEditingId(null);
      setEditForm({ name: '', email: '', phone: '' });
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update teacher');
    } finally {
      setUpdating(false);
    }
  };

  if (!isSchool) {
    return <p className="text-center text-gray-500">Only schools can manage teacher accounts.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Teachers</h1>
        <p className="text-primary-100 text-lg">Manage teacher accounts and assignments</p>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Create Teacher</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadTemplate}
              className="btn-secondary text-sm"
            >
              📥 Download Template
            </button>
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="btn-secondary text-sm"
            >
              {showBulkUpload ? 'Cancel' : '📤 Bulk Upload'}
            </button>
          </div>
        </div>

        {showBulkUpload && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleBulkUpload}
              disabled={uploading}
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-2">
              {uploading ? 'Uploading...' : 'Upload teachers using the template format'}
            </p>
          </div>
        )}
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          {['name', 'email', 'phone', 'password'].map((field) => (
            <input
              key={field}
              name={field}
              type={field === 'password' ? 'password' : 'text'}
              placeholder={field === 'phone' ? 'Phone (optional)' : field.charAt(0).toUpperCase() + field.slice(1)}
              className="input-field"
              required={field !== 'phone'}
              value={(form as any)[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          ))}
          <button type="submit" disabled={creating} className="btn-primary col-span-full md:w-48">
            {creating ? 'Creating...' : 'Create teacher'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Teachers</h2>
          <span className="text-sm text-gray-500">{teachers.length} total</span>
        </div>
        {loading ? (
          <p className="text-gray-500">Loading teachers...</p>
        ) : teachers.length === 0 ? (
          <p className="text-gray-500">No teachers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Belongs To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Metrics</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Classes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    {editingId === teacher.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="input-field text-sm"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Name"
                            required
                          />
                          <input
                            type="text"
                            className="input-field text-sm mt-2"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            placeholder="Phone (optional)"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="email"
                            className="input-field text-sm"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="Email"
                            required
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {teacher.parent ? (
                            <span>{teacher.parent.name} ({teacher.parent.role})</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {teacher.metrics ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs">Classes: {teacher.metrics.classes}</span>
                              <span className="text-xs">Sessions: {teacher.metrics.sessions}</span>
                              <span className="text-xs">Tests: {teacher.metrics.tests}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {teacher.assignedClasses?.length > 0 ? (
                            <div className="relative group">
                              <div className="flex flex-wrap gap-1">
                                {teacher.assignedClasses.map((assignment: any) => (
                                  <span
                                    key={assignment.classroom.id}
                                    className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium"
                                    title={assignment.classroom.name}
                                  >
                                    {assignment.classroom.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No classes</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(teacher.id)}
                              disabled={updating}
                              className="px-3 py-1 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {updating ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={updating}
                              className="px-3 py-1 text-xs font-semibold rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{teacher.name}</p>
                          <p className="text-xs text-gray-500">{teacher.phone || 'No phone'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{teacher.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {teacher.parent ? (
                            <span>{teacher.parent.name} ({teacher.parent.role})</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {teacher.metrics ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs">Classes: {teacher.metrics.classes}</span>
                              <span className="text-xs">Sessions: {teacher.metrics.sessions}</span>
                              <span className="text-xs">Tests: {teacher.metrics.tests}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {teacher.assignedClasses?.length > 0 ? (
                            <div className="relative group">
                              <div className="flex flex-wrap gap-1">
                                {teacher.assignedClasses.map((assignment: any) => (
                                  <span
                                    key={assignment.classroom.id}
                                    className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium"
                                    title={assignment.classroom.name}
                                  >
                                    {assignment.classroom.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No classes</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(teacher)}
                              className="px-3 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700"
                              title="Edit teacher"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleImpersonate(teacher.id)}
                              disabled={impersonatingId === teacher.id}
                              className="px-3 py-1 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                              title="Impersonate teacher"
                            >
                              {impersonatingId === teacher.id ? 'Switching...' : '👤 Impersonate'}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

