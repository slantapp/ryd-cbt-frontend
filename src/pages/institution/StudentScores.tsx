import { useEffect, useState } from 'react';
import { studentAPI, sessionAPI, subjectAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface TestGroupScore {
  testGroupId: string;
  testGroupName: string;
  weight: number;
  studentScore: number;
  totalPossible: number;
  percentage: number;
  contribution: number;
  tests: Array<{
    testId: string;
    testTitle: string;
    score: number;
    maxPoints: number;
    percentage: number;
  }>;
}

interface SubjectScore {
  subjectId: string;
  subjectName: string;
  testGroups: TestGroupScore[];
  overallScore: number;
  hasData: boolean;
}

interface OverallScoreData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    username: string;
  };
  subjects: SubjectScore[];
  overallAverage: number;
}

export default function StudentScores() {
  const [overallScores, setOverallScores] = useState<OverallScoreData[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<OverallScoreData | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    loadSessions();
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOverallScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId, selectedSubjectId]);

  const loadSessions = async () => {
    try {
      const { data } = await sessionAPI.getAll();
      setSessions(data || []);
      // Find active session and set it as default
      const activeSession = data?.find((s: any) => 
        s.isActive && 
        new Date(s.startDate) <= new Date() && 
        new Date(s.endDate) >= new Date()
      );
      if (activeSession) {
        setSelectedSessionId(activeSession.id);
      }
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    }
  };

  const loadSubjects = async () => {
    try {
      const { data } = await subjectAPI.getAll();
      setSubjects(data || []);
    } catch (error: any) {
      console.error('Failed to load subjects:', error);
      setSubjects([]);
    }
  };

  const loadOverallScores = async () => {
    try {
      setLoading(true);
      const params: { sessionId?: string; subjectId?: string } = {};
      if (selectedSessionId) {
        params.sessionId = selectedSessionId;
      }
      if (selectedSubjectId) {
        params.subjectId = selectedSubjectId;
      }
      const response = await studentAPI.getOverallScores(params);
      setOverallScores(response.data || []);
    } catch (error: any) {
      console.error('Load overall scores error:', error);
      toast.error(error?.response?.data?.error || 'Failed to load overall scores');
      setOverallScores([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = overallScores.filter((score) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const studentName = `${score.student.firstName} ${score.student.lastName}`.toLowerCase();
    const studentEmail = score.student.email?.toLowerCase() || '';
    const studentPhone = score.student.phone?.toLowerCase() || '';
    const studentUsername = score.student.username?.toLowerCase() || '';
    return (
      studentName.includes(query) ||
      studentEmail.includes(query) ||
      studentPhone.includes(query) ||
      studentUsername.includes(query)
    );
  });

  const handleViewBreakdown = (student: OverallScoreData) => {
    setSelectedStudent(student);
    setShowBreakdown(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading overall scores...</div>
        </div>
      </div>
    );
  }

  // Get all unique test groups from the data
  const allTestGroups = new Set<string>();
  overallScores.forEach(score => {
    score.subjects.forEach(subject => {
      subject.testGroups.forEach(tg => {
        if (tg.totalPossible > 0) {
          allTestGroups.add(tg.testGroupName);
        }
      });
    });
  });
  const testGroupNames = Array.from(allTestGroups).sort();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div>
          <h1 className="text-4xl font-bold mb-2">Overall Student Scores</h1>
          <p className="text-primary-100 text-lg">View student performance across all test groups</p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{filteredScores.length}</div>
            <div className="text-sm text-primary-100 mt-1">Total Students</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">
              {filteredScores.length > 0
                ? (filteredScores.reduce((sum, s) => sum + s.overallAverage, 0) / filteredScores.length).toFixed(1)
                : '0.0'}%
            </div>
            <div className="text-sm text-primary-100 mt-1">Average Overall Score</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{testGroupNames.length}</div>
            <div className="text-sm text-primary-100 mt-1">Active Test Groups</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Session
            </label>
            <select
              className="input-field w-full"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isActive && new Date(s.startDate) <= new Date() && new Date(s.endDate) >= new Date() ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Subject
            </label>
            <select
              className="input-field w-full"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
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
            placeholder="Search by student name, email, phone, or username..."
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
      </div>

      {/* Results Count */}
      {filteredScores.length > 0 && searchQuery && (
        <div className="text-sm text-gray-600 font-medium">
          Showing {filteredScores.length} of {overallScores.length} student{filteredScores.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Scores Table */}
      {filteredScores.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No results found' : 'No scores available'}
          </h3>
          <p className="text-gray-500">
            {searchQuery
              ? `No students match "${searchQuery}". Try a different search term.`
              : 'Student overall scores will appear here once they complete tests and grading schemes are configured.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 btn-secondary"
            >
              Clear Search
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
                  {testGroupNames.map((tgName) => (
                    <th key={tgName} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {tgName}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Overall Average
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScores.map((score) => {
                  // Get test group scores for display (combine across all subjects)
                  const testGroupMap = new Map<string, { contribution: number; weight: number; percentage: number }>();
                  
                  score.subjects.forEach(subject => {
                    subject.testGroups.forEach(tg => {
                      if (tg.totalPossible > 0) {
                        const existing = testGroupMap.get(tg.testGroupName) || { contribution: 0, weight: 0, percentage: 0 };
                        testGroupMap.set(tg.testGroupName, {
                          contribution: existing.contribution + tg.contribution,
                          weight: tg.weight,
                          percentage: tg.percentage,
                        });
                      }
                    });
                  });

                  return (
                    <tr key={score.student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-primary font-bold text-sm">
                              {score.student.firstName?.[0] || score.student.lastName?.[0] || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {score.student.firstName} {score.student.lastName}
                            </div>
                            {score.student.email && (
                              <div className="text-sm text-gray-500">{score.student.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {testGroupNames.map((tgName) => {
                        const tgData = testGroupMap.get(tgName);
                        return (
                          <td key={tgName} className="px-6 py-4 whitespace-nowrap">
                            {tgData ? (
                              <div className="text-sm">
                                <div className="font-bold text-gray-900">
                                  {tgData.contribution > 0 ? `${tgData.contribution.toFixed(2)}%` : `${tgData.percentage.toFixed(1)}%`}
                                </div>
                                {tgData.contribution > 0 && (
                                  <div className="text-xs text-gray-500">
                                    ({tgData.percentage.toFixed(1)}% × {tgData.weight}%)
                                  </div>
                                )}
                                {tgData.contribution === 0 && tgData.percentage > 0 && (
                                  <div className="text-xs text-gray-500">
                                    (Not in grading scheme)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`text-sm font-bold ${
                            score.overallAverage >= 70
                              ? 'text-green-600'
                              : score.overallAverage >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {score.overallAverage.toFixed(2)}%
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                score.overallAverage >= 70
                                  ? 'bg-green-500'
                                  : score.overallAverage >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(score.overallAverage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewBreakdown(score)}
                          className="text-primary hover:text-primary-600 font-semibold hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {showBreakdown && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Score Breakdown - {selectedStudent.student.firstName} {selectedStudent.student.lastName}
              </h2>
              <button
                onClick={() => {
                  setShowBreakdown(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {selectedStudent.subjects.filter(s => s.hasData).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No score data available for this student.</p>
                </div>
              ) : (
                selectedStudent.subjects.filter(s => s.hasData).map((subject) => (
                <div key={subject.subjectId} className="mb-6 border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{subject.subjectName}</h3>
                  <div className="space-y-4">
                    {subject.testGroups
                      .filter(tg => tg.totalPossible > 0)
                      .map((testGroup) => (
                        <div key={testGroup.testGroupId} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{testGroup.testGroupName}</h4>
                              <p className="text-sm text-gray-600">Weight: {testGroup.weight}%</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {testGroup.contribution.toFixed(2)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Contribution
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="text-sm text-gray-700">
                              Score: {testGroup.studentScore.toFixed(1)} / {testGroup.totalPossible.toFixed(1)} 
                              {' '}({testGroup.percentage.toFixed(1)}%)
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Calculation: ({testGroup.studentScore.toFixed(1)} / {testGroup.totalPossible.toFixed(1)}) × {testGroup.weight}% = {testGroup.contribution.toFixed(2)}%
                            </div>
                          </div>
                          {testGroup.tests.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Individual Tests:</p>
                              <div className="space-y-2">
                                {testGroup.tests.map((test) => (
                                  <div key={test.testId} className="flex justify-between items-center text-sm bg-white rounded p-2">
                                    <span className="text-gray-700">{test.testTitle}</span>
                                    <span className="font-semibold text-gray-900">
                                      {test.score.toFixed(1)} / {test.maxPoints.toFixed(1)} ({test.percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Subject Overall:</span>
                      <span className="text-lg font-bold text-primary">
                        {subject.overallScore.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                ))
              )}
              {selectedStudent.subjects.filter(s => s.hasData).length > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-primary">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Overall Average:</span>
                  <span className="text-2xl font-bold text-primary">
                    {selectedStudent.overallAverage.toFixed(2)}%
                  </span>
                </div>
              </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowBreakdown(false);
                  setSelectedStudent(null);
                }}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
