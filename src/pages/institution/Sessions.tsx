import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI, testAPI, classroomAPI, sessionArchiveAPI } from '../../services/api';
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [archiveOptions, setArchiveOptions] = useState({
    archiveClassAssignments: false,
    archiveTeacherAssignments: false,
  });
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    testIds: [] as string[],
    classroomId: '' as string | undefined,
  });

  useEffect(() => {
    loadSessions();
    loadTests();
    if (account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') {
      loadClassrooms();
      loadArchivedSessions();
    }
  }, [account?.role]);

  const loadSessions = async () => {
    try {
      const response = await sessionAPI.getAll();
      setSessions(response.data);
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

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sessions</h1>
            <p className="text-primary-100 text-lg">Manage test sessions and schedules</p>
          </div>
          {account?.role === 'SCHOOL' && (
            <button 
              onClick={() => setShowForm(!showForm)} 
              className="bg-white text-primary hover:bg-primary-50 font-semibold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              {showForm ? 'Cancel' : '+ Create New Session'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{sessions.length}</div>
            <div className="text-sm text-primary-100 mt-1">Total Sessions</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">{activeSessions}</div>
            <div className="text-sm text-primary-100 mt-1">Active Now</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-bold">
              {sessions.reduce((sum, s) => sum + (s.tests?.length || 0), 0)}
            </div>
            <div className="text-sm text-primary-100 mt-1">Total Tests</div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
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

      {/* Tabs for Active/Archived */}
      {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
        <div className="card">
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'active'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Active Sessions ({sessions.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'archived'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Archived Sessions ({archivedSessions.length})
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {activeTab === 'active' && sessions.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
          <p className="text-gray-500 mb-6">Create a session to organize your tests</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.map((session) => {
            const startDate = new Date(session.startDate);
            const endDate = new Date(session.endDate);
            const isActive = session.isActive && startDate <= new Date() && endDate >= new Date();
            const isScheduled = session.isActive && startDate > new Date();
            
            return (
              <div
                key={session.id}
                className="card-hover group border-2 border-transparent hover:border-primary-200 transition-all relative"
              >
                <Link to={`/sessions/${session.id}`} className="block">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? 'bg-green-100 group-hover:bg-green-200' :
                        isScheduled ? 'bg-yellow-100 group-hover:bg-yellow-200' :
                        'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <svg className={`w-6 h-6 ${
                          isActive ? 'text-green-600' :
                          isScheduled ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{session.name}</h3>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                            isActive
                              ? 'bg-green-100 text-green-800'
                              : isScheduled
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {isActive ? 'Active Now' : isScheduled ? 'Scheduled' : 'Inactive'}
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
                    <span className="font-medium">Starts: {format(startDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Ends: {format(endDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">{session.tests?.length || 0} test{session.tests?.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                </Link>
                {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
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
      )}

      {/* Archived Sessions */}
      {activeTab === 'archived' && (
        archivedSessions.length === 0 ? (
          <div className="card text-center py-16 border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No archived sessions</h3>
            <p className="text-gray-500">Archived sessions will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {archivedSessions.map((session) => {
              const archivedDate = session.archivedAt ? new Date(session.archivedAt) : null;
              return (
                <div
                  key={session.id}
                  className="card border-2 border-gray-200 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-700">{session.name}</h3>
                      {session.description && (
                        <p className="text-gray-600 mt-2 line-clamp-2">{session.description}</p>
                      )}
                      {archivedDate && (
                        <p className="text-sm text-gray-500 mt-2">
                          Archived: {format(archivedDate, 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnarchive(session.id)}
                      className="bg-green-50 hover:bg-green-100 text-green-600 p-2 rounded-lg transition-colors"
                      title="Unarchive Session"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

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
