import { useEffect, useState } from 'react';
import { classroomAPI, teacherAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Classes() {
  const { account } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
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

  useEffect(() => {
    loadClasses();
    if (isSchool) {
      loadTeachers();
    }
  }, [account?.role]);

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

  if (!isSchool && !isTeacher) {
    return <p className="text-center text-gray-500">Classes are only visible to schools and teachers.</p>;
  }

  return (
    <div className="space-y-8">
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
              <input
                name="academicSession"
                placeholder="Academic session (ex: 2025 Spring)"
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

