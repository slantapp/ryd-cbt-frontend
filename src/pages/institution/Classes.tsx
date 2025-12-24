import { useEffect, useState } from 'react';
import { classroomAPI, teacherAPI, sessionAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Session } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Classes() {
  const { account } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    academicSession: '',
    description: '',
  });
  const [assignment, setAssignment] = useState({
    classroomId: '',
    teacherId: '',
  });

  const isSchool = account?.role === 'SCHOOL';
  const isTeacher = account?.role === 'TEACHER';
  const isSuperAdmin = account?.role === 'SUPER_ADMIN';

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
      toast.success('Class created');
      setClassForm({ name: '', academicSession: '', description: '' });
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
      loadClasses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
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

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">
          {isSuperAdmin ? 'All Classes' : 'Classes'}
        </h1>
        <p className="text-primary-100 text-lg">
          {isSuperAdmin ? 'View all classes across all schools' : isTeacher ? 'View classes you are assigned to' : 'Manage classes and teacher assignments'}
        </p>
      </div>
      {isSchool && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Create Class</h2>
            <form className="space-y-3" onSubmit={handleCreateClass}>
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
                  Academic Session
                </label>
                <select
                  name="academicSession"
                  className="input-field"
                  value={classForm.academicSession}
                  onChange={(e) => setClassForm({ ...classForm, academicSession: e.target.value })}
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
                      <option key={session.id} value={session.name}>
                        {session.name} - {dateRange} {status ? `(${status})` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select an active or scheduled session for this class
                </p>
              </div>
              <textarea
                name="description"
                placeholder="Description"
                className="input-field h-24"
                value={classForm.description}
                onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
              />
              <button type="submit" disabled={creating} className="btn-primary w-full">
                {creating ? 'Creating...' : 'Create class'}
              </button>
            </form>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Assign Teacher</h2>
            <form className="space-y-3" onSubmit={handleAssignTeacher}>
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
              <button type="submit" disabled={assigning} className="btn-primary w-full">
                {assigning ? 'Assigning...' : 'Assign teacher'}
              </button>
            </form>
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
                  <div>
                    <p className="font-semibold text-gray-900">{cls.name}</p>
                    <p className="text-sm text-gray-500">{cls.academicSession}</p>
                    <p className="text-sm text-gray-600 mt-2">{cls.description}</p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      cls.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cls.isActive ? 'Active' : 'Inactive'}
                  </span>
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

