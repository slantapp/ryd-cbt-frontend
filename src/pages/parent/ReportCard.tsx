import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { parentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ReportCardData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    institution: {
      id: string;
      name: string;
      uniqueSlug: string;
    };
  };
  classAssignments: any[];
  tests: any[];
  statistics: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averagePercentage: string;
    totalScore: string;
  };
}

export default function ReportCard() {
  const { studentId } = useParams();
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('');

  useEffect(() => {
    if (studentId) {
      loadReportCard();
    }
  }, [studentId, selectedSession]);

  const loadReportCard = async () => {
    try {
      const response = await parentAPI.getStudentReportCard(
        studentId!,
        selectedSession || undefined
      );
      setReportCard(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load report card');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading report card...</div>
        </div>
      </div>
    );
  }

  if (!reportCard) {
    return (
      <div className="card">
        <p className="text-red-600">Failed to load report card</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="space-y-8">
        <div className="no-print bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <Link to="/parent/dashboard" className="text-blue-100 hover:text-white mb-4 inline-flex items-center transition-colors">
              <span className="mr-2">←</span> Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-3">📄 Report Card</h1>
                <p className="text-blue-100 text-xl">
                  {reportCard.student.firstName} {reportCard.student.lastName}
                </p>
              </div>
              <div className="hidden md:block text-8xl opacity-20">🎓</div>
            </div>
          </div>
        </div>

        <div className="no-print card">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Filter by Session
          </label>
          <select
            className="input-field"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
          >
            <option value="">All Sessions</option>
            {reportCard.classAssignments?.map((assignment) => (
              <option key={assignment.session.id} value={assignment.session.id}>
                {assignment.session.name} - {assignment.classroom.name}
              </option>
            ))}
          </select>
        </div>

        <div className="print-container bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-600 p-8 text-white text-center">
            <h1 className="text-4xl font-bold mb-2">Report Card</h1>
            <p className="text-xl">{reportCard.student.institution.name}</p>
          </div>

          {/* Student Info */}
          <div className="p-8 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="text-lg font-semibold">
                  {reportCard.student.firstName} {reportCard.student.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Student ID</p>
                <p className="text-lg font-semibold">{reportCard.student.username}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="p-8 bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">Overall Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Total Tests</p>
                <p className="text-2xl font-bold text-primary">{reportCard.statistics.totalTests}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Passed</p>
                <p className="text-2xl font-bold text-green-600">{reportCard.statistics.passedTests}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{reportCard.statistics.failedTests}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Average</p>
                <p className="text-2xl font-bold text-primary">{reportCard.statistics.averagePercentage}%</p>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Test Results</h2>
            {reportCard.tests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No test results available</p>
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
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportCard.tests?.map((test) => (
                      <tr key={test.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {test.test?.title || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {test.test?.testGroup || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {test.score !== null && test.score !== undefined
                            ? `${test.score.toFixed(1)}`
                            : 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                          test.percentage !== null && test.percentage !== undefined
                            ? test.percentage >= 70
                              ? 'text-green-600'
                              : test.percentage >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {test.percentage !== null && test.percentage !== undefined
                            ? `${test.percentage.toFixed(1)}%`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            test.isPassed === true
                              ? 'bg-green-100 text-green-800'
                              : test.isPassed === false
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {test.isPassed === true ? 'Passed' : test.isPassed === false ? 'Failed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {test.submittedAt
                            ? format(new Date(test.submittedAt), 'MMM dd, yyyy')
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
          </div>
        </div>

        <div className="no-print card text-center">
          <button onClick={handlePrint} className="btn-primary">
            Print Report Card
          </button>
        </div>
      </div>
    </>
  );
}

