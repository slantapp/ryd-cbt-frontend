import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI, testAPI, classroomAPI, sessionArchiveAPI, themeAPI } from '../../services/api';
import { Session, Test, Classroom } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Sessions() {
  const { account } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<Session[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [archiveOptions, setArchiveOptions] = useState({
    archiveClassAssignments: false,
    archiveTeacherAssignments: false,
  });
  const [activeTab, setActiveTab] = useState<'active-scheduled' | 'inactive' | 'archived'>('active-scheduled');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    testIds: [] as string[],
    classroomId: '' as string | undefined,
  });

  const isSuperAdmin = account?.role === 'SUPER_ADMIN';

  // Helper function to determine session status
  const getSessionStatus = (session: Session): 'active' | 'scheduled' | 'inactive' | 'archived' => {
    if (session.isArchived) return 'archived';
    
    const parseDate = (dateStr: string | Date) => {
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
      }
      return new Date(dateStr);
    };
    
    const startDate = parseDate(session.startDate);
    const endDate = parseDate(session.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    if (session.isActive && start <= today && end >= today) {
      return 'active';
    } else if (session.isActive && start > today) {
      return 'scheduled';
    } else {
      return 'inactive';
    }
  };

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
    loadSessions();
    loadTests();
    if (account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN' || isSuperAdmin) {
      if (isSuperAdmin) {
        // Super admin can view but not create, so skip loading classrooms and archived sessions for now
        // They can still view all sessions
      } else {
        loadClassrooms();
        loadArchivedSessions();
      }
    }
  }, [account?.role, isSuperAdmin]);

  const loadSessions = async () => {
    try {
      const response = await sessionAPI.getAll();
      // Ensure dates are always strings in YYYY-MM-DD format
      const normalizeDates = (sessions: Session[]) => {
        return sessions.map(session => ({
          ...session,
          startDate: typeof session.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(session.startDate)
            ? session.startDate
            : (() => {
                const date = new Date(session.startDate);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              })(),
          endDate: typeof session.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(session.endDate)
            ? session.endDate
            : (() => {
                const date = new Date(session.endDate);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              })(),
        }));
      };
      // Sort sessions: recent ones first (by startDate descending)
      const sortedSessions = normalizeDates(response.data).sort((a, b) => {
        // Sort by startDate (most recent first)
        const aStart = new Date(a.startDate).getTime();
        const bStart = new Date(b.startDate).getTime();
        return bStart - aStart;
      });
      setSessions(sortedSessions);
    } catch (error: any) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    try {
      const response = await testAPI.getAll();
      setTests(response.data);
    } catch (error: any) {
      console.error('Failed to load tests');
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

  const loadArchivedSessions = async () => {
    try {
      const response = await sessionArchiveAPI.getArchived();
      setArchivedSessions(response.data);
    } catch (error: any) {
      console.error('Failed to load archived sessions');
    }
  };

  const handleArchive = async () => {
    if (!selectedSession) return;
    try {
      await sessionArchiveAPI.archive(selectedSession.id, archiveOptions);
      toast.success('Session archived successfully');
      setShowArchiveDialog(false);
      setSelectedSession(null);
      setArchiveOptions({ archiveClassAssignments: false, archiveTeacherAssignments: false });
      loadSessions();
      loadArchivedSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to archive session');
    }
  };

  const handleUnarchive = async (sessionId: string) => {
    try {
      await sessionArchiveAPI.unarchive(sessionId);
      toast.success('Session unarchived successfully');
      loadSessions();
      loadArchivedSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unarchive session');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare data - remove classroomId if it's empty
      const submitData = {
        ...formData,
        classroomId: formData.classroomId || undefined,
      };
      await sessionAPI.create(submitData);
      toast.success('Session created successfully');
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        testIds: [],
        classroomId: undefined,
      });
      loadSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter(s => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return s.isActive && start <= new Date() && end >= new Date();
  }).length;

  const totalSessions = sessions.length;
  const totalTestsInSessions = sessions.reduce((sum, s) => sum + (s.tests?.length || 0), 0);

  return (
    <div className="space-y-8">
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Academic Sessions</h1>
              <p className="text-white/80 text-lg">Manage test sessions and schedules</p>
            </div>
            {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
              <button 
                onClick={() => setShowForm(!showForm)} 
                className="bg-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
                style={{ color: theme?.primaryColor || '#A8518A' }}
              >
                {showForm ? 'Cancel' : '+ Create New Session'}
              </button>
            )}
          </div>
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
            {totalSessions}
          </div>
          <div className="text-sm text-gray-600">Total Sessions</div>
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
            {activeSessions}
          </div>
          <div className="text-sm text-gray-600">Active Now</div>
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
            {totalTestsInSessions}
          </div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
        <div className="card border-2 border-primary-200 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Session</h2>
              <p className="text-sm text-gray-500">Organize your tests into scheduled sessions</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g., Spring 2024 Exams"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                className="input-field"
                placeholder="Session description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            {account?.role === 'SCHOOL' && classrooms.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign to Classroom (Optional)
                </label>
                <select
                  className="input-field"
                  value={formData.classroomId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      classroomId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">No classroom (General session)</option>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                      {classroom.academicSession && ` - ${classroom.academicSession}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Assigning to a classroom will link this session to that class. Teachers assigned to the class can manage it.
                </p>
              </div>
            )}
            {tests.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Tests (Optional - can add later)
                </label>
                <div className="border-2 border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                  {tests.map((test) => (
                    <label
                      key={test.id}
                      className="flex items-center p-3 hover:bg-white rounded-lg cursor-pointer transition-colors mb-2 last:mb-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.testIds.includes(test.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              testIds: [...formData.testIds, test.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              testIds: formData.testIds.filter((id) => id !== test.id),
                            });
                          }
                        }}
                        className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{test.title}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({test.questions?.length || 0} questions)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button type="submit" className="btn-primary">
                Create Session
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Session Status Tabs */}
      {(() => {
        const getSessionStatus = (session: Session): 'active' | 'scheduled' | 'inactive' | 'archived' => {
          if (session.isArchived) return 'archived';
          
          const parseDate = (dateStr: string | Date) => {
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const [year, month, day] = dateStr.split('-').map(Number);
              return new Date(Date.UTC(year, month - 1, day));
            }
            return new Date(dateStr);
          };
          
          const startDate = parseDate(session.startDate);
          const endDate = parseDate(session.endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Set dates to start of day for comparison
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          
          if (session.isActive && start <= today && end >= today) {
            return 'active';
          } else if (session.isActive && start > today) {
            return 'scheduled';
          } else {
            return 'inactive';
          }
        };

        const activeScheduledCount = sessions.filter(s => {
          const status = getSessionStatus(s);
          return status === 'active' || status === 'scheduled';
        }).length;
        const inactiveCount = sessions.filter(s => getSessionStatus(s) === 'inactive').length;
        const archivedCount = sessions.filter(s => getSessionStatus(s) === 'archived').length;

        return (
          <div className="card">
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-0">
              <button
                onClick={() => setActiveTab('active-scheduled')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'active-scheduled'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Active & Scheduled ({activeScheduledCount})
              </button>
              <button
                onClick={() => setActiveTab('inactive')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'inactive'
                    ? 'border-gray-500 text-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'archived'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Archived ({archivedCount})
              </button>
            </div>
          </div>
        );
      })()}

      {/* Sessions List */}
      {(() => {
        const filteredSessions = activeTab === 'active-scheduled'
          ? sessions.filter(s => {
              const status = getSessionStatus(s);
              return status === 'active' || status === 'scheduled';
            })
          : sessions.filter(s => getSessionStatus(s) === activeTab);

        if (filteredSessions.length === 0) {
          const emptyMessages = {
            'active-scheduled': { emoji: '✅', title: 'No active or scheduled sessions', message: 'There are no active or scheduled sessions' },
            inactive: { emoji: '⏸️', title: 'No inactive sessions', message: 'There are no inactive sessions' },
            archived: { emoji: '📦', title: 'No archived sessions', message: 'Archived sessions will appear here' },
          };
          const empty = emptyMessages[activeTab];
          
          return (
            <div className="card text-center py-16 border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">{empty.emoji}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{empty.title}</h3>
              <p className="text-gray-500 mb-6">{empty.message}</p>
              {activeTab === 'active-scheduled' && (account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  Create Your First Session
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSessions.map((session) => {
            // Parse dates as UTC to avoid timezone shifts
            // Dates are now returned as YYYY-MM-DD strings from the backend
            // Parse them for display and comparison
            const parseDate = (dateStr: string | Date) => {
              if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(Date.UTC(year, month - 1, day));
              }
              return new Date(dateStr);
            };
            const startDate = parseDate(session.startDate);
            const endDate = parseDate(session.endDate);
            // Format dates using UTC to prevent one-day backward shift
            // Since dates come as YYYY-MM-DD strings, parse them directly for display
            const formatUTCDate = (dateStr: string | Date) => {
              // If it's already a string in YYYY-MM-DD format, use it directly
              if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                // Create a UTC date at noon to avoid timezone shifts when formatting
                const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                return format(utcDate, 'MMM dd, yyyy');
              }
              // If it's a Date object, extract UTC components
              const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
              const year = date.getUTCFullYear();
              const month = date.getUTCMonth();
              const day = date.getUTCDate();
              // Create a UTC date at noon to avoid timezone shifts when formatting
              const utcDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
              return format(utcDate, 'MMM dd, yyyy');
            };
            // Determine status for display
            const sessionStatus = getSessionStatus(session);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const isActive = sessionStatus === 'active';
            const isScheduled = sessionStatus === 'scheduled';
            const isArchived = sessionStatus === 'archived';
            
            return (
              <div
                key={session.id}
                className={`group border-2 transition-all relative ${
                  isArchived 
                    ? 'card border-gray-200 bg-gray-50' 
                    : 'card-hover border-transparent hover:border-primary-200'
                }`}
              >
                <Link to={`/sessions/${session.id}`} className="block">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? 'bg-green-100 group-hover:bg-green-200' :
                        isScheduled ? 'bg-yellow-100 group-hover:bg-yellow-200' :
                        isArchived ? 'bg-gray-200 group-hover:bg-gray-300' :
                        'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <svg className={`w-6 h-6 ${
                          isActive ? 'text-green-600' :
                          isScheduled ? 'text-yellow-600' :
                          isArchived ? 'text-gray-500' :
                          'text-gray-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold group-hover:text-primary transition-colors ${
                          isArchived ? 'text-gray-700' : 'text-gray-900'
                        }`}>{session.name}</h3>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            isActive
                              ? 'bg-green-100 text-green-800'
                              : isScheduled
                              ? 'bg-yellow-100 text-yellow-800'
                              : isArchived
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {isActive ? 'Active Now' : isScheduled ? 'Scheduled' : isArchived ? 'Archived' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {session.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{session.description}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Starts: {formatUTCDate(session.startDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Ends: {formatUTCDate(session.endDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">{session.tests?.length || 0} test{session.tests?.length !== 1 ? 's' : ''}</span>
                  </div>
                  {isArchived && session.archivedAt && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="font-medium">Archived: {formatUTCDate(session.archivedAt)}</span>
                    </div>
                  )}
                </div>
                </Link>
                {!isArchived && (account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSession(session);
                        setShowArchiveDialog(true);
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
                      title="Archive Session"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* Archive Dialog */}
      {showArchiveDialog && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Archive Session</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive <strong>{selectedSession.name}</strong>? You can unarchive it later.
            </p>
            <div className="space-y-4 mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveOptions.archiveClassAssignments}
                  onChange={(e) =>
                    setArchiveOptions({
                      ...archiveOptions,
                      archiveClassAssignments: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-primary focus:ring-primary rounded"
                />
                <div>
                  <span className="font-semibold text-gray-900">Archive Class Assignments</span>
                  <p className="text-sm text-gray-500">
                    Move students to unassigned pool and archive their class assignments
                  </p>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveOptions.archiveTeacherAssignments}
                  onChange={(e) =>
                    setArchiveOptions({
                      ...archiveOptions,
                      archiveTeacherAssignments: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-primary focus:ring-primary rounded"
                />
                <div>
                  <span className="font-semibold text-gray-900">Archive Teacher Assignments</span>
                  <p className="text-sm text-gray-500">
                    Remove teacher assignments to classes in this session
                  </p>
                </div>
              </label>
            </div>
            <div className="flex space-x-3">
              <button onClick={handleArchive} className="btn-primary flex-1">
                Archive Session
              </button>
              <button
                onClick={() => {
                  setShowArchiveDialog(false);
                  setSelectedSession(null);
                  setArchiveOptions({ archiveClassAssignments: false, archiveTeacherAssignments: false });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
