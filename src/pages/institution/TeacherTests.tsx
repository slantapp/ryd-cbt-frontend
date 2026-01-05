import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { testAPI, teacherAPI } from '../../services/api';
import { Test } from '../../types';
import toast from 'react-hot-toast';

export default function TeacherTests() {
  const { account } = useAuthStore();
  const [tests, setTests] = useState<Test[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherTests, setTeacherTests] = useState<{ [teacherId: string]: Test[] }>({});
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [testsRes, teachersRes] = await Promise.all([
        testAPI.getAll(),
        teacherAPI.getAll(),
      ]);

      const testsData = testsRes.data || [];
      const teachersData = teachersRes.data || [];

      setTests(testsData);
      setTeachers(teachersData);

      // Map tests to teachers (tests created by the teacher)
      const teacherTestMap: { [teacherId: string]: Test[] } = {};
      teachersData.forEach((teacher: any) => {
        const teacherTests = testsData.filter((test: Test) => {
          // Check if test was created by this teacher
          if (test.teacher?.id === teacher.id) return true;
          return false;
        });
        teacherTestMap[teacher.id] = teacherTests;
      });

      setTeacherTests(teacherTestMap);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load teacher tests');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = selectedTeacherId
    ? teachers.filter((t: any) => t.id === selectedTeacherId)
    : teachers;

  const hasTests = (teacherId: string) => {
    return (teacherTests[teacherId] || []).length > 0;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500">Loading teacher tests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test by Teacher</h1>
          <p className="text-gray-600 mt-1">View all tests assigned to each teacher</p>
        </div>
      </div>

      {/* Filter */}
      {teachers.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-4">
            <label htmlFor="teacher-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Filter by Teacher:
            </label>
            <select
              id="teacher-filter"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="input-field flex-1 max-w-xs"
            >
              <option value="">All Teachers</option>
              {teachers.map((teacher: any) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            {selectedTeacherId && (
              <button
                onClick={() => setSelectedTeacherId('')}
                className="text-sm text-primary hover:text-primary-600 font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {teachers.length === 0 ? (
        <div className="card text-center py-12">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teachers Found</h3>
          <p className="text-gray-500 mb-4">Add teachers to see their assigned tests.</p>
          <Link to="/teachers" className="btn-primary inline-block">
            Manage Teachers
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeachers.map((teacher: any) => {
            const teacherTestList = teacherTests[teacher.id] || [];
            
            return (
              <div key={teacher.id} className="card">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {teacher.name}
                    </h3>
                    {teacher.email && (
                      <p className="text-sm text-gray-500 mt-1">{teacher.email}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-semibold rounded-full">
                    {teacherTestList.length} test{teacherTestList.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {teacherTestList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>This teacher has no assigned tests</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teacherTestList.map((test: Test) => (
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
          
          {filteredTeachers.filter((t: any) => !hasTests(t.id)).length > 0 && selectedTeacherId === '' && (
            <div className="card text-center py-8 text-gray-500">
              <p>
                {filteredTeachers.filter((t: any) => !hasTests(t.id)).length} teacher(s) have no assigned tests
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

