import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  testAPI,
  sessionAPI,
  adminAPI,
  ministryAPI,
  teacherAPI,
} from '../../services/api';
import { Test, Session, Classroom, TeacherAssignment } from '../../types';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(true);

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
        const [testsRes, sessionsRes] = await Promise.all([
          testAPI.getAll(),
          sessionAPI.getAll(),
        ]);
        setTests(testsRes.data);
        setSessions(sessionsRes.data);
      }
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load dashboard data';
      toast.error(errorMessage);
      // Set default values to prevent UI crashes
      if (account?.role === 'TEACHER') {
        setTeacherStats({
          assignments: [],
          tests: [],
          school: undefined,
          stats: { classCount: 0, testCount: 0 },
        });
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

  const activeTests = tests.filter((t) => t.isActive).length;
  const activeSessions = sessions.filter((s) => s.isActive).length;

  const renderSchoolDashboard = () => (
    <>
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-primary-100 text-lg">Welcome back, {account?.name}</p>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Tests', value: tests.length, emoji: '📝', gradient: 'from-primary to-primary-600' },
          { label: 'Active Tests', value: activeTests, emoji: '✅', gradient: 'from-green-500 to-green-600' },
          { label: 'Active Sessions', value: activeSessions, emoji: '📅', gradient: 'from-blue-500 to-blue-600' },
        ].map((card) => (
          <div className="card-hover" key={card.label}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg`}
                >
                  <span className="text-2xl">{card.emoji}</span>
                </div>
              </div>
              <div className="ml-5 flex-1">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/tests', label: 'Manage Tests', emoji: '📝', gradient: 'from-primary-50 to-primary-100' },
            { to: '/sessions', label: 'Manage Sessions', emoji: '📅', gradient: 'from-blue-50 to-blue-100' },
            { to: '/scores', label: 'View Scores', emoji: '📊', gradient: 'from-green-50 to-green-100' },
            { to: '/profile', label: 'Profile', emoji: '👤', gradient: 'from-purple-50 to-purple-100' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`flex flex-col items-center p-6 bg-gradient-to-br ${action.gradient} rounded-xl hover:shadow-md transition-all border-2 border-transparent hover:border-primary-300`}
            >
              <span className="text-4xl mb-3">{action.emoji}</span>
              <span className="font-semibold text-gray-900">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Tests</h2>
          <Link to="/tests" className="text-primary hover:text-primary-600 font-medium text-sm">
            View all →
          </Link>
        </div>
        {tests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tests yet. Create your first test!</p>
            <Link to="/tests?create=true" className="btn-primary inline-block">
              Create Test
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.slice(0, 5).map((test) => (
              <Link
                key={test.id}
                to={`/tests/${test.id}`}
                className="block p-5 border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-md transition-all bg-gray-50 hover:bg-white"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{test.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>⏱️ {test.duration} min</span>
                      <span>❓ {test.questions?.length || 0} questions</span>
                      <span>👥 {test._count?.studentTests || 0} attempts</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      test.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {test.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 rounded-xl shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Super Admin Overview</h1>
        <p className="text-slate-200 text-lg">Global health across ministries and schools</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
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
        icon: '🏫',
        gradient: 'from-indigo-500 to-indigo-600',
      },
      {
        label: 'Teachers',
        value: totals.teacherCount ?? 0,
        subLabel: 'Across all schools',
        icon: '👨‍🏫',
        gradient: 'from-blue-500 to-blue-600',
      },
      {
        label: 'Students',
        value: totals.studentCount ?? 0,
        subLabel: 'Enrolled students',
        icon: '👥',
        gradient: 'from-green-500 to-green-600',
      },
      {
        label: 'Sessions',
        value: totals.sessionCount ?? 0,
        subLabel: `${totals.activeSessionCount ?? 0} active`,
        icon: '📅',
        gradient: 'from-purple-500 to-purple-600',
      },
      {
        label: 'Tests',
        value: totals.testCount ?? 0,
        subLabel: `${totals.activeTestCount ?? 0} active`,
        icon: '📝',
        gradient: 'from-orange-500 to-orange-600',
      },
      {
        label: 'Classes',
        value: totals.classCount ?? 0,
        subLabel: 'Academic classes',
        icon: '📚',
        gradient: 'from-pink-500 to-pink-600',
      },
    ];

    return (
      <>
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Ministry Overview</h1>
          <p className="text-indigo-100 text-lg">Comprehensive metrics across all schools under your umbrella</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${metric.gradient} flex items-center justify-center text-2xl shadow-md`}>
                  {metric.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{metric.value.toLocaleString()}</p>
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

    return (
      <>
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Teacher Workspace</h1>
              <p className="text-emerald-100 text-lg">
                {school?.name || 'Welcome to your dashboard'}
              </p>
            </div>
            {school && (
              <div className="text-right">
                <p className="text-sm text-emerald-100 mb-1">School</p>
                <p className="text-xl font-semibold">{school.name}</p>
              </div>
            )}
          </div>
          {school?.uniqueSlug && (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Student Registration URL</p>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/${school.uniqueSlug}`)}
                  className="text-white hover:text-emerald-100 transition-colors p-1 rounded hover:bg-white/20"
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assigned Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.classCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.testCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Assignments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{assignments.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
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
            <div className="space-y-3">
              {tests.slice(0, 5).map((test) => (
                <Link
                  key={test.id}
                  to={`/tests/${test.id}`}
                  className="block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{test.title}</h3>
                      {test.description && (
                        <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {test.duration && (
                          <span>⏱️ {test.duration} min</span>
                        )}
                        {test.questions && (
                          <span>❓ {test.questions.length || 0} questions</span>
                        )}
                        {test.passingScore && (
                          <span>✅ {test.passingScore}% passing</span>
                        )}
                      </div>
                      {test.classrooms && test.classrooms.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {test.classrooms.slice(0, 3).map((tc: any) => (
                            <span
                              key={tc.classroom?.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {tc.classroom?.name}
                            </span>
                          ))}
                          {test.classrooms.length > 3 && (
                            <span className="px-2 py-1 text-gray-500 text-xs">
                              +{test.classrooms.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 text-primary text-sm font-medium">
                      View →
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
      {(account?.role === 'SCHOOL' || !account?.role) && renderSchoolDashboard()}
    </div>
  );
}
