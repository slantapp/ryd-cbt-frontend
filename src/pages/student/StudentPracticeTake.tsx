import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { practiceAPI } from '../../services/api';
import { Question } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import QuestionImage from '../../components/QuestionImage';

function entriesFromQuestionOptions(options: unknown): [string, string][] {
  if (options == null || options === '') return [];
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, string>);
      }
    } catch {
      return [];
    }
  }
  if (typeof options === 'object' && !Array.isArray(options)) {
    return Object.entries(options as Record<string, string>);
  }
  return [];
}

function splitAnswerTokens(s: string | undefined | null): string[] {
  if (s == null || s === '') return [];
  return String(s).split(',').map((t) => t.trim()).filter(Boolean);
}

/** e.g. "C" + { C: "4" } → "C (4)"; "A,C" → "A (2), C (4)" */
function formatLetterAnswerForDisplay(
  answer: string | undefined | null,
  options: Record<string, string>,
): string {
  const tokens = splitAnswerTokens(answer);
  if (!tokens.length) return answer?.trim() || '—';
  return tokens
    .map((key) => {
      const label = options[key];
      return label ? `${key} (${label})` : key;
    })
    .join(', ');
}

/** DB / upload may use snake_case or human labels. */
function normalizeQuestionType(type: string | undefined | null): Question['questionType'] | null {
  if (!type) return null;
  const raw = String(type).trim().toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
  if (raw === 'multiple_choice' || raw === 'mcq') return 'multiple_choice';
  if (raw === 'multiple_select' || raw === 'msq') return 'multiple_select';
  if (raw === 'true_false' || raw === 'tf') return 'true_false';
  if (raw === 'short_answer' || raw === 'sa') return 'short_answer';
  return null;
}

export default function StudentPracticeTake() {
  const { id: practiceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [practice, setPractice] = useState<{ id: string; name: string; subjectName: string; classLabel: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [shownAnswer, setShownAnswer] = useState<Record<string, boolean>>({});
  const [answerResult, setAnswerResult] = useState<
    Record<string, { isCorrect: boolean; correctAnswer: string; answerRationale?: string | null; topicTag?: string | null }>
  >({});
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
        if (attempt?.id) {
          try {
            const attemptDetails = await practiceAPI.studentGetAttempt(attempt.id);
            const nextAnswers: Record<string, string> = {};
            const nextFlags: Record<string, boolean> = {};
            (attemptDetails?.answers || []).forEach((a: any) => {
              if (typeof a?.questionId === 'string') {
                nextAnswers[a.questionId] = a.selectedAnswer ?? '';
                if (a.isFlagged) nextFlags[a.questionId] = true;
              }
            });
            setAnswers(nextAnswers);
            setFlagged(nextFlags);
          } catch {
            // Non-blocking: practice can continue even if previous state fetch fails.
          }
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to start practice');
        navigate('/student/practice');
      } finally {
        setLoading(false);
      }
    })();
  }, [practiceId, account?.role, navigate]);

  const currentQuestion = questions[currentIndex];
  const questionType = normalizeQuestionType(currentQuestion?.questionType);
  const qId = currentQuestion?.id;
  const selected = qId ? String(answers[qId] ?? '') : '';
  const shown = qId ? shownAnswer[qId] : false;
  const result = qId ? answerResult[qId] : null;
  const isFlagged = qId ? !!flagged[qId] : false;
  const choiceOptionEntries =
    currentQuestion && (questionType === 'multiple_choice' || questionType === 'multiple_select')
      ? entriesFromQuestionOptions(currentQuestion.options)
      : [];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelect = (value: string) => {
    if (!qId || shown) return;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleToggleMultiSelect = (letter: string) => {
    if (!qId || shown) return;
    const cur = splitAnswerTokens(answers[qId] ?? '');
    const next = cur.includes(letter) ? cur.filter((x) => x !== letter) : [...cur, letter];
    setAnswers((prev) => ({ ...prev, [qId]: next.join(',') }));
  };

  const handleToggleFlag = async () => {
    if (!attemptId || !qId) return;
    const nextFlag = !isFlagged;
    setFlagged((prev) => ({ ...prev, [qId]: nextFlag }));
    try {
      await practiceAPI.studentSubmitAnswer(attemptId, {
        questionId: qId,
        selectedAnswer: answers[qId] ?? '',
        isFlagged: nextFlag,
      });
    } catch {
      setFlagged((prev) => ({ ...prev, [qId]: !nextFlag }));
      toast.error('Failed to update flag');
    }
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
        setAnswerResult((prev) => ({
          ...prev,
          [questionId]: {
            isCorrect: res.isCorrect,
            correctAnswer: res.correctAnswer,
            answerRationale: res?.answerRationale ?? null,
            topicTag: res?.topicTag ?? null,
          },
        }));
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
        setAnswerResult((prev) => ({
          ...prev,
          [qId]: {
            isCorrect: res.isCorrect,
            correctAnswer: res.correctAnswer,
            answerRationale: res?.answerRationale ?? null,
            topicTag: res?.topicTag ?? null,
          },
        }));
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

  const getMcOptionClasses = (key: string) => {
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

  const getTfOptionClasses = (option: string) => {
    const base = 'flex items-center gap-3 p-4 rounded-xl border-2 transition-all ';
    if (!shown || !result) {
      const selectedClass = selected === option ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-50,#fdf2f8)]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
      return base + selectedClass + (shown ? ' cursor-default' : ' cursor-pointer');
    }
    const correctKey = (result.correctAnswer || '').trim().toLowerCase();
    const isSelected = selected === option;
    const isCorrectKey = option === correctKey;
    if (isCorrectKey) return base + 'border-emerald-500 bg-emerald-50 cursor-default';
    if (isSelected && !result.isCorrect) return base + 'border-red-400 bg-red-50 cursor-default';
    return base + 'border-gray-100 bg-gray-50/50 cursor-default opacity-80';
  };

  const getMultiSelectRowClasses = (key: string) => {
    const base = 'flex items-center gap-3 p-4 rounded-xl border-2 transition-all ';
    const selectedKeys = splitAnswerTokens(selected);
    const isChosen = selectedKeys.includes(key);
    if (!shown || !result) {
      const selectedClass = isChosen
        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-50,#fdf2f8)]'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
      return base + selectedClass + (shown ? ' cursor-default' : ' cursor-pointer');
    }
    const correctKeys = splitAnswerTokens(result.correctAnswer || '');
    const inCorrect = correctKeys.includes(key);
    const wronglySelected = isChosen && !inCorrect;
    if (inCorrect) return base + 'border-emerald-500 bg-emerald-50 cursor-default';
    if (wronglySelected) return base + 'border-red-400 bg-red-50 cursor-default';
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
          <p className="text-gray-900 font-medium text-lg leading-relaxed mb-3">{currentQuestion?.questionText}</p>
          <QuestionImage imageUrl={currentQuestion?.imageUrl} />
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleFlag}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
                isFlagged
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isFlagged ? 'Flagged' : 'Flag question'}
            </button>
            {isFlagged && <span className="text-xs text-amber-700">This question is flagged for review</span>}
          </div>
          {questionType === 'multiple_choice' && choiceOptionEntries.length > 0 && (
            <div className="mt-6 space-y-3">
              {choiceOptionEntries.map(([key, label]) => (
                <label key={key} className={getMcOptionClasses(key)}>
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
          {questionType === 'multiple_select' && choiceOptionEntries.length === 0 && (
            <p className="mt-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              This question has no answer options. Contact your instructor or skip and continue.
            </p>
          )}
          {questionType === 'multiple_select' && choiceOptionEntries.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-600 mb-1">
                Select one or more correct options. You get credit if every option you choose is correct.
              </p>
              {choiceOptionEntries.map(([key, label]) => {
                const checked = splitAnswerTokens(selected).includes(key);
                return (
                  <label key={key} className={getMultiSelectRowClasses(key)}>
                    <input
                      type="checkbox"
                      name={`q-${qId}-${key}`}
                      value={key}
                      checked={checked}
                      onChange={() => handleToggleMultiSelect(key)}
                      disabled={shown}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                    <span className="font-medium text-gray-700">{key}.</span>
                    <span className="text-gray-900">{label || key}</span>
                  </label>
                );
              })}
            </div>
          )}
          {questionType === 'true_false' && (
            <div className="mt-6 space-y-3">
              {['true', 'false'].map((option) => (
                <label key={option} className={getTfOptionClasses(option)}>
                  <input
                    type="radio"
                    name={`q-${qId}`}
                    value={option}
                    checked={selected === option}
                    onChange={() => handleSelect(option)}
                    disabled={shown}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                  />
                  <span className="capitalize text-gray-900 font-medium">{option}</span>
                </label>
              ))}
            </div>
          )}
          {questionType === 'short_answer' && (
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
              {!result.isCorrect && (
                <p className="mt-1">
                  {questionType === 'multiple_select' && currentQuestion?.options
                    ? formatLetterAnswerForDisplay(
                        result.correctAnswer,
                        currentQuestion.options as Record<string, string>,
                      )
                    : result.correctAnswer}
                </p>
              )}
              {result.answerRationale && (
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="font-medium">Answer rationale: </span>
                  {result.answerRationale}
                </p>
              )}
              {result.topicTag && (
                <p className="mt-2 text-xs opacity-85">
                  <span className="font-medium">Topic: </span>
                  {result.topicTag}
                </p>
              )}
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
            title={flagged[q.id] ? 'Flagged question' : undefined}
          >
            {i + 1}
            {flagged[q.id] ? ' *' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
