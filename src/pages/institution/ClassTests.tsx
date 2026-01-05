import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { testAPI, classroomAPI } from '../../services/api';
import { Test, Classroom } from '../../types';
import toast from 'react-hot-toast';

export default function ClassTests() {
  const { account } = useAuthStore();
  const [tests, setTests] = useState<Test[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classTests, setClassTests] = useState<{ [classroomId: string]: Test[] }>({});
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [testsRes, classroomsRes] = await Promise.all([
        testAPI.getAll(),
        classroomAPI.list(),
      ]);

      const testsData = testsRes.data || [];
      const classroomsData = classroomsRes.data || [];

      setTests(testsData);
      setClassrooms(classroomsData);

      // Map tests to classrooms (tests assigned to the classroom)
      const classTestMap: { [classroomId: string]: Test[] } = {};
      classroomsData.forEach((classroom: Classroom) => {
        const testsForClass = testsData.filter((test: Test) => {
          if (!test.classrooms || test.classrooms.length === 0) return false;
          return test.classrooms.some((tc: any) =>
            (tc.classroom?.id || tc.classroomId || tc.id) === classroom.id
          );
        });
        classTestMap[classroom.id] = testsForClass;
      });

      setClassTests(classTestMap);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load class tests');
    } finally {
      setLoading(false);
    }
  };

  const filteredClassrooms = selectedClassroomId
    ? classrooms.filter((c: Classroom) => c.id === selectedClassroomId)
    : classrooms;

  const hasTests = (classroomId: string) => {
    return (classTests[classroomId] || []).length > 0;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500">Loading class tests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test by Class</h1>
          <p className="text-gray-600 mt-1">View all tests assigned to each class</p>
        </div>
      </div>

      {/* Filter */}
      {classrooms.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-4">
            <label htmlFor="classroom-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Filter by Class:
            </label>
            <select
              id="classroom-filter"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="input-field flex-1 max-w-xs"
            >
              <option value="">All Classes</option>
              {classrooms.map((classroom: Classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            {selectedClassroomId && (
              <button
                onClick={() => setSelectedClassroomId('')}
                className="text-sm text-primary hover:text-primary-600 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {classrooms.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Found</h3>
          <p className="text-gray-500 mb-4">Create classes to see their assigned tests.</p>
          <Link to="/classes" className="btn-primary inline-block">
            Manage Classes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClassrooms.map((classroom: Classroom) => {
            const classTestList = classTests[classroom.id] || [];
            
            return (
              <div key={classroom.id} className="card">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {classroom.name}
                    </h3>
                    {classroom.academicSession && (
                      <p className="text-sm text-gray-500 mt-1">{classroom.academicSession}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-semibold rounded-full">
                    {classTestList.length} test{classTestList.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {classTestList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>This class has no assigned tests</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classTestList.map((test: Test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{test.title}</h4>
                          {test.description && (
                            <p className="text-sm text-gray-500 truncate mt-1">{test.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {(() => {
                              const testGroup = (test as any).testGroup;
                              if (testGroup) {
                                if (typeof testGroup === 'object' && 'name' in testGroup) {
                                  return <span>Group: {testGroup.name}</span>;
                                } else if (typeof testGroup === 'string') {
                                  return <span>Group: {testGroup}</span>;
                                }
                              }
                              return null;
                            })()}
                            {(() => {
                              const subject = (test as any).subject;
                              const subjectId = (test as any).subjectId;
                              if (subject && typeof subject === 'object' && 'name' in subject) {
                                return <span>Subject: {subject.name}</span>;
                              } else if (subjectId) {
                                return <span>Subject ID: {subjectId}</span>;
                              }
                              return null;
                            })()}
                            {test.dueDate && (
                              <span>Due: {new Date(test.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <Link
                          to={`/tests/${test.id}`}
                          className="ml-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredClassrooms.filter((c: Classroom) => !hasTests(c.id)).length > 0 && selectedClassroomId === '' && (
            <div className="card text-center py-8 text-gray-500">
              <p>
                {filteredClassrooms.filter((c: Classroom) => !hasTests(c.id)).length} class(es) have no assigned tests
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

