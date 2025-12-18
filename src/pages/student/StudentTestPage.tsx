import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ThemeConfig } from '../../types';

interface InstitutionData {
  institution: {
    id: string;
    name: string;
    uniqueSlug: string;
  };
  classes: Array<{
    id: string;
    name: string;
    description?: string;
    academicSession?: string;
  }>;
  sessions: any[];
  theme?: ThemeConfig;
}

export default function StudentTestPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      checkForInProgressSession();
      loadInstitution();
    }
  }, [slug]);

  const checkForInProgressSession = () => {
    if (!slug) return;

    try {
      // Check all localStorage keys for this slug
      const sessionKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`test_session_${slug}_`)) {
          sessionKeys.push(key);
        }
      }

      // Find the first valid in-progress session
      for (const key of sessionKeys) {
        try {
          const savedSession = localStorage.getItem(key);
          if (savedSession) {
            const session = JSON.parse(savedSession);
            
            // Check if session is still valid (not expired)
            if (session.studentTestId && session.startedAt && session.testDuration) {
              const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
              
              if (elapsed < session.testDuration) {
                // Extract testId from the key (format: test_session_${slug}_${testId})
                const testId = key.replace(`test_session_${slug}_`, '');
                
                // Redirect to continue the test
                console.log('Found in-progress session, redirecting to test:', testId);
                navigate(`/${slug}/test/${testId}`, { replace: true });
                return;
              } else {
                // Session expired, clear it
                localStorage.removeItem(key);
              }
            }
          }
        } catch (e) {
          console.error('Error checking session:', key, e);
          // Remove invalid session
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error checking for in-progress sessions:', error);
    }
  };

  const loadInstitution = async () => {
    try {
      const response = await publicAPI.getInstitutionBySlug(slug!);
      setData(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading institution:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Institution not found';
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Institution not found
          </h1>
          <p className="text-gray-600">The institution you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const brand = {
    primary: data.theme?.primaryColor || '#1d4ed8',
    secondary: data.theme?.secondaryColor || '#2563eb',
    accent: data.theme?.accentColor || '#facc15',
    background: data.theme?.backgroundColor || '#f8fafc',
    text: data.theme?.textColor || '#0f172a',
  };

  // Filter tests by selected class
  const getTestsForClass = (classId: string | null) => {
    if (!classId) return [];
    
    return data.sessions.flatMap((session) => {
      return session.tests
        ?.filter((st: any) => {
          // Check if test is assigned to the selected class
          return st.test.classrooms?.some((tc: any) => tc.classroom.id === classId);
        })
        .map((st: any) => ({ ...st.test, sessionName: session.name, sessionId: session.id })) || [];
    });
  };

  const availableTests = selectedClassId ? getTestsForClass(selectedClassId) : [];

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: brand.background, color: brand.text }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-block rounded-full p-4 shadow-lg mb-6"
            style={{ backgroundColor: brand.primary, color: brand.background }}
          >
            <span className="text-5xl">🎓</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            {data.institution.name}
          </h1>
          <p className="text-xl text-gray-600">Welcome to the test portal</p>
        </div>

        {/* Class Selection */}
        {!selectedClassId && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="mr-3">🎓</span>
              Select Your Class
            </h2>
            {data.classes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-gray-500 text-lg">No classes available at this time.</p>
                <p className="text-gray-400 text-sm mt-2">Please contact your institution.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.classes.map((classItem) => (
                  <button
                    key={classItem.id}
                    onClick={() => setSelectedClassId(classItem.id)}
                    className="p-6 rounded-xl border-2 transition-all hover:shadow-lg transform hover:-translate-y-1 text-left"
                    style={{
                      borderColor: brand.primary,
                      background: `linear-gradient(135deg, ${brand.primary}10, ${brand.secondary}15)`,
                    }}
                  >
                    <h3 className="font-bold text-xl text-gray-900 mb-2">{classItem.name}</h3>
                    {classItem.academicSession && (
                      <p className="text-sm text-gray-600 mb-2">{classItem.academicSession}</p>
                    )}
                    {classItem.description && (
                      <p className="text-sm text-gray-500">{classItem.description}</p>
                    )}
                    <div className="mt-4 flex items-center text-primary font-semibold">
                      <span>View Tests</span>
                      <span className="ml-2">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Tests for Selected Class */}
        {selectedClassId && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="mr-3">📚</span>
                Available Tests
              </h2>
              <button
                onClick={() => setSelectedClassId(null)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                ← Change Class
              </button>
            </div>
            {availableTests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-500 text-lg">No active tests available for this class.</p>
                <p className="text-gray-400 text-sm mt-2">Please check back later or contact your institution.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.sessions
                  .filter((session) => {
                    return session.tests?.some((st: any) => {
                      return st.test.classrooms?.some((tc: any) => tc.classroom.id === selectedClassId);
                    });
                  })
                  .map((session) => {
                    const sessionTests = session.tests?.filter((st: any) => {
                      return st.test.classrooms?.some((tc: any) => tc.classroom.id === selectedClassId);
                    }) || [];

                    if (sessionTests.length === 0) return null;

                    return (
                      <div
                        key={session.id}
                        className="border-2 rounded-xl p-6 transition-all bg-gray-50 hover:bg-white"
                        style={{ borderColor: brand.primary }}
                      >
                        <h3 className="font-bold text-xl text-gray-900 mb-2 flex items-center">
                          <span className="mr-2">📅</span>
                          {session.name}
                        </h3>
                        {session.description && (
                          <p className="text-gray-600 text-sm mb-4 ml-7">{session.description}</p>
                        )}
                        <div className="space-y-3 ml-7">
                          {sessionTests.map((st: any) => (
                            <Link
                              key={st.id}
                              to={`/${slug}/test/${st.test.id}`}
                              className="block p-5 rounded-xl transition-all border-2 hover:shadow-lg transform hover:-translate-y-1"
                              style={{
                                background: `linear-gradient(135deg, ${brand.primary}15, ${brand.secondary}20)`,
                                borderColor: brand.primary,
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg text-gray-900 mb-1">
                                    {st.test.title}
                                  </h4>
                                  {st.test.description && (
                                    <p className="text-sm text-gray-600 mb-2">
                                      {st.test.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span className="flex items-center">
                                      <span className="mr-1">⏱️</span>
                                      {st.test.duration} minutes
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <span
                                    className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg shadow-md"
                                    style={{ backgroundColor: brand.primary, color: brand.background }}
                                  >
                                    →
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Need help? Contact your institution for assistance.</p>
        </div>
      </div>
    </div>
  );
}
