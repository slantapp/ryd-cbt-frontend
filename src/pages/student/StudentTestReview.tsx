import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { ThemeConfig } from '../../types';
import toast from 'react-hot-toast';

const defaultTheme: ThemeConfig = {
  primaryColor: '#1d4ed8',
  secondaryColor: '#2563eb',
  accentColor: '#facc15',
  backgroundColor: '#f8fafc',
  textColor: '#0f172a',
  logoUrl: '',
  bannerUrl: '',
};

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options?: any;
  points: number;
  order: number;
  correctAnswer: string;
  studentAnswer?: {
    answer: string;
    isCorrect: boolean | null;
    pointsEarned: number;
  } | null;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  institution?: {
    id: string;
    name: string;
    uniqueSlug: string;
    themeConfig?: ThemeConfig;
  };
}

export default function StudentTestReview() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [test, setTest] = useState<Test | null>(null);
  const [studentTest, setStudentTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(defaultTheme);

  useEffect(() => {
    if (!testId) return;
    
    const loadReview = async () => {
      try {
        setLoading(true);
        const { data } = await studentAPI.getTestReview(testId);
        setTest(data.test);
        setStudentTest(data.studentTest);
        
        // Set theme from institution
        if (data.test.institution?.themeConfig) {
          setTheme({
            ...defaultTheme,
            ...data.test.institution.themeConfig,
          });
        }
      } catch (error: any) {
        console.error('Load review error:', error);
        toast.error(error?.response?.data?.error || 'Failed to load test review');
        navigate('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [testId, navigate]);

  const brand = theme;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading test review...</div>
        </div>
      </div>
    );
  }

  if (!test || !studentTest) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Review Not Available</h1>
          <p className="text-gray-600 mb-4">
            Unable to load test review. This test may not have been completed yet.
          </p>
          <Link to="/student/dashboard" className="btn-primary inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formatAnswer = (answer: string, questionType: string) => {
    if (questionType === 'multiple_select') {
      return answer.split(',').map(a => a.trim()).filter(a => a).join(', ');
    }
    return answer;
  };

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div
          className="rounded-xl shadow-lg p-8 mb-8 text-white"
          style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Test Review</h1>
              <p className="text-white opacity-90">{test.title}</p>
            </div>
            <Link
              to="/student/dashboard"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
          
          {studentTest && (
            <div className="mt-4 pt-4 border-t border-white border-opacity-20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="opacity-75">Score</div>
                  <div className="text-xl font-bold">
                    {studentTest.score !== null ? `${studentTest.score.toFixed(1)} / ${test.questions.reduce((sum, q) => sum + q.points, 0).toFixed(1)}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="opacity-75">Percentage</div>
                  <div className="text-xl font-bold">
                    {studentTest.percentage !== null ? `${studentTest.percentage.toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="opacity-75">Status</div>
                  <div className="text-xl font-bold">
                    {studentTest.isPassed ? '✓ Passed' : studentTest.isPassed === false ? '✗ Failed' : 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="opacity-75">Attempt</div>
                  <div className="text-xl font-bold">#{studentTest.attemptNumber}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {test.questions.map((question, index) => {
            const studentAnswer = question.studentAnswer;
            const isCorrect = studentAnswer?.isCorrect;
            const pointsEarned = studentAnswer?.pointsEarned || 0;
            const maxPoints = question.points;
            
            return (
              <div key={question.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-primary">
                        Question {index + 1}
                      </span>
                      <span className="text-sm text-gray-500">
                        {maxPoints} point{maxPoints !== 1 ? 's' : ''}
                      </span>
                      {isCorrect !== null && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      )}
                      {pointsEarned !== undefined && (
                        <span className="text-sm text-gray-600">
                          ({pointsEarned.toFixed(1)} / {maxPoints.toFixed(1)} points)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {question.questionText}
                    </h3>
                  </div>
                </div>

                {/* Options (for multiple choice/select) */}
                {question.options && (
                  <div className="mb-4 space-y-2">
                    {Object.entries(question.options).map(([key, value]: [string, any]) => {
                      const isSelected = studentAnswer?.answer?.includes(key);
                      const isCorrectOption = question.correctAnswer?.includes(key);
                      
                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border-2 ${
                            isSelected && isCorrectOption
                              ? 'border-green-500 bg-green-50'
                              : isSelected && !isCorrectOption
                              ? 'border-red-500 bg-red-50'
                              : isCorrectOption && !isSelected
                              ? 'border-green-300 bg-green-50 border-dashed'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              isSelected && isCorrectOption
                                ? 'text-green-800'
                                : isSelected && !isCorrectOption
                                ? 'text-red-800'
                                : isCorrectOption && !isSelected
                                ? 'text-green-700'
                                : 'text-gray-700'
                            }`}>
                              {key}:
                            </span>
                            <span className={`${
                              isSelected && isCorrectOption
                                ? 'text-green-900'
                                : isSelected && !isCorrectOption
                                ? 'text-red-900'
                                : isCorrectOption && !isSelected
                                ? 'text-green-800'
                                : 'text-gray-700'
                            }`}>
                              {value}
                            </span>
                            {isSelected && (
                              <span className="ml-2 text-xs font-semibold text-gray-600">
                                (Your Answer)
                              </span>
                            )}
                            {isCorrectOption && !isSelected && (
                              <span className="ml-2 text-xs font-semibold text-green-700">
                                (Correct Answer)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Student Answer (for text/short answer) */}
                {!question.options && studentAnswer && (
                  <div className="mb-4 space-y-3">
                    <div className={`p-4 rounded-lg border-2 ${
                      isCorrect === true
                        ? 'border-green-500 bg-green-50'
                        : isCorrect === false
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}>
                      <div className="text-sm font-medium text-gray-700 mb-1">Your Answer:</div>
                      <div className={`text-base ${
                        isCorrect === true
                          ? 'text-green-900'
                          : isCorrect === false
                          ? 'text-red-900'
                          : 'text-gray-800'
                      }`}>
                        {formatAnswer(studentAnswer.answer, question.questionType)}
                      </div>
                    </div>
                    
                    {question.correctAnswer && (
                      <div className="p-4 rounded-lg border-2 border-green-300 bg-green-50 border-dashed">
                        <div className="text-sm font-medium text-green-800 mb-1">Correct Answer:</div>
                        <div className="text-base text-green-900">
                          {formatAnswer(question.correctAnswer, question.questionType)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* True/False */}
                {question.questionType === 'true_false' && question.options && (
                  <div className="mb-4 space-y-2">
                    {['True', 'False'].map((option) => {
                      const isSelected = studentAnswer?.answer?.toLowerCase() === option.toLowerCase();
                      const isCorrectOption = question.correctAnswer?.toLowerCase() === option.toLowerCase();
                      
                      return (
                        <div
                          key={option}
                          className={`p-3 rounded-lg border-2 ${
                            isSelected && isCorrectOption
                              ? 'border-green-500 bg-green-50'
                              : isSelected && !isCorrectOption
                              ? 'border-red-500 bg-red-50'
                              : isCorrectOption && !isSelected
                              ? 'border-green-300 bg-green-50 border-dashed'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              isSelected && isCorrectOption
                                ? 'text-green-800'
                                : isSelected && !isCorrectOption
                                ? 'text-red-800'
                                : isCorrectOption && !isSelected
                                ? 'text-green-700'
                                : 'text-gray-700'
                            }`}>
                              {option}
                            </span>
                            {isSelected && (
                              <span className="text-xs font-semibold text-gray-600">
                                Your Answer
                              </span>
                            )}
                            {isCorrectOption && !isSelected && (
                              <span className="text-xs font-semibold text-green-700">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/student/dashboard"
            className="btn-primary inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

