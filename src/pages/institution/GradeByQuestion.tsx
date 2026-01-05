import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gradingAPI, testAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Test {
  id: string;
  title: string;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  order: number;
  correctAnswer?: string | null;
  studentAnswersCount: number;
  ungradedAnswersCount: number;
}

interface StudentAnswer {
  id: string;
  answer: string;
  pointsEarned: number;
  isCorrect: boolean | null;
  manuallyGraded: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  studentTestId: string;
  oldScore: {
    points: number;
    percentage: number;
    maxPoints?: number;
  };
  question: {
    id: string;
    questionText: string;
    points: number;
    order: number;
    correctAnswer?: string | null;
  };
}

interface Navigation {
  nextId: string | null;
  prevId: string | null;
  current: number;
  total: number;
}

export default function GradeByQuestion() {
  const { testId, questionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [navigation, setNavigation] = useState<Navigation | null>(null);
  const [gradingData, setGradingData] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ungraded' | 'graded'>('all');

  useEffect(() => {
    if (testId) {
      loadQuestions();
    }
  }, [testId]);

  useEffect(() => {
    if (testId && questionId) {
      loadQuestionAnswers();
    }
  }, [testId, questionId]);

  const loadQuestions = async () => {
    try {
      const [testResponse, questionsResponse] = await Promise.all([
        testAPI.getOne(testId!),
        gradingAPI.getQuestionsNeedingGrading(testId!),
      ]);
      
      setTest(testResponse.data);
      setQuestions(questionsResponse.data.questions);
      
      // If questionId is provided, select that question and load its answers
      if (questionId) {
        const question = questionsResponse.data.questions.find((q: Question) => q.id === questionId);
        if (question) {
          setSelectedQuestion(question);
          // loadQuestionAnswers will be called by the useEffect when questionId is set
        }
      }
      // Otherwise, show the question selection screen (don't auto-navigate)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionAnswers = async () => {
    if (!questionId) return;
    
    try {
      setLoading(true);
      const response = await gradingAPI.getQuestionAnswersForGrading(testId!, questionId);
      setSelectedQuestion(response.data.question);
      setStudentAnswers(response.data.studentAnswers);
      setNavigation(response.data.navigation);
      
      // Initialize grading data with current values
      const initialData: Record<string, number> = {};
      response.data.studentAnswers.forEach((answer: StudentAnswer) => {
        initialData[answer.id] = answer.pointsEarned;
      });
      setGradingData(initialData);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load question answers');
    } finally {
      setLoading(false);
    }
  };

  const handlePointsChange = (answerId: string, value: string) => {
    if (value === '') {
      // Allow empty string temporarily while user is typing
      setGradingData(prev => ({
        ...prev,
        [answerId]: 0,
      }));
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const maxPoints = selectedQuestion?.points || 0;
      const clampedValue = Math.max(0, Math.min(maxPoints, numValue));
      setGradingData(prev => ({
        ...prev,
        [answerId]: clampedValue,
      }));
    }
  };

  const calculateNewScore = (answer: StudentAnswer) => {
    const newPointsForThisAnswer = gradingData[answer.id] ?? answer.pointsEarned;
    const oldPointsForThisAnswer = answer.pointsEarned;
    const difference = newPointsForThisAnswer - oldPointsForThisAnswer;
    
    const newTotalPoints = answer.oldScore.points + difference;
    // Get max points from oldScore (added in backend) or calculate from percentage
    const maxPoints = answer.oldScore.maxPoints || 
      (answer.oldScore.points > 0 
        ? (answer.oldScore.points / (answer.oldScore.percentage / 100))
        : answer.question.points * 10); // Fallback estimate
    const newPercentage = maxPoints > 0 ? (newTotalPoints / maxPoints) * 100 : 0;
    
    return {
      points: newTotalPoints,
      percentage: newPercentage,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Group answers by studentTestId
      const answersByStudent: Record<string, Array<{ answerId: string; pointsEarned: number }>> = {};
      
      studentAnswers.forEach(answer => {
        const newPoints = gradingData[answer.id] ?? answer.pointsEarned;
        if (!answersByStudent[answer.studentTestId]) {
          answersByStudent[answer.studentTestId] = [];
        }
        answersByStudent[answer.studentTestId].push({
          answerId: answer.id,
          pointsEarned: newPoints,
        });
      });

      // Save all student tests
      await Promise.all(
        Object.entries(answersByStudent).map(([studentTestId, answers]) =>
          gradingAPI.gradeStudentTest(studentTestId, { answers })
        )
      );

      toast.success('Grading saved successfully');
      await loadQuestionAnswers(); // Reload to get updated scores
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save grading');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionSelect = (q: Question) => {
    navigate(`/tests/${testId}/grade/by-question/${q.id}`);
  };

  // Filter and search questions
  const filteredQuestions = questions.filter((question) => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      question.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `question ${question.order}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'ungraded' && question.ungradedAnswersCount > 0) ||
      (filterStatus === 'graded' && question.ungradedAnswersCount === 0 && question.studentAnswersCount > 0);
    
    return matchesSearch && matchesFilter;
  });

  if (loading && !selectedQuestion) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If no question selected, show question selection
  if (!questionId && questions.length > 0) {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
          <div>
            <Link to={`/tests/${testId}/grade/select-mode`} className="text-primary-100 hover:text-white mb-2 inline-block">
              ← Back to Mode Selection
            </Link>
            <h1 className="text-4xl font-bold mb-2">Grade by Question</h1>
            <p className="text-primary-100 text-lg">{test?.title}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Select Question to Grade</h2>
            <div className="text-sm text-gray-600">
              Showing {filteredQuestions.length} of {questions.length} questions
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Questions
              </label>
              <input
                type="text"
                placeholder="Search by question text or number..."
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
                  All ({questions.length})
                </button>
                <button
                  onClick={() => setFilterStatus('ungraded')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'ungraded'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ungraded ({questions.filter(q => q.ungradedAnswersCount > 0).length})
                </button>
                <button
                  onClick={() => setFilterStatus('graded')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === 'graded'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Graded ({questions.filter(q => q.ungradedAnswersCount === 0 && q.studentAnswersCount > 0).length})
                </button>
              </div>
            </div>
          </div>

          {/* Questions List */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-600 text-lg">No questions found matching your search/filter criteria.</p>
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
            <div className="space-y-3">
              {filteredQuestions.map((question) => (
              <div
                key={question.id}
                onClick={() => handleQuestionSelect(question)}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-semibold text-gray-500">
                        Question {question.order}
                      </span>
                      <span className="text-xs text-gray-400">({question.points} points)</span>
                      {question.ungradedAnswersCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {question.ungradedAnswersCount} ungraded
                        </span>
                      )}
                      {question.ungradedAnswersCount === 0 && question.studentAnswersCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✓ All graded
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium">{question.questionText}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {question.studentAnswersCount} student{question.studentAnswersCount !== 1 ? 's' : ''} answered
                    </p>
                  </div>
                  <button className="btn-primary ml-4">
                    Grade →
                  </button>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <Link to={`/tests/${testId}/grade/by-question`} className="text-primary-100 hover:text-white mb-2 inline-block">
              ← Back to Questions
            </Link>
            <h1 className="text-4xl font-bold mb-2">Grade by Question</h1>
            <p className="text-primary-100 text-lg">{test?.title}</p>
            {navigation && (
              <p className="text-primary-100 text-sm mt-2">
                Question {navigation.current} of {navigation.total}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            {navigation?.prevId && (
              <button
                onClick={() => navigate(`/tests/${testId}/grade/by-question/${navigation.prevId}`)}
                className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                ← Previous
              </button>
            )}
            {navigation?.nextId && (
              <button
                onClick={() => navigate(`/tests/${testId}/grade/by-question/${navigation.nextId}`)}
                className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-all"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question Info */}
      {selectedQuestion && (
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-sm font-semibold text-gray-500">
                Question {selectedQuestion.order}
              </span>
              <span className="text-xs text-gray-400">({selectedQuestion.points} points)</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedQuestion.questionText}</h2>
            {selectedQuestion.correctAnswer && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-1">Reference Answer:</p>
                <p className="text-sm text-blue-800">{selectedQuestion.correctAnswer}</p>
              </div>
            )}
          </div>

          {/* Student Answers Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Answer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Points</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Old Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">New Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {studentAnswers.map((answer) => {
                  const newScore = calculateNewScore(answer);
                  const hasChanged = newScore.points !== answer.oldScore.points;
                  
                  return (
                    <tr key={answer.id} className={hasChanged ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {answer.student.firstName} {answer.student.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{answer.student.username}</div>
                      </td>
                      <td className="px-4 py-3" style={{ minWidth: '200px', maxWidth: '300px' }}>
                        <div className="p-3 bg-gray-50 rounded border border-gray-200 max-h-32 overflow-y-auto">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{answer.answer || '(No answer provided)'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ width: '150px' }}>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={selectedQuestion.points}
                            step="1"
                            className="w-20 input-field text-right flex-shrink-0"
                            value={gradingData[answer.id] ?? answer.pointsEarned}
                            onChange={(e) => handlePointsChange(answer.id, e.target.value)}
                          />
                          <span className="text-xs text-gray-500 whitespace-nowrap">/ {selectedQuestion.points}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          <div>{answer.oldScore.points.toFixed(1)} pts</div>
                          <div className="text-xs text-gray-500">{answer.oldScore.percentage.toFixed(1)}%</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-sm font-semibold ${hasChanged ? 'text-primary' : 'text-gray-700'}`}>
                          <div>{newScore.points.toFixed(1)} pts</div>
                          <div className="text-xs">{newScore.percentage.toFixed(1)}%</div>
                          {hasChanged && (
                            <div className="text-xs text-yellow-600 mt-1">Changed</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Grading'}
            </button>
            {navigation?.nextId && (
              <button
                onClick={async () => {
                  await handleSave();
                  navigate(`/tests/${testId}/grade/by-question/${navigation.nextId}`);
                }}
                disabled={saving}
                className="btn-primary"
              >
                Save & Next Question →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

