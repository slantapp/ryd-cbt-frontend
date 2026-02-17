import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface PracticeItem {
  id: string;
  name: string;
  subjectName: string;
  classLabel: string;
  _count?: { questions: number };
}

interface AttemptItem {
  id: string;
  practiceId: string;
  practice: { id: string; name: string; subjectName: string; classLabel: string };
  startedAt: string;
  submittedAt: string | null;
  totalQuestions: number;
  score: number | null;
}

export default function StudentPractice() {
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [practices, setPractices] = useState<PracticeItem[]>([]);
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  useEffect(() => {
    if (account?.role !== 'STUDENT') {
      navigate('/student/dashboard', { replace: true });
      return;
    }
    load();
  }, [account?.role, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const [pList, aList] = await Promise.all([
        practiceAPI.studentList({ class: filterClass || undefined, subject: filterSubject || undefined }),
        practiceAPI.studentListAttempts(),
      ]);
      setPractices(Array.isArray(pList) ? pList : []);
      setAttempts(Array.isArray(aList) ? aList : []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.role === 'STUDENT') load();
  }, [filterClass, filterSubject]);

  const uniqueClasses = Array.from(new Set(practices.map((p) => p.classLabel).filter(Boolean))).sort();
  const uniqueSubjects = Array.from(new Set(practices.map((p) => p.subjectName).filter(Boolean))).sort();

  if (account?.role !== 'STUDENT') return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--theme-primary,#A8518A)] via-[var(--theme-primary-700,#721c55)] to-slate-800 text-white p-6 mb-6 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
        <p className="mt-1 text-white/90 text-sm">
          Take practice tests and review your answers. Try any practice as many times as you like.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500">Loading…</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Available practices */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900">Available practices</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="">All classes</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="">All subjects</option>
                  {uniqueSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6">
              {practices.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No practices available.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-1">
                  {practices.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:border-[var(--theme-primary-200)] hover:shadow-md transition-all bg-gray-50/30"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{p.subjectName} · {p.classLabel} · {p._count?.questions ?? 0} questions</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/student/practice/${p.id}/take`)}
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl font-medium px-5 py-2.5 text-white shadow-md hover:shadow-lg transition"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                      >
                        Take practice
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* My attempts */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900">My attempts</h2>
            </div>
            <div className="p-6">
              {attempts.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">You have not taken any practice yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-1">
                  {attempts.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition bg-white"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{a.practice?.name ?? 'Practice'}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'In progress'} · {a.totalQuestions} questions
                          {a.score != null && (
                            <span className={`ml-1 font-medium ${a.score >= 70 ? 'text-emerald-600' : a.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              · {a.score}%
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/student/practice/result/${a.id}`)}
                        className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View result
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
