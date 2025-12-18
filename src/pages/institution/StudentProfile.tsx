import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { studentAPI, sessionAPI, classroomAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: '',
  });
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    classroomId: '',
    sessionId: '',
  });

  const isTeacher = account?.role === 'TEACHER';
  const isSchool = account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN';

  useEffect(() => {
    if (id) {
      loadStudent();
      if (isSchool) {
        loadSessions();
        loadClassrooms();
      }
    }
  }, [id, isSchool]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const { data } = await studentAPI.getById(id!);
      setStudent(data);
      // Initialize edit form with student data
      setEditForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load student');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (username: string) => {
    if (!username || username.trim().length === 0) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    // If username hasn't changed, it's available
    if (username === student?.username) {
      setUsernameStatus({ checking: false, available: true, message: 'Current username' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });

    try {
      const { data } = await studentAPI.checkUsernameAvailability(username, student?.id);
      setUsernameStatus({
        checking: false,
        available: data.available,
        message: data.available ? 'Username is available' : 'Username is already taken',
      });
    } catch (error: any) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Error checking username availability',
      });
    }
  };

  // Debounce username checking
  useEffect(() => {
    if (!isEditing || !student) return;

    const timeoutId = setTimeout(() => {
      if (editForm.username && editForm.username !== student.username) {
        checkUsername(editForm.username);
      } else if (editForm.username === student.username) {
        setUsernameStatus({ checking: false, available: true, message: 'Current username' });
      } else {
        setUsernameStatus({ checking: false, available: null, message: '' });
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.username, isEditing, student?.id, student?.username]);

  const handleUpdateStudent = async () => {
    if (!student) return;

    // Check if username is available before saving
    if (editForm.username !== student.username) {
      if (usernameStatus.available === false) {
        toast.error('Please choose an available username before saving');
        return;
      }
      if (usernameStatus.checking) {
        toast.error('Please wait for username availability check to complete');
        return;
      }
      if (usernameStatus.available === null) {
        // Force check before saving
        await checkUsername(editForm.username);
        if (usernameStatus.available === false) {
          toast.error('Username is not available. Please choose a different username');
          return;
        }
      }
    }

    setUpdating(true);
    try {
      await studentAPI.update(student.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        username: editForm.username,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        dateOfBirth: editForm.dateOfBirth || undefined,
      });
      toast.success('Student information updated successfully');
      setIsEditing(false);
      setUsernameStatus({ checking: false, available: null, message: '' });
      loadStudent();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update student');
    } finally {
      setUpdating(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await sessionAPI.getAll();
      setSessions(data);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadClassrooms = async () => {
    try {
      const { data } = await classroomAPI.list();
      setClassrooms(data);
    } catch (error: any) {
      console.error('Failed to load classrooms:', error);
    }
  };

  const handleAssignStudent = async () => {
    if (!assignForm.studentId || !assignForm.classroomId || !assignForm.sessionId) {
      toast.error('Please select class and session');
      return;
    }

    const currentAssignment = student?.classAssignments?.[0];
    const isReassigning = currentAssignment && 
      (currentAssignment.classroomId !== assignForm.classroomId || 
       currentAssignment.sessionId !== assignForm.sessionId);

    if (isReassigning) {
      const currentClass = classrooms.find((c) => c.id === currentAssignment.classroomId);
      const currentSession = sessions.find((s) => s.id === currentAssignment.sessionId);
      const newClass = classrooms.find((c) => c.id === assignForm.classroomId);
      const newSession = sessions.find((s) => s.id === assignForm.sessionId);

      const confirmMessage = `This student is currently assigned to:\n` +
        `Class: ${currentClass?.name || 'Unknown'}\n` +
        `Session: ${currentSession?.name || 'Unknown'}\n\n` +
        `You are about to reassign them to:\n` +
        `Class: ${newClass?.name || 'Unknown'}\n` +
        `Session: ${newSession?.name || 'Unknown'}\n\n` +
        `This will automatically unassign them from their current class. Continue?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setUpdating(true);
    try {
      await studentAPI.assignToClass(assignForm);
      toast.success(isReassigning ? 'Student reassigned successfully' : 'Student assigned to class successfully');
      setShowAssignDialog(false);
      setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
      loadStudent();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign student');
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePromotion = async () => {
    if (!student) return;

    setUpdating(true);
    try {
      await studentAPI.markForPromotion({
        studentId: student.id,
        markForPromotion: !student.markedForPromotion,
      });
      toast.success(
        student.markedForPromotion
          ? 'Promotion mark removed'
          : 'Student marked for promotion'
      );
      loadStudent();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update promotion status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading student profile...</div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Student not found</p>
        <Link to="/students" className="text-primary hover:underline mt-2 inline-block">
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <Link
            to="/students"
            className="text-blue-100 hover:text-white mb-2 inline-block text-sm"
          >
            ← Back to Students
          </Link>
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold backdrop-blur-sm">
              {student.firstName?.[0] || ''}{student.lastName?.[0] || ''}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-blue-100 text-lg">@{student.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {student.studentTests?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Tests Taken</div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {student.classAssignments?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Class Assignments</div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {student.isAssigned ? '✓' : '✗'}
          </div>
          <div className="text-sm text-gray-600">Assignment Status</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Student Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Personal Information</h2>
              {isSchool && (
                <button
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                      // Reset form to original values
                      setEditForm({
                        firstName: student.firstName || '',
                        lastName: student.lastName || '',
                        username: student.username || '',
                        email: student.email || '',
                        phone: student.phone || '',
                        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
                      });
                      setUsernameStatus({ checking: false, available: null, message: '' });
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title={isEditing ? "Cancel editing" : "Edit student information"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isEditing ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    )}
                  </svg>
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Username *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className={`input-field pr-10 ${
                          usernameStatus.available === false
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : usernameStatus.available === true
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                            : ''
                        }`}
                        value={editForm.username}
                        onChange={(e) => {
                          setEditForm({ ...editForm, username: e.target.value });
                          setUsernameStatus({ checking: false, available: null, message: '' });
                        }}
                        required
                      />
                      {editForm.username && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameStatus.checking ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          ) : usernameStatus.available === true ? (
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : usernameStatus.available === false ? (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {usernameStatus.message && (
                      <p
                        className={`text-xs mt-1 ${
                          usernameStatus.available === false
                            ? 'text-red-600'
                            : usernameStatus.available === true
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {usernameStatus.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateStudent}
                    disabled={updating}
                    className="btn-primary disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        firstName: student.firstName || '',
                        lastName: student.lastName || '',
                        username: student.username || '',
                        email: student.email || '',
                        phone: student.phone || '',
                        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
                      });
                      setUsernameStatus({ checking: false, available: null, message: '' });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    First Name
                  </label>
                  <p className="text-gray-900">{student.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Last Name
                  </label>
                  <p className="text-gray-900">{student.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Username
                  </label>
                  <p className="text-gray-900">@{student.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{student.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone
                  </label>
                  <p className="text-gray-900">{student.phone || '-'}</p>
                </div>
                {student.dateOfBirth && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <p className="text-gray-900">
                      {format(new Date(student.dateOfBirth), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Class Assignments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Class Assignments</h2>
              {isSchool && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (!student) return;
                      const currentAssignment = student.classAssignments?.[0];
                      setAssignForm({
                        studentId: student.id,
                        classroomId: currentAssignment?.classroomId || '',
                        sessionId: currentAssignment?.sessionId || '',
                      });
                      setShowAssignDialog(true);
                    }}
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                    title={student.isAssigned ? "Reassign student to a different class" : "Assign student to a class"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {student.isAssigned && (
                    <button
                      onClick={async () => {
                        const currentAssignment = student.classAssignments?.[0];
                        if (!currentAssignment) {
                          toast.error('Student is not assigned to any class');
                          return;
                        }

                        const confirmMessage = `Are you sure you want to unassign this student from:\n` +
                          `Class: ${currentAssignment.classroom?.name || 'Unknown'}\n` +
                          `Session: ${currentAssignment.session?.name || 'Unknown'}\n\n` +
                          `They will be moved to the unassigned pool.`;

                        if (!window.confirm(confirmMessage)) {
                          return;
                        }

                        setUpdating(true);
                        try {
                          await studentAPI.unassignFromClass({ studentId: student.id });
                          toast.success('Student unassigned successfully');
                          loadStudent();
                        } catch (error: any) {
                          toast.error(error?.response?.data?.error || 'Failed to unassign student');
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Unassign student from current class"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            {student.classAssignments && student.classAssignments.length > 0 ? (
              <div className="space-y-4">
                {student.classAssignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {assignment.classroom?.name}
                        </h3>
                        <p className="text-sm text-gray-600">{assignment.session?.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned: {format(new Date(assignment.assignedAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {isSchool && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to remove this student from this class?')) {
                              try {
                                await studentAPI.unassignFromClass({ studentId: student.id });
                                toast.success('Student removed from class');
                                loadStudent();
                              } catch (error: any) {
                                toast.error(error?.response?.data?.error || 'Failed to remove student from class');
                              }
                            }
                          }}
                          className="ml-4 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          title="Remove from class"
                        >
                          ❌ Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No class assignments yet</p>
            )}
          </div>

          {/* Recent Tests */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Recent Tests</h2>
            {student.studentTests && student.studentTests.length > 0 ? (
              <div className="space-y-3">
                {student.studentTests.map((test: any) => (
                  <div
                    key={test.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{test.test?.title}</h3>
                        <p className="text-sm text-gray-600">
                          Status: <span className="capitalize">{test.status}</span>
                        </p>
                        {test.score !== null && (
                          <p className="text-sm text-gray-600">
                            Score: {test.score}% {test.isPassed ? '✓ Passed' : '✗ Failed'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No tests taken yet</p>
            )}
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Login Credentials */}
          {(isSchool || isTeacher) && (
            <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Credentials</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Username
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900 flex-1">
                      {student.username}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(student.username);
                        toast.success('Username copied to clipboard!');
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      title="Copy username"
                    >
                      📋
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Login URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-900 flex-1 truncate">
                      {window.location.origin}/student/login
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/student/login`);
                        toast.success('Login URL copied to clipboard!');
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      title="Copy login URL"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Students login using their <strong>username</strong> and password.
                    {student.mustResetPassword && (
                      <span className="block mt-1">
                        This student must reset their password on first login.
                      </span>
                    )}
                  </p>
                </div>

                {isSchool && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Reset this student\'s password? A new password will be generated and sent via email if the student has an email address.')) {
                        return;
                      }
                      const newPassword = prompt('Enter new password (min 6 characters):');
                      if (!newPassword || newPassword.length < 6) {
                        toast.error('Password must be at least 6 characters');
                        return;
                      }
                      setUpdating(true);
                      try {
                        const response = await studentAPI.resetPassword({
                          studentId: student.id,
                          newPassword,
                          forceReset: true,
                        });
                        const message = response.data.emailSent 
                          ? 'Password reset successfully! The new password has been sent to the student\'s email.'
                          : 'Password reset successfully! Note: Email not sent (student has no email address).';
                        toast.success(message);
                        loadStudent();
                      } catch (error: any) {
                        toast.error(error?.response?.data?.error || 'Failed to reset password');
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
                  >
                    {updating ? 'Resetting...' : 'Reset Password'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Promotion Status */}
          {isTeacher && (
            <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Promotion</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Mark for Promotion</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={student.markedForPromotion || false}
                      onChange={handleTogglePromotion}
                      disabled={updating}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {student.markedForPromotion && (
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <p className="text-xs text-purple-800">
                      ✓ This student is marked for promotion. An administrator will process the
                      promotion.
                    </p>
                  </div>
                )}
                {student.promotedAt && (
                  <div className="p-3 bg-green-100 rounded-lg">
                    <p className="text-xs text-green-800">
                      Promoted on: {format(new Date(student.promotedAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Card */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Assignment Status</span>
                {student.isAssigned ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    ✓ Assigned
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                    Unassigned
                  </span>
                )}
              </div>
              {student.markedForPromotion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Promotion Status</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                    🎓 Marked for Promotion
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* School Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">School</h3>
            <p className="text-gray-700">{student.institution?.name}</p>
          </div>
        </div>
      </div>

      {/* Assign Dialog */}
      {showAssignDialog && student && (() => {
        const currentAssignment = student.classAssignments?.[0];
        const currentClass = currentAssignment ? classrooms.find((c) => c.id === currentAssignment.classroomId) : null;
        const currentSession = currentAssignment ? sessions.find((s) => s.id === currentAssignment.sessionId) : null;
        const isReassigning = currentAssignment && 
          assignForm.classroomId && assignForm.sessionId &&
          (currentAssignment.classroomId !== assignForm.classroomId || 
           currentAssignment.sessionId !== assignForm.sessionId);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">
                {currentAssignment ? 'Reassign Student to Class' : 'Assign Student to Class'}
              </h2>
              
              {currentAssignment && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Current Assignment:</p>
                  <p className="text-sm text-yellow-700">
                    <strong>Class:</strong> {currentClass?.name || 'Unknown'} | 
                    <strong> Session:</strong> {currentSession?.name || 'Unknown'}
                  </p>
                </div>
              )}

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> A student can only belong to one class at a time. 
                  {currentAssignment ? ' Reassigning will automatically unassign from the current class.' : ' Assigning to a new class will automatically unassign from any previous class.'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Session</label>
                  <select
                    className="input-field"
                    value={assignForm.sessionId}
                    onChange={(e) => setAssignForm({ ...assignForm, sessionId: e.target.value })}
                  >
                    <option value="">Choose a session...</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                  <select
                    className="input-field"
                    value={assignForm.classroomId}
                    onChange={(e) => setAssignForm({ ...assignForm, classroomId: e.target.value })}
                  >
                    <option value="">Choose a class...</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isReassigning && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    ⚠️ <strong>Warning:</strong> You are about to reassign this student. 
                    A confirmation dialog will appear before proceeding.
                  </p>
                </div>
              )}

              <div className="flex space-x-2 mt-6">
                <button 
                  onClick={handleAssignStudent} 
                  disabled={updating}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {updating ? 'Processing...' : (currentAssignment ? 'Reassign' : 'Assign')}
                </button>
                <button
                  onClick={() => {
                    setShowAssignDialog(false);
                    setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

