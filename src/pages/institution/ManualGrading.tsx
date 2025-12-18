import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gradingAPI, testAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Test {
  id: string;
  title: string;
  requiresManualGrading: boolean;
}

interface StudentTest {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  submittedAt: string;
  _count: {
    answers: number;
  };
}

export default function ManualGrading() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [studentTests, setStudentTests] = useState<StudentTest[]>([]);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    if (testId) {
      loadData();
    }
  }, [testId]);

  const loadData = async () => {
    try {
      const [testResponse, gradingResponse] = await Promise.all([
        testAPI.getOne(testId!),
        gradingAPI.getTestsNeedingGrading(testId!),
      ]);
      
      setTest(testResponse.data);
      setStudentTests(gradingResponse.data.studentTests);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRelease = async () => {
    if (!window.confirm('Release scores for all graded students? They will be able to see their results.')) {
      return;
    }
    setReleasing(true);
    try {
      await gradingAPI.bulkReleaseScores(testId!);
      toast.success('Scores released successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to release scores');
    } finally {
      setReleasing(false);
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

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <Link to="/tests" className="text-primary-100 hover:text-white mb-2 inline-block">
              ← Back to Tests
            </Link>
            <h1 className="text-4xl font-bold mb-2">Manual Grading</h1>
            <p className="text-primary-100 text-lg">{test?.title}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Students Needing Grading ({studentTests.length})
          </h2>
          {studentTests.length > 0 && (
            <button
              onClick={handleBulkRelease}
              disabled={releasing}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              {releasing ? 'Releasing...' : 'Release All Graded Scores'}
            </button>
          )}
        </div>
        {studentTests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600 text-lg">All submissions have been graded!</p>
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
                    Answers to Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentTests.map((studentTest) => (
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {studentTest._count.answers} answers
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/tests/${testId}/grade/${studentTest.id}`)}
                        className="text-primary hover:text-primary-600 font-medium"
                      >
                        Grade →
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

