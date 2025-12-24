import { useEffect, useState, useMemo } from 'react';
import { teacherAPI, classroomAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Teachers() {
  const { account } = useAuthStore();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningClassroomId, setAssigningClassroomId] = useState<string | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
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

  const isSuperAdmin = useMemo(() => {
    return account?.role === 'SUPER_ADMIN';
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
    if (isSchool || isSuperAdmin) {
      loadTeachers();
      if (isSchool) {
        loadClassrooms();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSchool, isSuperAdmin]);

  const loadClassrooms = async () => {
    try {
      const { data } = await classroomAPI.list();
      setClassrooms(data);
    } catch (error: any) {
      console.error('Failed to load classrooms:', error);
    }
  };

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

  const handleToggleActive = async (teacher: any) => {
    if (!window.confirm(`Are you sure you want to ${teacher.isActive ? 'deactivate' : 'activate'} ${teacher.name}?`)) {
      return;
    }

    try {
      await teacherAPI.update(teacher.id, { isActive: !teacher.isActive });
      toast.success(`Teacher ${teacher.isActive ? 'deactivated' : 'activated'} successfully`);
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || `Failed to ${teacher.isActive ? 'deactivate' : 'activate'} teacher`);
    }
  };

  const handleAssignClass = async () => {
    if (!selectedClassroomId || !assigningClassroomId) {
      toast.error('Please select a class');
      return;
    }

    setAssigning(true);
    try {
      await classroomAPI.assignTeacher({
        classroomId: selectedClassroomId,
        teacherId: assigningClassroomId,
      });
      toast.success('Teacher assigned to class successfully');
      setAssigningClassroomId(null);
      setSelectedClassroomId('');
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign teacher to class');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveClass = async (teacherId: string, classroomId: string) => {
    if (!window.confirm('Are you sure you want to remove this teacher from the class?')) {
      return;
    }

    try {
      await classroomAPI.removeTeacher(classroomId, teacherId);
      toast.success('Teacher removed from class successfully');
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to remove teacher from class');
    }
  };

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter((teacher) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const name = teacher.name?.toLowerCase() || '';
    const email = teacher.email?.toLowerCase() || '';
    const phone = teacher.phone?.toLowerCase() || '';
    
    return (
      name.includes(query) ||
      email.includes(query) ||
      phone.includes(query)
    );
  });

  if (!isSchool && !isSuperAdmin) {
    return <p className="text-center text-gray-500">Only schools and super admins can view teacher accounts.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Teachers</h1>
        <p className="text-primary-100 text-lg">
          {isSuperAdmin ? 'View all teachers across all schools' : 'Manage teacher accounts and assignments'}
        </p>
      </div>

      {isSchool && (
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
          <input
            name="teacher-name"
            type="text"
            placeholder="Name"
            className="input-field"
            required
            autoComplete="off"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            name="teacher-email"
            type="email"
            placeholder="Email"
            className="input-field"
            required
            autoComplete="off"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            name="teacher-phone"
            type="tel"
            placeholder="Phone (optional)"
            className="input-field"
            autoComplete="off"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            name="teacher-password"
            type="password"
            placeholder="Password"
            className="input-field"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" disabled={creating} className="btn-primary col-span-full md:w-48">
            {creating ? 'Creating...' : 'Create teacher'}
          </button>
        </form>
      </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Teachers</h2>
          <span className="text-sm text-gray-500">
            {searchQuery ? `${filteredTeachers.length} of ${teachers.length}` : `${teachers.length} total`}
          </span>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search teachers by name, email, or phone..."
            className="input-field w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="text-gray-500">Loading teachers...</p>
        ) : teachers.length === 0 ? (
          <p className="text-gray-500">No teachers yet.</p>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No teachers found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-primary hover:text-primary-600"
            >
              Clear search
            </button>
          </div>
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
                {filteredTeachers.map((teacher) => (
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
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              teacher.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {teacher.isActive ? 'Active' : 'Inactive'}
                          </span>
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
                          {isSchool ? (
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleEdit(teacher)}
                                className="px-3 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700"
                                title="Edit teacher"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => setAssigningClassroomId(teacher.id)}
                                className="px-3 py-1 text-xs font-semibold rounded bg-purple-600 text-white hover:bg-purple-700"
                                title="Assign to class"
                              >
                                📚 Assign Class
                              </button>
                              <button
                                onClick={() => handleToggleActive(teacher)}
                                className={`px-3 py-1 text-xs font-semibold rounded text-white ${
                                  teacher.isActive
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                                title={teacher.isActive ? 'Deactivate teacher' : 'Activate teacher'}
                              >
                                {teacher.isActive ? '🚫 Deactivate' : '✅ Activate'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">View only</span>
                          )}
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

      {/* Assign Class Modal */}
      {assigningClassroomId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Assign Teacher to Class</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select a class to assign to{' '}
              <span className="font-semibold">
                {teachers.find((t) => t.id === assigningClassroomId)?.name}
              </span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                className="input-field w-full"
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
              >
                <option value="">Choose a class...</option>
                {classrooms
                  .filter((classroom) => {
                    const teacher = teachers.find((t) => t.id === assigningClassroomId);
                    // Filter out classes the teacher is already assigned to
                    return !teacher?.assignedClasses?.some(
                      (ac: any) => ac.classroom.id === classroom.id
                    );
                  })
                  .map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} {classroom.academicSession ? `(${classroom.academicSession})` : ''}
                    </option>
                  ))}
              </select>
              {classrooms.filter((classroom) => {
                const teacher = teachers.find((t) => t.id === assigningClassroomId);
                return !teacher?.assignedClasses?.some(
                  (ac: any) => ac.classroom.id === classroom.id
                );
              }).length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  All available classes are already assigned to this teacher
                </p>
              )}
            </div>

            {/* Show already assigned classes */}
            {teachers
              .find((t) => t.id === assigningClassroomId)
              ?.assignedClasses?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Currently Assigned Classes:</p>
                <div className="flex flex-wrap gap-2">
                  {teachers
                    .find((t) => t.id === assigningClassroomId)
                    ?.assignedClasses.map((assignment: any) => (
                      <div
                        key={assignment.classroom.id}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        <span>{assignment.classroom.name}</span>
                        <button
                          onClick={() => handleRemoveClass(assigningClassroomId, assignment.classroom.id)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                          title="Remove from class"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setAssigningClassroomId(null);
                  setSelectedClassroomId('');
                }}
                className="btn-secondary flex-1"
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignClass}
                disabled={assigning || !selectedClassroomId}
                className="btn-primary flex-1"
              >
                {assigning ? 'Assigning...' : 'Assign Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

