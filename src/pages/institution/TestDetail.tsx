import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { testAPI, questionAPI, sessionAPI, classroomAPI, teacherAPI, customFieldAPI } from '../../services/api';
import { Test, Question, Session, Classroom, Institution, TestCustomField } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Institution[]>([]);
  const [customFields, setCustomFields] = useState<TestCustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    questionType: 'multiple_choice',
    options: '{"A": "", "B": "", "C": ""}',
    correctAnswer: '',
    points: '1.0',
  });
  const [optionInputs, setOptionInputs] = useState({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  });
  const [useVisualBuilder, setUseVisualBuilder] = useState(true);
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    testGroup: 'Assignment',
    isTimed: false,
    duration: '',
    dueDate: '',
    passingScore: '',
    maxAttempts: '1',
    allowRetrial: false,
    scoreVisibility: false,
    requiresManualGrading: false,
    isActive: true,
    sessionId: '',
    classroomId: '',
    teacherId: '',
  });
  const [aiForm, setAiForm] = useState({
    subject: '',
    topic: '',
    age: '',
    academicLevel: '',
    classLevel: '',
    numberOfQuestions: '5',
    questionType: 'multiple_choice' as 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer',
  });

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            loadTest(),
            loadQuestions(),
            loadSessions(),
            loadCustomFields(),
          ]);
          
          if (account && (account.role === 'SCHOOL' || account.role === 'TEACHER')) {
            await loadClassrooms();
          }
          if (account && account.role === 'SCHOOL') {
            await loadTeachers();
          }
        } catch (error) {
          console.error('Error loading test data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [id, account?.role]);

  const loadTest = async () => {
    try {
      const response = await testAPI.getOne(id!);
      setTest(response.data);
      const currentSession = response.data.sessions?.[0]?.session;
      const currentClassroom = response.data.classrooms?.[0]?.classroom;
      const currentTeacher = (response.data as any).teacher;
      
      const dueDate = response.data.dueDate ? new Date(response.data.dueDate).toISOString().slice(0, 16) : '';
      setTestForm({
        title: response.data.title,
        description: response.data.description || '',
        testGroup: response.data.testGroup || 'Assignment',
        isTimed: response.data.isTimed || false,
        duration: response.data.duration?.toString() || '',
        dueDate: dueDate,
        passingScore: response.data.passingScore?.toString() || '',
        maxAttempts: response.data.maxAttempts.toString(),
        allowRetrial: response.data.allowRetrial,
        scoreVisibility: response.data.scoreVisibility || false,
        requiresManualGrading: response.data.requiresManualGrading || false,
        isActive: response.data.isActive,
        sessionId: currentSession?.id || '',
        classroomId: currentClassroom?.id || '',
        teacherId: currentTeacher?.id || '',
      });
    } catch (error: any) {
      console.error('Failed to load test:', error);
      toast.error(error.response?.data?.error || 'Failed to load test');
      throw error;
    }
  };

  const loadClassrooms = async () => {
    try {
      const response = await classroomAPI.list();
      setClassrooms(response.data);
    } catch (error: any) {
      console.error('Failed to load classrooms');
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await teacherAPI.getAll();
      setTeachers(response.data);
    } catch (error: any) {
      console.error('Failed to load teachers');
    }
  };

  const loadSessions = async () => {
    try {
      const response = await sessionAPI.getAll();
      setSessions(response.data);
    } catch (error: any) {
      console.error('Failed to load sessions');
    }
  };

  const loadCustomFields = async () => {
    try {
      if (id) {
        const response = await customFieldAPI.getTestFields(id);
        setCustomFields(response.data || []);
        
        // Load existing custom field values if any
        if (response.data && response.data.length > 0) {
          const values: Record<string, string> = {};
          response.data.forEach((field: TestCustomField) => {
            if (field.fieldValue) {
              values[field.id] = field.fieldValue;
            }
          });
          setCustomFieldValues(values);
        }
      }
    } catch (error: any) {
      console.error('Failed to load custom fields');
    }
  };

  const loadQuestions = async () => {
    try {
      const response = await questionAPI.getByTest(id!);
      setQuestions(response.data || []);
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      console.error('Error response:', error.response?.data);
      // Don't show error toast if test has no questions yet (newly created test) or if it's a 404
      if (error.response?.status === 404) {
        // Test not found or no access - this is handled by loadTest
        setQuestions([]);
      } else {
        // Only show error for actual server errors, not for missing questions
        const errorMessage = error.response?.data?.error || error.message;
        if (errorMessage && !errorMessage.includes('not found')) {
          toast.error(errorMessage);
        }
        setQuestions([]);
      }
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate duration if test is timed
    if (testForm.isTimed && !testForm.duration) {
      toast.error('Duration is required when test is timed');
      return;
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.isRequired && (!customFieldValues[field.id] || customFieldValues[field.id].trim() === '')) {
        toast.error(`Custom field "${field.fieldName}" is required`);
        return;
      }
    }
    
    try {
      await testAPI.update(id!, testForm);

      // Save custom field values if any
      if (Object.keys(customFieldValues).length > 0) {
        const customFieldData = Object.entries(customFieldValues)
          .filter(([_, value]) => value && value.trim() !== '')
          .map(([fieldId, value]) => ({
            fieldId,
            fieldValue: value,
          }));

        if (customFieldData.length > 0) {
          await customFieldAPI.saveTestFields(id!, { customFieldValues: customFieldData });
        }
      }

      toast.success('Test updated');
      setShowEditForm(false);
      loadTest();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update test');
    }
  };

  const handleDeleteTest = async () => {
    try {
      await testAPI.delete(id!);
      toast.success('Test deleted');
      navigate('/tests');
    } catch (error: any) {
      toast.error('Failed to delete test');
    }
  };

  const handlePublish = async () => {
    try {
      await testAPI.publish(id!);
      toast.success('Test published successfully');
      loadTest();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to publish test');
    }
  };

  const handleUnpublish = async () => {
    try {
      await testAPI.unpublish(id!);
      toast.success('Test unpublished successfully');
      loadTest();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unpublish test');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this test? It will be unpublished and hidden from students.')) {
      return;
    }
    try {
      await testAPI.archive(id!);
      toast.success('Test archived successfully');
      loadTest();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to archive test');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const questionData: any = {
        testId: id,
        questionText: questionForm.questionText,
        questionType: questionForm.questionType,
        correctAnswer: questionForm.correctAnswer,
        points: questionForm.points,
      };

      // Only include options for question types that need it
      if (questionForm.questionType === 'multiple_choice' || questionForm.questionType === 'multiple_select') {
        try {
          questionData.options = typeof questionForm.options === 'string' 
            ? JSON.parse(questionForm.options) 
            : questionForm.options;
        } catch (parseError) {
          toast.error('Invalid JSON format for options. Please check your options format.');
          return;
        }
      } else {
        // For true_false and short_answer, set options to null
        questionData.options = null;
      }

      await questionAPI.create(questionData);
      toast.success('Question created');
      setShowQuestionForm(false);
      setQuestionForm({
        questionText: '',
        questionType: 'multiple_choice',
        options: '{"A": "", "B": "", "C": ""}',
        correctAnswer: '',
        points: '1.0',
      });
      setOptionInputs({
        A: '',
        B: '',
        C: '',
        D: '',
        E: '',
      });
      loadQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create question');
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    let optionsString = '{"A": "", "B": "", "C": ""}';
    let parsedOptions = { A: '', B: '', C: '', D: '', E: '' };
    
    if (question.options) {
      if (typeof question.options === 'string') {
        optionsString = question.options;
        try {
          parsedOptions = { ...parsedOptions, ...JSON.parse(question.options) };
        } catch (e) {
          // Keep default
        }
      } else {
        optionsString = JSON.stringify(question.options);
        parsedOptions = { ...parsedOptions, ...(question.options as any) };
      }
    }
    
    setOptionInputs({
      A: parsedOptions.A || '',
      B: parsedOptions.B || '',
      C: parsedOptions.C || '',
      D: parsedOptions.D || '',
      E: parsedOptions.E || '',
    });
    
    setQuestionForm({
      questionText: question.questionText,
      questionType: question.questionType,
      options: optionsString,
      correctAnswer: question.correctAnswer || '',
      points: question.points.toString(),
    });
    setShowQuestionForm(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      const questionData: any = {
        questionText: questionForm.questionText,
        questionType: questionForm.questionType,
        correctAnswer: questionForm.correctAnswer,
        points: questionForm.points,
      };

      // Only include options for question types that need it
      if (questionForm.questionType === 'multiple_choice' || questionForm.questionType === 'multiple_select') {
        try {
          questionData.options = typeof questionForm.options === 'string' 
            ? JSON.parse(questionForm.options) 
            : questionForm.options;
        } catch (parseError) {
          toast.error('Invalid JSON format for options. Please check your options format.');
          return;
        }
      } else {
        // For true_false and short_answer, set options to null
        questionData.options = null;
      }

      await questionAPI.update(editingQuestion.id, questionData);
      toast.success('Question updated');
      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionForm({
        questionText: '',
        questionType: 'multiple_choice',
        options: '{"A": "", "B": "", "C": ""}',
        correctAnswer: '',
        points: '1.0',
      });
      setOptionInputs({
        A: '',
        B: '',
        C: '',
        D: '',
        E: '',
      });
      loadQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update question');
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiGenerating(true);
    try {
      await questionAPI.generateAI({
        testId: id,
        ...aiForm,
        age: parseInt(aiForm.age),
        numberOfQuestions: parseInt(aiForm.numberOfQuestions),
      });
      toast.success('Questions generated');
      setShowAIGenerator(false);
      loadQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate questions');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await questionAPI.bulkUpload(id!, file);
      toast.success('Questions uploaded');
      loadQuestions();
    } catch (error: any) {
      toast.error('Failed to upload questions');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!test) {
    return <div>Test not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/tests" className="text-primary hover:text-primary-600">
            ← Back to Tests
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{test.title}</h1>
        </div>
        <div className="flex space-x-2 flex-wrap gap-2">
          {test && test.requiresManualGrading && (
            <Link
              to={`/tests/${id}/grade`}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Grade Tests
            </Link>
          )}
          {test && !test.isPublished && !test.isArchived && (
            <button
              onClick={handlePublish}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Publish Test
            </button>
          )}
          {test && test.isPublished && !test.isArchived && (
            <button
              onClick={handleUnpublish}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Unpublish Test
            </button>
          )}
          {test && !test.isArchived && (
            <button
              onClick={handleArchive}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Archive Test
            </button>
          )}
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="btn-secondary"
          >
            {showEditForm ? 'Cancel Edit' : 'Edit Test'}
          </button>
          {account?.role === 'SCHOOL' && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Delete Test
          </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="card bg-red-50 border border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Confirm Delete</h3>
          <p className="text-red-700 mb-4">
            Are you sure you want to delete this test? This action cannot be undone.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleDeleteTest}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showEditForm ? (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Edit Test</h2>
          <form onSubmit={handleUpdateTest} className="space-y-4" key="edit-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Session <span className="text-red-500">*</span>
                  {account && account.role === 'TEACHER' && <span className="text-xs text-gray-500 ml-2">(Locked)</span>}
                </label>
                {account && account.role === 'TEACHER' ? (
                  <div className="input-field bg-gray-50 cursor-not-allowed">
                    {test?.sessions?.[0]?.session?.name || 'No session assigned'}
                    {test?.sessions?.[0]?.session?.classAssignments?.[0]?.classroom?.name && ` (${test.sessions[0].session.classAssignments[0].classroom.name})`}
                  </div>
                ) : (
                  <select
                    className="input-field"
                    value={testForm.sessionId}
                    onChange={(e) => {
                      const selectedSession = sessions.find(s => s.id === e.target.value);
                      setTestForm({ 
                        ...testForm, 
                        sessionId: e.target.value,
                        classroomId: selectedSession?.classAssignments?.[0]?.classroomId || testForm.classroomId
                      });
                    }}
                    required
                  >
                    <option value="">Select a session</option>
                    {sessions
                      .filter((s) => s.isActive)
                      .map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                          {session.classAssignments?.[0]?.classroom?.name && ` (${session.classAssignments[0].classroom.name})`}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                  {account && account.role === 'TEACHER' && <span className="text-xs text-gray-500 ml-2">(Locked)</span>}
                </label>
                {account && account.role === 'TEACHER' ? (
                  <div className="input-field bg-gray-50 cursor-not-allowed">
                    {test?.classrooms?.[0]?.classroom?.name || 'No class assigned'}
                    {test?.classrooms?.[0]?.classroom?.academicSession && ` (${test.classrooms[0].classroom.academicSession})`}
                  </div>
                ) : (
                  <select
                    className="input-field"
                    value={testForm.classroomId}
                    onChange={(e) => setTestForm({ ...testForm, classroomId: e.target.value })}
                    required
                  >
                    <option value="">Select a class</option>
                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                        {classroom.academicSession && ` - ${classroom.academicSession}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {account && account.role === 'SCHOOL' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign to Teacher (Optional)
                </label>
                <select
                  className="input-field"
                  value={testForm.teacherId}
                  onChange={(e) => setTestForm({ ...testForm, teacherId: e.target.value })}
                >
                  <option value="">No specific teacher (School-owned test)</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Title <span className="text-red-500">*</span>
                </label>
            <input
              className="input-field"
              placeholder="Test Title"
              value={testForm.title}
              onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
              required
            />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Group <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={testForm.testGroup}
                  onChange={(e) => setTestForm({ ...testForm, testGroup: e.target.value })}
                  required
                >
                  <option value="Assignment">Assignment</option>
                  <option value="Practice Banks">Practice Banks</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Final Assessment">Final Assessment</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
            <textarea
              className="input-field"
              placeholder="Description"
              value={testForm.description}
              onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
              rows={3}
            />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center cursor-pointer group mb-2">
                  <input
                    type="checkbox"
                    checked={testForm.isTimed}
                    onChange={(e) => setTestForm({ ...testForm, isTimed: e.target.checked, duration: e.target.checked ? testForm.duration : '' })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Is this test timed?</span>
                </label>
                {testForm.isTimed && (
              <input
                type="number"
                className="input-field"
                placeholder="Duration (minutes)"
                value={testForm.duration}
                onChange={(e) => setTestForm({ ...testForm, duration: e.target.value })}
                    required={testForm.isTimed}
                    min="1"
                  />
                )}
                {!testForm.isTimed && (
                  <p className="text-xs text-gray-500 mt-1">
                    Students can complete this test anytime before the due date
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={testForm.dueDate}
                  onChange={(e) => setTestForm({ ...testForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="0.1"
                className="input-field"
                placeholder="Passing Score (%)"
                value={testForm.passingScore}
                onChange={(e) => setTestForm({ ...testForm, passingScore: e.target.value })}
              />
              <input
                type="number"
                className="input-field"
                placeholder="Max Attempts"
                value={testForm.maxAttempts}
                onChange={(e) => setTestForm({ ...testForm, maxAttempts: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={testForm.allowRetrial}
                    onChange={(e) =>
                      setTestForm({ ...testForm, allowRetrial: e.target.checked })
                    }
                  className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Allow Retrial</span>
                </label>
              <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={testForm.isActive}
                    onChange={(e) =>
                      setTestForm({ ...testForm, isActive: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>

            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields</h3>
                <div className="space-y-4">
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {field.fieldName}
                        {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.fieldType === 'text' && (
                        <input
                          type="text"
                          className="input-field"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            })
                          }
                          required={field.isRequired}
                        />
                      )}
                      {field.fieldType === 'textarea' && (
                        <textarea
                          className="input-field"
                          rows={3}
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            })
                          }
                          required={field.isRequired}
                        />
                      )}
                      {field.fieldType === 'number' && (
                        <input
                          type="number"
                          className="input-field"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            })
                          }
                          required={field.isRequired}
                        />
                      )}
                      {field.fieldType === 'date' && (
                        <input
                          type="date"
                          className="input-field"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            })
                          }
                          required={field.isRequired}
                        />
                      )}
                      {field.fieldType === 'select' && (
                        <select
                          className="input-field"
                          value={customFieldValues[field.id] || ''}
                          onChange={(e) =>
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            })
                          }
                          required={field.isRequired}
                        >
                          <option value="">Select an option</option>
                          {Array.isArray(field.options) &&
                            field.options.map((option: string, index: number) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                        </select>
                      )}
                      {field.fieldType === 'boolean' && (
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={customFieldValues[field.id] === 'true'}
                            onChange={(e) =>
                              setCustomFieldValues({
                                ...customFieldValues,
                                [field.id]: e.target.checked ? 'true' : 'false',
                              })
                            }
                            className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            {customFieldValues[field.id] === 'true' ? 'Yes' : 'No'}
                          </span>
                        </label>
                      )}
            </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button type="submit" className="btn-primary">
                Update Test
              </button>
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card" key="test-details">
          <h2 className="text-xl font-semibold mb-4">Test Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Duration</label>
              <p className="font-medium">{test.duration} minutes</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Passing Score</label>
              <p className="font-medium">{test.passingScore || 'N/A'}%</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Max Attempts</label>
              <p className="font-medium">{test.maxAttempts}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <p className="font-medium">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    test.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {test.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionForm(!showQuestionForm);
              }}
              className="btn-secondary text-sm"
            >
              {showQuestionForm ? 'Cancel' : 'Add Question'}
            </button>
            <label className="btn-secondary text-sm cursor-pointer">
              Bulk Upload
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBulkUpload}
              />
            </label>
            <a
              href="/sample-questions.csv"
              download
              className="btn-secondary text-sm"
            >
              Download Sample CSV
            </a>
            <a
              href="/sample-questions-template.md"
              target="_blank"
              className="btn-secondary text-sm"
            >
              View Template Guide
            </a>
            <button
              onClick={() => setShowAIGenerator(!showAIGenerator)}
              className="btn-secondary text-sm"
            >
              AI Generate
            </button>
          </div>
        </div>

        {showQuestionForm && (
          <form
            onSubmit={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
            className="mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <h3 className="font-semibold mb-4">
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </h3>
            <div className="space-y-4">
              <textarea
                className="input-field"
                placeholder="Question text"
                value={questionForm.questionText}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, questionText: e.target.value })
                }
                required
              />
              <select
                className="input-field"
                value={questionForm.questionType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setQuestionForm({ 
                    ...questionForm, 
                    questionType: newType,
                    // Reset options when changing type
                    options: (newType === 'multiple_choice' || newType === 'multiple_select')
                      ? '{"A": "", "B": "", "C": ""}'
                      : '',
                    // Reset correct answer for true/false
                    correctAnswer: newType === 'true_false' ? '' : questionForm.correctAnswer,
                  });
                  // Reset option inputs
                  if (newType === 'multiple_choice' || newType === 'multiple_select') {
                    setOptionInputs({
                      A: '',
                      B: '',
                      C: '',
                      D: '',
                      E: '',
                    });
                  }
                }}
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="multiple_select">Multiple Select</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
              </select>
              {(questionForm.questionType === 'multiple_choice' || questionForm.questionType === 'multiple_select') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Options <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setUseVisualBuilder(!useVisualBuilder);
                        if (!useVisualBuilder) {
                          // When switching to visual builder, parse current JSON
                          try {
                            const parsed = JSON.parse(questionForm.options);
                            setOptionInputs({
                              A: parsed.A || '',
                              B: parsed.B || '',
                              C: parsed.C || '',
                              D: parsed.D || '',
                              E: parsed.E || '',
                            });
                          } catch (e) {
                            // Keep current inputs
                          }
                        }
                      }}
                      className="text-xs text-primary hover:text-primary-600"
                    >
                      {useVisualBuilder ? 'Switch to JSON' : 'Switch to Visual Builder'}
                    </button>
                  </div>
                  
                  {useVisualBuilder ? (
                    <div className="space-y-3">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => (
                        <div key={key} className="flex items-center space-x-3">
                          <span className="w-8 text-sm font-semibold text-gray-700">{key}:</span>
                          <input
                            type="text"
                            className="input-field flex-1"
                            placeholder={`Enter option ${key}${['D', 'E'].includes(key) ? ' (optional)' : ''}`}
                            value={optionInputs[key]}
                            onChange={(e) => {
                              const newInputs = { ...optionInputs, [key]: e.target.value };
                              setOptionInputs(newInputs);
                              // Auto-update JSON - only include non-empty options
                              const optionsObj: Record<string, string> = {};
                              (['A', 'B', 'C', 'D', 'E'] as const).forEach((k) => {
                                if (newInputs[k]) {
                                  optionsObj[k] = newInputs[k];
                                }
                              });
                              setQuestionForm({ ...questionForm, options: JSON.stringify(optionsObj) });
                            }}
                            required={['A', 'B', 'C'].includes(key)}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Options A, B, C are required. D and E are optional. Only filled options will appear to students.
                      </p>
                    </div>
                  ) : (
                    <>
                      <textarea
                        className="input-field font-mono text-sm"
                        placeholder='{"A": "First option", "B": "Second option", "C": "Third option", "D": "Fourth (optional)", "E": "Fifth (optional)"}'
                        value={questionForm.options}
                        onChange={(e) =>
                          setQuestionForm({ ...questionForm, options: e.target.value })
                        }
                        rows={5}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Format: JSON object with keys (A, B, C required; D, E optional). Only include options you want to use.
                      </p>
                    </>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer <span className="text-red-500">*</span>
                </label>
                {questionForm.questionType === 'true_false' ? (
                  <select
                    className="input-field"
                    value={questionForm.correctAnswer}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                    }
                    required
                  >
                    <option value="">Select answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : questionForm.questionType === 'short_answer' ? (
                  <input
                    className="input-field"
                    placeholder="Expected answer (for reference, not used for auto-grading)"
                    value={questionForm.correctAnswer}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                    }
                    required
                  />
                ) : (
                  <input
                    className="input-field"
                    placeholder="Correct answer (e.g., A, B, C, D, E or comma-separated for multiple select)"
                    value={questionForm.correctAnswer}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                    }
                    required
                  />
                )}
                {questionForm.questionType === 'multiple_select' && (
                  <p className="text-xs text-gray-500 mt-1">
                    For multiple select, use comma-separated values (e.g., "A,C" or "A, B, C")
                  </p>
                )}
              </div>
              <input
                type="number"
                step="0.1"
                className="input-field"
                placeholder="Points"
                value={questionForm.points}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, points: e.target.value })
                }
                required
              />
              <div className="flex space-x-2">
                <button type="submit" className="btn-primary">
                  {editingQuestion ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {showAIGenerator && (
          <form onSubmit={handleGenerateAI} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-4">AI Question Generator</h3>
            {aiGenerating && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-blue-700 font-medium">
                    Generating questions with AI... This may take a moment.
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <input
                className="input-field"
                placeholder="Subject"
                value={aiForm.subject}
                onChange={(e) => setAiForm({ ...aiForm, subject: e.target.value })}
                required
                disabled={aiGenerating}
              />
              <input
                className="input-field"
                placeholder="Topic"
                value={aiForm.topic}
                onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                required
                disabled={aiGenerating}
              />
              <input
                type="number"
                className="input-field"
                placeholder="Age"
                value={aiForm.age}
                onChange={(e) => setAiForm({ ...aiForm, age: e.target.value })}
                required
                disabled={aiGenerating}
              />
              <input
                className="input-field"
                placeholder="Academic Level"
                value={aiForm.academicLevel}
                onChange={(e) =>
                  setAiForm({ ...aiForm, academicLevel: e.target.value })
                }
                required
                disabled={aiGenerating}
              />
              <input
                className="input-field"
                placeholder="Class Level"
                value={aiForm.classLevel}
                onChange={(e) =>
                  setAiForm({ ...aiForm, classLevel: e.target.value })
                }
                required
                disabled={aiGenerating}
              />
              <input
                type="number"
                className="input-field"
                placeholder="Number of Questions"
                value={aiForm.numberOfQuestions}
                onChange={(e) =>
                  setAiForm({ ...aiForm, numberOfQuestions: e.target.value })
                }
                required
                disabled={aiGenerating}
              />
              <div>
                <select
                  className="input-field"
                  value={aiForm.questionType}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, questionType: e.target.value as any })
                  }
                  disabled={aiGenerating}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="multiple_select">Multiple Select</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {aiForm.questionType === 'multiple_choice' && 'Single correct answer from 4 options'}
                  {aiForm.questionType === 'multiple_select' && 'Multiple correct answers from 4 options'}
                  {aiForm.questionType === 'true_false' && 'True or False questions'}
                  {aiForm.questionType === 'short_answer' && 'Open-ended text response questions'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                type="submit"
                className="btn-primary"
                disabled={aiGenerating}
              >
                {aiGenerating ? 'Generating...' : 'Generate'}
              </button>
              <button
                type="button"
                onClick={() => setShowAIGenerator(false)}
                className="btn-secondary"
                disabled={aiGenerating}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">
                      {index + 1}. {question.questionText}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                      {question.questionType === 'multiple_choice' ? 'Multiple Choice' :
                       question.questionType === 'multiple_select' ? 'Multiple Select' :
                       question.questionType === 'true_false' ? 'True/False' :
                       'Short Answer'}
                    </span>
                  </div>
                  {question.options && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(question.options).map(([key, value]) => (
                        <p key={key} className="text-sm text-gray-600">
                          {key}: {value}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Correct: {question.correctAnswer} • Points: {question.points}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditQuestion(question)}
                    className="text-primary hover:text-primary-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Delete this question?')) {
                        try {
                          await questionAPI.delete(question.id);
                          toast.success('Question deleted');
                          loadQuestions();
                        } catch (error) {
                          toast.error('Failed to delete question');
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
