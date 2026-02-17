import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceAPI } from '../../services/api';
import { Practice as PracticeType } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Practice() {
  const { account } = useAuthStore();
  const navigate = useNavigate();
  const isSuperAdmin = account?.role === 'SUPER_ADMIN';
  const [practices, setPractices] = useState<PracticeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', subjectName: '', classLabel: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadPractices();
  }, [isSuperAdmin, navigate]);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await practiceAPI.list();
      setPractices(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load practices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.subjectName.trim() || !createForm.classLabel.trim()) {
      toast.error('Name, subject name, and class are required');
      return;
    }
    setCreating(true);
    try {
      await practiceAPI.create(createForm);
      toast.success('Practice created');
      setShowCreateModal(false);
      setCreateForm({ name: '', subjectName: '', classLabel: '' });
      await loadPractices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create practice');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this practice? Students will no longer see it.')) return;
    setDeletingId(id);
    try {
      await practiceAPI.delete(id);
      toast.success('Practice deleted');
      await loadPractices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete practice');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisibility = async (p: PracticeType) => {
    setTogglingVisibilityId(p.id);
    try {
      await practiceAPI.update(p.id, { isVisible: !(p.isVisible ?? true) });
      toast.success(p.isVisible ? 'Practice hidden from students' : 'Practice visible to students');
      await loadPractices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update visibility');
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  if (!isSuperAdmin) return null;

  const totalStudents = practices.reduce((s, p) => s + (p.studentsTaken ?? 0), 0);

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--theme-primary,#A8518A)] via-[var(--theme-primary-700,#721c55)] to-slate-800 text-white p-6 sm:p-8 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Practice</h1>
            <p className="mt-1 text-white/90 text-sm sm:text-base max-w-xl">
              Create practice tests for all students. Add questions from the bank, school tests, or bulk upload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 inline-flex items-center gap-2 bg-white text-[var(--theme-primary,#A8518A)] font-semibold px-5 py-2.5 rounded-xl hover:bg-white/95 shadow-lg transition hover:scale-[1.02]"
          >
            <span className="text-lg">+</span> Create Practice
          </button>
        </div>
        {!loading && practices.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2">
              <span className="text-white/80 text-sm">Total practices</span>
              <p className="text-xl font-bold">{practices.length}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2">
              <span className="text-white/80 text-sm">Students taken</span>
              <p className="text-xl font-bold">{totalStudents}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500">Loading practices…</p>
        </div>
      ) : practices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">📝</div>
          <p className="text-gray-600 font-medium">No practices yet</p>
          <p className="text-gray-500 text-sm mt-1">Create one to get started.</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 btn-primary rounded-xl"
          >
            Create Practice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Taken</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibility</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {practices.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900">{p.name}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{p.subjectName}</td>
                    <td className="px-5 py-4 text-gray-600">{p.classLabel}</td>
                    <td className="px-5 py-4 text-gray-600">{p._count?.questions ?? 0}</td>
                    <td className="px-5 py-4 text-gray-600">{p.studentsTaken ?? 0}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${p.isVisible !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                        {p.isVisible !== false ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/practice/${p.id}`)}
                          className="text-sm font-medium px-3 py-1.5 rounded-lg transition"
                          style={{ color: 'var(--theme-primary)', backgroundColor: 'var(--theme-primary-50,#f5eef3)' }}
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(p)}
                          disabled={togglingVisibilityId === p.id}
                          className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                        >
                          {togglingVisibilityId === p.id ? '…' : p.isVisible !== false ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          {deletingId === p.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create Practice</h2>
            <p className="text-sm text-gray-500 mb-6">Students will see this in their Practice list.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  className="input-field rounded-xl"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mathematics SS1 Practice"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject name</label>
                <input
                  type="text"
                  className="input-field rounded-xl"
                  value={createForm.subjectName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, subjectName: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
                <input
                  type="text"
                  className="input-field rounded-xl"
                  value={createForm.classLabel}
                  onChange={(e) => setCreateForm((f) => ({ ...f, classLabel: e.target.value }))}
                  placeholder="e.g. SS1, JSS2"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary rounded-xl disabled:opacity-50 px-5 py-2.5">
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
