import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentAPI, publicAPI, testGroupAPI, subjectAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { account } = useAuthStore();
  const [tests, setTests] = useState<any[]>([]);
  const [studentClass, setStudentClass] = useState<{ id: string; name: string; sessionId?: string; sessionName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'completed' | 'missed'>('available');
  const [filterSessionId, setFilterSessionId] = useState<string>('');
  const [filterClassroomId, setFilterClassroomId] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterTestGroupId, setFilterTestGroupId] = useState<string>('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [testGroups, setTestGroups] = useState<any[]>([]);
  const [sortByDueDate, setSortByDueDate] = useState<boolean>(true);

  useEffect(() => {
    if (account?.role === 'STUDENT') {
      loadTests();
      loadSubjects();
      loadTestGroups();
    }
  }, [account]);

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      setSubjects(response.data || []);
    } catch (error: any) {
      console.error('Failed to load subjects');
    }
  };

  const loadTestGroups = async () => {
    try {
      const response = await testGroupAPI.getAll();
      setTestGroups(response.data || []);
    } catch (error: any) {
      console.error('Failed to load test groups');
    }
  };

  const loadTests = async () => {
    try {
      setLoading(true);
      const { data } = await studentAPI.getMyTests();
      // Handle both old format (array) and new format (object with tests and studentClass)
      if (Array.isArray(data)) {
        setTests(data);
        setStudentClass(null);
      } else if (data && data.tests) {
        setTests(Array.isArray(data.tests) ? data.tests : []);
        setStudentClass(data.studentClass || null);
      } else {
        setTests([]);
        setStudentClass(null);
      }
    } catch (error: any) {
      console.error('Load tests error:', error);
      toast.error(error?.response?.data?.error || 'Failed to load tests');
      setTests([]); // Set empty array on error
      setStudentClass(null);
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test: any) => {
    if (!test) return { status: 'available', label: 'Available', color: 'bg-green-100 text-green-800' };
    
    const studentTest = test.studentTests?.[0];
    if (!studentTest) {
      return { status: 'available', label: 'Available', color: 'bg-green-100 text-green-800' };
    }
    
    if (studentTest.status === 'submitted' || studentTest.status === 'graded') {
      // Only show score if it's visible to the student
      const isScoreVisible = studentTest.scoreVisibleToStudent === true;
      
      return {
        status: 'completed',
        label: isScoreVisible 
          ? (studentTest.isPassed ? '✓ Passed' : '✗ Failed')
          : 'Completed',
        color: isScoreVisible
          ? (studentTest.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
          : 'bg-gray-100 text-gray-800',
        score: isScoreVisible ? (studentTest.percentage || 0) : undefined,
      };
    }
    
    if (studentTest.status === 'in_progress') {
      return { status: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    return { status: 'available', label: 'Available', color: 'bg-blue-100 text-blue-800' };
  };

  const canTakeTest = (test: any) => {
    if (!test) return false;
    
    const studentTest = test.studentTests?.[0];
    if (!studentTest) return true;
    
    // Can retake if test allows retrial and hasn't exceeded max attempts
    if (test.allowRetrial && studentTest.attemptNumber < (test.maxAttempts || 1)) {
      return true;
    }
    
    // Can take if status is pending
    return studentTest.status === 'pending';
  };

  const isMissedTest = (test: any) => {
    if (!test) return false;
    
    // Check if test has a due date that has passed
    if (test.dueDate) {
      const dueDate = new Date(test.dueDate);
      const now = new Date();
      if (dueDate < now) {
        // Check if test is not completed
        const studentTest = test.studentTests?.[0];
        if (!studentTest || (studentTest.status !== 'submitted' && studentTest.status !== 'graded')) {
          return true;
        }
      }
    }
    
    return false;
  };

  const getTestUrl = (test: any) => {
    if (!test?.id) return '#';
    // For authenticated students, use a route that doesn't require slug
    return `/student/test/${test.id}`;
  };

  const getResultUrl = (test: any) => {
    if (!test?.id) return '#';
    const studentTest = test.studentTests?.[0];
    if (!studentTest?.id) return '#';
    return `/student/test/${test.id}/result?studentTestId=${studentTest.id}`;
  };

  const getReviewUrl = (test: any) => {
    if (!test?.id) return '#';
    return `/student/test/${test.id}/review`;
  };

  const getDueDateInfo = (test: any) => {
    if (!test?.dueDate) return null;
    
    const dueDate = new Date(test.dueDate);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    const isPastDue = diffMs < 0;
    const isUrgent = diffHours <= 24 && diffHours > 0;
    const isVeryUrgent = diffHours <= 12 && diffHours > 0;
    
    let colorClass = 'text-gray-600';
    if (isPastDue) {
      colorClass = 'text-red-600 font-semibold';
    } else if (isVeryUrgent) {
      colorClass = 'text-red-600 font-semibold';
    } else if (isUrgent) {
      colorClass = 'text-orange-600 font-semibold';
    }
    
    return {
      date: dueDate,
      formatted: format(dueDate, 'MMM dd, yyyy HH:mm'),
      isPastDue,
      isUrgent,
      colorClass,
      diffDays: Math.ceil(diffDays),
      diffHours: Math.ceil(diffHours),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading your tests...</div>
        </div>
      </div>
    );
  }

  // Extract unique sessions and classrooms from tests
  const sessionsMap = new Map<string, any>();
  tests.forEach(t => {
    (t.sessions || []).forEach((ts: any) => {
      if (ts.session?.id && !sessionsMap.has(ts.session.id)) {
        sessionsMap.set(ts.session.id, ts.session);
      }
    });
  });
  const sessions = Array.from(sessionsMap.values());

  const classroomsMap = new Map<string, any>();
  tests.forEach(t => {
    (t.classrooms || []).forEach((tc: any) => {
      if (tc.classroom?.id && !classroomsMap.has(tc.classroom.id)) {
        classroomsMap.set(tc.classroom.id, tc.classroom);
      }
    });
  });
  const classrooms = Array.from(classroomsMap.values());

  // Filter tests based on active tab
  let filteredTests = Array.isArray(tests) ? tests.filter(t => t) : [];
  
  if (activeTab === 'available') {
    filteredTests = filteredTests.filter(t => canTakeTest(t));
  } else if (activeTab === 'completed') {
    filteredTests = filteredTests.filter(t => {
      const status = getTestStatus(t);
      return status.status === 'completed';
    });
  } else if (activeTab === 'missed') {
    filteredTests = filteredTests.filter(t => isMissedTest(t));
  }

  // Apply session filter
  if (filterSessionId) {
    filteredTests = filteredTests.filter(t => 
      t.sessions?.some((ts: any) => ts.session?.id === filterSessionId)
    );
  }

  // Apply classroom filter
  if (filterClassroomId) {
    filteredTests = filteredTests.filter(t => 
      t.classrooms?.some((tc: any) => tc.classroom?.id === filterClassroomId)
    );
  }

  // Apply subject filter
  if (filterSubjectId) {
    filteredTests = filteredTests.filter(t => 
      (t as any).subjectId === filterSubjectId
    );
  }

  // Apply test group filter
  if (filterTestGroupId) {
    filteredTests = filteredTests.filter(t => 
      (t as any).testGroupId === filterTestGroupId
    );
  }

  // Sort by due date (closest to farthest) for available tests
  if (activeTab === 'available' && sortByDueDate) {
    filteredTests = [...filteredTests].sort((a, b) => {
      const aDueDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDueDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      // Sort: tests with due dates first (closest first), then tests without due dates
      if (aDueDate === Infinity && bDueDate === Infinity) return 0;
      if (aDueDate === Infinity) return 1;
      if (bDueDate === Infinity) return -1;
      return aDueDate - bDueDate;
    });
  }

  const availableTests = Array.isArray(tests) ? tests.filter(t => t && canTakeTest(t)) : [];
  const completedTests = Array.isArray(tests) ? tests.filter(t => {
    if (!t) return false;
    const status = getTestStatus(t);
    return status.status === 'completed';
  }) : [];
  const missedTests = Array.isArray(tests) ? tests.filter(t => t && isMissedTest(t)) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            Welcome, {account?.firstName || account?.name || 'Student'}! 👋
          </h1>
          <p className="text-blue-100 text-lg">View and take your assigned tests</p>
          {studentClass && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-semibold">Class: {studentClass.name}</span>
              {studentClass.sessionName && (
                <span className="text-blue-100">• {studentClass.sessionName}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`card bg-gradient-to-br from-green-50 to-green-100 border-2 transition-all hover:shadow-lg cursor-pointer ${
            activeTab === 'available' ? 'border-green-400 ring-2 ring-green-300' : 'border-green-200'
          }`}
        >
          <div className="text-3xl font-bold text-green-600 mb-1">{availableTests.length}</div>
          <div className="text-sm text-gray-600">Available Test</div>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`card bg-gradient-to-br from-purple-50 to-purple-100 border-2 transition-all hover:shadow-lg cursor-pointer ${
            activeTab === 'completed' ? 'border-purple-400 ring-2 ring-purple-300' : 'border-purple-200'
          }`}
        >
          <div className="text-3xl font-bold text-purple-600 mb-1">{completedTests.length}</div>
          <div className="text-sm text-gray-600">Completed Test</div>
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          className={`card bg-gradient-to-br from-red-50 to-red-100 border-2 transition-all hover:shadow-lg cursor-pointer ${
            activeTab === 'missed' ? 'border-red-400 ring-2 ring-red-300' : 'border-red-200'
          }`}
        >
          <div className="text-3xl font-bold text-red-600 mb-1">{missedTests.length}</div>
          <div className="text-sm text-gray-600">Missed Test</div>
        </button>
      </div>

      {/* Filters and Sort */}
      {(sessions.length > 0 || classrooms.length > 0 || subjects.length > 0 || testGroups.length > 0 || activeTab === 'available') && (
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {sessions.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter by Session
                  </label>
                  <select
                    value={filterSessionId}
                    onChange={(e) => setFilterSessionId(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">All Sessions</option>
                    {sessions.map((session: any) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {classrooms.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter by Class
                  </label>
                  <select
                    value={filterClassroomId}
                    onChange={(e) => setFilterClassroomId(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">All Classes</option>
                    {classrooms.map((classroom: any) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {subjects.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter by Subject
                  </label>
                  <select
                    value={filterSubjectId}
                    onChange={(e) => setFilterSubjectId(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">All Subjects</option>
                    {subjects.filter(s => s.isActive).map((subject: any) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {testGroups.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter by Test Group
                  </label>
                  <select
                    value={filterTestGroupId}
                    onChange={(e) => setFilterTestGroupId(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">All Test Groups</option>
                    {testGroups.filter(tg => tg.isActive).map((testGroup: any) => (
                      <option key={testGroup.id} value={testGroup.id}>
                        {testGroup.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {activeTab === 'available' && (
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sortByDueDate}
                    onChange={(e) => setSortByDueDate(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary mr-2"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Sort by Due Date (Closest First)
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tests Display */}
      {filteredTests.length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">
            {activeTab === 'available' && 'Available Tests'}
            {activeTab === 'completed' && 'Completed Tests'}
            {activeTab === 'missed' && 'Missed Tests'}
          </h2>
          {activeTab === 'available' || activeTab === 'missed' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => {
              const status = getTestStatus(test);
              const testUrl = getTestUrl(test);
              
              return (
                <div
                  key={test.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {test.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  {test.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {test.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">❓</span>
                      {test._count?.questions || test.questions?.length || 0} questions
                    </div>
                    {test.isTimed && test.duration && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">⏱️</span>
                        {test.duration} minutes
                      </div>
                    )}
                    {test.passingScore && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">🎯</span>
                        Passing: {test.passingScore}%
                      </div>
                    )}
                    {(() => {
                      const dueDateInfo = getDueDateInfo(test);
                      if (!dueDateInfo) return null;
                      return (
                        <div className={`flex items-center text-sm ${dueDateInfo.colorClass}`}>
                          <span className="mr-2">📅</span>
                          Due: {dueDateInfo.formatted}
                          {dueDateInfo.isPastDue && (
                            <span className="ml-2 text-xs font-semibold">(Overdue)</span>
                          )}
                          {dueDateInfo.isUrgent && !dueDateInfo.isPastDue && (
                            <span className="ml-2 text-xs font-semibold">
                              ({dueDateInfo.diffHours <= 1 
                                ? 'Less than 1 hour left' 
                                : `${dueDateInfo.diffHours} hours left`})
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {test.studentTests?.[0]?.status === 'in_progress' ? (
                    <Link
                      to={testUrl}
                      className="block w-full btn-primary text-center"
                    >
                      Continue Test
                    </Link>
                  ) : (
                    <Link
                      to={testUrl}
                      className="block w-full btn-primary text-center"
                    >
                      {test.studentTests?.[0] ? 'Retake Test' : 'Start Test'}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test) => {
              const status = getTestStatus(test);
              const studentTest = test.studentTests?.[0];
              const testUrl = getTestUrl(test);
              
              return (
                <div
                  key={test.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                      {status.score !== undefined && (
                        <span className="text-sm font-semibold text-gray-700">
                          Score: {status.score.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                    {studentTest?.submittedAt && (
                        <p className="text-sm text-gray-500">
                        Submitted: {format(new Date(studentTest.submittedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                      {(() => {
                        const dueDateInfo = getDueDateInfo(test);
                        if (!dueDateInfo) return null;
                        return (
                          <p className={`text-sm ${dueDateInfo.colorClass}`}>
                            Due: {dueDateInfo.formatted}
                            {dueDateInfo.isPastDue && (
                              <span className="ml-1 font-semibold">(Overdue)</span>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={getReviewUrl(test)}
                      className="btn-primary text-sm"
                    >
                      Review Test
                    </Link>
                  <Link
                    to={getResultUrl(test)}
                    className="btn-secondary text-sm"
                  >
                    View Results
                  </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* Empty State */}
      {filteredTests.length === 0 && tests.length > 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 text-lg mb-2">No tests found</p>
          <p className="text-gray-500">
            {(filterSessionId || filterClassroomId || filterSubjectId || filterTestGroupId)
              ? 'Try adjusting your filters to see more tests.'
              : `No ${activeTab === 'available' ? 'available' : activeTab === 'completed' ? 'completed' : ''} tests at the moment.`}
          </p>
          {(filterSessionId || filterClassroomId || filterSubjectId || filterTestGroupId) && (
            <button
              onClick={() => {
                setFilterSessionId('');
                setFilterClassroomId('');
                setFilterSubjectId('');
                setFilterTestGroupId('');
              }}
              className="mt-4 btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {tests.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600 text-lg mb-2">No tests available</p>
          <p className="text-gray-500">
            Your teacher will assign tests to your class. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}

