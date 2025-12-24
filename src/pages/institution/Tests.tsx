import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { testAPI, sessionAPI, classroomAPI, teacherAPI, customFieldAPI } from '../../services/api';
import { Test, Session, Classroom, Institution, TestCustomField } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Tests() {
  const { account } = useAuthStore();
  const [tests, setTests] = useState<Test[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Institution[]>([]);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [customFields, setCustomFields] = useState<TestCustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDueDate, setTempDueDate] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    testGroup: 'Assignment',
    isTimed: false,
    duration: '',
    dueDate: '',
    passingScore: '',
    maxAttempts: '1',
    allowRetrial: false,
    scoreVisibility: false,
    requiresManualGrading: false,
    sessionId: '',
    classroomId: '',
    teacherId: '',
  });
  const navigate = useNavigate();

  const isSuperAdmin = account?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadTests();
    loadCustomFields();
    if (account && account.role === 'TEACHER') {
      loadTeacherData();
    } else {
    loadSessions();
      if (account && (account.role === 'SCHOOL' || account.role === 'TEACHER' || isSuperAdmin)) {
        loadClassrooms();
      }
      if (account && (account.role === 'SCHOOL' || isSuperAdmin)) {
        loadTeachers();
      }
    }
  }, [account?.role, isSuperAdmin]);

  const loadTeacherData = async () => {
    try {
      const response = await teacherAPI.dashboard();
      console.log('Teacher dashboard response:', response.data);
      
      if (!response?.data) {
        throw new Error('Invalid response from server');
      }
      
      setTeacherData(response.data);
      
      // Set sessions
      if (response.data.sessions && Array.isArray(response.data.sessions) && response.data.sessions.length > 0) {
        setSessions(response.data.sessions);
        
        // Auto-select first session and class for teacher
        const firstSession = response.data.sessions[0];
        // Get classroom from session's class assignments if available
        const selectedClassroomId = firstSession.classAssignments?.[0]?.classroom?.id || '';
        
        setFormData(prev => ({
          ...prev,
          sessionId: firstSession.id,
          classroomId: selectedClassroomId,
        }));
      }
      
      // Set classrooms from assignments
      if (response.data.assignments && Array.isArray(response.data.assignments) && response.data.assignments.length > 0) {
        const classrooms = response.data.assignments
          .map((a: any) => a.classroom)
          .filter((c: any) => c && c.id);
        setClassrooms(classrooms);
        
        // If no session was selected but we have classrooms, select first classroom
        if (!formData.sessionId && classrooms.length > 0) {
          setFormData(prev => ({
            ...prev,
            classroomId: classrooms[0].id,
          }));
        }
      } else {
        // No assignments - set empty array
        setClassrooms([]);
      }
    } catch (error: any) {
      console.error('Failed to load teacher data:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load teacher assignments';
      toast.error(errorMessage);
      // Set empty arrays to prevent UI crashes
      setSessions([]);
      setClassrooms([]);
      setTeacherData(null);
    }
  };

  const loadTests = async () => {
    try {
      const response = await testAPI.getAll();
      setTests(response.data);
    } catch (error: any) {
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await sessionAPI.getAll();
      setSessions(response.data);
    } catch (error: any) {
      console.error('Failed to load sessions');
    }
  };

  const loadCustomFields = async () => {
    try {
      const response = await customFieldAPI.getAll();
      setCustomFields(response.data || []);
    } catch (error: any) {
      console.error('Failed to load custom fields');
    }
  };

  const loadClassrooms = async () => {
    try {
      const response = await classroomAPI.list();
      setClassrooms(response.data);
    } catch (error: any) {
      console.error('Failed to load classrooms');
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await teacherAPI.getAll();
      setTeachers(response.data);
    } catch (error: any) {
      console.error('Failed to load teachers');
    }
  };

  // Get available classrooms for a specific session (used when changing sessions)
  const getAvailableClassroomsForSession = (sessionId: string) => {
    if (!sessionId) return [];
    
    const selectedSession = sessions.find(s => s.id === sessionId);
    
    // For teachers, only show classrooms they're assigned to that are in the selected session
    if (account && account.role === 'TEACHER') {
      if (selectedSession?.classAssignments && selectedSession.classAssignments.length > 0) {
        const sessionClassroomIds = selectedSession.classAssignments.map((ca: any) => ca.classroomId);
        // Filter to only show classrooms the teacher is assigned to
        return classrooms.filter(c => sessionClassroomIds.includes(c.id));
      }
      return [];
    }
    
    // For schools, show all classrooms for the selected session
    if (selectedSession?.classAssignments && selectedSession.classAssignments.length > 0) {
      const sessionClassroomIds = selectedSession.classAssignments.map((ca: any) => ca.classroomId);
      return classrooms.filter(c => sessionClassroomIds.includes(c.id));
    }

    return classrooms;
  };

  // Get available classrooms based on selected session and user role
  const getAvailableClassrooms = () => {
    return getAvailableClassroomsForSession(formData.sessionId);
  };

  const formatDueDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sessionId) {
      toast.error('Please select a session');
      return;
    }

    if (!formData.classroomId) {
      toast.error('Please select a classroom');
      return;
    }

    // Validate duration if test is timed
    if (formData.isTimed && !formData.duration) {
      toast.error('Duration is required when test is timed');
      return;
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].trim() === '')) {
        toast.error(`Custom field "${field.fieldName}" is required`);
        return;
      }
    }

    try {
      const response = await testAPI.create(formData);
      const testId = response.data.test.id;

      // Save custom field values if any
      if (Object.keys(customFieldValues).length > 0) {
        const customFieldData = Object.entries(customFieldValues)
          .filter(([_, value]) => value && value.trim() !== '')
          .map(([fieldId, value]) => ({
            fieldId,
            fieldValue: value,
          }));

        if (customFieldData.length > 0) {
          await customFieldAPI.saveTestFields(testId, { customFieldValues: customFieldData });
        }
      }

      toast.success('Test created successfully');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        testGroup: 'Assignment',
        isTimed: false,
        duration: '',
        dueDate: '',
        passingScore: '',
        maxAttempts: '1',
        allowRetrial: false,
        scoreVisibility: false,
        requiresManualGrading: false,
        sessionId: '',
        classroomId: '',
        teacherId: '',
      });
      setCustomFieldValues({});
      navigate(`/tests/${testId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create test');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading tests...</div>
        </div>
      </div>
    );
  }

  const activeTests = tests.filter(t => t.isActive).length;
  const totalQuestions = tests.reduce((sum, test) => sum + (test.questions?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Tests</h1>
            <p className="text-primary-100 text-lg">Manage and create your assessment tests</p>
          </div>
          <div className="flex space-x-3">
            {account && account.role === 'SCHOOL' && (
            <Link to="/sessions" className="bg-white/20 hover:bg-white/30 text-white font-medium py-2.5 px-6 rounded-lg transition-all backdrop-blur-sm">
              Manage Sessions
            </Link>
            )}
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="bg-white text-primary hover:bg-primary-50 font-semibold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              {showForm ? 'Cancel' : '+ Create New Test'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{tests.length}</div>
            <div className="text-sm text-primary-100 mt-1">Total Tests</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{activeTests}</div>
            <div className="text-sm text-primary-100 mt-1">Active Tests</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{totalQuestions}</div>
            <div className="text-sm text-primary-100 mt-1">Total Questions</div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card border-2 border-primary-200 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Test</h2>
              <p className="text-sm text-gray-500">Fill in the details to create a new assessment</p>
            </div>
          </div>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session <span className="text-red-500">*</span>
                  {account && account.role === 'TEACHER' && sessions.length > 1 && (
                    <span className="text-xs text-gray-500 ml-2">(Your assigned sessions)</span>
                  )}
              </label>
              <select
                className="input-field"
                value={formData.sessionId}
                  onChange={(e) => {
                    const sessionId = e.target.value;
                    const selectedSession = sessions.find(s => s.id === sessionId);
                    // For teachers, auto-select first available classroom from the session
                    let autoSelectedClassroomId = '';
                    if (account && account.role === 'TEACHER' && selectedSession) {
                      const availableClassrooms = getAvailableClassroomsForSession(sessionId);
                      autoSelectedClassroomId = availableClassrooms[0]?.id || '';
                    } else if (selectedSession?.classAssignments?.[0]) {
                      autoSelectedClassroomId = selectedSession.classAssignments[0].classroomId || '';
                    }
                    
                    setFormData({ 
                      ...formData, 
                      sessionId: sessionId,
                      classroomId: autoSelectedClassroomId || ''
                    });
                  }}
                required
                  disabled={sessions.filter((s) => s.isActive).length === 0}
              >
                <option value="">Select a session</option>
                {sessions
                  .filter((s) => s.isActive)
                    .map((session) => {
                      // For teachers, show which classes are in the session
                      const sessionClasses = session.classAssignments?.map((ca: any) => ca.classroom?.name).filter(Boolean).join(', ') || '';
                      return (
                    <option key={session.id} value={session.id}>
                      {session.name}
                          {sessionClasses && ` (${sessionClasses})`}
                    </option>
                      );
                    })}
              </select>
                {sessions.filter((s) => s.isActive).length === 0 && account && account.role !== 'TEACHER' && (
                <p className="text-sm text-red-600 mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  No active sessions. Please{' '}
                  <Link to="/sessions" className="text-primary underline font-medium ml-1">
                    create a session
                  </Link>{' '}
                  first.
                </p>
              )}
                {account && account.role === 'TEACHER' && sessions.filter((s) => s.isActive).length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    No active sessions available for your assigned classes. Please contact your school administrator.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                  {account && account.role === 'TEACHER' && (
                    <span className="text-xs text-gray-500 ml-2">(Your assigned classes)</span>
                  )}
                </label>
                <select
                  className="input-field"
                  value={formData.classroomId}
                  onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                  required
                  disabled={!formData.sessionId || getAvailableClassrooms().length === 0}
                >
                  <option value="">
                    {!formData.sessionId 
                      ? 'Select a session first' 
                      : getAvailableClassrooms().length === 0 
                      ? (account && account.role === 'TEACHER')
                        ? 'No assigned classes available for this session'
                        : 'No classes available'
                      : 'Select a class'}
                  </option>
                  {getAvailableClassrooms().map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                      {classroom.academicSession && ` - ${classroom.academicSession}`}
                    </option>
                  ))}
                </select>
                {formData.sessionId && getAvailableClassrooms().length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    {(account && account.role === 'TEACHER')
                      ? 'You are not assigned to any classes for this session. Please contact your school administrator.'
                      : 'No classes available. Please create classes first.'}
                  </p>
                )}
              </div>
            </div>
            {account?.role === 'SCHOOL' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign to Teacher (Optional)
                </label>
                <select
                  className="input-field"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                >
                  <option value="">No specific teacher (School-owned test)</option>
                  {teachers
                    .filter((teacher) => {
                      // Only show teachers assigned to the selected classroom
                      if (!formData.classroomId) return true;
                      // This would need to be enhanced with assignment data, but for now show all
                      return true;
                    })
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a teacher to assign this test to. The teacher must be assigned to the selected class.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="Enter test title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Group <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={formData.testGroup}
                  onChange={(e) => setFormData({ ...formData, testGroup: e.target.value })}
                  required
                >
                  <option value="Assignment">Assignment</option>
                  <option value="Practice Banks">Practice Banks</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Final Assessment">Final Assessment</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                className="input-field"
                placeholder="Test description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center cursor-pointer group mb-4">
                  <input
                    type="checkbox"
                    checked={formData.isTimed}
                    onChange={(e) => setFormData({ ...formData, isTimed: e.target.checked, duration: e.target.checked ? formData.duration : '' })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Is this test timed?</span>
                </label>
                {formData.isTimed && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration (minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="e.g., 60"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required={formData.isTimed}
                      min="1"
                    />
                  </div>
                )}
                {!formData.isTimed && (
                  <p className="text-xs text-gray-500 mt-1">
                    Students can complete this test anytime before the due date
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Click to select date and time"
                    value={formatDueDate(formData.dueDate)}
                    readOnly
                    onClick={() => {
                      setTempDueDate(formData.dueDate || '');
                      setShowDatePicker(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTempDueDate(formData.dueDate || '');
                      setShowDatePicker(true);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    📅
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  When should students complete this test by?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  placeholder="e.g., 70"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Attempts <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g., 1"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.allowRetrial}
                    onChange={(e) => setFormData({ ...formData, allowRetrial: e.target.checked })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Allow Retrial</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.scoreVisibility}
                    onChange={(e) => setFormData({ ...formData, scoreVisibility: e.target.checked })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 block">Show scores to students after completion</span>
                    <span className="text-xs text-gray-500">Students can see their scores immediately after submitting</span>
                  </div>
                </label>
              </div>
              <div>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.requiresManualGrading}
                    onChange={(e) => setFormData({ ...formData, requiresManualGrading: e.target.checked })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 block">Requires manual grading</span>
                    <span className="text-xs text-gray-500">Enable for short answer questions that need manual review</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="btn-primary"
                disabled={!formData.sessionId}
              >
                Create Test
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tests yet</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first test</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Create Your First Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tests.map((test) => (
            <Link
              key={test.id}
              to={`/tests/${test.id}`}
              className="card-hover group border-2 border-transparent hover:border-primary-200 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{test.title}</h3>
                      <span
                        className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          test.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {test.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  {test.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{test.description}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{test.duration} min</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{test.questions?.length || 0} questions</span>
                </div>
                {test.passingScore && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{test.passingScore}% passing</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium">{test.maxAttempts} attempt{test.maxAttempts !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {test.allowRetrial && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="inline-flex items-center text-xs font-medium text-primary bg-primary-50 px-2.5 py-1 rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retrial Allowed
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Select Due Date & Time</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={tempDueDate}
                  onChange={(e) => setTempDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDatePicker(false);
                    setTempDueDate('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempDueDate) {
                      setFormData({ ...formData, dueDate: tempDueDate });
                    }
                    setShowDatePicker(false);
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-semibold"
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
