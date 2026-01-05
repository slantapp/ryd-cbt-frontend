import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gradingAPI, testAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Test {
  id: string;
  title: string;
}

interface StudentTest {
  id: string;
  studentId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  submittedAt: string;
  score: number | null;
  percentage: number | null;
  manuallyGraded: boolean;
  scoreVisibleToStudent?: boolean;
  attemptNumber: number;
  _count: {
    answers: number;
  };
}

export default function GradeByStudent() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [studentTests, setStudentTests] = useState<StudentTest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'graded'>('all');
  const [activeTab, setActiveTab] = useState<'best' | 'multiple'>('best');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (testId) {
      loadData();
    }
  }, [testId]);

  const loadData = async () => {
    try {
      const [testResponse, gradingResponse] = await Promise.all([
        testAPI.getOne(testId!),
        gradingAPI.getAllStudentTests(testId!),
      ]);
      
      setTest(testResponse.data);
      setStudentTests(gradingResponse.data.studentTests);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  // Get the first ungraded student, or the first student if all are graded
  const getFirstStudentId = () => {
    const ungraded = studentTests.find(st => !st.manuallyGraded);
    return ungraded?.id || studentTests[0]?.id;
  };

  const handleStartGrading = () => {
    // Get first ungraded from filtered results, or first student if all are graded
    const ungraded = filteredStudentTests.find(st => !st.manuallyGraded);
    const firstStudentId = ungraded?.id || filteredStudentTests[0]?.id;
    if (firstStudentId) {
      navigate(`/tests/${testId}/grade/${firstStudentId}`);
    }
  };

  const handleBulkPublish = async () => {
    const gradedButUnpublished = filteredStudentTests.filter(
      st => st.manuallyGraded && st.score !== null && !st.scoreVisibleToStudent
    );

    if (gradedButUnpublished.length === 0) {
      toast.error('No graded tests available to publish');
      return;
    }

    if (!window.confirm(`Publish scores for ${gradedButUnpublished.length} student(s)? They will be able to see their results.`)) {
      return;
    }

    setPublishing(true);
    try {
      const studentTestIds = gradedButUnpublished.map(st => st.id);
      await gradingAPI.bulkReleaseScores(testId!, { studentTestIds });
      toast.success(`Published scores for ${gradedButUnpublished.length} student(s)`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to publish scores');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  const ungradedCount = studentTests.filter(st => !st.manuallyGraded).length;
  const gradedCount = studentTests.filter(st => st.manuallyGraded).length;

  // Group student tests by studentId to find best scores
  const studentTestsByStudent = new Map<string, StudentTest[]>();
  studentTests.forEach(st => {
    const studentId = st.studentId || st.student.id;
    if (!studentTestsByStudent.has(studentId)) {
      studentTestsByStudent.set(studentId, []);
    }
    studentTestsByStudent.get(studentId)!.push(st);
  });

  // Get best scores (highest score per student)
  const bestScores = Array.from(studentTestsByStudent.values()).map(studentScores => {
    return studentScores.reduce((best, current) => {
      const bestScore = best.score || 0;
      const currentScore = current.score || 0;
      if (currentScore > bestScore) return current;
      if (currentScore === bestScore) {
        // If scores are equal, prefer latest attempt
        return (current.attemptNumber || 0) > (best.attemptNumber || 0) ? current : best;
      }
      return best;
    });
  });

  // Get multiple attempts (all attempts that are not the best score)
  const bestScoreIds = new Set(bestScores.map(s => s.id));
  const multipleAttempts = studentTests.filter(st => !bestScoreIds.has(st.id));

  // Filter based on active tab
  const tabFilteredTests = activeTab === 'best' ? bestScores : multipleAttempts;

  // Filter and search students
  const filteredStudentTests = tabFilteredTests.filter((studentTest) => {
    // Search filter - search by name or username
    const fullName = `${studentTest.student.firstName} ${studentTest.student.lastName}`.toLowerCase();
    const username = studentTest.student.username.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      fullName.includes(searchLower) ||
      username.includes(searchLower);
    
    // Status filter
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'pending' && !studentTest.manuallyGraded) ||
      (filterStatus === 'graded' && studentTest.manuallyGraded);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <Link to={`/tests/${testId}/grade/select-mode`} className="text-primary-100 hover:text-white mb-2 inline-block">
              ← Back to Mode Selection
            </Link>
            <h1 className="text-4xl font-bold mb-2">Grade by Student</h1>
            <p className="text-primary-100 text-lg">{test?.title}</p>
            <p className="text-primary-100 text-sm mt-2">
              {ungradedCount} to grade • {gradedCount} completed
            </p>
          </div>
          {studentTests.length > 0 && (
            <button
              onClick={handleStartGrading}
              className="bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-6 rounded-lg transition-all"
            >
              {ungradedCount > 0 ? `Start Grading (${ungradedCount} remaining)` : 'Review Graded Tests'}
            </button>
          )}
        </div>
      </div>

      {/* Student List */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Students ({studentTests.length})
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Showing {filteredStudentTests.length} of {studentTests.length} students
            </div>
            {filteredStudentTests.filter(st => st.manuallyGraded && st.score !== null && !st.scoreVisibleToStudent).length > 0 && (
              <button
                onClick={handleBulkPublish}
                disabled={publishing}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                title="Publish scores for all graded students"
              >
                {publishing ? 'Publishing...' : `📢 Publish All (${filteredStudentTests.filter(st => st.manuallyGraded && st.score !== null && !st.scoreVisibleToStudent).length})`}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('best')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'best'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Best Scores ({bestScores.length})
            </button>
            <button
              onClick={() => setActiveTab('multiple')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'multiple'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Multiple Attempts ({multipleAttempts.length})
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <input
              type="text"
              placeholder="Search by student name or username..."
              className="input-field w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <div className="flex space-x-3">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({tabFilteredTests.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({tabFilteredTests.filter(st => !st.manuallyGraded).length})
              </button>
              <button
                onClick={() => setFilterStatus('graded')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'graded'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Graded ({tabFilteredTests.filter(st => st.manuallyGraded).length})
              </button>
            </div>
          </div>
        </div>

        {studentTests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600 text-lg">No students have submitted this test yet.</p>
          </div>
        ) : filteredStudentTests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-600 text-lg">No students found matching your search/filter criteria.</p>
            {(searchQuery || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="mt-4 text-primary hover:text-primary-600 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudentTests.map((studentTest) => (
                  <tr key={studentTest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {studentTest.student.firstName} {studentTest.student.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {studentTest.student.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(studentTest.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {studentTest.manuallyGraded ? (
                        <div className="flex flex-col space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Graded
                          </span>
                          {studentTest.scoreVisibleToStudent ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📢 Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Not Published
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {studentTest.score !== null ? (
                        <span>
                          {studentTest.score.toFixed(1)} / {studentTest.percentage?.toFixed(1)}%
                          {studentTest.attemptNumber && studentTest.attemptNumber > 1 && (
                            <span className="text-xs text-gray-500 ml-1">(Attempt {studentTest.attemptNumber})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/tests/${testId}/grade/${studentTest.id}`)}
                        className="text-primary hover:text-primary-600 font-medium"
                      >
                        {studentTest.manuallyGraded ? 'Review →' : 'Grade →'}
                      </button>
                    </td>
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

