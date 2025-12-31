import { useLocation, useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { publicAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { ThemeConfig } from '../../types';

interface TestResult {
  score: number | null;
  totalPoints: number | null;
  percentage: string | null;
  isPassed: boolean | null;
  timeSpent: number;
  scoreVisible?: boolean;
  message?: string;
}

interface StudentTest {
  student: {
    firstName: string;
    lastName: string;
    username?: string;
    email?: string;
  };
  test: {
    title: string;
    passingScore?: number;
    institution?: {
      id: string;
      name: string;
      uniqueSlug: string;
    };
  };
}

export default function StudentTestResult() {
  const { slug: urlSlug, testId } = useParams();
  const location = useLocation();
  const { isAuthenticated, account } = useAuthStore();
  const [result, setResult] = useState<TestResult | null>(null);
  const [studentTest, setStudentTest] = useState<StudentTest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get slug from URL or from test result institution
  const slug = urlSlug || studentTest?.test?.institution?.uniqueSlug;
  
  // Determine return URL based on authentication
  const returnUrl = (isAuthenticated && account?.role === 'STUDENT') 
    ? '/student/dashboard' 
    : `/${slug}`;
  
  const [theme, setTheme] = useState<ThemeConfig>({
    primaryColor: '#1d4ed8',
    secondaryColor: '#2563eb',
    accentColor: '#facc15',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    logoUrl: '',
    bannerUrl: '',
  });

  useEffect(() => {
    if (!slug) return;
    publicAPI
      .getInstitutionBySlug(slug)
      .then(({ data }) => {
        setTheme({
          primaryColor: data.theme?.primaryColor || '#1d4ed8',
          secondaryColor: data.theme?.secondaryColor || '#2563eb',
          accentColor: data.theme?.accentColor || '#facc15',
          backgroundColor: data.theme?.backgroundColor || '#f8fafc',
          textColor: data.theme?.textColor || '#0f172a',
          logoUrl: data.theme?.logoUrl || '',
          bannerUrl: data.theme?.bannerUrl || '',
        });
      })
      .catch(() => {
        // ignore
      });
  }, [slug]);

  useEffect(() => {
    const loadResult = async () => {
      try {
        // Always fetch from API to get latest score visibility status
        // Don't use cached location.state as it may have outdated visibility
        let studentTestId: string | null = null;

        // Try to get from URL query params first (most reliable)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('studentTestId')) {
          studentTestId = urlParams.get('studentTestId');
          console.log('Found studentTestId from URL:', studentTestId);
        }

        // Try to get from location.state as fallback (for studentTestId only, not the result data)
        if (!studentTestId && location?.state?.studentTest?.id) {
          studentTestId = location.state.studentTest.id;
          console.log('Found studentTestId from location.state:', studentTestId);
        }

        // Try to get from localStorage as fallback
        if (!studentTestId && slug && testId) {
          const storageKey = `test_session_${slug}_${testId}`;
          const savedSession = localStorage.getItem(storageKey);
          if (savedSession) {
            try {
              const session = JSON.parse(savedSession);
              studentTestId = session.studentTestId;
              console.log('Found studentTestId from localStorage:', studentTestId);
            } catch (e) {
              console.error('Failed to parse session:', e);
            }
          }
        }

        if (studentTestId) {
          console.log('Fetching result for studentTestId:', studentTestId);
          try {
            const response = await publicAPI.getTestResult(studentTestId);
            console.log('Result response:', response);
            console.log('Result data:', response?.data);
            
            if (response?.data) {
              // The API returns { result: {...}, studentTest: {...} }
              const data = response.data;
              console.log('Response data structure:', {
                hasResult: !!data.result,
                hasStudentTest: !!data.studentTest,
                resultKeys: data.result ? Object.keys(data.result) : [],
                studentTestKeys: data.studentTest ? Object.keys(data.studentTest) : [],
              });
              
              if (data?.result && data?.studentTest) {
                // Check if score is visible - use scoreVisible flag from API
                const isScoreVisible = data.result.scoreVisible !== false;
                
                if (!isScoreVisible) {
                  // Score not released yet - set all score fields to null
                  setResult({
                    score: null,
                    totalPoints: null,
                    percentage: null,
                    isPassed: null,
                    timeSpent: data.result.timeSpent || 0,
                    scoreVisible: false,
                    message: data.result.message || 'Your score will be available after your teacher reviews and releases it.',
                  });
                  setStudentTest(data.studentTest);
                } else {
                  // Score is visible - use the actual result data
                  setResult({
                    ...data.result,
                    scoreVisible: true,
                  });
                  setStudentTest(data.studentTest);
                  console.log('Successfully set result and studentTest');
                }
              } else {
                console.error('Invalid response structure. Expected result and studentTest.');
                console.error('Full response data:', JSON.stringify(data, null, 2));
              }
            } else {
              console.error('No data in response. Full response:', response);
            }
          } catch (apiError: any) {
            console.error('API Error:', apiError);
            console.error('Error response:', apiError.response?.data);
            throw apiError;
          }
        } else {
          console.error('No student test ID found. URL params:', window.location.search, 'Slug:', slug, 'TestId:', testId);
        }
      } catch (error: any) {
        console.error('Failed to load result:', error);
        console.error('Error details:', error?.response?.data || error?.message);
        // Set default values on error
        setResult(null);
        setStudentTest(null);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [location, slug, testId]);

  const brand = theme;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading results...</div>
        </div>
      </div>
    );
  }

  if (!result || !studentTest) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
      >
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Results Found</h1>
          <p className="text-gray-600 mb-4">
            Unable to load test results. This could happen if:
          </p>
          <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
            <li>• The test hasn't been submitted yet</li>
            <li>• The result link has expired</li>
            <li>• There was an error loading the results</li>
          </ul>
          <Link 
            to={returnUrl} 
            className="btn-primary inline-block"
          >
            Return to {isAuthenticated && account?.role === 'STUDENT' ? 'Dashboard' : 'Test Portal'}
          </Link>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: brand.backgroundColor, color: brand.textColor }}
      >
        <div className="max-w-3xl mx-auto print-container">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div
            className="px-8 py-6"
            style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`, color: brand.backgroundColor }}
          >
            <h1 className="text-3xl font-bold mb-2">Test Completed!</h1>
            <p style={{ opacity: 0.8 }}>{studentTest.test.title}</p>
          </div>

          {/* Result Content */}
          <div className="p-8">
            {/* Score Display */}
            <div className="text-center mb-8">
              <div className="inline-block">
                {result.scoreVisible !== false && result.percentage !== null && result.score !== null && result.totalPoints !== null ? (
                  <>
                    <div
                      className={`text-6xl font-bold mb-2 ${
                        result.isPassed === true
                          ? 'text-green-600'
                          : result.isPassed === false
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {result.percentage}%
                    </div>
                    <div className="text-lg text-gray-600">
                      {result.score.toFixed(1)} / {result.totalPoints.toFixed(1)} points
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <div className="text-xl font-semibold text-gray-700 mb-2">
                      Score Not Available Yet
                    </div>
                    <div className="text-sm text-gray-600 max-w-md mx-auto">
                      {result.message || 'Your score will be available after your teacher reviews and releases it.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge - Only show if score is visible */}
            {result.scoreVisible !== false && result.isPassed !== null && result.score !== null && (
              <div className="text-center mb-8">
                <span
                  className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
                    result.isPassed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.isPassed ? '✓ Passed' : '✗ Failed'}
                </span>
              </div>
            )}

            {/* Passing Score Info - Only show if score is visible */}
            {result.scoreVisible !== false && studentTest.test.passingScore && result.score !== null && result.totalPoints !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Passing Score:</span> {studentTest.test.passingScore}%
                  {result.isPassed !== null && (
                    <span className="ml-2">
                      {result.isPassed
                        ? '✓ You passed!'
                        : `You needed ${(result.totalPoints * studentTest.test.passingScore) / 100 - result.score > 0 ? ((result.totalPoints * studentTest.test.passingScore) / 100 - result.score).toFixed(1) : 0} more points to pass.`}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(result.timeSpent)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Time Spent</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {result.totalPoints !== null ? result.totalPoints.toFixed(0) : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Points</div>
              </div>
            </div>

            {/* Student Info */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
              <div className="space-y-2 text-gray-600">
                <p>
                  <span className="font-medium">Name:</span> {studentTest.student.firstName} {studentTest.student.lastName}
                </p>
                {studentTest.student.username && (
                  <p>
                    <span className="font-medium">Username:</span> {studentTest.student.username}
                  </p>
                )}
                {studentTest.student.email && (
                  <p>
                    <span className="font-medium">Email:</span> {studentTest.student.email}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-center space-x-4 no-print">
              <button
                onClick={handlePrint}
                className="btn-secondary px-8 py-3 text-lg flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print Result</span>
              </button>
              <Link
                to={returnUrl}
                className="btn-primary px-8 py-3 text-lg"
              >
                Return to {isAuthenticated && account?.role === 'STUDENT' ? 'Dashboard' : 'Portal'}
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600 no-print">
          <p>Your results have been recorded and submitted to the institution.</p>
        </div>
      </div>
    </div>
    </>
  );
}

