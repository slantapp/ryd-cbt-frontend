import { useEffect, useState, useMemo } from 'react';
import { teacherAPI, classroomAPI, themeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Teachers() {
  const { account } = useAuthStore();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningClassroomId, setAssigningClassroomId] = useState<string | null>(null);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: string[];
    errors: string[];
    successful: number;
    failed: number;
  } | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    classroomIds: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<any>(null);

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

  // Load theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { data } = await themeAPI.get();
        if (data) {
          setTheme(data);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    if (isSchool || isSuperAdmin) {
      loadTheme();
    }
  }, [isSchool, isSuperAdmin]);

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
      const { classroomIds, ...teacherData } = form;
      const response = await teacherAPI.create(teacherData);
      const teacherId = response.data.teacher.id;
      
      // Assign teacher to selected classrooms if any
      if (classroomIds.length > 0) {
        try {
          await Promise.all(
            classroomIds.map(classroomId =>
              classroomAPI.assignTeacher({ classroomId, teacherId })
            )
          );
          toast.success(`Teacher account created and assigned to ${classroomIds.length} class(es)`);
        } catch (assignError: any) {
          // Teacher was created but assignment failed
          toast.success('Teacher account created, but some class assignments failed');
          console.error('Assignment error:', assignError);
        }
      } else {
        toast.success('Teacher account created');
      }
      
      setForm({ name: '', email: '', password: '', phone: '', classroomIds: [] });
      setShowCreateModal(false);
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
      
      setUploadResults({
        success: response.data.success || [],
        errors: response.data.errors || [],
        successful: response.data.successful || 0,
        failed: response.data.failed || 0,
      });
      
      toast.success(`Upload completed: ${response.data.successful || 0} successful, ${response.data.failed || 0} failed`);
      
      // Show results modal if there are errors or successes to display
      if ((response.data.errors && response.data.errors.length > 0) || (response.data.success && response.data.success.length > 0)) {
        setShowUploadResults(true);
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
    if (!selectedClassroomIds.length || !assigningClassroomId) {
      toast.error('Please select at least one class');
      return;
    }

    setAssigning(true);
    try {
      const response = await classroomAPI.bulkAssignTeacher({
        classroomIds: selectedClassroomIds,
        teacherId: assigningClassroomId,
      });
      toast.success(response.data?.message || `Teacher assigned to ${selectedClassroomIds.length} class(es) successfully`);
      setAssigningClassroomId(null);
      setSelectedClassroomIds([]);
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign teacher to classes');
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

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;

    try {
      await teacherAPI.delete(deletingTeacher.id);
      toast.success('Teacher deleted successfully');
      setDeletingTeacher(null);
      loadTeachers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete teacher');
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

  const totalTeachers = teachers.length;
  const assignedTeachers = teachers.filter(t => t.classrooms && t.classrooms.length > 0).length;
  const unassignedTeachers = totalTeachers - assignedTeachers;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div 
        className="rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(to right, ${theme?.primaryColor || '#A8518A'}, ${theme?.secondaryColor || theme?.primaryColor || '#A8518A'}, ${theme?.accentColor || theme?.primaryColor || '#A8518A'})`
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">Teachers</h1>
          <p className="text-white/80 text-lg">
            {isSuperAdmin ? 'View all teachers across all schools' : 'Manage teacher accounts and assignments'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {isSchool && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="card border-2"
            style={{
              background: `linear-gradient(to bottom right, ${theme?.primaryColor || '#A8518A'}15, ${theme?.primaryColor || '#A8518A'}25)`,
              borderColor: `${theme?.primaryColor || '#A8518A'}40`
            }}
          >
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: theme?.primaryColor || '#A8518A' }}
            >
              {totalTeachers}
            </div>
            <div className="text-sm text-gray-600">Total Teachers</div>
          </div>
          <div 
            className="card border-2"
            style={{
              background: `linear-gradient(to bottom right, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}15, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}25)`,
              borderColor: `${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}40`
            }}
          >
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: theme?.secondaryColor || theme?.primaryColor || '#1d4ed8' }}
            >
              {assignedTeachers}
            </div>
            <div className="text-sm text-gray-600">Assigned</div>
          </div>
          <div 
            className="card border-2"
            style={{
              background: `linear-gradient(to bottom right, ${theme?.accentColor || theme?.primaryColor || '#facc15'}15, ${theme?.accentColor || theme?.primaryColor || '#facc15'}25)`,
              borderColor: `${theme?.accentColor || theme?.primaryColor || '#facc15'}40`
            }}
          >
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: theme?.accentColor || theme?.primaryColor || '#facc15' }}
            >
              {unassignedTeachers}
            </div>
            <div className="text-sm text-gray-600">Unassigned</div>
          </div>
        </div>
      )}

      {isSchool && (
        <div className="card">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Teachers</h2>
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
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-sm"
              >
                ➕ Create Teacher
              </button>
            </div>
          </div>

          {showBulkUpload && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
        </div>
      )}

      {/* Create Teacher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold">Create Teacher</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setForm({ name: '', email: '', password: '', phone: '', classroomIds: [] });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Teacher Name"
                      className="input-field w-full"
                      required
                      autoComplete="off"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="teacher@example.com"
                      className="input-field w-full"
                      required
                      autoComplete="off"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      className="input-field w-full"
                      autoComplete="off"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Password"
                      className="input-field w-full"
                      required
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Assign to Classes (Optional)
                    </label>
                    {classrooms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = form.classroomIds.length === classrooms.length;
                          if (allSelected) {
                            // Deselect all
                            setForm({
                              ...form,
                              classroomIds: [],
                            });
                          } else {
                            // Select all
                            setForm({
                              ...form,
                              classroomIds: classrooms.map(c => c.id),
                            });
                          }
                        }}
                        className="text-xs font-medium text-primary hover:text-primary-600 transition-colors"
                      >
                        {form.classroomIds.length === classrooms.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    You can assign the teacher to classes now or later
                  </p>
                  <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                    {classrooms.length === 0 ? (
                      <div className="p-4">
                        <p className="text-sm text-gray-500">No classes available. Create classes first.</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto p-3">
                        <div className="space-y-2">
                          {classrooms.map((classroom) => (
                            <label key={classroom.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={form.classroomIds.includes(classroom.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setForm({
                                      ...form,
                                      classroomIds: [...form.classroomIds, classroom.id],
                                    });
                                  } else {
                                    setForm({
                                      ...form,
                                      classroomIds: form.classroomIds.filter(id => id !== classroom.id),
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-gray-700 flex-1">
                                {classroom.name} {classroom.academicSession ? `(${classroom.academicSession})` : ''}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {form.classroomIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {form.classroomIds.length} class{form.classroomIds.length !== 1 ? 'es' : ''} selected
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setForm({ name: '', email: '', password: '', phone: '', classroomIds: [] });
                }}
                className="btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary"
              >
                {creating ? 'Creating...' : 'Create Teacher'}
              </button>
            </div>
          </div>
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Email</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Belongs To</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell">Metrics</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Classes</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      {editingId === teacher.id ? (
                        <>
                          <td className="px-2 sm:px-4 md:px-6 py-3">
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
                          <td className="px-2 sm:px-4 md:px-6 py-3 hidden sm:table-cell">
                          <input
                            type="email"
                            className="input-field text-sm"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="Email"
                            required
                          />
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {teacher.parent ? (
                            <span className="text-xs">{teacher.parent.name} ({teacher.parent.role})</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm hidden lg:table-cell">
                          {teacher.metrics ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs">Classes: {teacher.metrics.classes}</span>
                              <span className="text-xs">Sessions: {teacher.metrics.sessions}</span>
                              <span className="text-xs">Tests: {teacher.metrics.tests}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm hidden md:table-cell">
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
                          <td className="px-2 sm:px-4 md:px-6 py-3 hidden sm:table-cell">
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
                        <td className="px-2 sm:px-4 md:px-6 py-3">
                          <p className="font-semibold text-gray-900 text-sm">{teacher.name}</p>
                          <p className="text-xs text-gray-500 sm:hidden">{teacher.email}</p>
                          <p className="text-xs text-gray-500 hidden sm:block">{teacher.phone || 'No phone'}</p>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm text-gray-700 hidden sm:table-cell">{teacher.email}</td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {teacher.parent ? (
                            <span className="text-xs">{teacher.parent.name} ({teacher.parent.role})</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm hidden lg:table-cell">
                          {teacher.metrics ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs">Classes: {teacher.metrics.classes}</span>
                              <span className="text-xs">Sessions: {teacher.metrics.sessions}</span>
                              <span className="text-xs">Tests: {teacher.metrics.tests}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-3 text-sm hidden md:table-cell">
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
                        <td className="px-2 sm:px-4 md:px-6 py-3">
                          <div className="flex gap-2 flex-wrap items-center">
                            {isSchool && (
                              <>
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
                                <button
                                  onClick={() => setDeletingTeacher(teacher)}
                                  className={`px-3 py-1 text-xs font-semibold rounded text-white ${
                                    (teacher.assignedClasses && teacher.assignedClasses.length > 0)
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-red-600 hover:bg-red-700'
                                  }`}
                                  title={
                                    (teacher.assignedClasses && teacher.assignedClasses.length > 0)
                                      ? 'Cannot delete teacher assigned to classes'
                                      : 'Delete teacher'
                                  }
                                  disabled={teacher.assignedClasses && teacher.assignedClasses.length > 0}
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                            {(isSchool || isSuperAdmin) && (
                              <button
                                onClick={() => {
                                  setSelectedTeacher(teacher);
                                  setResetPasswordData({ newPassword: '', confirmPassword: '' });
                                  setShowResetPasswordDialog(true);
                                }}
                                className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Reset teacher password"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </button>
                            )}
                            {!isSchool && !isSuperAdmin && (
                              <span className="text-xs text-gray-500">View only</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Assign Class Modal */}
      {assigningClassroomId && (() => {
        const teacher = teachers.find((t) => t.id === assigningClassroomId);
        const availableClassrooms = classrooms.filter((classroom) => {
          // Filter out classes the teacher is already assigned to
          return !teacher?.assignedClasses?.some(
            (ac: any) => ac.classroom.id === classroom.id
          );
        });
        const allSelected = availableClassrooms.length > 0 && selectedClassroomIds.length === availableClassrooms.length;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] flex flex-col">
              <h2 className="text-2xl font-bold mb-4">Assign Teacher to Classes</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select class(es) to assign to{' '}
                <span className="font-semibold">
                  {teacher?.name}
                </span>
              </p>

              <div className="mb-4 flex-1 overflow-y-auto">
                {availableClassrooms.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">
                      All available classes are already assigned to this teacher
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Classes
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (allSelected) {
                            setSelectedClassroomIds([]);
                          } else {
                            setSelectedClassroomIds(availableClassrooms.map(c => c.id));
                          }
                        }}
                        className="text-xs font-medium text-primary hover:text-primary-600 transition-colors"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                      <div className="max-h-64 overflow-y-auto p-3">
                        <div className="space-y-2">
                          {availableClassrooms.map((classroom) => (
                            <label
                              key={classroom.id}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedClassroomIds.includes(classroom.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedClassroomIds([...selectedClassroomIds, classroom.id]);
                                  } else {
                                    setSelectedClassroomIds(selectedClassroomIds.filter(id => id !== classroom.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-gray-700 flex-1">
                                {classroom.name} {classroom.academicSession ? `(${classroom.academicSession})` : ''}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    {selectedClassroomIds.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {selectedClassroomIds.length} class{selectedClassroomIds.length !== 1 ? 'es' : ''} selected
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Show already assigned classes */}
              {teacher?.assignedClasses?.length > 0 && (
                <div className="mb-4 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Currently Assigned Classes:</p>
                  <div className="flex flex-wrap gap-2">
                    {teacher.assignedClasses.map((assignment: any) => (
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

              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setAssigningClassroomId(null);
                    setSelectedClassroomIds([]);
                  }}
                  className="btn-secondary flex-1"
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignClass}
                  disabled={assigning || selectedClassroomIds.length === 0}
                  className="btn-primary flex-1"
                >
                  {assigning ? 'Assigning...' : `Assign ${selectedClassroomIds.length > 0 ? `(${selectedClassroomIds.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reset Password Dialog */}
      {showResetPasswordDialog && selectedTeacher && !resetPasswordResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Reset Teacher Password</h2>
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Teacher:</strong> {selectedTeacher.name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Email:</strong> {selectedTeacher.email}
              </p>
              {selectedTeacher.username && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Username:</strong> {selectedTeacher.username}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> The teacher's password will be reset immediately. The teacher will be required to reset their password on their first login. Please share the new password with the teacher directly.
                </p>
              </div>
            </div>

            <div className="flex space-x-2 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  if (!selectedTeacher) {
                    toast.error('No teacher selected');
                    return;
                  }

                  if (!resetPasswordData.newPassword || !resetPasswordData.confirmPassword) {
                    toast.error('Please enter and confirm the new password');
                    return;
                  }

                  if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
                    toast.error('Passwords do not match');
                    return;
                  }

                  if (resetPasswordData.newPassword.length < 6) {
                    toast.error('Password must be at least 6 characters long');
                    return;
                  }

                  setResettingPassword(true);

                  try {
                    const response = await teacherAPI.resetPassword({
                      teacherId: selectedTeacher.id,
                      newPassword: resetPasswordData.newPassword,
                      forceReset: true, // Always force reset on first login
                    });
                    toast.success('Password reset successfully');
                    // Show the new password to admin so they can share it with teacher
                    if (response.data.newPassword && response.data.username) {
                      setResetPasswordResult({
                        username: response.data.username,
                        password: response.data.newPassword,
                      });
                    } else {
                      setShowResetPasswordDialog(false);
                      setResetPasswordData({ newPassword: '', confirmPassword: '' });
                      setSelectedTeacher(null);
                    }
                  } catch (error: any) {
                    toast.error(error?.response?.data?.error || 'Failed to reset password');
                  } finally {
                    setResettingPassword(false);
                  }
                }}
                disabled={resettingPassword || !resetPasswordData.newPassword || !resetPasswordData.confirmPassword}
                className="btn-primary flex-1"
              >
                {resettingPassword ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => {
                  setShowResetPasswordDialog(false);
                  setResetPasswordData({ newPassword: '', confirmPassword: '' });
                  setSelectedTeacher(null);
                }}
                className="btn-secondary flex-1"
                disabled={resettingPassword}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Result Dialog */}
      {resetPasswordResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Password Reset Successful</h2>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">
                The teacher's password has been reset. Please share these credentials with the teacher:
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Username:</span>
                  <div className="mt-1 p-2 bg-white border border-gray-300 rounded font-mono text-sm flex items-center justify-between">
                    <span>{resetPasswordResult.username}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resetPasswordResult.username);
                        toast.success('Username copied to clipboard');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-700">New Password:</span>
                  <div className="mt-1 p-2 bg-white border border-gray-300 rounded font-mono text-sm flex items-center justify-between">
                    <span>{resetPasswordResult.password}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resetPasswordResult.password);
                        toast.success('Password copied to clipboard');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Important:</strong> The teacher will be required to reset their password when they first log in.
              </p>
            </div>
            <button
              onClick={() => {
                setResetPasswordResult(null);
                setShowResetPasswordDialog(false);
                setResetPasswordData({ newPassword: '', confirmPassword: '' });
                setSelectedTeacher(null);
              }}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadResults && uploadResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold text-gray-900">Bulk Upload Results</h3>
                <button
                  onClick={() => {
                    setShowUploadResults(false);
                    setUploadResults(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{uploadResults.successful}</div>
                  <div className="text-sm text-green-700">Successful</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
              </div>

              {/* Success List */}
              {uploadResults.success.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-green-700 mb-3">✅ Successful Uploads</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {uploadResults.success.map((item, index) => (
                        <div key={index} className="text-sm text-green-800 font-mono">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Errors List */}
              {uploadResults.errors.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-red-700 mb-3">❌ Failed Uploads</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {uploadResults.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-800">
                          {typeof error === 'string' ? error : String(error)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowUploadResults(false);
                    setUploadResults(null);
                  }}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Teacher Confirmation Modal */}
      {deletingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Delete Teacher</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deletingTeacher.name}</strong>? This action cannot be undone.
              </p>
              {deletingTeacher.assignedClasses && deletingTeacher.assignedClasses.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This teacher is currently assigned to {deletingTeacher.assignedClasses.length} class(es). 
                    Please remove the teacher from all classes before deleting.
                  </p>
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleDeleteTeacher}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
                  disabled={deletingTeacher.assignedClasses && deletingTeacher.assignedClasses.length > 0}
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingTeacher(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

