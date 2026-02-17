import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { practiceAPI } from '../../services/api';
import { Question } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function StudentPracticeTake() {
  const { id: practiceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [practice, setPractice] = useState<{ id: string; name: string; subjectName: string; classLabel: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shownAnswer, setShownAnswer] = useState<Record<string, boolean>>({});
  const [answerResult, setAnswerResult] = useState<Record<string, { isCorrect: boolean; correctAnswer: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account?.role !== 'STUDENT' || !practiceId) {
      navigate('/student/practice', { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [meta, qList] = await Promise.all([
          practiceAPI.studentGet(practiceId),
          practiceAPI.studentGetQuestions(practiceId),
        ]);
        setPractice(meta);
        setQuestions(Array.isArray(qList) ? qList : []);
        const attempt = await practiceAPI.studentStartAttempt(practiceId);
        setAttemptId(attempt?.id ?? null);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to start practice');
        navigate('/student/practice');
      } finally {
        setLoading(false);
      }
    })();
  }, [practiceId, account?.role, navigate]);

  const currentQuestion = questions[currentIndex];
  const qId = currentQuestion?.id;
  const selected = qId ? answers[qId] : '';
  const shown = qId ? shownAnswer[qId] : false;
  const result = qId ? answerResult[qId] : null;
  const options = currentQuestion?.options && typeof currentQuestion.options === 'object'
    ? Object.entries(currentQuestion.options as Record<string, string>)
    : [];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelect = (value: string) => {
    if (!qId || shown) return;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const saveAnswer = async (questionId: string, value: string, showAnswerFlag = false) => {
    if (!attemptId) return;
    try {
      const res = await practiceAPI.studentSubmitAnswer(attemptId, {
        questionId,
        selectedAnswer: value,
        showAnswer: showAnswerFlag,
      });
      if (showAnswerFlag && res?.isCorrect !== undefined && res?.correctAnswer !== undefined) {
        setAnswerResult((prev) => ({ ...prev, [questionId]: { isCorrect: res.isCorrect, correctAnswer: res.correctAnswer } }));
        setShownAnswer((prev) => ({ ...prev, [questionId]: true }));
      }
    } catch (e) {
      // ignore for background save
    }
  };

  const handleShowAnswer = async () => {
    if (!attemptId || !qId || shown) return;
    const value = answers[qId] ?? '';
    try {
      const res = await practiceAPI.studentSubmitAnswer(attemptId, {
        questionId: qId,
        selectedAnswer: value,
        showAnswer: true,
      });
      setShownAnswer((prev) => ({ ...prev, [qId]: true }));
      if (res?.isCorrect !== undefined && res?.correctAnswer !== undefined) {
        setAnswerResult((prev) => ({ ...prev, [qId]: { isCorrect: res.isCorrect, correctAnswer: res.correctAnswer } }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save answer');
    }
  };

  const handleSubmitAttempt = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      await practiceAPI.studentSubmitAttempt(attemptId);
      toast.success('Practice submitted');
      navigate(`/student/practice/result/${attemptId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionClasses = (key: string) => {
    const base = 'flex items-center gap-3 p-4 rounded-xl border-2 transition-all ';
    if (!shown || !result) {
      const selectedClass = selected === key ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-50,#fdf2f8)]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
      return base + selectedClass + (shown ? ' cursor-default' : ' cursor-pointer');
    }
    const correctKey = result.correctAnswer?.trim();
    const isSelected = selected === key;
    const isCorrectKey = key === correctKey;
    if (isCorrectKey) return base + 'border-emerald-500 bg-emerald-50 cursor-default';
    if (isSelected && !result.isCorrect) return base + 'border-red-400 bg-red-50 cursor-default';
    return base + 'border-gray-100 bg-gray-50/50 cursor-default opacity-80';
  };

  if (account?.role !== 'STUDENT') return null;
  if (loading || !practice || !attemptId) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500">Loading practice…</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-gray-500">No questions in this practice.</p>
        <button type="button" onClick={() => navigate('/student/practice')} className="mt-4 rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
          Back to Practice
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-4">
        <button type="button" onClick={() => navigate('/student/practice')} className="text-[var(--theme-primary)] hover:underline text-sm font-medium">
          ← Back to Practice
        </button>
      </div>

      {/* Header + progress */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--theme-primary,#A8518A)] via-[var(--theme-primary-700,#721c55)] to-slate-800 text-white p-5 mb-6 shadow-xl">
        <h1 className="text-xl font-bold tracking-tight">{practice.name}</h1>
        <p className="text-white/80 text-sm mt-0.5">{practice.subjectName} · {practice.classLabel}</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/90 mb-1">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 sm:p-8">
          <p className="text-gray-900 font-medium text-lg leading-relaxed">{currentQuestion?.questionText}</p>
          {(currentQuestion?.questionType === 'multiple_choice' || currentQuestion?.questionType === 'true_false') && (
            <div className="mt-6 space-y-3">
              {options.map(([key, label]) => (
                <label key={key} className={getOptionClasses(key)}>
                  <input
                    type="radio"
                    name={`q-${qId}`}
                    value={key}
                    checked={selected === key}
                    onChange={() => handleSelect(key)}
                    disabled={shown}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                  />
                  <span className="text-gray-900">{label || key}</span>
                </label>
              ))}
            </div>
          )}
          {currentQuestion?.questionType === 'short_answer' && (
            <div className="mt-6">
              <input
                type="text"
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                value={selected}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [qId!]: e.target.value }))}
                disabled={shown}
                placeholder="Type your answer"
              />
            </div>
          )}
          {shown && result && (
            <div className={`mt-6 p-4 rounded-xl ${result.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              <p className="font-medium">{result.isCorrect ? 'Correct!' : 'Correct answer:'}</p>
              {!result.isCorrect && <p className="mt-1">{result.correctAnswer}</p>}
            </div>
          )}
          {!shown && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleShowAnswer}
                className="rounded-xl border-2 border-[var(--theme-primary)] px-4 py-2 text-sm font-medium text-[var(--theme-primary)] hover:bg-[var(--theme-primary-50,#fdf2f8)]"
              >
                Show answer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={async () => {
              if (qId && answers[qId] !== undefined) await saveAnswer(qId, answers[qId], false);
              setCurrentIndex((i) => i + 1);
            }}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              if (qId && answers[qId] !== undefined) await saveAnswer(qId, answers[qId], false);
              await handleSubmitAttempt();
            }}
            disabled={submitting}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            {submitting ? 'Submitting…' : 'Submit practice'}
          </button>
        )}
      </div>

      {/* Question numbers */}
      <div className="flex flex-wrap gap-2 justify-center">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={async () => {
              if (qId && answers[qId] !== undefined) await saveAnswer(qId, answers[qId], false);
              setCurrentIndex(i);
            }}
            className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
              i === currentIndex
                ? 'text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={i === currentIndex ? { backgroundColor: 'var(--theme-primary)' } : {}}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
