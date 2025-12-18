import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { parentAPI } from '../../services/api';
import { StudentTest } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StudentScores() {
  const { studentId } = useParams();
  const [scores, setScores] = useState<StudentTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    if (studentId) {
      loadScores();
    }
  }, [studentId]);

  const loadScores = async () => {
    try {
      const response = await parentAPI.getStudentScores(studentId!);
      setScores(response.data);
      if (response.data.length > 0) {
        setStudent(response.data[0].student);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

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

  const passedCount = scores.filter(s => s.isPassed === true).length;
  const failedCount = scores.filter(s => s.isPassed === false).length;
  const avgPercentage = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length
    : 0;

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <Link to="/parent/dashboard" className="text-blue-100 hover:text-white mb-4 inline-flex items-center transition-colors">
            <span className="mr-2">←</span> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold mb-3">📊 Test Scores</h1>
              {student && (
                <p className="text-blue-100 text-xl">
                  {student.firstName} {student.lastName}
                </p>
              )}
            </div>
            <div className="hidden md:block text-8xl opacity-20">🎯</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-100 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">{scores.length}</div>
              <div className="text-sm font-semibold text-gray-600">Total Tests</div>
            </div>
            <div className="text-4xl opacity-20">📝</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100 hover:border-green-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">{passedCount}</div>
              <div className="text-sm font-semibold text-gray-600">Passed</div>
            </div>
            <div className="text-4xl opacity-20">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-100 hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">{avgPercentage.toFixed(1)}%</div>
              <div className="text-sm font-semibold text-gray-600">Average Score</div>
            </div>
            <div className="text-4xl opacity-20">📈</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Test Results</h2>
        {scores.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
              <span className="text-7xl">📊</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Scores Available Yet</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              Scores will appear here once they are released by the teacher. Check back later!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scores.map((score) => (
                  <tr key={score.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {score.test?.title || 'Unknown Test'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {score.test?.testGroup || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {score.score !== null && score.score !== undefined
                          ? `${score.score.toFixed(1)}`
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        score.isPassed === true
                          ? 'bg-green-100 text-green-800'
                          : score.isPassed === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {score.isPassed === true ? 'Passed' : score.isPassed === false ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {score.submittedAt
                        ? format(new Date(score.submittedAt), 'MMM dd, yyyy')
                        : 'N/A'}
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

