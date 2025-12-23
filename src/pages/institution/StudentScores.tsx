import { useEffect, useState } from 'react';
import { studentAPI, gradingAPI, sessionAPI, classroomAPI } from '../../services/api';
import { StudentTest } from '../../types';
import toast from 'react-hot-toast';

export default function StudentScores() {
  const [scores, setScores] = useState<StudentTest[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'in_progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  useEffect(() => {
    loadSessions();
    loadClassrooms();
    loadScores(); // Load scores on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reload scores when filters change
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, selectedClassroomId]);

  const loadSessions = async () => {
    try {
      const { data } = await sessionAPI.getAll();
      setSessions(data || []);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      setSessions([]); // Set empty array on error
    }
  };

  const loadClassrooms = async () => {
    try {
      const { data } = await classroomAPI.list();
      setClassrooms(data || []);
    } catch (error: any) {
      console.error('Failed to load classrooms:', error);
      setClassrooms([]); // Set empty array on error
    }
  };

  const loadScores = async () => {
    try {
      setLoading(true);
      const params: { sessionId?: string; classroomId?: string } = {};
      if (selectedSessionId) {
        params.sessionId = selectedSessionId;
      }
      if (selectedClassroomId) {
        params.classroomId = selectedClassroomId;
      }
      const response = await studentAPI.getScores(Object.keys(params).length > 0 ? params : undefined);
      setScores(response.data || []);
    } catch (error: any) {
      console.error('Load scores error:', error);
      toast.error(error?.response?.data?.error || 'Failed to load scores');
      setScores([]); // Set empty array on error to prevent crashes
    } finally {
      setLoading(false);
    }
  };

  const handleGrantRetrial = async (studentTestId: string) => {
    if (!confirm('Are you sure you want to grant a retrial to this student?')) {
      return;
    }
    try {
      await studentAPI.grantRetrial(studentTestId);
      toast.success('Retrial granted successfully');
      loadScores();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to grant retrial');
    }
  };

  const handleReleaseScore = async (studentTestId: string) => {
    try {
      await gradingAPI.releaseScore(studentTestId);
      toast.success('Score released to student');
      loadScores();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to release score');
    }
  };

  const handleHideScore = async (studentTestId: string) => {
    if (!confirm('Hide this score from the student?')) {
      return;
    }
    try {
      await gradingAPI.hideScore(studentTestId);
      toast.success('Score hidden from student');
      loadScores();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to hide score');
    }
  };

  const filteredScores = scores.filter((score) => {
    // Apply status filter
    let matchesFilter = true;
    if (filter === 'passed') matchesFilter = score.isPassed === true;
    else if (filter === 'failed') matchesFilter = score.isPassed === false;
    else if (filter === 'in_progress') matchesFilter = score.status === 'in_progress';

    // Apply search query
    if (!matchesFilter) return false;
    
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const studentName = score.student ? `${score.student.firstName} ${score.student.lastName}`.toLowerCase() : '';
    const studentEmail = score.student?.email?.toLowerCase() || '';
    const studentPhone = score.student?.phone?.toLowerCase() || '';
    const testTitle = score.test?.title?.toLowerCase() || '';

    return (
      studentName.includes(query) ||
      studentEmail.includes(query) ||
      studentPhone.includes(query) ||
      testTitle.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading scores...</div>
        </div>
      </div>
    );
  }

  const passedCount = scores.filter((s) => s.isPassed === true).length;
  const failedCount = scores.filter((s) => s.isPassed === false).length;
  const inProgressCount = scores.filter((s) => s.status === 'in_progress').length;
  const avgScore = scores.length > 0 
    ? scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div>
          <h1 className="text-4xl font-bold mb-2">Student Scores</h1>
          <p className="text-primary-100 text-lg">View and manage student test results</p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{scores.length}</div>
            <div className="text-sm text-primary-100 mt-1">Total Submissions</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{passedCount}</div>
            <div className="text-sm text-primary-100 mt-1">Passed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{failedCount}</div>
            <div className="text-sm text-primary-100 mt-1">Failed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{avgScore.toFixed(1)}%</div>
            <div className="text-sm text-primary-100 mt-1">Average Score</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Session and Class Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Session
            </label>
            <select
              className="input-field w-full"
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                // Clear classroom filter when session changes
                setSelectedClassroomId('');
              }}
            >
              <option value="">All Sessions</option>
              {sessions && sessions.length > 0 ? sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              )) : null}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Class
            </label>
            <select
              className="input-field w-full"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
            >
              <option value="">All Classes</option>
              {classrooms && classrooms.length > 0 ? classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              )) : null}
            </select>
          </div>
        </div>

        {(selectedSessionId || selectedClassroomId) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Filtering by: {selectedSessionId && sessions && `Session: ${sessions.find(s => s.id === selectedSessionId)?.name || 'Unknown'}`}
              {selectedSessionId && selectedClassroomId && ' | '}
              {selectedClassroomId && classrooms && `Class: ${classrooms.find(c => c.id === selectedClassroomId)?.name || 'Unknown'}`}
            </span>
            <button
              onClick={() => {
                setSelectedSessionId('');
                setSelectedClassroomId('');
              }}
              className="text-sm text-primary hover:text-primary-600 font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Search Bar */}
        {scores.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search by student name, email, phone, or test title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Status Filters */}
        {scores.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                filter === 'all'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              All ({scores.length})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                filter === 'passed'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Passed ({passedCount})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                filter === 'failed'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Failed ({failedCount})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                filter === 'in_progress'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      {scores.length > 0 && (searchQuery || filter !== 'all') && (
        <div className="text-sm text-gray-600 font-medium">
          Showing {filteredScores.length} of {scores.length} result{filteredScores.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Scores Table */}
      {filteredScores.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery || filter !== 'all'
              ? 'No results found'
              : 'No test scores yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? `No scores match "${searchQuery}". Try a different search term.`
              : filter !== 'all'
              ? `No scores match the "${filter}" filter`
              : 'Student scores will appear here once they complete tests'}
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
              className="mt-4 btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden border-2 border-gray-200 shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Attempt
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScores.map((score) => (
                  <tr key={score.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-primary font-bold text-sm">
                            {score.student?.firstName?.[0] || score.student?.lastName?.[0] || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {score.student ? `${score.student.firstName} ${score.student.lastName}` : 'Unknown'}
                          </div>
                          {score.student?.email && (
                            <div className="text-sm text-gray-500">{score.student.email}</div>
                          )}
                          {score.student?.phone && (
                            <div className="text-xs text-gray-400">{score.student.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {score.test?.title || 'Unknown Test'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {score.score !== null && score.score !== undefined
                          ? `${score.score.toFixed(1)}`
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`text-sm font-bold ${
                          score.percentage !== null && score.percentage !== undefined
                            ? score.percentage >= 70
                              ? 'text-green-600'
                              : score.percentage >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {score.percentage !== null && score.percentage !== undefined
                            ? `${score.percentage.toFixed(1)}%`
                            : 'N/A'}
                        </div>
                        {score.percentage !== null && score.percentage !== undefined && (
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                score.percentage >= 70
                                  ? 'bg-green-500'
                                  : score.percentage >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(score.percentage, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                          score.status === 'graded' || score.status === 'submitted'
                            ? score.isPassed === true
                            ? 'bg-green-100 text-green-800'
                            : score.isPassed === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                            : score.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {(score.status === 'graded' || score.status === 'submitted') && score.isPassed !== null
                          ? score.isPassed
                            ? '✓ Passed'
                            : '✗ Failed'
                          : score.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-medium">
                        Attempt {score.attemptNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {score.test?.allowRetrial &&
                        (score.status === 'graded' || score.status === 'submitted') &&
                        score.attemptNumber < (score.test?.maxAttempts || 1) && (
                          <button
                            onClick={() => handleGrantRetrial(score.id)}
                            className="text-primary hover:text-primary-600 font-semibold hover:underline"
                          >
                            Grant Retrial
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
