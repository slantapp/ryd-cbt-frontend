import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sessionAPI, testAPI, classroomAPI } from '../../services/api';
import { Session, Test, Classroom } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuthStore();
  const [session, setSession] = useState<Session | null>(null);
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddClassesDialog, setShowAddClassesDialog] = useState(false);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
    testIds: [] as string[],
    classroomIds: [] as string[],
  });

  const isSchool = account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN';

  useEffect(() => {
    if (id) {
      loadSession();
      loadAllTests();
      if (isSchool) {
        loadAllClassrooms();
      }
    }
  }, [id, isSchool]);

  // Reload classrooms when dialog opens
  useEffect(() => {
    if (showAddClassesDialog && isSchool) {
      loadAllClassrooms();
    }
  }, [showAddClassesDialog, isSchool]);

  const loadSession = async () => {
    try {
      const response = await sessionAPI.getOne(id!);
      setSession(response.data);
      const startDate = new Date(response.data.startDate);
      const endDate = new Date(response.data.endDate);
      setFormData({
        name: response.data.name,
        description: response.data.description || '',
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        isActive: response.data.isActive,
        testIds: response.data.tests?.map((st: any) => st.testId) || [],
        classroomIds: response.data.classAssignments?.map((ca: any) => ca.classroomId) || [],
      });
    } catch (error: any) {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const loadAllTests = async () => {
    try {
      const response = await testAPI.getAll();
      setAllTests(response.data);
    } catch (error: any) {
      console.error('Failed to load tests');
    }
  };

  const loadAllClassrooms = async () => {
    try {
      const response = await classroomAPI.list();
      setAllClassrooms(response.data);
    } catch (error: any) {
      console.error('Failed to load classrooms:', error);
      toast.error(error?.response?.data?.error || 'Failed to load classrooms');
    }
  };

  const handleAddClasses = async () => {
    if (selectedClassroomIds.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    try {
      const response = await sessionAPI.addClasses(id!, selectedClassroomIds);
      toast.success(response.data.message || 'Classes added successfully');
      setShowAddClassesDialog(false);
      setSelectedClassroomIds([]);
      loadSession();
    } catch (error: any) {
      console.error('Add classes error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add classes';
      toast.error(errorMessage);
    }
  };

  const handleRemoveClass = async (classroomId: string) => {
    if (!confirm('Are you sure you want to remove this class from the session?')) {
      return;
    }

    try {
      const response = await sessionAPI.removeClasses(id!, [classroomId]);
      toast.success(response.data.message || 'Class removed successfully');
      loadSession();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove class');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sessionAPI.update(id!, formData);
      toast.success('Session updated');
      setShowEditForm(false);
      loadSession();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update session');
    }
  };

  const handleDelete = async () => {
    try {
      await sessionAPI.delete(id!);
      toast.success('Session deleted');
      navigate('/sessions');
    } catch (error: any) {
      toast.error('Failed to delete session');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!session) {
    return <div>Session not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/sessions" className="text-primary hover:text-primary-600">
            ← Back to Sessions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{session.name}</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="btn-secondary"
          >
            {showEditForm ? 'Cancel Edit' : 'Edit Session'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Delete Session
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="card bg-red-50 border border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Confirm Delete</h3>
          <p className="text-red-700 mb-4">
            Are you sure you want to delete this session? This action cannot be undone.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleDelete}
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
          <h2 className="text-xl font-semibold mb-4">Edit Session</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <input
              className="input-field"
              placeholder="Session Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <textarea
              className="input-field"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
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
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            {isSchool && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Classes
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {allClassrooms.map((classroom) => (
                    <label
                      key={classroom.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.classroomIds.includes(classroom.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              classroomIds: [...formData.classroomIds, classroom.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              classroomIds: formData.classroomIds.filter((id) => id !== classroom.id),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <div>
                        <span className="text-sm font-medium">{classroom.name}</span>
                        {classroom.academicSession && (
                          <p className="text-xs text-gray-500">{classroom.academicSession}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tests
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                {allTests.map((test) => (
                  <label
                    key={test.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded"
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
                      className="mr-2"
                    />
                    <span className="text-sm">{test.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="btn-primary">
                Update Session
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
        <>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Session Details</h2>
            <p className="text-gray-600 mb-4">{session.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Start Date</label>
                <p className="font-medium">
                  {format(new Date(session.startDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">End Date</label>
                <p className="font-medium">
                  {format(new Date(session.endDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p className="font-medium">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      session.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {session.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Classes in Session</h2>
              {isSchool && (
                <button
                  onClick={() => {
                    // If no classes exist, redirect to classes page
                    if (allClassrooms.length === 0) {
                      navigate('/classes');
                    } else {
                      setShowAddClassesDialog(true);
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  + Add Classes
                </button>
              )}
            </div>
            {session.classAssignments && session.classAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {session.classAssignments.map((ca: any) => (
                  <div
                    key={ca.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{ca.classroom?.name}</h3>
                        {ca.classroom?.academicSession && (
                          <p className="text-sm text-gray-500 mt-1">
                            {ca.classroom.academicSession}
                          </p>
                        )}
                      </div>
                      {isSchool && (
                        <button
                          onClick={() => handleRemoveClass(ca.classroomId)}
                          className="ml-2 text-red-600 hover:text-red-800"
                          title="Remove class"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No classes assigned to this session</p>
                {isSchool && (
                  <button
                    onClick={() => {
                      // If no classes exist, redirect to classes page
                      if (allClassrooms.length === 0) {
                        navigate('/classes');
                      } else {
                        setShowAddClassesDialog(true);
                      }
                    }}
                    className="btn-primary"
                  >
                    {allClassrooms.length === 0 ? 'Create Classes' : 'Add Classes'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Tests in Session</h2>
            {session.tests && session.tests.length > 0 ? (
              <div className="space-y-3">
                {session.tests?.map((st: any) => (
                  <Link
                    key={st.id}
                    to={`/tests/${st.testId}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                  >
                    <h3 className="font-medium">{st.test.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {st.test.description}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tests in this session</p>
            )}
          </div>
        </>
      )}

      {/* Add Classes Dialog */}
      {showAddClassesDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add Classes to Session</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Select classes to add to this session. Already assigned classes are not shown.
              </p>
              <div className="border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                {allClassrooms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      No classes available. Please create classes first.
                    </p>
                    <button
                      onClick={() => {
                        setShowAddClassesDialog(false);
                        navigate('/classes');
                      }}
                      className="btn-primary"
                    >
                      Go to Classes Page
                    </button>
                  </div>
                ) : (
                  <>
                    {allClassrooms
                      .filter((classroom) => 
                        !session?.classAssignments?.some((ca: any) => ca.classroomId === classroom.id)
                      )
                      .map((classroom) => (
                        <label
                          key={classroom.id}
                          className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClassroomIds.includes(classroom.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassroomIds([...selectedClassroomIds, classroom.id]);
                              } else {
                                setSelectedClassroomIds(selectedClassroomIds.filter(id => id !== classroom.id));
                              }
                            }}
                            className="mr-3"
                          />
                          <div>
                            <span className="font-medium text-gray-900">{classroom.name}</span>
                            {classroom.academicSession && (
                              <p className="text-sm text-gray-500">{classroom.academicSession}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    {allClassrooms.filter((classroom) => 
                      !session?.classAssignments?.some((ca: any) => ca.classroomId === classroom.id)
                    ).length === 0 && (
                      <p className="text-gray-500 text-center py-8">
                        All available classes are already assigned to this session
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddClassesDialog(false);
                  setSelectedClassroomIds([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClasses}
                className="btn-primary"
                disabled={selectedClassroomIds.length === 0}
              >
                Add {selectedClassroomIds.length > 0 ? `(${selectedClassroomIds.length})` : ''} Classes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
