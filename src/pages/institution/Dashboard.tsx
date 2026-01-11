import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  testAPI,
  sessionAPI,
  adminAPI,
  ministryAPI,
  teacherAPI,
  themeAPI,
} from '../../services/api';
import { Test, Session, Classroom, TeacherAssignment } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('URL copied to clipboard!');
};

export default function Dashboard() {
  const { account } = useAuthStore();
  const [tests, setTests] = useState<Test[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [ministryStats, setMinistryStats] = useState<any>(null);
  const [teacherStats, setTeacherStats] = useState<{
    assignments: TeacherAssignment[];
    tests?: Test[];
    school?: {
      id: string;
      name: string;
      uniqueSlug?: string;
      email: string;
    };
    stats?: {
      classCount: number;
      testCount: number;
    };
  } | null>(null);
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });
  const [loading, setLoading] = useState(true);
  const [teacherFilters, setTeacherFilters] = useState({
    classroomId: '',
    testGroup: '',
  });

  // Load theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { data } = await themeAPI.get();
        if (data) {
          setTheme(data);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    if (account && (account.role === 'SCHOOL' || account.role === 'TEACHER' || account.role === 'SCHOOL_ADMIN')) {
      loadTheme();
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account?.role, account?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (account?.role === 'SUPER_ADMIN') {
        const [{ data: stats }, { data: ministries }] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getMinistries('PENDING'),
        ]);
        setAdminStats({ stats, requests: ministries.ministries });
      } else if (account?.role === 'MINISTRY') {
        const { data } = await ministryAPI.getDashboard();
        setMinistryStats(data);
      } else if (account?.role === 'TEACHER') {
        const response = await teacherAPI.dashboard();
        console.log('Teacher dashboard response:', response);
        if (response?.data) {
          setTeacherStats({
            assignments: response.data.assignments || [],
            tests: response.data.tests || [],
            school: response.data.school || null,
            stats: response.data.stats || { classCount: 0, testCount: 0 },
          });
        } else {
          throw new Error('Invalid response structure');
        }
      } else {
        // For SCHOOL and SCHOOL_ADMIN roles
        const [testsRes, sessionsRes] = await Promise.all([
          testAPI.getAll(),
          sessionAPI.getAll(),
        ]);
        const testsData = Array.isArray(testsRes.data) ? testsRes.data : [];
        const sessionsData = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
        console.log('Dashboard data loaded:', {
          testsCount: testsData.length,
          sessionsCount: sessionsData.length,
          tests: testsData,
          sessions: sessionsData,
        });
        setTests(testsData);
        setSessions(sessionsData);
      }
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load dashboard data';
      console.error('Error details:', {
        message: errorMessage,
        response: error?.response?.data,
        status: error?.response?.status,
        role: account?.role,
      });
      // Don't show toast in production to avoid noise, but log the error
      if (import.meta.env.MODE === 'development') {
      toast.error(errorMessage);
      }
      // Set default values to prevent UI crashes
      if (account?.role === 'TEACHER') {
        setTeacherStats({
          assignments: [],
          tests: [],
          school: undefined,
          stats: { classCount: 0, testCount: 0 },
        });
      } else if (account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') {
        // Ensure tests and sessions are arrays even on error
        setTests([]);
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // Helper function to parse dates consistently (matches Sessions.tsx logic)
  const parseDate = (dateStr: string | Date) => {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    return new Date(dateStr);
  };

  // Get active session (matches Sessions.tsx logic for determining active sessions)
  // A session is "active" if it's isActive=true, not archived, and current date is between start and end
  const activeSession = sessions.find(s => {
    // Skip if not active or explicitly archived
    if (!s.isActive || s.isArchived === true) {
      return false;
    }
    
    const startDate = parseDate(s.startDate);
    const endDate = parseDate(s.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Session is active if current date is between start and end (inclusive)
    // This matches Sessions.tsx logic: session.isActive && start <= today && end >= today
    const isCurrentlyActive = start <= today && end >= today;
    
    // Debug logging for sessions that should be checked
    console.log('Checking session for active status:', {
      sessionName: s.name,
      sessionId: s.id,
      isActive: s.isActive,
      isArchived: s.isArchived,
      startDate: s.startDate,
      endDate: s.endDate,
      parsedStart: start.toISOString(),
      parsedEnd: end.toISOString(),
      today: today.toISOString(),
      startCompare: `${start.toISOString()} <= ${today.toISOString()} = ${start <= today}`,
      endCompare: `${end.toISOString()} >= ${today.toISOString()} = ${end >= today}`,
      result: isCurrentlyActive,
    });
    
    return isCurrentlyActive;
  });
  
  console.log('Dashboard active session result:', activeSession ? {
    id: activeSession.id,
    name: activeSession.name,
    startDate: activeSession.startDate,
    endDate: activeSession.endDate,
    isActive: activeSession.isActive,
    isArchived: activeSession.isArchived,
  } : 'No active session found', {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.isActive).length,
  });

  // Calculate metrics - use active session if available, otherwise use all data
  let totalTests = 0;
  let totalClasses = 0;
  let totalStudents = 0;

  console.log('Calculating metrics:', {
    hasActiveSession: !!activeSession,
    testsCount: Array.isArray(tests) ? tests.length : 0,
    sessionsCount: Array.isArray(sessions) ? sessions.length : 0,
    activeSession,
  });

  if (activeSession) {
    // Get tests assigned to the active session
    // Session.tests is an array of SessionTest objects with testId or test.id
    const activeSessionTestIds = new Set<string>();
    if (activeSession.tests && Array.isArray(activeSession.tests)) {
      activeSession.tests.forEach((st: any) => {
        if (st.testId) {
          activeSessionTestIds.add(st.testId);
        } else if (st.test?.id) {
          activeSessionTestIds.add(st.test.id);
        } else if (st.testId) {
          activeSessionTestIds.add(st.testId);
        }
      });
    }
    
    const activeSessionTests = tests.filter(t => activeSessionTestIds.has(t.id));
    
    totalTests = activeSessionTests.length;
    
    // Get classes assigned to the active session
    if (activeSession.classAssignments && Array.isArray(activeSession.classAssignments)) {
      totalClasses = activeSession.classAssignments.length;
    }
    
    // Count students in active session classes (if we have student data)
    // For now, we'll leave this as 0 or calculate from student assignments if available
  } else {
    // Fallback: show all tests and classes if no active session
    totalTests = Array.isArray(tests) ? tests.length : 0;
    
    // Count unique classes from all sessions
    const allClassIds = new Set<string>();
    sessions.forEach((session: any) => {
      if (session.classAssignments && Array.isArray(session.classAssignments)) {
        session.classAssignments.forEach((ca: any) => {
          if (ca.classroomId) {
            allClassIds.add(ca.classroomId);
          } else if (ca.classroom?.id) {
            allClassIds.add(ca.classroom.id);
          }
        });
      }
    });
    totalClasses = allClassIds.size;
    
    // Total students - would need to be fetched from API or calculated from student data
    // For now, leave as 0 or fetch separately if needed
  }

  console.log('Final metrics:', { totalTests, totalClasses, totalStudents });

  const renderSchoolDashboard = () => (
    <>
      {/* Header */}
      <div 
        className="rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(to right, ${theme?.primaryColor || '#A8518A'}, ${theme?.secondaryColor || theme?.primaryColor || '#A8518A'}, ${theme?.accentColor || theme?.primaryColor || '#A8518A'})`
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-white/80 text-lg">Welcome back, {account?.name}</p>
        {account?.uniqueSlug && (
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Your Unique URL</p>
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/${account.uniqueSlug}`)}
                className="text-white hover:text-primary-100 transition-colors p-1 rounded hover:bg-white/20"
                title="Copy URL"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <code className="text-white text-sm break-all">
              {window.location.origin}/{account.uniqueSlug}
            </code>
          </div>
        )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          className="card border-2"
          style={{
            background: `linear-gradient(to bottom right, ${theme?.primaryColor || '#A8518A'}15, ${theme?.primaryColor || '#A8518A'}25)`,
            borderColor: `${theme?.primaryColor || '#A8518A'}40`
          }}
        >
          <div 
            className="text-3xl font-bold mb-1"
            style={{ color: theme?.primaryColor || '#A8518A' }}
          >
            {totalTests}
                </div>
          <div className="text-sm text-gray-600">Total Tests</div>
              </div>
        <div 
          className="card border-2"
          style={{
            background: `linear-gradient(to bottom right, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}15, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}25)`,
            borderColor: `${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}40`
          }}
        >
          <div 
            className="text-3xl font-bold mb-1"
            style={{ color: theme?.secondaryColor || theme?.primaryColor || '#1d4ed8' }}
          >
            {totalClasses}
              </div>
          <div className="text-sm text-gray-600">Total Classes</div>
            </div>
        <div 
          className="card border-2"
          style={{
            background: `linear-gradient(to bottom right, ${theme?.accentColor || theme?.primaryColor || '#facc15'}15, ${theme?.accentColor || theme?.primaryColor || '#facc15'}25)`,
            borderColor: `${theme?.accentColor || theme?.primaryColor || '#facc15'}40`
          }}
        >
          <div 
            className="text-3xl font-bold mb-1"
            style={{ color: theme?.accentColor || theme?.primaryColor || '#facc15' }}
          >
            {totalStudents}
          </div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
      </div>

      {/* Active Session */}
      {(() => {

        if (!activeSession) {
          return (
            <div className="card border-2 border-dashed border-gray-300">
              <div className="text-center py-8">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
        </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h3>
                <p className="text-gray-500 text-sm">There is currently no active session running.</p>
      </div>
            </div>
          );
        }

        return (
          <div 
            className="card border-2"
            style={{
              background: `linear-gradient(to bottom right, ${theme?.primaryColor || '#A8518A'}10, white)`,
              borderColor: `${theme?.primaryColor || '#A8518A'}40`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}20`
                  }}
                >
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: theme?.secondaryColor || theme?.primaryColor || '#1d4ed8' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
        </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Active Session</h2>
                  <p className="text-sm text-gray-600">Current ongoing session</p>
          </div>
              </div>
              <span 
                className="px-3 py-1 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: `${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}20`,
                  color: theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'
                }}
              >
                Active Now
                        </span>
                    </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{activeSession.name}</h3>
                {activeSession.description && (
                  <p className="text-sm text-gray-600">{activeSession.description}</p>
                      )}
                    </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(activeSession.startDate), 'MMM dd, yyyy')}
                  </p>
                  </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">End Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(activeSession.endDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
            <Link
                  to={`/sessions/${activeSession.id}`}
                  className="inline-flex items-center text-primary hover:text-primary-600 font-medium text-sm"
                >
                  View Session Details
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
            </Link>
                      </div>
      </div>
          </div>
        );
      })()}

      {/* Quick Actions */}
      {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teacher Tests Quick Action */}
          <Link
            to="/teacher-tests"
            className="card-hover group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    Test by Teacher
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View all tests assigned to each teacher
                  </p>
                </div>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
                </div>
              </Link>

          {/* Class Tests Quick Action */}
          <Link
            to="/class-tests"
            className="card-hover group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
          </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    Test by Class
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View all tests assigned to each class
                  </p>
      </div>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      )}
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 rounded-xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Super Admin Overview</h1>
        <p className="text-slate-200 text-lg">Global health across ministries and schools</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Ministries', value: adminStats?.stats?.totals?.ministries ?? 0 },
          { label: 'Pending Requests', value: adminStats?.stats?.totals?.pendingMinistries ?? 0 },
          { label: 'Schools', value: adminStats?.stats?.totals?.schools ?? 0 },
          { label: 'Active Schools', value: adminStats?.stats?.totals?.activeSchools ?? 0 },
          { label: 'Teachers', value: adminStats?.stats?.totals?.teachers ?? 0 },
          { label: 'Students', value: adminStats?.stats?.totals?.students ?? 0 },
        ].map((stat) => (
          <div className="card-hover" key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Pending Ministry Requests</h2>
          <Link to="/ministries" className="text-primary text-sm font-medium">
            Manage →
          </Link>
        </div>
        {adminStats?.requests?.length === 0 ? (
          <p className="text-gray-500">No pending requests right now.</p>
        ) : (
          <div className="space-y-3">
            {adminStats.requests.map((req: any) => (
              <div key={req.id} className="p-4 border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{req.name}</p>
                  <p className="text-sm text-gray-500">{req.email}</p>
                </div>
                <span className="text-xs text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderMinistryDashboard = () => {
    const totals = ministryStats?.totals || {};
    const schools = ministryStats?.schools || [];

    const metrics = [
      {
        label: 'Total Schools',
        value: totals.schools ?? 0,
        subLabel: `${totals.activeSchools ?? 0} active, ${totals.inactiveSchools ?? 0} inactive`,
        icon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        gradient: 'from-indigo-500 to-indigo-600',
      },
      {
        label: 'Teachers',
        value: totals.teacherCount ?? 0,
        subLabel: 'Across all schools',
        icon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        gradient: 'from-blue-500 to-blue-600',
      },
      {
        label: 'Students',
        value: totals.studentCount ?? 0,
        subLabel: 'Enrolled students',
        icon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        gradient: 'from-green-500 to-green-600',
      },
      {
        label: 'Sessions',
        value: totals.sessionCount ?? 0,
        subLabel: `${totals.activeSessionCount ?? 0} active`,
        icon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        gradient: 'from-purple-500 to-purple-600',
      },
      {
        label: 'Tests',
        value: totals.testCount ?? 0,
        subLabel: `${totals.activeTestCount ?? 0} active`,
        icon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        gradient: 'from-orange-500 to-orange-600',
      },
      {
        label: 'Classes',
        value: totals.classCount ?? 0,
        subLabel: 'Academic classes',
        icon: (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        gradient: 'from-pink-500 to-pink-600',
      },
    ];

    return (
      <>
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Ministry Overview</h1>
          <p className="text-indigo-100 text-lg">Comprehensive metrics across all schools under your umbrella</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${metric.gradient} flex items-center justify-center text-xl sm:text-2xl shadow-md`}>
                  {metric.icon}
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{metric.value.toLocaleString()}</p>
              <p className="text-sm font-semibold text-gray-700 mb-1">{metric.label}</p>
              <p className="text-xs text-gray-500">{metric.subLabel}</p>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Schools Overview</h2>
              <p className="text-sm text-gray-500 mt-1">Detailed metrics for each school</p>
            </div>
            <Link to="/schools" className="text-primary text-sm font-medium hover:text-primary-600">
              Manage All →
            </Link>
          </div>
          {schools.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No schools onboarded yet.</p>
              <Link to="/schools" className="btn-primary inline-block">
                Create First School
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      School
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Teachers
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Classes
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tests
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schools.map((school: any) => (
                    <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{school.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{school.email}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            school.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {school.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-900 font-medium">
                        {school.teacherCount ?? 0}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-900 font-medium">
                        {school.classCount ?? 0}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-gray-900 font-medium">{school.sessionCount ?? 0}</span>
                          {school.activeSessionCount !== undefined && (
                            <span className="text-xs text-green-600">
                              {school.activeSessionCount} active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-gray-900 font-medium">{school.testCount ?? 0}</span>
                          {school.activeTestCount !== undefined && (
                            <span className="text-xs text-green-600">
                              {school.activeTestCount} active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-900 font-medium">
                        {school.studentCount ?? 0}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-500">
                        {school.createdAt ? new Date(school.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderTeacherDashboard = () => {
    const assignments = teacherStats?.assignments ?? [];
    const tests = teacherStats?.tests ?? [];
    const school = teacherStats?.school;
    const stats = teacherStats?.stats ?? { classCount: 0, testCount: 0 };

    // Get unique test groups for filter
    const uniqueTestGroups = Array.from(new Set(tests.map(t => t.testGroup).filter(Boolean)));

    // Get unique classrooms from assignments
    const uniqueClassrooms = Array.from(
      new Map(
        assignments
          .map((a: any) => a.classroom)
          .filter((c: any) => c && c.id)
          .map((c: any) => [c.id, c])
      ).values()
    );

    // Filter tests based on selected filters
    const filteredTests = tests.filter((test) => {
      if (teacherFilters.classroomId && test.classrooms && test.classrooms.length > 0) {
        const hasClassroom = test.classrooms.some((tc: any) => 
          (tc.classroom?.id || tc.id) === teacherFilters.classroomId
        );
        if (!hasClassroom) return false;
      }
      if (teacherFilters.testGroup && test.testGroup !== teacherFilters.testGroup) {
        return false;
      }
      return true;
    });

    return (
      <>
        {/* Header with theme gradient */}
        <div 
          className="rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(to right, ${theme?.primaryColor || '#A8518A'}, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}, ${theme?.accentColor || theme?.primaryColor || '#facc15'})`
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Teacher Workspace</h1>
                <p className="text-white/80 text-lg">
                {school?.name || 'Welcome to your dashboard'}
              </p>
            </div>
            {school && (
              <div className="text-right">
                  <p className="text-sm text-white/80 mb-1">School</p>
                <p className="text-xl font-semibold">{school.name}</p>
              </div>
            )}
          </div>
          {school?.uniqueSlug && (
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Student Registration URL</p>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/${school.uniqueSlug}`)}
                    className="text-white hover:text-white/80 transition-colors p-1 rounded hover:bg-white/20"
                  title="Copy URL"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              <code className="text-white text-sm break-all">
                {window.location.origin}/{school.uniqueSlug}
              </code>
            </div>
          )}
          </div>
        </div>

        {/* Stats Cards with theme colors */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div 
            className="card-hover rounded-xl shadow-lg p-6 text-white"
            style={{
              background: `linear-gradient(135deg, ${theme?.primaryColor || '#A8518A'} 0%, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'} 100%)`
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">Assigned Classes</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-2">{stats.classCount}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
          <div 
            className="card-hover rounded-xl shadow-lg p-6 text-white"
            style={{
              background: `linear-gradient(135deg, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'} 0%, ${theme?.accentColor || theme?.primaryColor || '#facc15'} 100%)`
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">Tests</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-2">{stats.testCount}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div 
            className="card-hover rounded-xl shadow-lg p-6 text-white"
            style={{
              background: `linear-gradient(135deg, ${theme?.accentColor || theme?.primaryColor || '#facc15'} 0%, ${theme?.primaryColor || '#A8518A'} 100%)`
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">Total Assignments</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-2">{assignments.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* My Classes Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Classes</h2>
            <Link to="/classes" className="text-primary text-sm font-medium hover:underline">
              View All →
            </Link>
          </div>
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No classes assigned yet</p>
              <p className="text-gray-400 text-sm">Contact your school administrator to get assigned to classes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-all"
                  style={{
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme?.primaryColor || '#A8518A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{assignment.classroom?.name}</h3>
                  </div>
                  {assignment.classroom?.academicSession && (
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="inline-flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {assignment.classroom.academicSession}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tests Section */}
        {tests.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Tests</h2>
              <Link to="/tests" className="text-primary text-sm font-medium hover:underline">
                View All →
              </Link>
            </div>

            {/* Filters */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                {(teacherFilters.classroomId || teacherFilters.testGroup) && (
                  <button
                    onClick={() => setTeacherFilters({ classroomId: '', testGroup: '' })}
                    className="text-xs text-primary hover:text-primary-600 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Filter by Class
                  </label>
                  <select
                    className="input-field text-sm py-2"
                    value={teacherFilters.classroomId}
                    onChange={(e) => setTeacherFilters({ ...teacherFilters, classroomId: e.target.value })}
                  >
                    <option value="">All Classes</option>
                    {uniqueClassrooms.map((classroom: any) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Filter by Test Group
                  </label>
                  <select
                    className="input-field text-sm py-2"
                    value={teacherFilters.testGroup}
                    onChange={(e) => setTeacherFilters({ ...teacherFilters, testGroup: e.target.value })}
                  >
                    <option value="">All Test Groups</option>
                    {uniqueTestGroups.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(teacherFilters.classroomId || teacherFilters.testGroup) && (
                <div className="mt-2 text-xs text-gray-500">
                  Showing {filteredTests.length} of {tests.length} test(s)
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(filteredTests.length === 0 ? tests : filteredTests).slice(0, 5).map((test) => (
                <Link
                  key={test.id}
                  to={`/tests/${test.id}`}
                  className="block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{test.title}</h3>
                        {test.testGroup && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            {test.testGroup}
                          </span>
                        )}
                      </div>
                      {test.description && (
                        <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {test.isTimed ? `${test.duration} min` : 'Untimed'}
                        </span>
                        {test.questions && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {test.questions.length || 0} questions
                          </span>
                        )}
                        {test.passingScore && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {test.passingScore}% passing
                          </span>
                        )}
                        {test.dueDate && (
                          <span className="text-orange-600 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(test.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      {test.classrooms && test.classrooms.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                          {test.classrooms.slice(0, 2).map((tc: any) => (
                            <span
                              key={tc.classroom?.id || tc.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full whitespace-nowrap"
                            >
                              {tc.classroom?.name || tc.name}
                            </span>
                          ))}
                          {test.classrooms.length > 2 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              +{test.classrooms.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-primary text-sm font-medium">
                        View →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/tests?create=true"
              className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all flex items-center space-x-3"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Create Test</p>
                <p className="text-sm text-gray-500">Create a new test for your classes</p>
              </div>
            </Link>
            <Link
              to="/sessions"
              className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all flex items-center space-x-3"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">View Sessions</p>
                <p className="text-sm text-gray-500">Manage your test sessions</p>
              </div>
            </Link>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-8">
      {account?.role === 'SUPER_ADMIN' && renderAdminDashboard()}
      {account?.role === 'MINISTRY' && renderMinistryDashboard()}
      {account?.role === 'TEACHER' && renderTeacherDashboard()}
      {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN' || !account?.role) && renderSchoolDashboard()}
    </div>
  );
}
