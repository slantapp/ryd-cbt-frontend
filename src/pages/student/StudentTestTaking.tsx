import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI, studentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Test, Question, ThemeConfig } from '../../types';
import toast from 'react-hot-toast';

const defaultTheme: ThemeConfig = {
  primaryColor: '#1d4ed8',
  secondaryColor: '#2563eb',
  accentColor: '#facc15',
  backgroundColor: '#f8fafc',
  textColor: '#0f172a',
  logoUrl: '',
  bannerUrl: '',
};

export default function StudentTestTaking() {
  const { slug, testId } = useParams();
  const navigate = useNavigate();
  const { account, isAuthenticated } = useAuthStore();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [studentTestId, setStudentTestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    token: '',
  });
  const [useToken, setUseToken] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [theme, setTheme] = useState(defaultTheme);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Load saved session from localStorage - this runs first
  useEffect(() => {
    const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
    
    if (storageKey) {
      const savedSession = localStorage.getItem(storageKey);
      
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          // Check if session is still valid (not expired)
          if (session.studentTestId && session.startedAt) {
            const testDuration = session.testDuration || 0;
            
            // Handle non-timed tests (no duration)
            if (!testDuration || testDuration === 0) {
              // Non-timed test - always restore the session
              setStudentTestId(session.studentTestId);
              setStarted(true);
              setAnswers(session.answers || {});
              setFlaggedQuestions(new Set(session.flaggedQuestions || []));
              setCurrentQuestionIndex(session.currentQuestionIndex || 0);
              setTimeRemaining(null); // No timer for non-timed tests
              setFormData(session.formData || { name: '', email: '', phone: '', token: '' });
              setUseToken(session.useToken || false);
            } else {
              // Timed test - check if session is still valid
              const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
              const remaining = testDuration - elapsed;
              
              // Only restore if there's at least 10 seconds remaining
              // This prevents auto-submit immediately on page load
              if (remaining > 10) {
                // Restore session immediately
                setStudentTestId(session.studentTestId);
                setStarted(true);
                setAnswers(session.answers || {});
                setFlaggedQuestions(new Set(session.flaggedQuestions || []));
                setCurrentQuestionIndex(session.currentQuestionIndex || 0);
                // Calculate remaining time based on actual elapsed time
                setTimeRemaining(remaining);
                setFormData(session.formData || { name: '', email: '', phone: '', token: '' });
                setUseToken(session.useToken || false);
              } else {
                // Session expired or about to expire, clear it
                localStorage.removeItem(storageKey);
              }
            }
          }
        } catch (error) {
          console.error('Failed to restore session:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
    
    // Always load test data
    loadTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, testId]);

  useEffect(() => {
    if (!slug) return;
    publicAPI
      .getInstitutionBySlug(slug)
      .then(({ data }) => {
        setTheme({
          primaryColor: data.theme?.primaryColor || defaultTheme.primaryColor,
          secondaryColor: data.theme?.secondaryColor || defaultTheme.secondaryColor,
          accentColor: data.theme?.accentColor || defaultTheme.accentColor,
          backgroundColor: data.theme?.backgroundColor || defaultTheme.backgroundColor,
          textColor: data.theme?.textColor || defaultTheme.textColor,
          logoUrl: data.theme?.logoUrl || defaultTheme.logoUrl,
          bannerUrl: data.theme?.bannerUrl || defaultTheme.bannerUrl,
        });
      })
      .catch(() => {
        setTheme(defaultTheme);
      });
  }, [slug]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
    if (studentTestId && started && storageKey && test) {
      const testDuration = test?.duration ? test.duration * 60 : 0;
      
      // Get or create startedAt timestamp
      const existingSession = localStorage.getItem(storageKey);
      let startedAt = Date.now();
      if (existingSession) {
        try {
          const parsed = JSON.parse(existingSession);
          if (parsed.startedAt) {
            startedAt = parsed.startedAt; // Keep original start time
          }
        } catch (e) {
          // Use current time if parsing fails
        }
      }
      
      const session = {
        studentTestId,
        answers,
        flaggedQuestions: Array.from(flaggedQuestions),
        currentQuestionIndex,
        timeRemaining,
        startedAt, // Always use the original start time
        testDuration,
        formData,
        useToken,
      };
      localStorage.setItem(storageKey, JSON.stringify(session));
    }
  }, [studentTestId, started, answers, flaggedQuestions, currentQuestionIndex, timeRemaining, slug, testId, formData, useToken, test]);

  useEffect(() => {
    const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
    
    // Only run timer for timed tests
    if (started && storageKey && !submitting && !autoSubmitting && test?.isTimed && test?.duration) {
      const timer = setInterval(() => {
        // Recalculate time based on actual elapsed time from localStorage
        const savedSession = localStorage.getItem(storageKey);
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            if (session.startedAt && session.testDuration) {
              const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
              const remaining = session.testDuration - elapsed;
              
              if (remaining <= 0) {
                handleAutoSubmit();
                clearInterval(timer); // Stop timer after auto-submit
                return;
              }
              
              setTimeRemaining(remaining);
            } else {
              // Fallback to decrementing
              setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                  handleAutoSubmit();
                  clearInterval(timer); // Stop timer after auto-submit
                  return 0;
                }
                return prev - 1;
              });
            }
          } catch (e) {
            // Fallback to decrementing
            setTimeRemaining((prev) => {
              if (prev === null || prev <= 1) {
                handleAutoSubmit();
                clearInterval(timer); // Stop timer after auto-submit
                return 0;
              }
              return prev - 1;
            });
          }
        } else {
          // Fallback to decrementing
          setTimeRemaining((prev) => {
            if (prev === null || prev <= 1) {
              handleAutoSubmit();
              clearInterval(timer); // Stop timer after auto-submit
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [started, slug, testId, submitting, autoSubmitting]);

  const loadTest = async () => {
    try {
      if (!testId) {
        toast.error('Invalid test URL. Please access tests through your school portal.');
        setLoading(false);
        return;
      }

      let response;
      
      // If student is authenticated, use authenticated endpoint
      if (isAuthenticated && account?.role === 'STUDENT') {
        try {
          response = await studentAPI.getTest(testId);
          if (!response?.data) {
            throw new Error('Invalid response from server');
          }
          setTest(response.data);
          setQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
          
          // Set theme from institution if available
          if (response.data.institution?.themeConfig) {
            setTheme({
              ...defaultTheme,
              ...response.data.institution.themeConfig,
            });
          }
          
          // Check if there's an in-progress test that matches the current session
          const existingTest = response.data.studentTests?.[0];
          const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
          const savedSession = storageKey ? localStorage.getItem(storageKey) : null;
          
          // Only restore if:
          // 1. There's an existing in-progress test
          // 2. AND there's a matching localStorage session
          // 3. AND the session's studentTestId matches the existing test
          if (existingTest && existingTest.status === 'in_progress' && savedSession) {
            try {
              const session = JSON.parse(savedSession);
              
              // Verify the session matches this test attempt
              if (session.studentTestId === existingTest.id) {
                setStudentTestId(existingTest.id);
                setStarted(true);
                
                if (session.answers) {
                  setAnswers(session.answers);
                }
                if (session.flaggedQuestions) {
                  setFlaggedQuestions(new Set(session.flaggedQuestions));
                }
                if (session.currentQuestionIndex !== undefined) {
                  setCurrentQuestionIndex(session.currentQuestionIndex);
                }
                if (session.timeRemaining !== undefined) {
                  setTimeRemaining(session.timeRemaining);
                }
              } else {
                // Session doesn't match - clear it and let user start fresh
                if (storageKey) localStorage.removeItem(storageKey);
              }
            } catch (e) {
              console.error('Failed to parse saved session:', e);
              if (storageKey) localStorage.removeItem(storageKey);
            }
          }
        } catch (error: any) {
          console.error('Failed to load test via authenticated endpoint:', error);
          // If authenticated endpoint fails, fall back to public
          if (!slug) {
            const errorMsg = error?.response?.data?.error || error?.message || 'Failed to load test';
            console.error('No slug available, cannot fallback to public endpoint. Error:', errorMsg);
            toast.error(errorMsg || 'Failed to load test. Please ensure you are logged in.');
            setLoading(false);
            return;
          }
          console.log('Falling back to public endpoint, slug:', slug);
          response = await publicAPI.getTestForStudent(slug, testId);
          if (!response?.data) {
            throw new Error('Invalid response from server');
          }
          setTest(response.data);
          setQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
          
          if (response.data.institution?.themeConfig) {
            setTheme({
              ...defaultTheme,
              ...response.data.institution.themeConfig,
            });
          }
        }
      } else {
        // Public access - requires slug
        if (!slug) {
          toast.error('Please log in to access this test.');
          navigate('/student/login');
          setLoading(false);
          return;
        }
        
        response = await publicAPI.getTestForStudent(slug, testId);
        if (!response?.data) {
          throw new Error('Invalid response from server');
        }
        setTest(response.data);
        setQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
        
        if (response.data.institution?.themeConfig) {
          setTheme({
            ...defaultTheme,
            ...response.data.institution.themeConfig,
          });
        }
      }
    } catch (error: any) {
      console.error('Load test error:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to load test';
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. Please check your connection and try again.');
      } else {
        toast.error(errorMsg);
      }
      // Set empty defaults on error
      setTest(null);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await publicAPI.startTest({
        testId,
        ...(useToken ? { token: formData.token } : formData),
      });
      setStudentTestId(response.data.studentTest.id);
      setStarted(true);
      const duration = test?.duration ? test.duration * 60 : null;
      setTimeRemaining(duration);
      
      // Save to localStorage with actual start timestamp
      const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
      
      if (storageKey) {
        const session = {
          studentTestId: response.data.studentTest.id,
          answers: {},
          flaggedQuestions: [],
          currentQuestionIndex: 0,
          timeRemaining: duration,
          startedAt: Date.now(), // Store actual start timestamp
          testDuration: duration,
          formData,
          useToken,
        };
        localStorage.setItem(storageKey, JSON.stringify(session));
      }
      
      toast.success('Test started!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string, isMultipleSelect: boolean = false) => {
    let newAnswer = answer;
    
    if (isMultipleSelect) {
      // For multiple select, toggle the answer in a comma-separated list
      const currentAnswers = answers[questionId] ? answers[questionId].split(',').map(a => a.trim()) : [];
      if (currentAnswers.includes(answer)) {
        // Remove if already selected
        newAnswer = currentAnswers.filter(a => a !== answer).join(',');
      } else {
        // Add if not selected
        newAnswer = [...currentAnswers, answer].join(',');
      }
    }
    
    setAnswers({ ...answers, [questionId]: newAnswer });
    
    // Auto-save answer
    if (studentTestId) {
      publicAPI.submitAnswer({
        studentTestId,
        questionId,
        answer: newAnswer,
      }).catch(() => {
        // Silent fail for auto-save
      });
    }
  };

  const handleSubmit = async (skipConfirmation = false) => {
    if (!studentTestId) return;
    if (submitting || autoSubmitting) return; // Prevent double submission

    if (!skipConfirmation && Object.keys(answers).length < questions.length) {
      const confirmed = window.confirm(
        `You have answered ${Object.keys(answers).length} out of ${questions.length} questions. Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      const response = await publicAPI.submitTest({ studentTestId });
      
      // Clear localStorage on successful submit
      const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      
      toast.success('Test submitted successfully!');
      // Pass studentTestId in URL for result retrieval
      const resultUrl = slug 
        ? `/${slug}/test/${testId}/result?studentTestId=${studentTestId}`
        : `/student/test/${testId}/result?studentTestId=${studentTestId}`;
      navigate(resultUrl, {
        state: { result: response.data.result, studentTest: response.data.studentTest },
      });
    } catch (error: any) {
      console.error('Failed to submit test:', error);
      toast.error('Failed to submit test');
      setSubmitting(false);
    }
  };

  const handleCancelTest = () => {
    if (window.confirm('Are you sure you want to cancel this test? Your progress will be lost.')) {
      // Clear localStorage
      const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      if (slug) {
        navigate(`/${slug}`);
      } else {
        navigate('/student/dashboard');
      }
    }
  };

  const handleAutoSubmit = () => {
    if (studentTestId && !submitting && !autoSubmitting) {
      setAutoSubmitting(true); // Prevent repeated auto-submit calls
      toast('Time is up! Submitting your test...', { icon: '⏰' });
      handleSubmit(true); // Skip confirmation for auto-submit
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const brand = theme;
  const primaryButtonStyle = {
    backgroundColor: brand.primaryColor,
    color: brand.backgroundColor,
  };
  const accentStyle = {
    backgroundColor: brand.accentColor,
    color: brand.textColor,
  };

  if (loading && !started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test not found</h1>
        </div>
      </div>
    );
  }

  if (!started) {
    // For authenticated students, show simple start button instead of form
    if (isAuthenticated && account?.role === 'STUDENT' && test && !loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary-600 text-white shadow">
                <span className="text-2xl">📝</span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">{test.title}</h2>
              <p className="mt-2 text-gray-600">{test.description}</p>
              <div className="mt-6 space-y-2 text-sm text-gray-600">
                <p>⏱️ Duration: {test.duration} minutes</p>
                <p>❓ Questions: {questions.length}</p>
                {test.passingScore && <p>✅ Passing Score: {test.passingScore}%</p>}
              </div>
            </div>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                  setLoading(true);
                  const response = await publicAPI.startTest({ testId: testId! });
                  
                  // Handle both response structures: new test or in-progress test
                  const studentTest = response.data?.studentTest;
                  if (!studentTest) {
                    throw new Error('Invalid response: studentTest not found');
                  }
                  
                  setStudentTestId(studentTest.id);
                  setStarted(true);
                  const duration = test?.duration ? test.duration * 60 : null;
                  setTimeRemaining(duration);
                  
                  // Save to localStorage for authenticated students too
                  const storageKey = testId ? (slug ? `test_session_${slug}_${testId}` : `test_session_${testId}`) : null;
                  if (storageKey) {
                    const session = {
                      studentTestId: studentTest.id,
                      answers: {},
                      flaggedQuestions: [],
                      currentQuestionIndex: 0,
                      timeRemaining: duration,
                      startedAt: Date.now(),
                      testDuration: duration,
                    };
                    localStorage.setItem(storageKey, JSON.stringify(session));
                  }
                  
                  if (response.data?.message === 'Test already in progress') {
                    toast.success('Resuming test in progress');
                  } else {
                    toast.success('Test started!');
                  }
                } catch (error: any) {
                  console.error('Start test error:', error);
                  const errorMsg = error?.response?.data?.error || error?.message || 'Failed to start test';
                  
                  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    toast.error('Request timed out. Please check your connection and try again.');
                  } else {
                    toast.error(errorMsg);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-3 text-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Test'}
            </button>
          </div>
        </div>
      );
    }

    // Show form for public/unauthenticated users
    return (
      <div
        className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
      >
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow"
              style={{ backgroundColor: brand.primaryColor, color: brand.backgroundColor }}
            >
              <span className="text-2xl">📝</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">{test.title}</h2>
            <p className="mt-2 text-gray-600">{test.description}</p>
            <div className="mt-6 space-y-2 text-sm text-gray-600">
              <p>⏱️ Duration: {test.duration} minutes</p>
              <p>❓ Questions: {questions.length}</p>
              {test.passingScore && <p>✅ Passing Score: {test.passingScore}%</p>}
            </div>
          </div>
          <form onSubmit={handleStartTest} className="space-y-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="useToken"
                checked={useToken}
                onChange={(e) => setUseToken(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useToken" className="text-sm text-gray-700">
                Use token instead
              </label>
            </div>
            {useToken ? (
              <input
                type="text"
                className="input-field"
                placeholder="Enter your token"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                required
              />
            ) : (
              <>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="input-field"
                  placeholder="Email (optional)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  type="tel"
                  className="input-field"
                  placeholder="Phone (optional)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-lg font-semibold rounded-lg shadow"
              style={primaryButtonStyle}
            >
              {loading ? 'Starting...' : 'Start Test'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
    >
      {/* Header Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div className="text-right">
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: timeRemaining < 300 ? '#dc2626' : brand.primaryColor,
                  }}
                >
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-xs text-gray-500">Time Remaining</p>
              </div>
            )}
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress: {answeredCount} / {questions.length} answered</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: brand.primaryColor }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Question Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((q, index) => {
              const isActive = index === currentQuestionIndex;
              const isAnswered = Boolean(answers[q.id]);
              const isFlagged = flaggedQuestions.has(q.id);
              const style = isActive
                ? {
                    backgroundColor: brand.primaryColor,
                    color: brand.backgroundColor,
                    transform: 'scale(1.05)',
                    boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                  }
                : isAnswered
                ? { backgroundColor: '#dcfce7', color: '#166534' }
                : { backgroundColor: '#f3f4f6', color: '#374151' };

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(index)}
                  className="w-10 h-10 rounded-lg font-medium transition-all relative"
                  style={style}
                  title={`Question ${index + 1}${isFlagged ? ' (Flagged)' : ''}${isAnswered ? ' (Answered)' : ''}`}
                >
                  {index + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 text-yellow-500 text-xs">🚩</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center mt-4 text-xs text-gray-600 space-x-4">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-100 rounded mr-1"></span>
              Answered
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-gray-100 rounded mr-1"></span>
              Not Answered
            </span>
            <span className="flex items-center">
              <span className="text-xs mr-1">🚩</span>
              Flagged
            </span>
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-primary">
                  Question {currentQuestionIndex + 1}
                </span>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      flaggedQuestions.has(currentQuestion.id)
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                    title={flaggedQuestions.has(currentQuestion.id) ? 'Unflag this question' : 'Flag this question for review'}
                  >
                    <span>🚩</span>
                    <span>{flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag'}</span>
                  </button>
                  <span className="text-sm text-gray-500">
                    {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQuestion.questionText}
              </h2>
            </div>

            {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {Object.entries(currentQuestion.options).map(([key, value]) => (
                  <label
                    key={key}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      answers[currentQuestion.id] === key
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={key}
                      checked={answers[currentQuestion.id] === key}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="mr-4 w-5 h-5 text-primary"
                    />
                    <span className="font-medium mr-2 text-gray-700">{key}:</span>
                    <span className="text-gray-900">{value}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.questionType === 'multiple_select' && currentQuestion.options && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">Select all that apply:</p>
                {Object.entries(currentQuestion.options).map(([key, value]) => {
                  const currentAnswers = answers[currentQuestion.id] 
                    ? answers[currentQuestion.id].split(',').map(a => a.trim()) 
                    : [];
                  const isChecked = currentAnswers.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isChecked
                          ? 'border-primary bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name={currentQuestion.id}
                        value={key}
                        checked={isChecked}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, true)}
                        className="mr-4 w-5 h-5 text-primary rounded"
                      />
                      <span className="font-medium mr-2 text-gray-700">{key}:</span>
                      <span className="text-gray-900">{value}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.questionType === 'true_false' && (
              <div className="space-y-3">
                {['true', 'false'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="mr-4 w-5 h-5 text-primary"
                    />
                    <span className="capitalize text-gray-900 font-medium">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.questionType === 'short_answer' && (
              <textarea
                className="input-field w-full min-h-[150px]"
                placeholder="Type your answer here..."
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              />
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
          <div className="flex space-x-2">
            <button
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="py-2 px-4 rounded-lg border font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: brand.primaryColor, color: brand.primaryColor }}
            >
              ← Previous
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {currentQuestionIndex + 1} / {questions.length}
          </div>
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              className="font-semibold py-2 px-4 rounded-lg shadow"
              style={primaryButtonStyle}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="font-semibold py-2 px-6 rounded-lg shadow disabled:opacity-50"
              style={{ backgroundColor: brand.secondaryColor, color: brand.backgroundColor }}
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          )}
        </div>

        {/* Quick Submit Button (always visible) */}
        <div className="mt-4 text-center">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Submit test now
          </button>
        </div>
      </div>
    </div>
  );
}
