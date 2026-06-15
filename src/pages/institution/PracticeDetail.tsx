import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { practiceAPI, questionAPI, subjectAPI, testAPI } from '../../services/api';
import { Practice as PracticeType, Question } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import QuestionImage from '../../components/QuestionImage';

type AddSource = 'bank' | 'test' | 'create' | 'bulk' | null;

export default function PracticeDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const onQuestionsPage = location.pathname.endsWith('/questions');
  const { account } = useAuthStore();
  const isSuperAdmin = account?.role === 'SUPER_ADMIN';
  const [practice, setPractice] = useState<PracticeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [addSource, setAddSource] = useState<AddSource>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [loadingTestQuestions, setLoadingTestQuestions] = useState(false);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankFilters, setBankFilters] = useState({ subjectId: '', grade: '', search: '', topicTag: '' });
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [selectedTestId, setSelectedTestId] = useState('');
  const [addingFromBank, setAddingFromBank] = useState(false);
  const [addingFromTest, setAddingFromTest] = useState(false);
  const [createForm, setCreateForm] = useState({
    questionText: '',
    imageUrl: '',
    questionType: 'multiple_choice' as const,
    options: '{"A": "", "B": "", "C": ""}',
    correctAnswer: '',
    points: '1.0',
    grade: '',
    topicTag: '',
  });
  const [creating, setCreating] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadReport, setBulkUploadReport] = useState<{
    success?: boolean;
    message?: string;
    details?: string[];
    rows?: { rowNumber: number; questionPreview: string; action: string; note?: string }[];
    emptyRowsSkipped?: number;
    linkedFromBank?: number;
    duplicatedInBank?: number;
    createdInBank?: number;
  } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', subjectName: '', classLabel: '' });
  const [updatingDetails, setUpdatingDetails] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (id) {
      loadPractice();
      loadTests();
    }
  }, [id, isSuperAdmin, navigate]);

  const loadPractice = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await practiceAPI.getOne(id);
      setPractice(data);
      setEditForm({
        name: data.name,
        subjectName: data.subjectName,
        classLabel: data.classLabel,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load practice');
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    try {
      const res = await testAPI.getAll();
      setTests(res.data || []);
    } catch {
      setTests([]);
    }
  };

  const loadBankQuestions = async (filtersOverride?: typeof bankFilters) => {
    const f = filtersOverride ?? bankFilters;
    setLoadingBank(true);
    try {
      const data = await questionAPI.getBankQuestions({
        subjectId: f.subjectId || undefined,
        grade: f.grade?.trim() || undefined,
        search: f.search?.trim() || undefined,
        topicTag: f.topicTag?.trim() || undefined,
        limit: 500,
      });
      setBankQuestions(data?.questions ?? []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load question bank');
      setBankQuestions([]);
    } finally {
      setLoadingBank(false);
    }
  };

  useEffect(() => {
    if (addSource === 'bank') {
      subjectAPI.getAll().then((r) => setSubjects(r.data || [])).catch(() => setSubjects([]));
    }
  }, [addSource]);

  // Auto-apply bank filters when any filter changes (debounced for text fields)
  useEffect(() => {
    if (addSource !== 'bank') return;
    const delay =
      bankFilters.search.trim() || bankFilters.grade.trim() || bankFilters.topicTag.trim() ? 350 : 0;
    const t = setTimeout(() => {
      loadBankQuestions();
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadBankQuestions uses latest bankFilters from closure
  }, [addSource, bankFilters.subjectId, bankFilters.grade, bankFilters.topicTag, bankFilters.search]);


  const loadTestQuestions = async (testId: string) => {
    if (!testId) {
      setTestQuestions([]);
      return;
    }
    setLoadingTestQuestions(true);
    try {
      const res = await questionAPI.getByTest(testId);
      setTestQuestions(res.data || []);
    } catch {
      setTestQuestions([]);
    } finally {
      setLoadingTestQuestions(false);
    }
  };

  const handleAddFromBank = async () => {
    if (!id || selectedBankIds.size === 0) return;
    setAddingFromBank(true);
    try {
      const res = await practiceAPI.addQuestionsFromBank(id, Array.from(selectedBankIds));
      const data = res.data as { added?: number; skipped?: number; message?: string };
      const msg = (data.skipped ?? 0) > 0
        ? `${data.added ?? 0} added. ${data.skipped} already in this practice.`
        : `${data.added ?? 0} question(s) added`;
      toast.success(msg);
      setAddSource(null);
      setSelectedBankIds(new Set());
      await loadPractice();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add questions');
    } finally {
      setAddingFromBank(false);
    }
  };

  const handleAddFromTest = async () => {
    if (!id || selectedTestIds.size === 0) return;
    setAddingFromTest(true);
    try {
      const res = await practiceAPI.addQuestionsFromTest(id, selectedTestId, Array.from(selectedTestIds));
      const data = res.data as { added?: number; skipped?: number };
      const msg = (data.skipped ?? 0) > 0
        ? `${data.added ?? 0} added. ${data.skipped} already in this practice.`
        : `${data.added ?? 0} question(s) added`;
      toast.success(msg);
      setAddSource(null);
      setSelectedTestId('');
      setSelectedTestIds(new Set());
      setTestQuestions([]);
      await loadPractice();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add questions');
    } finally {
      setAddingFromTest(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !createForm.questionText.trim() || !createForm.correctAnswer.trim()) {
      toast.error('Question text and correct answer are required');
      return;
    }
    setCreating(true);
    try {
      await practiceAPI.createQuestion(id, {
        questionText: createForm.questionText,
        imageUrl: createForm.imageUrl.trim() || null,
        questionType: createForm.questionType,
        options: createForm.options,
        correctAnswer: createForm.correctAnswer,
        points: createForm.points,
        grade: createForm.grade || practice?.classLabel,
        topicTag: createForm.topicTag.trim() || null,
      });
      toast.success('Question created and added to practice');
      setAddSource(null);
      setCreateForm({ questionText: '', imageUrl: '', questionType: 'multiple_choice', options: '{"A": "", "B": "", "C": ""}', correctAnswer: '', points: '1.0', grade: '', topicTag: '' });
      await loadPractice();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create question');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setBulkUploading(true);
    setBulkUploadReport(null);
    try {
      const data = await practiceAPI.bulkUpload(id, file);
      setBulkUploadReport({
        success: true,
        message: data.message,
        rows: data.rows,
        emptyRowsSkipped: data.emptyRowsSkipped,
        linkedFromBank: data.linkedFromBank,
        duplicatedInBank: data.duplicatedInBank,
        createdInBank: data.createdInBank,
      });
      toast.success(data.message || `${data.count ?? 0} questions uploaded`);
      await loadPractice();
    } catch (error: any) {
      const payload = error.response?.data;
      setBulkUploadReport({
        success: false,
        message: payload?.error || 'Failed to upload',
        details: payload?.details,
      });
      toast.error(payload?.error || 'Failed to upload');
    } finally {
      setBulkUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!id) return;
    setRemovingId(questionId);
    try {
      await practiceAPI.removeQuestion(id, questionId);
      toast.success('Question removed from practice');
      await loadPractice();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await practiceAPI.downloadTemplate();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'practice-bulk-template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download template');
    }
  };

  if (!isSuperAdmin) return null;
  if (loading || !practice) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading practice…</p>
      </div>
    );
  }

  const questions = practice.questions || [];

  const openBankModal = () => {
    setBankFilters({ subjectId: '', grade: '', search: '', topicTag: '' });
    setSelectedBankIds(new Set());
    setAddSource('bank');
  };

  const startEditingDetails = () => {
    if (!practice) return;
    setEditForm({
      name: practice.name,
      subjectName: practice.subjectName,
      classLabel: practice.classLabel,
    });
    setIsEditingDetails(true);
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practice) return;
    if (!editForm.name.trim() || !editForm.subjectName.trim() || !editForm.classLabel.trim()) {
      toast.error('Name, subject name, and class are required');
      return;
    }
    setUpdatingDetails(true);
    try {
      const updated = await practiceAPI.update(practice.id, {
        name: editForm.name.trim(),
        subjectName: editForm.subjectName.trim(),
        classLabel: editForm.classLabel.trim(),
      });
      setPractice((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsEditingDetails(false);
      toast.success('Practice details updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update practice');
    } finally {
      setUpdatingDetails(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <button type="button" onClick={() => navigate('/practice')} className="text-primary hover:underline text-sm">
          ← Back to Practice
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{practice.name}</h1>
          <p className="text-gray-600">
            {practice.subjectName} · {practice.classLabel} · {questions.length} question(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEditingDetails ? (
            <button type="button" onClick={startEditingDetails} className="btn-secondary text-sm">
              Edit details
            </button>
          ) : null}
          {!onQuestionsPage ? (
            <Link to={`/practice/${id}/questions`} className="btn-primary text-sm">
              Questions ({questions.length})
            </Link>
          ) : (
            <Link to={`/practice/${id}`} className="btn-secondary text-sm">
              ← Practice details
            </Link>
          )}
        </div>
      </div>

      {!onQuestionsPage && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Practice details</h2>
          {isEditingDetails ? (
            <form onSubmit={handleUpdateDetails} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="input-field rounded-xl w-full"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject name</label>
                <input
                  type="text"
                  className="input-field rounded-xl w-full"
                  value={editForm.subjectName}
                  onChange={(e) => setEditForm((f) => ({ ...f, subjectName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <input
                  type="text"
                  className="input-field rounded-xl w-full"
                  value={editForm.classLabel}
                  onChange={(e) => setEditForm((f) => ({ ...f, classLabel: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={updatingDetails} className="btn-primary text-sm disabled:opacity-50">
                  {updatingDetails ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingDetails(false);
                    if (practice) {
                      setEditForm({
                        name: practice.name,
                        subjectName: practice.subjectName,
                        classLabel: practice.classLabel,
                      });
                    }
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{practice.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Subject</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{practice.subjectName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Class</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{practice.classLabel}</dd>
                </div>
              </dl>
              <p className="text-sm text-gray-600 mb-4">
                Manage questions on a separate page. Use the Question Bank to find items by grade ({practice.classLabel}),
                subject, or topic tag.
              </p>
              <Link to={`/practice/${id}/questions`} className="btn-primary text-sm inline-block">
                Manage questions
              </Link>
            </>
          )}
        </div>
      )}

      {onQuestionsPage && (
        <>
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">Add questions</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openBankModal} className="btn-secondary text-sm">
            From Question Bank
          </button>
          <button type="button" onClick={() => setAddSource('test')} className="btn-secondary text-sm">
            From school test
          </button>
          <button type="button" onClick={() => setAddSource('create')} className="btn-secondary text-sm">
            Create new question
          </button>
          <button type="button" onClick={() => setAddSource('bulk')} className="btn-secondary text-sm">
            Bulk upload
          </button>
          <button type="button" onClick={handleDownloadTemplate} className="btn-secondary text-sm">
            Download template
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Use the template for bulk upload. Columns: Question Text, Question Type, Option A–D, Correct Answer, Points, Answer Rationale, Topic Tag, Image (optional). Short Answer: leave options blank; model answer in Correct Answer or Answer Rationale. Multiple select: comma-separated answers. The practice class is used as grade.
        </p>
      </div>

      {/* Modal: From Question Bank */}
      {addSource === 'bank' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Add from Question Bank</h3>
            <p className="text-sm text-gray-500 mb-4">
              All bank questions are shown by default. Change subject, grade, or topic tag to narrow the list (filters apply automatically).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <select
                  className="input-field w-full text-sm"
                  value={bankFilters.subjectId}
                  onChange={(e) => setBankFilters((f) => ({ ...f, subjectId: e.target.value }))}
                >
                  <option value="">All</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                <input
                  type="text"
                  className="rounded-xl border border-gray-200 w-full px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                  placeholder="e.g. SS1"
                  value={bankFilters.grade}
                  onChange={(e) => setBankFilters((f) => ({ ...f, grade: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Topic tag</label>
                <input
                  type="text"
                  className="input-field w-full text-sm"
                  placeholder="e.g. Algebra"
                  value={bankFilters.topicTag}
                  onChange={(e) => setBankFilters((f) => ({ ...f, topicTag: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  className="input-field w-full text-sm"
                  placeholder="Search text..."
                  value={bankFilters.search}
                  onChange={(e) => setBankFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {loadingBank ? 'Loading…' : `${bankQuestions.length} question(s)`}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {loadingBank && bankQuestions.length === 0 ? (
                <p className="text-sm text-gray-500">Loading questions…</p>
              ) : bankQuestions.length === 0 ? (
                <p className="text-sm text-gray-500">No questions match. Change filters or search.</p>
              ) : (
                bankQuestions.map((q) => (
                  <label key={q.id} className="flex items-start gap-2 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedBankIds.has(q.id)}
                      onChange={() => {
                        setSelectedBankIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(q.id)) next.delete(q.id);
                          else next.add(q.id);
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm">
                      <span className="line-clamp-2 block">{q.questionText}</span>
                      {q.topicTag && <span className="text-xs text-gray-500">Topic: {q.topicTag}</span>}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">Showing up to 500 bank questions. Use filters to narrow.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAddSource(null); setSelectedBankIds(new Set()); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleAddFromBank} disabled={selectedBankIds.size === 0 || addingFromBank} className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--theme-primary)' }}>
                {addingFromBank ? 'Adding…' : `Add ${selectedBankIds.size} selected`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: From Test */}
      {addSource === 'test' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Add from school test</h3>
            <p className="text-sm text-gray-500 mb-4">Pick a test and select questions.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select test</label>
              <select
                className="input-field w-full"
                value={selectedTestId}
                onChange={(e) => {
                  setSelectedTestId(e.target.value);
                  setSelectedTestIds(new Set());
                  loadTestQuestions(e.target.value);
                }}
              >
                <option value="">Choose a test</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            {selectedTestId && (
              <div className="mb-4">
                {loadingTestQuestions ? (
                  <p className="text-sm text-gray-500">Loading questions…</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {testQuestions.map((q) => (
                      <label key={q.id} className="flex items-start gap-2 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedTestIds.has(q.id)}
                          onChange={() => {
                            setSelectedTestIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(q.id)) next.delete(q.id);
                              else next.add(q.id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm line-clamp-2">{q.questionText}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAddSource(null); setSelectedTestId(''); setSelectedTestIds(new Set()); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleAddFromTest} disabled={selectedTestIds.size === 0 || addingFromTest} className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--theme-primary)' }}>
                {addingFromTest ? 'Adding…' : `Add ${selectedTestIds.size} selected`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create new */}
      {addSource === 'create' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Create new question</h3>
            <p className="text-sm text-gray-500 mb-4">Add a single question to this practice.</p>
            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question text *</label>
                <textarea className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" rows={3} value={createForm.questionText} onChange={(e) => setCreateForm((f) => ({ ...f, questionText: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL or path (optional)</label>
                <input type="text" className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" placeholder="https://… or questions/diagram.png" value={createForm.imageUrl} onChange={(e) => setCreateForm((f) => ({ ...f, imageUrl: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" value={createForm.questionType} onChange={(e) => setCreateForm((f) => ({ ...f, questionType: e.target.value as any }))}>
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="multiple_select">Multiple select</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short answer</option>
                </select>
              </div>
              {(createForm.questionType === 'multiple_choice' || createForm.questionType === 'multiple_select') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options (JSON)</label>
                  <textarea className="rounded-xl border border-gray-200 w-full px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" rows={4} value={createForm.options} onChange={(e) => setCreateForm((f) => ({ ...f, options: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct answer *</label>
                <input className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" value={createForm.correctAnswer} onChange={(e) => setCreateForm((f) => ({ ...f, correctAnswer: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input type="number" step="0.1" className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" value={createForm.points} onChange={(e) => setCreateForm((f) => ({ ...f, points: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade (optional)</label>
                <input className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" placeholder={practice.classLabel} value={createForm.grade} onChange={(e) => setCreateForm((f) => ({ ...f, grade: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic tag (optional)</label>
                <input className="rounded-xl border border-gray-200 w-full px-3 py-2 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent" placeholder="e.g. Algebra" value={createForm.topicTag} onChange={(e) => setCreateForm((f) => ({ ...f, topicTag: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAddSource(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating} className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--theme-primary)' }}>{creating ? 'Creating…' : 'Create & add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk upload */}
      {addSource === 'bulk' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Bulk upload</h3>
            <p className="text-sm text-gray-500 mb-4">
              Use the practice template (no grade column): Question Text, Question Type, Option A–D, Correct Answer, Points. For Short Answer rows, leave options blank — put a model answer in Correct Answer (or Answer Rationale). Prefer .xlsx over CSV when answers contain commas. The practice class ({practice.classLabel}) is used as grade. If any row is invalid, nothing is added.
            </p>
            <button type="button" onClick={handleDownloadTemplate} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 mb-4 block">
              Download template
            </button>
            <label className="block">
              <span className="sr-only">Choose file</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="block w-full text-sm" onChange={handleBulkUpload} disabled={bulkUploading} />
            </label>
            {bulkUploading && <p className="text-sm text-gray-500 mt-2">Uploading…</p>}
            {bulkUploadReport && (
              <div
                className={`mt-4 rounded-xl border p-4 text-sm max-h-64 overflow-y-auto ${
                  bulkUploadReport.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <p className="font-medium">{bulkUploadReport.message}</p>
                {bulkUploadReport.success && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {bulkUploadReport.emptyRowsSkipped ? (
                      <li>{bulkUploadReport.emptyRowsSkipped} blank row(s) in the file were ignored.</li>
                    ) : null}
                    {bulkUploadReport.linkedFromBank ? (
                      <li>{bulkUploadReport.linkedFromBank} linked from the question bank.</li>
                    ) : null}
                    {bulkUploadReport.duplicatedInBank ? (
                      <li>{bulkUploadReport.duplicatedInBank} duplicated in the bank (same text already in practice or repeated in file).</li>
                    ) : null}
                    {(bulkUploadReport.createdInBank ?? 0) > 0 ? (
                      <li>{bulkUploadReport.createdInBank} newly created in the bank.</li>
                    ) : null}
                  </ul>
                )}
                {bulkUploadReport.details && bulkUploadReport.details.length > 0 && (
                  <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
                    {bulkUploadReport.details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {bulkUploadReport.success && bulkUploadReport.rows && bulkUploadReport.rows.length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium">Per-row breakdown</summary>
                    <ul className="mt-1 space-y-1">
                      {bulkUploadReport.rows.map((r) => (
                        <li key={`${r.rowNumber}-${r.action}`}>
                          Row {r.rowNumber}: {r.action.replace(/_/g, ' ')} — {r.questionPreview}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setAddSource(null);
                  setBulkUploadReport(null);
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">Questions in this practice ({questions.length})</h2>
        </div>
        <div className="p-6">
        {questions.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No questions yet. Add some using the buttons above.</p>
        ) : (
          <ul className="space-y-2">
            {questions.map((pq, idx) => (
              <li key={pq.id} className="flex items-start justify-between gap-2 p-4 border border-gray-100 rounded-xl hover:bg-gray-50/50">
                <div className="min-w-0 flex-1">
                  <span className="text-gray-500 text-sm mr-2">{idx + 1}.</span>
                  <span className="text-gray-900">{pq.question?.questionText ?? '—'}</span>
                  <QuestionImage imageUrl={pq.question?.imageUrl} className="max-w-xs h-auto rounded-lg border border-gray-200 mt-2" />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(pq.questionId)}
                  disabled={removingId === pq.questionId}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 shrink-0 disabled:opacity-50"
                >
                  {removingId === pq.questionId ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
