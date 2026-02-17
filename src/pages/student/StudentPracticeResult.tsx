import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { practiceAPI } from '../../services/api';
import { PracticeAttempt } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function StudentPracticeResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account?.role !== 'STUDENT' || !attemptId) {
      navigate('/student/practice', { replace: true });
      return;
    }
    (async () => {
      try {
        const data = await practiceAPI.studentGetAttempt(attemptId);
        setAttempt(data);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load result');
        navigate('/student/practice');
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, account?.role, navigate]);

  const handleDownload = () => {
    if (!attempt) return;
    const summary = attempt.summary;
    const lines: string[] = [
      `Practice: ${attempt.practice?.name ?? 'Practice'}`,
      `Subject: ${attempt.practice?.subjectName ?? ''} | Class: ${attempt.practice?.classLabel ?? ''}`,
      `Submitted: ${attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : ''}`,
      '',
      '--- SUMMARY ---',
      `Score: ${summary?.score ?? 0}%`,
      `Correct: ${summary?.correct ?? 0}`,
      `Wrong: ${summary?.wrong ?? 0}`,
      `Total: ${summary?.total ?? 0}`,
      '',
      '--- QUESTIONS & ANSWERS ---',
    ];
    (attempt.answers || []).forEach((a, i) => {
      const q = (a as any).question;
      lines.push('');
      lines.push(`${i + 1}. ${q?.questionText ?? ''}`);
      lines.push(`   Your answer: ${a.selectedAnswer}`);
      lines.push(`   Correct: ${a.isCorrect ? 'Yes' : 'No'}`);
      if (q?.correctAnswer) lines.push(`   Correct answer: ${q.correctAnswer}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-result-${attempt.practice?.name ?? 'practice'}-${attemptId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Downloaded');
  };

  if (account?.role !== 'STUDENT') return null;
  if (loading || !attempt) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500">Loading result…</p>
        </div>
      </div>
    );
  }

  const summary = attempt.summary ?? { total: 0, correct: 0, wrong: 0, score: 0 };
  const answers = attempt.answers || [];

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <button
        type="button"
        onClick={() => navigate('/student/practice')}
        className="text-[var(--theme-primary)] hover:underline text-sm font-medium mb-4"
      >
        ← Back to Practice
      </button>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--theme-primary,#A8518A)] via-[var(--theme-primary-700,#721c55)] to-slate-800 text-white p-6 sm:p-8 mb-6 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Practice result</h1>
        <p className="text-white/90 text-sm mt-1">{attempt.practice?.name}</p>
        <p className="text-white/70 text-xs mt-1">{attempt.practice?.subjectName} · {attempt.practice?.classLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>{summary.score}%</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Score</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{summary.correct}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Correct</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-bold text-red-500">{summary.wrong}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Wrong</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-bold text-gray-800">{summary.total}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Total</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download result
        </button>
      </div>

      {/* Review */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">Review</h2>
        </div>
        <div className="p-6">
          <ul className="space-y-4">
            {answers.map((a: any, i: number) => {
              const q = a.question;
              const options = q?.options && typeof q.options === 'object' ? q.options : {};
              return (
                <li key={a.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                  <p className="font-medium text-gray-900 mb-2">{i + 1}. {q?.questionText}</p>
                  <p className="text-sm text-gray-600">
                    Your answer: <span className={a.isCorrect ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{a.selectedAnswer}</span>
                    {options[a.selectedAnswer] && ` (${options[a.selectedAnswer]})`}
                  </p>
                  {!a.isCorrect && q?.correctAnswer && (
                    <p className="text-sm text-emerald-600 mt-1">
                      Correct answer: {q.correctAnswer}
                      {options[q.correctAnswer] && ` (${options[q.correctAnswer]})`}
                    </p>
                  )}
                  <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${a.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {a.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
