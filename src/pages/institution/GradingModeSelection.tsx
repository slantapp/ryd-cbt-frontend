import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { testAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Test {
  id: string;
  title: string;
  requiresManualGrading: boolean;
}

export default function GradingModeSelection() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  const loadTest = async () => {
    try {
      const response = await testAPI.getOne(testId!);
      setTest(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load test');
    } finally {
      setLoading(false);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div>
          <Link to={`/tests/${testId}`} className="text-primary-100 hover:text-white mb-2 inline-block">
            ← Back to Test
          </Link>
          <h1 className="text-4xl font-bold mb-2">Manual Grading</h1>
          <p className="text-primary-100 text-lg">{test?.title}</p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Grading Mode</h2>
        <p className="text-gray-600 mb-8">
          Choose how you want to grade this test. You can switch between modes at any time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grade by Student */}
          <div
            onClick={() => navigate(`/tests/${testId}/grade/by-student`)}
            className="border-2 border-gray-200 rounded-xl p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">👤</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Grade by Student</h3>
              <p className="text-gray-600 mb-6">
                Grade one student at a time. See all their answers together and grade them sequentially.
              </p>
              <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>View all answers for each student</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Navigate student by student</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>See old vs new scores</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Resume where you left off</span>
                </li>
              </ul>
              <button className="btn-primary w-full">
                Start Grading by Student →
              </button>
            </div>
          </div>

          {/* Grade by Question */}
          <div
            onClick={() => navigate(`/tests/${testId}/grade/by-question`)}
            className="border-2 border-gray-200 rounded-xl p-8 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">❓</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Grade by Question</h3>
              <p className="text-gray-600 mb-6">
                Grade one question at a time. See all students' answers for that question in a table.
              </p>
              <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Select which question to grade</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>See all students' answers in a table</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Batch grade efficiently</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Track progress per question</span>
                </li>
              </ul>
              <button className="btn-primary w-full">
                Start Grading by Question →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





