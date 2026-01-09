import { useEffect, useState } from 'react';
import { questionAPI, subjectAPI, testAPI } from '../../services/api';
import { Question, Test } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function QuestionBank() {
  const { account } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subjectId: '',
    grade: '',
    search: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    questionId: '',
    testId: '',
    subjectId: '',
    grade: '',
  });
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [loadingTestQuestions, setLoadingTestQuestions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    questionText: '',
    questionType: 'multiple_choice' as 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer',
    options: '{"A": "", "B": "", "C": ""}',
    correctAnswer: '',
    points: '1.0',
    subjectId: '',
    grade: '',
  });
  const [optionInputs, setOptionInputs] = useState({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  });
  const [useVisualBuilder, setUseVisualBuilder] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    questionText: '',
    questionType: 'multiple_choice' as 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer',
    options: '{"A": "", "B": "", "C": ""}',
    correctAnswer: '',
    points: '1.0',
    subjectId: '',
    grade: '',
  });
  const [editOptionInputs, setEditOptionInputs] = useState({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  });
  const [useEditVisualBuilder, setUseEditVisualBuilder] = useState(true);
  const [bulkUploadForm, setBulkUploadForm] = useState({
    subjectId: '',
    grade: '',
  });
  const [bulkUploading, setBulkUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filters]);

  // Initialize edit form when editingQuestion changes
  useEffect(() => {
    if (editingQuestion) {
      const options = editingQuestion.options as any;
      const optionsString = options ? JSON.stringify(options, null, 2) : '{"A": "", "B": "", "C": ""}';
      
      // Initialize option inputs from question options
      const optionInputs: any = { A: '', B: '', C: '', D: '', E: '' };
      if (options && typeof options === 'object') {
        Object.keys(options).forEach((key) => {
          if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
            optionInputs[key] = options[key] || '';
          }
        });
      }

      setEditForm({
        questionText: editingQuestion.questionText || '',
        questionType: editingQuestion.questionType || 'multiple_choice',
        options: optionsString,
        correctAnswer: editingQuestion.correctAnswer || '',
        points: editingQuestion.points?.toString() || '1.0',
        subjectId: editingQuestion.questionBankSubjectId || '',
        grade: editingQuestion.questionBankGrade || '',
      });
      setEditOptionInputs(optionInputs);
      setUseEditVisualBuilder(true);
    }
  }, [editingQuestion]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadQuestions(),
        loadSubjects(),
        loadTests(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const params: any = {};
      if (filters.subjectId) {
        params.subjectId = filters.subjectId;
      }
      if (filters.grade) {
        params.grade = filters.grade;
      }
      const response = await questionAPI.getBankQuestions(params);
      let filtered = response.data || [];
      
      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter((q: Question) =>
          q.questionText.toLowerCase().includes(searchLower)
        );
      }
      
      setQuestions(filtered);
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      toast.error(error.response?.data?.error || 'Failed to load questions');
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Failed to load subjects');
    }
  };

  const loadTests = async () => {
    try {
      const response = await testAPI.getAll();
      setTests(response.data || []);
    } catch (error) {
      console.error('Failed to load tests');
    }
  };

  const handleAddFromTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.questionId || !addForm.subjectId || !addForm.grade) {
      toast.error('Please fill in all required fields');
      return;
    }

    setAdding(true);
    try {
      await questionAPI.addToBank({
        questionId: addForm.questionId,
        subjectId: addForm.subjectId,
        grade: addForm.grade,
      });
      toast.success('Question added to bank successfully');
      setShowAddModal(false);
      setAddForm({ questionId: '', testId: '', subjectId: '', grade: '' });
      await loadQuestions();
    } catch (error: any) {
      console.error('Failed to add question to bank:', error);
      toast.error(error.response?.data?.error || 'Failed to add question to bank');
    } finally {
      setAdding(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.questionText || !createForm.correctAnswer || !createForm.subjectId || !createForm.grade) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      // Parse options
      let parsedOptions: any = null;
      if (createForm.questionType === 'multiple_choice' || createForm.questionType === 'multiple_select') {
        if (useVisualBuilder) {
          const optionsObj: Record<string, string> = {};
          (['A', 'B', 'C', 'D', 'E'] as const).forEach((key) => {
            if (optionInputs[key]) {
              optionsObj[key] = optionInputs[key];
            }
          });
          parsedOptions = optionsObj;
        } else {
          try {
            parsedOptions = JSON.parse(createForm.options);
          } catch (e) {
            toast.error('Invalid options JSON format');
            setCreating(false);
            return;
          }
        }
      }

      // Create question directly in the bank
      await questionAPI.createInBank({
        questionText: createForm.questionText,
        questionType: createForm.questionType,
        options: parsedOptions,
        correctAnswer: createForm.correctAnswer,
        points: parseFloat(createForm.points),
        subjectId: createForm.subjectId,
        grade: createForm.grade,
      });

      toast.success('Question created and added to bank successfully');
      setShowCreateModal(false);
      setCreateForm({
        questionText: '',
        questionType: 'multiple_choice',
        options: '{"A": "", "B": "", "C": ""}',
        correctAnswer: '',
        points: '1.0',
        subjectId: '',
        grade: '',
      });
      setOptionInputs({ A: '', B: '', C: '', D: '', E: '' });
      await loadQuestions();
    } catch (error: any) {
      console.error('Failed to create question:', error);
      toast.error(error.response?.data?.error || 'Failed to create question');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (!editForm.questionText || !editForm.correctAnswer || !editForm.subjectId || !editForm.grade) {
      toast.error('Please fill in all required fields');
      return;
    }

    setEditing(true);
    try {
      // Parse options
      let parsedOptions: any = null;
      if (editForm.questionType === 'multiple_choice' || editForm.questionType === 'multiple_select') {
        if (useEditVisualBuilder) {
          const optionsObj: Record<string, string> = {};
          (['A', 'B', 'C', 'D', 'E'] as const).forEach((key) => {
            if (editOptionInputs[key]) {
              optionsObj[key] = editOptionInputs[key];
            }
          });
          parsedOptions = optionsObj;
        } else {
          try {
            parsedOptions = JSON.parse(editForm.options);
          } catch (e) {
            toast.error('Invalid options JSON format');
            setEditing(false);
            return;
          }
        }
      }

      // Update question
      await questionAPI.update(editingQuestion.id, {
        questionText: editForm.questionText,
        questionType: editForm.questionType,
        options: parsedOptions,
        correctAnswer: editForm.correctAnswer,
        points: parseFloat(editForm.points),
        subjectId: editForm.subjectId,
        grade: editForm.grade,
      });

      toast.success('Question updated successfully');
      setEditingQuestion(null);
      setEditForm({
        questionText: '',
        questionType: 'multiple_choice',
        options: '{"A": "", "B": "", "C": ""}',
        correctAnswer: '',
        points: '1.0',
        subjectId: '',
        grade: '',
      });
      setEditOptionInputs({ A: '', B: '', C: '', D: '', E: '' });
      await loadQuestions();
    } catch (error: any) {
      console.error('Failed to update question:', error);
      toast.error(error.response?.data?.error || 'Failed to update question');
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return;

    try {
      await questionAPI.delete(deletingQuestion.id);
      toast.success('Question deleted from bank successfully');
      setDeletingQuestion(null);
      await loadQuestions();
    } catch (error: any) {
      console.error('Failed to delete question:', error);
      toast.error(error.response?.data?.error || 'Failed to delete question');
    }
  };

  const loadQuestionsFromTest = async (testId: string) => {
    if (!testId) {
      setTestQuestions([]);
      return;
    }
    setLoadingTestQuestions(true);
    try {
      const response = await questionAPI.getByTest(testId);
      setTestQuestions(response.data || []);
    } catch (error: any) {
      console.error('Failed to load questions from test:', error);
      toast.error(error.response?.data?.error || 'Failed to load questions from test');
      setTestQuestions([]);
    } finally {
      setLoadingTestQuestions(false);
    }
  };

  const handleBulkUploadToBank = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate required fields
    if (!bulkUploadForm.subjectId || !bulkUploadForm.grade) {
      toast.error('Please select a subject and enter a grade before uploading');
      e.target.value = ''; // Reset file input
      return;
    }

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidFile) {
      toast.error('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      e.target.value = ''; // Reset file input
      return;
    }

    setBulkUploading(true);
    try {
      await questionAPI.bulkUploadToBank(bulkUploadForm.subjectId, bulkUploadForm.grade, file);
      toast.success('Questions uploaded to bank successfully');
      setShowBulkUploadModal(false);
      setBulkUploadForm({ subjectId: '', grade: '' });
      await loadQuestions();
      e.target.value = ''; // Reset file input
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload questions to bank');
      e.target.value = ''; // Reset file input
    } finally {
      setBulkUploading(false);
    }
  };

  const handleDownloadBankTemplate = async () => {
    try {
      const response = await questionAPI.downloadBankTemplate();
      // Create blob from response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'question-bank-upload-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to download template');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading question bank...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Question Bank</h1>
        <p className="text-gray-600">Manage your question bank - add, edit, and organize questions for reuse across tests</p>
      </div>

      {/* Filters and Actions */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              className="input-field"
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Grade 1"
              value={filters.grade}
              onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm"
            >
              Create New Question
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-secondary text-sm"
            >
              Add from Test
            </button>
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="btn-secondary text-sm"
            >
              Bulk Upload
            </button>
            <button
              onClick={handleDownloadBankTemplate}
              className="btn-secondary text-sm"
            >
              Download Template
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No questions found. Create your first question or add one from an existing test.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">{question.questionText}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Type: {question.questionType}</span>
                      <span>Points: {question.points}</span>
                      {question.questionBankGrade && (
                        <span>Grade: {question.questionBankGrade}</span>
                      )}
                      {question.questionBankSubjectId && (
                        <span>
                          Subject: {subjects.find(s => s.id === question.questionBankSubjectId)?.name || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingQuestion(question)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingQuestion(question)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Edit Question</h3>
            </div>
            <form onSubmit={handleUpdateQuestion} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={editForm.questionText}
                  onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={editForm.questionType}
                  onChange={(e) => setEditForm({ ...editForm, questionType: e.target.value as any })}
                  required
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="multiple_select">Multiple Select</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
              {(editForm.questionType === 'multiple_choice' || editForm.questionType === 'multiple_select') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Options <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseEditVisualBuilder(!useEditVisualBuilder)}
                      className="text-sm text-primary hover:underline"
                    >
                      {useEditVisualBuilder ? 'Use JSON' : 'Use Visual Builder'}
                    </button>
                  </div>
                  {useEditVisualBuilder ? (
                    <div className="space-y-2">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-8 text-sm font-semibold text-gray-700">{key}:</span>
                          <input
                            type="text"
                            className="input-field flex-1"
                            placeholder={`Enter option ${key}${['D', 'E'].includes(key) ? ' (optional)' : ''}`}
                            value={editOptionInputs[key]}
                            onChange={(e) => {
                              const newInputs = { ...editOptionInputs, [key]: e.target.value };
                              setEditOptionInputs(newInputs);
                            }}
                            required={['A', 'B', 'C'].includes(key)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="input-field font-mono text-sm"
                      placeholder='{"A": "First option", "B": "Second option", "C": "Third option"}'
                      value={editForm.options}
                      onChange={(e) => setEditForm({ ...editForm, options: e.target.value })}
                      rows={5}
                      required
                    />
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer <span className="text-red-500">*</span>
                </label>
                {editForm.questionType === 'true_false' ? (
                  <select
                    className="input-field"
                    value={editForm.correctAnswer}
                    onChange={(e) => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                    required
                  >
                    <option value="">Select answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : editForm.questionType === 'short_answer' ? (
                  <input
                    className="input-field"
                    placeholder="Expected answer"
                    value={editForm.correctAnswer}
                    onChange={(e) => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                    required
                  />
                ) : (
                  <input
                    className="input-field"
                    placeholder="e.g., A or A,B for multiple select"
                    value={editForm.correctAnswer}
                    onChange={(e) => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input-field"
                  value={editForm.points}
                  onChange={(e) => setEditForm({ ...editForm, points: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={editForm.subjectId}
                  onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Grade 1, Grade 2"
                  value={editForm.grade}
                  onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  required
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={editing}
                >
                  {editing ? 'Updating...' : 'Update Question'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    setEditForm({
                      questionText: '',
                      questionType: 'multiple_choice',
                      options: '{"A": "", "B": "", "C": ""}',
                      correctAnswer: '',
                      points: '1.0',
                      subjectId: '',
                      grade: '',
                    });
                    setEditOptionInputs({ A: '', B: '', C: '', D: '', E: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add from Test Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Add Question from Test</h3>
            </div>
            <form onSubmit={handleAddFromTest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={addForm.testId}
                  onChange={(e) => {
                    setAddForm({ ...addForm, testId: e.target.value, questionId: '' });
                    loadQuestionsFromTest(e.target.value);
                  }}
                  required
                >
                  <option value="">Select a test</option>
                  {tests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.title}
                    </option>
                  ))}
                </select>
              </div>
              {addForm.testId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question <span className="text-red-500">*</span>
                  </label>
                  {loadingTestQuestions ? (
                    <p className="text-sm text-gray-500">Loading questions...</p>
                  ) : testQuestions.length === 0 ? (
                    <p className="text-sm text-gray-500">No questions found in this test</p>
                  ) : (
                    <select
                      className="input-field"
                      value={addForm.questionId}
                      onChange={(e) => setAddForm({ ...addForm, questionId: e.target.value })}
                      required
                    >
                      <option value="">Select a question</option>
                      {testQuestions.map((question) => (
                        <option key={question.id} value={question.id}>
                          {question.questionText.substring(0, 100)}{question.questionText.length > 100 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={addForm.subjectId}
                  onChange={(e) => setAddForm({ ...addForm, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Grade 1, Grade 2"
                  value={addForm.grade}
                  onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}
                  required
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={adding}
                >
                  {adding ? 'Adding...' : 'Add to Bank'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddForm({ questionId: '', testId: '', subjectId: '', grade: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Create New Question</h3>
            </div>
            <form onSubmit={handleCreateQuestion} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={createForm.questionText}
                  onChange={(e) => setCreateForm({ ...createForm, questionText: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={createForm.questionType}
                  onChange={(e) => setCreateForm({ ...createForm, questionType: e.target.value as any })}
                  required
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="multiple_select">Multiple Select</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
              {(createForm.questionType === 'multiple_choice' || createForm.questionType === 'multiple_select') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Options <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseVisualBuilder(!useVisualBuilder)}
                      className="text-sm text-primary hover:underline"
                    >
                      {useVisualBuilder ? 'Use JSON' : 'Use Visual Builder'}
                    </button>
                  </div>
                  {useVisualBuilder ? (
                    <div className="space-y-2">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-8 text-sm font-semibold text-gray-700">{key}:</span>
                          <input
                            type="text"
                            className="input-field flex-1"
                            placeholder={`Enter option ${key}${['D', 'E'].includes(key) ? ' (optional)' : ''}`}
                            value={optionInputs[key]}
                            onChange={(e) => {
                              const newInputs = { ...optionInputs, [key]: e.target.value };
                              setOptionInputs(newInputs);
                            }}
                            required={['A', 'B', 'C'].includes(key)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="input-field font-mono text-sm"
                      placeholder='{"A": "First option", "B": "Second option", "C": "Third option"}'
                      value={createForm.options}
                      onChange={(e) => setCreateForm({ ...createForm, options: e.target.value })}
                      rows={5}
                      required
                    />
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer <span className="text-red-500">*</span>
                </label>
                {createForm.questionType === 'true_false' ? (
                  <select
                    className="input-field"
                    value={createForm.correctAnswer}
                    onChange={(e) => setCreateForm({ ...createForm, correctAnswer: e.target.value })}
                    required
                  >
                    <option value="">Select answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : createForm.questionType === 'short_answer' ? (
                  <input
                    className="input-field"
                    placeholder="Expected answer"
                    value={createForm.correctAnswer}
                    onChange={(e) => setCreateForm({ ...createForm, correctAnswer: e.target.value })}
                    required
                  />
                ) : (
                  <input
                    className="input-field"
                    placeholder="e.g., A or A,B for multiple select"
                    value={createForm.correctAnswer}
                    onChange={(e) => setCreateForm({ ...createForm, correctAnswer: e.target.value })}
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input-field"
                  value={createForm.points}
                  onChange={(e) => setCreateForm({ ...createForm, points: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={createForm.subjectId}
                  onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Grade 1, Grade 2"
                  value={createForm.grade}
                  onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                  required
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create & Add to Bank'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      questionText: '',
                      questionType: 'multiple_choice',
                      options: '{"A": "", "B": "", "C": ""}',
                      correctAnswer: '',
                      points: '1.0',
                      subjectId: '',
                      grade: '',
                    });
                    setOptionInputs({ A: '', B: '', C: '', D: '', E: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Bulk Upload Questions to Bank</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Upload an Excel file (.xlsx, .xls) or CSV file (.csv) with questions. The file should include columns: questionText, questionType, options, correctAnswer, points, subjectId (optional), grade (optional).
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={bulkUploadForm.subjectId}
                    onChange={(e) => setBulkUploadForm({ ...bulkUploadForm, subjectId: e.target.value })}
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Grade 1, Grade 2"
                    value={bulkUploadForm.grade}
                    onChange={(e) => setBulkUploadForm({ ...bulkUploadForm, grade: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File <span className="text-red-500">*</span>
                  </label>
                  <label className="block w-full cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleBulkUploadToBank}
                      disabled={bulkUploading || !bulkUploadForm.subjectId || !bulkUploadForm.grade}
                    />
                    <div className={`flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 ${(bulkUploading || !bulkUploadForm.subjectId || !bulkUploadForm.grade) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Excel (.xlsx, .xls) or CSV (.csv)</p>
                        {(!bulkUploadForm.subjectId || !bulkUploadForm.grade) && (
                          <p className="text-xs text-red-500 mt-1">Please select subject and enter grade first</p>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> If subjectId and grade are provided in the file, they will override the values selected above.
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setBulkUploadForm({ subjectId: '', grade: '' });
                  }}
                  className="btn-secondary flex-1"
                  disabled={bulkUploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Delete Question</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this question from the bank? This action cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleDeleteQuestion}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingQuestion(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

