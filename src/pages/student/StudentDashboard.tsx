import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentAPI, publicAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { account } = useAuthStore();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account?.role === 'STUDENT') {
      loadTests();
    }
  }, [account]);

  const loadTests = async () => {
    try {
      setLoading(true);
      const { data } = await studentAPI.getMyTests();
      setTests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Load tests error:', error);
      toast.error(error?.response?.data?.error || 'Failed to load tests');
      setTests([]); // Set empty array on error
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
      return {
        status: 'completed',
        label: studentTest.isPassed ? '✓ Passed' : '✗ Failed',
        color: studentTest.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        score: studentTest.percentage || 0,
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

  const availableTests = Array.isArray(tests) ? tests.filter(t => t && canTakeTest(t)) : [];
  const completedTests = Array.isArray(tests) ? tests.filter(t => {
    if (!t) return false;
    const status = getTestStatus(t);
    return status.status === 'completed';
  }) : [];

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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="text-3xl font-bold text-blue-600 mb-1">{tests.length}</div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="text-3xl font-bold text-green-600 mb-1">{availableTests.length}</div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-1">{completedTests.length}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Available Tests */}
      {availableTests.length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Available Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTests.map((test) => {
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
        </div>
      )}

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Completed Tests</h2>
          <div className="space-y-4">
            {completedTests.map((test) => {
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
                    {studentTest?.submittedAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted: {format(new Date(studentTest.submittedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                  <Link
                    to={getResultUrl(test)}
                    className="btn-secondary text-sm"
                  >
                    View Results
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
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

