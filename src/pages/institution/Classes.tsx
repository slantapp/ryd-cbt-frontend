import { useEffect, useState } from 'react';
import { classroomAPI, teacherAPI, sessionAPI, themeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Session } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Classes() {
  const { account } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [deletingClass, setDeletingClass] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    academicSession: '',
    description: '',
    sessionId: '',
  });
  const [assignment, setAssignment] = useState({
    classroomId: '',
    teacherId: '',
  });
  const [bulkAssignment, setBulkAssignment] = useState({
    classroomIds: [] as string[],
    teacherId: '',
  });

  const isSchool = account?.role === 'SCHOOL';
  const isTeacher = account?.role === 'TEACHER';
  const isSuperAdmin = account?.role === 'SUPER_ADMIN';

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
    loadClasses();
    if (isSchool || isSuperAdmin) {
      if (isSuperAdmin) {
        // Super admin can view sessions for filtering
        loadSessions();
      } else {
        loadTeachers();
        loadSessions();
      }
    }
  }, [account?.role, isSuperAdmin]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const { data } = await classroomAPI.list();
      setClasses(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const { data } = await teacherAPI.list();
      setTeachers(data);
    } catch (error: any) {
      toast.error('Failed to load teachers');
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await sessionAPI.getAll();
      setSessions(data);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      // Don't show error toast - sessions are optional for class creation
    }
  };

  // Get active or scheduled sessions for dropdown
  const getAvailableSessions = () => {
    const now = new Date();
    return sessions.filter((session) => {
      if (!session.isActive || session.isArchived) return false;
      const startDate = new Date(session.startDate);
      const endDate = new Date(session.endDate);
      // Active: current date is between start and end
      const isActive = startDate <= now && endDate >= now;
      // Scheduled: start date is in the future
      const isScheduled = startDate > now;
      return isActive || isScheduled;
    });
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await classroomAPI.create(classForm);
      toast.success(classForm.sessionId ? 'Class created and assigned to session' : 'Class created');
      setClassForm({ name: '', academicSession: '', description: '', sessionId: '' });
      setShowCreateModal(false);
      loadClasses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment.classroomId || !assignment.teacherId) {
      toast.error('Select both class and teacher');
      return;
    }
    setAssigning(true);
    try {
      await classroomAPI.assignTeacher(assignment);
      toast.success('Teacher assigned');
      setAssignment({ classroomId: '', teacherId: '' });
      setShowAssignModal(false);
      loadClasses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAssignment.teacherId || bulkAssignment.classroomIds.length === 0) {
      toast.error('Select a teacher and at least one class');
      return;
    }
    setAssigning(true);
    try {
      const response = await classroomAPI.bulkAssignTeacher(bulkAssignment);
      toast.success(response.data?.message || `Teacher assigned to ${bulkAssignment.classroomIds.length} class(es)`);
      setBulkAssignment({ classroomIds: [], teacherId: '' });
      setShowBulkAssignModal(false);
      loadClasses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign teacher to classes');
    } finally {
      setAssigning(false);
    }
  };

  const handleEditClass = (cls: any) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name || '',
      academicSession: cls.academicSession || '',
      description: cls.description || '',
      sessionId: '', // Don't pre-fill sessionId for edit
    });
    setShowEditModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    
    setUpdating(true);
    try {
      await classroomAPI.update(editingClass.id, {
        name: classForm.name,
        academicSession: classForm.academicSession,
        description: classForm.description,
      });
      toast.success('Class updated successfully');
      setShowEditModal(false);
      setEditingClass(null);
      setClassForm({ name: '', academicSession: '', description: '', sessionId: '' });
      loadClasses();
    } catch (error: any) {
      console.error('Update class error:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.statusText || 
                          error?.message || 
                          'Failed to update class';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClass) return;
    
    setDeleting(true);
    try {
      await classroomAPI.delete(deletingClass.id);
      toast.success('Class deleted successfully');
      setShowDeleteConfirm(false);
      setDeletingClass(null);
      loadClasses();
    } catch (error: any) {
      console.error('Delete class error:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.statusText || 
                          error?.message || 
                          'Failed to delete class';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveTeacher = async (classroomId: string, teacherId: string) => {
    try {
      await classroomAPI.removeTeacher(classroomId, teacherId);
      toast.success('Removed teacher from class');
      loadClasses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to remove teacher');
    }
  };

  if (!isSchool && !isTeacher && !isSuperAdmin) {
    return <p className="text-center text-gray-500">Classes are only visible to schools, teachers, and super admins.</p>;
  }

  const totalClasses = classes.length;
  const classesWithTeachers = classes.filter(c => c.teachers && c.teachers.length > 0).length;
  const classesWithoutTeachers = totalClasses - classesWithTeachers;

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
          <h1 className="text-4xl font-bold mb-2">
            {isSuperAdmin ? 'All Classes' : 'Classes'}
          </h1>
          <p className="text-white/80 text-lg">
            {isSuperAdmin ? 'View all classes across all schools' : isTeacher ? 'View classes you are assigned to' : 'Manage classes and teacher assignments'}
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
              {totalClasses}
            </div>
            <div className="text-sm text-gray-600">Total Classes</div>
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
              {classesWithTeachers}
            </div>
            <div className="text-sm text-gray-600">With Teachers</div>
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
              {classesWithoutTeachers}
            </div>
            <div className="text-sm text-gray-600">Without Teachers</div>
          </div>
        </div>
      )}
      {isSchool && (
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Class
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="btn-secondary"
          >
            Assign Teacher
          </button>
          <button
            onClick={() => setShowBulkAssignModal(true)}
            className="btn-secondary"
          >
            Bulk Assign Teacher
          </button>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Class</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setClassForm({ name: '', academicSession: '', description: '', sessionId: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleCreateClass}>
              <input
                name="name"
                placeholder="Class name"
                className="input-field"
                required
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Session (Optional)
                </label>
                <select
                  name="sessionId"
                  className="input-field"
                  value={classForm.sessionId}
                  onChange={(e) => {
                    const selectedSession = getAvailableSessions().find(s => s.id === e.target.value);
                    setClassForm({ 
                      ...classForm, 
                      sessionId: e.target.value,
                      academicSession: selectedSession ? selectedSession.name : '',
                    });
                  }}
                >
                  <option value="">Select a session (optional)</option>
                  {getAvailableSessions().map((session) => {
                    const startDate = new Date(session.startDate);
                    const endDate = new Date(session.endDate);
                    const now = new Date();
                    const isActive = startDate <= now && endDate >= now;
                    const isScheduled = startDate > now;
                    const status = isActive ? 'Active' : isScheduled ? 'Scheduled' : '';
                    const dateRange = `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
                    return (
                      <option key={session.id} value={session.id}>
                        {session.name} - {dateRange} {status ? `(${status})` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select an active or scheduled session to assign this class to
                </p>
              </div>
              <textarea
                name="description"
                placeholder="Description"
                className="input-field h-24"
                value={classForm.description}
                onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
              />
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setClassForm({ name: '', academicSession: '', description: '', sessionId: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Assign Teacher</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignment({ classroomId: '', teacherId: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleAssignTeacher}>
              <select
                value={assignment.classroomId}
                onChange={(e) => setAssignment({ ...assignment, classroomId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <select
                value={assignment.teacherId}
                onChange={(e) => setAssignment({ ...assignment, teacherId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignment({ classroomId: '', teacherId: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={assigning} className="btn-primary flex-1">
                  {assigning ? 'Assigning...' : 'Assign Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Teacher Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Bulk Assign Teacher</h2>
              <button
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignment({ classroomIds: [], teacherId: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleBulkAssignTeacher}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher
                </label>
                <select
                  value={bulkAssignment.teacherId}
                  onChange={(e) => setBulkAssignment({ ...bulkAssignment, teacherId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Classes ({bulkAssignment.classroomIds.length} selected)
                </label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {classes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No classes available</p>
                  ) : (
                    <div className="space-y-2">
                      {classes.map((cls) => (
                        <label key={cls.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={bulkAssignment.classroomIds.includes(cls.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkAssignment({
                                  ...bulkAssignment,
                                  classroomIds: [...bulkAssignment.classroomIds, cls.id],
                                });
                              } else {
                                setBulkAssignment({
                                  ...bulkAssignment,
                                  classroomIds: bulkAssignment.classroomIds.filter(id => id !== cls.id),
                                });
                              }
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">{cls.name}</span>
                          {cls.academicSession && (
                            <span className="text-xs text-gray-500">({cls.academicSession})</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkAssignment({
                        ...bulkAssignment,
                        classroomIds: classes.map(cls => cls.id),
                      });
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkAssignment({
                        ...bulkAssignment,
                        classroomIds: [],
                      });
                    }}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkAssignModal(false);
                    setBulkAssignment({ classroomIds: [], teacherId: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={assigning || bulkAssignment.classroomIds.length === 0} className="btn-primary flex-1">
                  {assigning ? 'Assigning...' : `Assign to ${bulkAssignment.classroomIds.length} Class(es)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Class</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClass(null);
                  setClassForm({ name: '', academicSession: '', description: '', sessionId: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleUpdateClass}>
              <input
                name="name"
                placeholder="Class name"
                className="input-field"
                required
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              />
              <input
                name="academicSession"
                placeholder="Academic Session"
                className="input-field"
                value={classForm.academicSession}
                onChange={(e) => setClassForm({ ...classForm, academicSession: e.target.value })}
              />
              <textarea
                name="description"
                placeholder="Description"
                className="input-field h-24"
                value={classForm.description}
                onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
              />
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClass(null);
                    setClassForm({ name: '', academicSession: '', description: '', sessionId: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="btn-primary flex-1">
                  {updating ? 'Updating...' : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Delete Class</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deletingClass.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingClass(null);
                  }}
                  className="btn-secondary flex-1"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClass}
                  disabled={deleting}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Classes</h2>
        {loading ? (
          <p className="text-gray-500">Loading classes...</p>
        ) : classes.length === 0 ? (
          <p className="text-gray-500">{isTeacher ? 'No classes assigned yet.' : 'No classes yet.'}</p>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{cls.name}</p>
                    <p className="text-sm text-gray-500">{cls.academicSession}</p>
                    <p className="text-sm text-gray-600 mt-2">{cls.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        cls.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cls.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {isSchool && (
                      <>
                        <button
                          onClick={() => handleEditClass(cls)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Edit class"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setDeletingClass(cls);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete class"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Teachers</p>
                  {!cls.assignments || cls.assignments.length === 0 ? (
                    <p className="text-sm text-gray-500">No teachers yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {cls.assignments.map((assignment: any) => (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-2 px-3 py-1 border rounded-full text-sm"
                        >
                          <span>{assignment.teacher.name}</span>
                          {isSchool && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeacher(cls.id, assignment.teacherId)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

