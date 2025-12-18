import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gradingAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Navigation {
  nextId: string | null;
  prevId: string | null;
  current: number;
  total: number;
}

interface StudentAnswer {
  id: string;
  answer: string;
  pointsEarned: number;
  isCorrect?: boolean | null;
  manuallyGraded: boolean;
  question: {
    id: string;
    questionText: string;
    questionType: string;
    points: number;
    order: number;
    requiresManualGrading: boolean;
    correctAnswer?: string | null;
  };
}

interface StudentTest {
  id: string;
  status: string;
  scoreVisibleToStudent: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  test: {
    id: string;
    title: string;
  };
  answers: StudentAnswer[];
}

export default function GradeStudentTest() {
  const { testId, studentTestId } = useParams();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [studentTest, setStudentTest] = useState<StudentTest | null>(null);
  const [navigation, setNavigation] = useState<Navigation | null>(null);
  const [gradingData, setGradingData] = useState<Record<string, { pointsEarned: number; isCorrect: boolean | null }>>({});
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    if (studentTestId) {
      loadStudentTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentTestId]);

  const loadStudentTest = async () => {
    try {
      const response = await gradingAPI.getStudentTestForGrading(studentTestId!);
      setStudentTest(response.data.studentTest);
      setNavigation(response.data.navigation as Navigation);
      
      // Initialize grading data with current values
      const initialData: Record<string, { pointsEarned: number; isCorrect: boolean | null }> = {};
      response.data.studentTest.answers.forEach((answer: StudentAnswer) => {
        if (answer.question.requiresManualGrading) {
          initialData[answer.id] = {
            pointsEarned: answer.pointsEarned || 0,
            isCorrect: answer.isCorrect ?? null,
          };
        }
      });
      setGradingData(initialData);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load student test');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (answerId: string, field: 'pointsEarned' | 'isCorrect', value: number | boolean) => {
    setGradingData(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value,
      },
    }));
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const answers = Object.entries(gradingData).map(([answerId, data]) => ({
        answerId,
        pointsEarned: data.pointsEarned,
        isCorrect: data.isCorrect,
      }));

      await gradingAPI.gradeStudentTest(studentTestId!, { answers });
      toast.success('Grading saved successfully');
      
      // Reload to get updated status
      await loadStudentTest();
      
      // Navigate to next student or back to list
      if (navigation?.nextId) {
        navigate(`/tests/${testId}/grade/${navigation.nextId}`);
      } else {
        navigate(`/tests/${testId}/grade`);
        toast.success('All students graded!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save grading');
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseScore = async () => {
    if (!window.confirm('Release this score to the student? They will be able to see their results.')) {
      return;
    }
    setReleasing(true);
    try {
      await gradingAPI.releaseScore(studentTestId!);
      toast.success('Score released to student');
      loadStudentTest();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to release score');
    } finally {
      setReleasing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const answers = Object.entries(gradingData).map(([answerId, data]) => ({
        answerId,
        pointsEarned: data.pointsEarned,
        isCorrect: data.isCorrect,
      }));

      await gradingAPI.gradeStudentTest(studentTestId!, { answers });
      toast.success('Grading saved successfully');
      loadStudentTest();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save grading');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading student test...</div>
        </div>
      </div>
    );
  }

  if (!studentTest) {
    return (
      <div className="card">
        <p className="text-red-600">Student test not found</p>
      </div>
    );
  }

  const manualGradingAnswers = studentTest.answers.filter(a => a.question.requiresManualGrading);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <Link to={`/tests/${testId}/grade`} className="text-primary-100 hover:text-white mb-2 inline-block">
              ← Back to Grading List
            </Link>
            <h1 className="text-4xl font-bold mb-2">Grade Student Test</h1>
            <p className="text-primary-100 text-lg">
              {studentTest.student.firstName} {studentTest.student.lastName} - {studentTest.test.title}
            </p>
            {navigation && (
              <p className="text-primary-100 text-sm mt-2">
                Student {navigation.current} of {navigation.total}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            {navigation?.prevId && (
              <button
                onClick={() => navigate(`/tests/${testId}/grade/${navigation.prevId}`)}
                className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                ← Previous
              </button>
            )}
            {navigation?.nextId && (
              <button
                onClick={() => navigate(`/tests/${testId}/grade/${navigation.nextId}`)}
                className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grading Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Manual Grading Questions</h2>
        {manualGradingAnswers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No manual grading questions found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {manualGradingAnswers.map((answer) => {
              const grading = gradingData[answer.id] || { pointsEarned: 0, isCorrect: null };
              const maxPoints = answer.question.points;
              
              return (
                <div key={answer.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Question {answer.question.order}
                        </span>
                        <span className="text-xs text-gray-400">({maxPoints} points)</span>
                        {answer.manuallyGraded && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Graded
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium mb-3">{answer.question.questionText}</p>
                      {answer.question.correctAnswer && (
                        <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-900 mb-1">Reference Answer:</p>
                          <p className="text-sm text-blue-800">{answer.question.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Student Answer:
                    </label>
                    <div className="p-4 bg-gray-50 rounded border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap">{answer.answer || '(No answer provided)'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Points Earned (0 - {maxPoints})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={maxPoints}
                        step="0.1"
                        className="input-field"
                        value={grading.pointsEarned ?? 0}
                        onChange={(e) => handleGradeChange(answer.id, 'pointsEarned', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Is Correct?
                      </label>
                      <select
                        className="input-field"
                        value={grading.isCorrect === null ? '' : grading.isCorrect ? 'true' : 'false'}
                        onChange={(e) => {
                          const value = e.target.value === '' ? false : e.target.value === 'true';
                          handleGradeChange(answer.id, 'isCorrect', value);
                        }}
                      >
                        <option value="">Not Set</option>
                        <option value="true">Correct</option>
                        <option value="false">Incorrect</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="flex space-x-2">
            {navigation?.prevId && (
              <button
                onClick={() => navigate(`/tests/${testId}/grade/${navigation.prevId}`)}
                className="btn-secondary"
              >
                ← Previous Student
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            {studentTest && studentTest.status === 'graded' && !studentTest.scoreVisibleToStudent && (
              <button
                onClick={handleReleaseScore}
                disabled={releasing}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                {releasing ? 'Releasing...' : 'Release Score'}
              </button>
            )}
            {studentTest && studentTest.scoreVisibleToStudent && (
              <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800">
                ✓ Score Released
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-secondary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleSaveAndContinue}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : navigation?.nextId ? 'Save & Next →' : 'Save & Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

