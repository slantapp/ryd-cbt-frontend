import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { testAPI, questionAPI, sessionAPI, classroomAPI, teacherAPI, customFieldAPI, gradingAPI, studentAPI, subjectAPI, testGroupAPI } from '../../services/api';
import { Test, Question, Session, Classroom, Institution, TestCustomField, StudentTest } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Institution[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [testGroups, setTestGroups] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<TestCustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasPublishedScores, setHasPublishedScores] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [testScores, setTestScores] = useState<StudentTest[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [scoreTab, setScoreTab] = useState<'best' | 'multiple'>('best');
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
    testGroupId: '',
    subjectId: '',
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
    classroomIds: [] as string[],
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
  // Question Bank state
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [questionBankQuestions, setQuestionBankQuestions] = useState<Question[]>([]);
  const [questionBankFilters, setQuestionBankFilters] = useState({
    subjectId: '',
    grade: '',
  });
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());
  const [loadingBankQuestions, setLoadingBankQuestions] = useState(false);

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
            loadSubjects(),
            loadTestGroups(),
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

  // Check scores published status after test loads
  useEffect(() => {
    if (test && id && (test.requiresManualGrading || account?.role === 'TEACHER')) {
      checkScoresPublished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, id, account?.role]);

  const loadTest = async () => {
    try {
      const response = await testAPI.getOne(id!);
      setTest(response.data);
      const currentSession = response.data.sessions?.[0]?.session;
      const currentClassroom = response.data.classrooms?.[0]?.classroom;
      const currentTeacher = (response.data as any).teacher;
      
      const dueDate = response.data.dueDate ? new Date(response.data.dueDate).toISOString().slice(0, 16) : '';
      const allClassroomIds = response.data.classrooms?.map((tc: any) => tc.classroom?.id || tc.classroomId).filter(Boolean) || [];
      setTestForm({
        title: response.data.title,
        description: response.data.description || '',
        testGroup: response.data.testGroup || 'Assignment',
        testGroupId: response.data.testGroupId || '',
        subjectId: response.data.subjectId || '',
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
        classroomIds: allClassroomIds,
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
      if (account?.role === 'TEACHER') {
        // For teachers, only load classrooms they are assigned to
        const response = await teacherAPI.dashboard();
        const assignments = response.data?.assignments || [];
        const assignedClassrooms = assignments.map((assignment: any) => assignment.classroom).filter(Boolean);
        setClassrooms(assignedClassrooms);
      } else {
        // For schools, load all classrooms
        const response = await classroomAPI.list();
        setClassrooms(response.data);
      }
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

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      setSubjects(response.data || []);
    } catch (error: any) {
      console.error('Failed to load subjects');
    }
  };

  const loadTestGroups = async () => {
    try {
      const response = await testGroupAPI.getAll();
      setTestGroups(response.data || []);
    } catch (error: any) {
      console.error('Failed to load test groups');
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

  const loadQuestionBankQuestions = async () => {
    setLoadingBankQuestions(true);
    try {
      const params: any = {};
      if (questionBankFilters.subjectId) {
        params.subjectId = questionBankFilters.subjectId;
      }
      if (questionBankFilters.grade) {
        params.grade = questionBankFilters.grade;
      }
      const response = await questionAPI.getBankQuestions(params);
      setQuestionBankQuestions(response.data || []);
    } catch (error: any) {
      console.error('Failed to load question bank questions:', error);
      toast.error(error.response?.data?.error || 'Failed to load question bank questions');
      setQuestionBankQuestions([]);
    } finally {
      setLoadingBankQuestions(false);
    }
  };

  const handleAddQuestionsFromBank = async () => {
    if (selectedBankQuestions.size === 0) {
      toast.error('Please select at least one question');
      return;
    }

    try {
      const response = await questionAPI.addFromBankToTest({
        testId: id!,
        questionIds: Array.from(selectedBankQuestions),
      });
      toast.success(`Added ${response.data.questions?.length || selectedBankQuestions.size} question(s) to test`);
      setShowQuestionBankModal(false);
      setSelectedBankQuestions(new Set());
      setQuestionBankFilters({ subjectId: '', grade: '' });
      await loadQuestions();
    } catch (error: any) {
      console.error('Failed to add questions from bank:', error);
      toast.error(error.response?.data?.error || 'Failed to add questions from bank');
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
      const updateData: any = {
        ...testForm,
        subjectId: testForm.subjectId || undefined,
        testGroupId: testForm.testGroupId || undefined,
      };
      
      // Always send classroomIds array if it has values, otherwise don't send it
      // This ensures the backend correctly processes multiple classroom assignments
      if (testForm.classroomIds && testForm.classroomIds.length > 0) {
        updateData.classroomIds = testForm.classroomIds;
      }
      
      await testAPI.update(id!, updateData);

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
      toast.error(error?.response?.data?.error || 'Failed to delete test');
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

  const checkScoresPublished = async () => {
    try {
      const response = await gradingAPI.getAllStudentTests(id!);
      const studentTests = response.data.studentTests || [];
      // Check if any graded student test has published scores
      const hasPublished = studentTests.some(
        (st: any) => st.status === 'graded' && st.scoreVisibleToStudent === true
      );
      setHasPublishedScores(hasPublished);
    } catch (error: any) {
      console.error('Failed to check scores published status:', error);
    }
  };

  const loadTestScores = async () => {
    if (!id) return;
    try {
      setLoadingScores(true);
      const response = await studentAPI.getScores({ testId: id });
      setTestScores(response.data || []);
    } catch (error: any) {
      console.error('Failed to load test scores:', error);
      toast.error(error?.response?.data?.error || 'Failed to load test scores');
      setTestScores([]);
    } finally {
      setLoadingScores(false);
    }
  };

  const handlePublishAllScores = async () => {
    if (!window.confirm('Publish all graded scores for this test? All students with graded tests will be able to see their scores.')) {
      return;
    }
    try {
      await gradingAPI.bulkReleaseScores(id!);
      toast.success('All scores published successfully');
      await checkScoresPublished();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to publish scores');
    }
  };

  const handleUnpublishAllScores = async () => {
    if (!window.confirm('Unpublish all scores for this test? Students will no longer be able to see their scores.')) {
      return;
    }
    try {
      await gradingAPI.bulkHideScores(id!);
      toast.success('All scores unpublished successfully');
      await checkScoresPublished();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unpublish scores');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (creatingQuestion) {
      return;
    }
    
    setCreatingQuestion(true);
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
          setCreatingQuestion(false);
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
    } finally {
      setCreatingQuestion(false);
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
      {/* Title Section at Top */}
        <div>
          <Link to="/tests" className="text-primary hover:text-primary-600">
            ← Back to Tests
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{test.title}</h1>
        </div>

      {/* Action Buttons Below Title */}
      <div className="flex flex-wrap gap-3 pb-4 border-b border-gray-200">
        {(test && test.requiresManualGrading) || (account && (account.role === 'TEACHER' || account.role === 'SCHOOL' || account.role === 'SCHOOL_ADMIN') && test) ? (
          <>
            <Link
              to={`/tests/${id}/grade`}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Grade Tests
            </Link>
            {hasPublishedScores ? (
              <button
                onClick={handleUnpublishAllScores}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Unpublish All Scores
              </button>
            ) : (
              <button
                onClick={handlePublishAllScores}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Publish All Scores
              </button>
            )}
          </>
          ) : null}
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
                  {account && account.role === 'TEACHER' && test?.teacherId !== account.id && <span className="text-xs text-gray-500 ml-2">(Locked)</span>}
                </label>
                {account && account.role === 'TEACHER' && test?.teacherId !== account.id ? (
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
                  Classes <span className="text-red-500">*</span>
                  {account && account.role === 'TEACHER' && test?.teacherId !== account.id && <span className="text-xs text-gray-500 ml-2">(Locked)</span>}
                </label>
                {account && account.role === 'TEACHER' && test?.teacherId !== account.id ? (
                  <div className="space-y-2">
                    {test?.classrooms?.map((tc: any) => (
                      <div key={tc.classroom?.id || tc.classroomId} className="input-field bg-gray-50 cursor-not-allowed">
                        {tc.classroom?.name || 'Unknown'}
                        {tc.classroom?.academicSession && ` (${tc.classroom.academicSession})`}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                    {classrooms.length === 0 ? (
                      <p className="text-sm text-gray-500">No classes available</p>
                    ) : (
                      <div className="space-y-2">
                    {classrooms.map((classroom) => (
                          <label key={classroom.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={testForm.classroomIds.includes(classroom.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTestForm({
                                    ...testForm,
                                    classroomIds: [...testForm.classroomIds, classroom.id],
                                    classroomId: classroom.id, // Keep for backwards compatibility
                                  });
                                } else {
                                  setTestForm({
                                    ...testForm,
                                    classroomIds: testForm.classroomIds.filter(id => id !== classroom.id),
                                    classroomId: testForm.classroomIds.filter(id => id !== classroom.id)[0] || '',
                                  });
                                }
                              }}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">{classroom.name}</span>
                            {classroom.academicSession && (
                              <span className="text-xs text-gray-500">({classroom.academicSession})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {testForm.classroomIds.length === 0 && account?.role !== 'TEACHER' && (
                  <p className="text-xs text-red-500 mt-1">Please select at least one class</p>
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
                  Test Group
                </label>
                <select
                  className="input-field"
                  value={testForm.testGroupId}
                  onChange={(e) => setTestForm({ ...testForm, testGroupId: e.target.value, testGroup: testGroups.find(tg => tg.id === e.target.value)?.name || '' })}
                >
                  <option value="">Select Test Group (optional)</option>
                  {testGroups.filter(tg => tg.isActive).map((tg) => (
                    <option key={tg.id} value={tg.id}>
                      {tg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  className="input-field"
                  value={testForm.subjectId}
                  onChange={(e) => setTestForm({ ...testForm, subjectId: e.target.value })}
                >
                  <option value="">Select Subject (optional)</option>
                  {subjects.filter(s => s.isActive).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
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
                    Students can complete this test at any time{testForm.dueDate ? ' before the due date' : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date (optional)
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={testForm.dueDate}
                  onChange={(e) => setTestForm({ ...testForm, dueDate: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Set a deadline for when students should complete this test
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Passing Score (%)
                </label>
              <input
                type="number"
                step="0.1"
                className="input-field"
                placeholder="Passing Score (%)"
                value={testForm.passingScore}
                onChange={(e) => setTestForm({ ...testForm, passingScore: e.target.value })}
              />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Attempts <span className="text-red-500">*</span>
                </label>
              <input
                type="number"
                className="input-field"
                placeholder="Max Attempts"
                value={testForm.maxAttempts}
                onChange={(e) => setTestForm({ ...testForm, maxAttempts: e.target.value })}
                required
              />
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Score Visibility</label>
                <span className="text-xs text-gray-500 block mb-2">Control when students can see their scores</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setTestForm({ ...testForm, scoreVisibility: true })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      testForm.scoreVisibility
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Show Scores
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestForm({ ...testForm, scoreVisibility: false })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !testForm.scoreVisibility
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hide Scores
                  </button>
                  </div>
              </div>
              <label className="flex items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={testForm.requiresManualGrading}
                    onChange={(e) => setTestForm({ ...testForm, requiresManualGrading: e.target.checked })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 block">Requires manual grading</span>
                    <span className="text-xs text-gray-500">Enable for short answer questions that need manual review</span>
                  </div>
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Test Summary</h2>
            <span className="text-sm text-gray-500">Complete test information</span>
          </div>
          
          {/* Basic Information */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                <p className="font-medium text-gray-900 mt-1">{test.title}</p>
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <p className="font-medium text-gray-900 mt-1">{test.description || <span className="text-gray-400 italic">No description</span>}</p>
            </div>
              {(test as any).testGroup && (
            <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Test Group</label>
                  <p className="font-medium text-gray-900 mt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {(test as any).testGroup}
                    </span>
                  </p>
            </div>
              )}
              {((test as any).subject || (test as any).subjectName) && (
            <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Subject</label>
                  <p className="font-medium text-gray-900 mt-1">{(test as any).subject || (test as any).subjectName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Session & Classes */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Session & Classes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {test.sessions && test.sessions.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Session</label>
                  <p className="font-medium text-gray-900 mt-1">
                    {test.sessions[0]?.session?.name || 'N/A'}
                  </p>
                </div>
              )}
              {test.classrooms && test.classrooms.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Assigned Classes</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {test.classrooms.map((tc: any) => (
                <span
                        key={tc.classroom.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {tc.classroom.name}
                        {tc.classroom.academicSession && ` (${tc.classroom.academicSession})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {test.teacher && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Assigned Teacher</label>
                  <p className="font-medium text-gray-900 mt-1">{test.teacher.name || test.teacher.email || 'N/A'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Test Settings */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Test Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Timing</label>
                <p className="font-medium text-gray-900 mt-1">
                  {test.isTimed ? `${test.duration} minutes` : <span className="text-gray-400 italic">Untimed</span>}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Due Date</label>
                <p className="font-medium text-gray-900 mt-1">
                  {test.dueDate ? (
                    <span className="text-orange-600">
                      {new Date(test.dueDate).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">No due date</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Passing Score</label>
                <p className="font-medium text-gray-900 mt-1">{test.passingScore ? `${test.passingScore}%` : <span className="text-gray-400 italic">Not set</span>}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Max Attempts</label>
                <p className="font-medium text-gray-900 mt-1">{test.maxAttempts || '1'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Allow Retrial</label>
                <p className="font-medium text-gray-900 mt-1">
                  {test.allowRetrial ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      ✗ No
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <p className="font-medium text-gray-900 mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
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

          {/* Visibility & Grading */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Visibility & Grading</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Score Visibility</label>
                <p className="font-medium text-gray-900 mt-1">
                  {test.scoreVisibility ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Show to students
                </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ✗ Hide from students
                    </span>
                  )}
              </p>
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Manual Grading</label>
                <p className="font-medium text-gray-900 mt-1">
                  {test.requiresManualGrading ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ✓ Required
                </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      ✗ Not required
                    </span>
                  )}
              </p>
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Published Status</label>
                <p className="font-medium text-gray-900 mt-1">
                  {test.isPublished ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ✓ Published
                </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      ✗ Not published
                    </span>
                  )}
              </p>
            </div>
                </div>
              </div>

          {/* Custom Fields */}
          {customFields.length > 0 && Object.keys(customFieldValues).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Custom Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(field => {
                  const value = customFieldValues[field.id];
                  if (!value || value.trim() === '') return null;
                  return (
                    <div key={field.id}>
                      <label className="text-xs font-semibold text-gray-500 uppercase">{field.fieldName}</label>
                      <p className="font-medium text-gray-900 mt-1">{value}</p>
          </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Scores Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Test Scores</h2>
          <button
            onClick={() => {
              if (!showScores) {
                loadTestScores();
              }
              setShowScores(!showScores);
            }}
            className="btn-secondary text-sm"
          >
            {showScores ? 'Hide Scores' : 'View All Scores'}
          </button>
        </div>

        {showScores && (
          <div>
            {loadingScores ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <div className="text-gray-600">Loading scores...</div>
                </div>
              </div>
            ) : testScores.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Scores Yet</h3>
                <p className="text-gray-500">
                  No students have taken this test yet. Scores will appear here once students complete the test.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setScoreTab('best')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                      scoreTab === 'best'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Best Scores
                  </button>
                  <button
                    onClick={() => setScoreTab('multiple')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                      scoreTab === 'multiple'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Multiple Attempts
                  </button>
                </div>

                {/* Filter scores based on tab */}
                {(() => {
                  // Group scores by student ID
                  const scoresByStudent = new Map<string, StudentTest[]>();
                  testScores.forEach(score => {
                    const studentId = score.studentId;
                    if (!scoresByStudent.has(studentId)) {
                      scoresByStudent.set(studentId, []);
                    }
                    scoresByStudent.get(studentId)!.push(score);
                  });

                  // For each student, find their best score (highest percentage, then highest score)
                  const bestScores = Array.from(scoresByStudent.values()).map(studentScores => {
                    return studentScores.reduce((best, current) => {
                      const bestPercent = best.percentage || 0;
                      const currentPercent = current.percentage || 0;
                      if (currentPercent > bestPercent) return current;
                      if (currentPercent === bestPercent) {
                        return (current.score || 0) > (best.score || 0) ? current : best;
                      }
                      return best;
                    });
                  });

                  // Multiple attempts are all scores that are not the best score for that student
                  const bestScoreIds = new Set(bestScores.map(s => s.id));
                  const multipleAttempts = testScores.filter(score => !bestScoreIds.has(score.id));

                  const displayedScores = scoreTab === 'best' ? bestScores : multipleAttempts;

                  return (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{displayedScores.length}</div>
                          <div className="text-sm text-blue-700 mt-1">Total {scoreTab === 'best' ? 'Students' : 'Attempts'}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="text-2xl font-bold text-green-600">
                            {displayedScores.filter(s => s.isPassed === true).length}
                          </div>
                          <div className="text-sm text-green-700 mt-1">Passed</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="text-2xl font-bold text-red-600">
                            {displayedScores.filter(s => s.isPassed === false).length}
                          </div>
                          <div className="text-sm text-red-700 mt-1">Failed</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">
                            {displayedScores.length > 0
                              ? (displayedScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / displayedScores.length).toFixed(1)
                              : '0'}%
                          </div>
                          <div className="text-sm text-purple-700 mt-1">Average Score</div>
                        </div>
                      </div>

                      {/* Scores Table */}
                      <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Attempt
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {displayedScores.map((score) => (
                        <tr key={score.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-primary font-bold text-sm">
                                  {score.student?.firstName?.[0] || score.student?.lastName?.[0] || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {score.student ? `${score.student.firstName} ${score.student.lastName}` : 'Unknown'}
                                </div>
                                {score.student?.email && (
                                  <div className="text-sm text-gray-500">{score.student.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {score.score !== null && score.score !== undefined
                                ? `${score.score.toFixed(1)}`
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className={`text-sm font-bold ${
                                score.percentage !== null && score.percentage !== undefined
                                  ? score.percentage >= 70
                                    ? 'text-green-600'
                                    : score.percentage >= 50
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                  : 'text-gray-600'
                              }`}>
                                {score.percentage !== null && score.percentage !== undefined
                                  ? `${score.percentage.toFixed(1)}%`
                                  : 'N/A'}
                              </div>
                              {score.percentage !== null && score.percentage !== undefined && (
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      score.percentage >= 70
                                        ? 'bg-green-500'
                                        : score.percentage >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(score.percentage, 100)}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                    <span
                              className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                                score.status === 'graded' || score.status === 'submitted'
                                  ? score.isPassed === true
                                    ? 'bg-green-100 text-green-800'
                                    : score.isPassed === false
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                  : score.status === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {(score.status === 'graded' || score.status === 'submitted') && score.isPassed !== null
                                ? score.isPassed
                                  ? '✓ Passed'
                                  : '✗ Failed'
                                : score.status}
                    </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-medium">
                              Attempt {score.attemptNumber}
                </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {score.submittedAt
                                ? format(new Date(score.submittedAt), 'MMM dd, yyyy HH:mm')
                                : 'N/A'}
              </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {score.test?.allowRetrial &&
                                (score.status === 'graded' || score.status === 'submitted') &&
                                score.attemptNumber < (score.test?.maxAttempts || 1) && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Grant a retrial to this student?')) return;
                                      try {
                                        await studentAPI.grantRetrial(score.id);
                                        toast.success('Retrial granted successfully');
                                        loadTestScores();
                                      } catch (error: any) {
                                        toast.error(error.response?.data?.error || 'Failed to grant retrial');
                                      }
                                    }}
                                    className="text-primary hover:text-primary-600 font-semibold hover:underline"
                                  >
                                    Grant Retrial
                                  </button>
                                )}
                              {score.status === 'graded' && (
                                <>
                                  {score.scoreVisibleToStudent ? (
                                    <button
                                      onClick={async () => {
                                        if (!confirm('Hide this score from the student?')) return;
                                        try {
                                          await gradingAPI.hideScore(score.id);
                                          toast.success('Score hidden from student');
                                          // Update state immediately
                                          setTestScores(prevScores => 
                                            prevScores.map(s => 
                                              s.id === score.id 
                                                ? { ...s, scoreVisibleToStudent: false }
                                                : s
                                            )
                                          );
                                          await checkScoresPublished();
                                        } catch (error: any) {
                                          toast.error(error.response?.data?.error || 'Failed to hide score');
                                        }
                                      }}
                                      className="text-orange-600 hover:text-orange-800 font-semibold hover:underline"
                                    >
                                      Hide Score
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await gradingAPI.releaseScore(score.id);
                                          toast.success('Score released to student');
                                          // Update state immediately
                                          setTestScores(prevScores => 
                                            prevScores.map(s => 
                                              s.id === score.id 
                                                ? { ...s, scoreVisibleToStudent: true }
                                                : s
                                            )
                                          );
                                          await checkScoresPublished();
                                        } catch (error: any) {
                                          toast.error(error.response?.data?.error || 'Failed to release score');
                                        }
                                      }}
                                      className="text-green-600 hover:text-green-800 font-semibold hover:underline"
                                    >
                                      Release Score
                                    </button>
                                  )}
                                </>
            )}
          </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                    </>
                  );
                })()}
        </div>
      )}
          </div>
        )}
      </div>

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
            <button
              onClick={() => {
                setShowQuestionBankModal(true);
                loadQuestionBankQuestions();
              }}
              className="btn-secondary text-sm"
            >
              Add from Question Bank
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
                ) : questionForm.questionType === 'multiple_choice' ? (
                  (() => {
                    // Get available option keys from the parsed options
                    let availableOptions: string[] = [];
                    try {
                      const parsedOptions = typeof questionForm.options === 'string' 
                        ? JSON.parse(questionForm.options) 
                        : questionForm.options;
                      availableOptions = Object.keys(parsedOptions || {}).filter(key => parsedOptions[key] && parsedOptions[key].trim() !== '');
                    } catch (e) {
                      // If parsing fails, use optionInputs instead
                      availableOptions = (['A', 'B', 'C', 'D', 'E'] as const).filter(key => optionInputs[key] && optionInputs[key].trim() !== '');
                    }
                    
                    return (
                      <select
                        className="input-field"
                        value={questionForm.correctAnswer}
                        onChange={(e) =>
                          setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                        }
                        required
                      >
                        <option value="">Select correct answer</option>
                        {availableOptions.map((key) => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    );
                  })()
                ) : (
                  <input
                    className="input-field"
                    placeholder="Correct answer (comma-separated for multiple select, e.g., A,C or A, B, C)"
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
                <button type="submit" className="btn-primary" disabled={creatingQuestion || !!(editingQuestion && creatingQuestion)}>
                  {creatingQuestion ? 'Creating...' : editingQuestion ? 'Update' : 'Create'}
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

      {/* Question Bank Modal */}
      {showQuestionBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Add Questions from Question Bank</h3>
              <p className="text-sm text-gray-500 mt-1">Filter and select questions to add to this test</p>
            </div>
            
            <div className="p-6 border-b border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    className="input-field"
                    value={questionBankFilters.subjectId}
                    onChange={(e) => {
                      setQuestionBankFilters({ ...questionBankFilters, subjectId: e.target.value });
                    }}
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
                    placeholder="e.g., Grade 1, Grade 2"
                    value={questionBankFilters.grade}
                    onChange={(e) => {
                      setQuestionBankFilters({ ...questionBankFilters, grade: e.target.value });
                    }}
                  />
                </div>
              </div>
              <button
                onClick={loadQuestionBankQuestions}
                className="btn-primary text-sm"
                disabled={loadingBankQuestions}
              >
                {loadingBankQuestions ? 'Loading...' : 'Filter Questions'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingBankQuestions ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading questions...</p>
                </div>
              ) : questionBankQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No questions found. Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questionBankQuestions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedBankQuestions.has(question.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedBankQuestions);
                        if (newSelected.has(question.id)) {
                          newSelected.delete(question.id);
                        } else {
                          newSelected.add(question.id);
                        }
                        setSelectedBankQuestions(newSelected);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedBankQuestions.has(question.id)}
                          onChange={() => {}}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{question.questionText}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Type: {question.questionType}</span>
                            <span>Points: {question.points}</span>
                            {question.questionBankGrade && (
                              <span>Grade: {question.questionBankGrade}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedBankQuestions.size} question(s) selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowQuestionBankModal(false);
                    setSelectedBankQuestions(new Set());
                    setQuestionBankFilters({ subjectId: '', grade: '' });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestionsFromBank}
                  className="btn-primary"
                  disabled={selectedBankQuestions.size === 0}
                >
                  Add Selected ({selectedBankQuestions.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
