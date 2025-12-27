import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentAPI, sessionAPI, classroomAPI, institutionAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Students() {
  const { account } = useAuthStore();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkUploadClassroomId, setBulkUploadClassroomId] = useState<string>('');
  const [bulkUploadSessionId, setBulkUploadSessionId] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    classroomId: '',
    sessionId: '',
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    sessionId: '',
    classroomId: '',
    isAssigned: '',
    search: '',
  });
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    classroomId: '',
    sessionId: '',
  });
  const [promoteForm, setPromoteForm] = useState({
    studentIds: [] as string[],
    targetClassroomId: '',
    targetSessionId: '',
  });
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  const isSchool = useMemo(() => {
    return account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN';
  }, [account?.role]);

  const isTeacher = useMemo(() => {
    return account?.role === 'TEACHER';
  }, [account?.role]);

  const isSuperAdmin = useMemo(() => {
    return account?.role === 'SUPER_ADMIN';
  }, [account?.role]);

  useEffect(() => {
    if (isSchool || isTeacher || isSuperAdmin) {
      loadStudents();
      if (isSchool) {
        loadSessions();
        loadClassrooms();
        loadSchoolInfo();
      } else if (isTeacher) {
        // Teachers can filter by sessions and classes they're assigned to
        loadSessions();
        loadClassrooms();
      } else if (isSuperAdmin) {
        // Super admins can view all sessions and classrooms for filtering
        loadSessions();
        loadClassrooms();
      }
    }
  }, [isSchool, isTeacher, isSuperAdmin, filters]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.sessionId) params.sessionId = filters.sessionId;
      if (filters.classroomId) params.classroomId = filters.classroomId;
      if (filters.isAssigned !== '') params.isAssigned = filters.isAssigned === 'true';
      
      const { data } = await studentAPI.getAll(params);
      let filtered = data;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = data.filter((s: any) =>
          s.firstName?.toLowerCase().includes(searchLower) ||
          s.lastName?.toLowerCase().includes(searchLower) ||
          s.username?.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower)
        );
      }
      
      setStudents(filtered);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await sessionAPI.getAll();
      setSessions(data);
    } catch (error: any) {
      console.error('Failed to load sessions');
    }
  };

  const loadClassrooms = async () => {
    try {
      const { data } = await classroomAPI.list();
      setClassrooms(data);
    } catch (error: any) {
      console.error('Failed to load classrooms');
    }
  };

  const loadSchoolInfo = async () => {
    try {
      const { data } = await institutionAPI.getProfile();
      setSchoolInfo(data);
    } catch (error: any) {
      console.error('Failed to load school info');
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        firstName: createFormData.firstName.trim(),
        lastName: createFormData.lastName.trim(),
        username: createFormData.username.trim(),
      };
      
      if (createFormData.email) submitData.email = createFormData.email.trim();
      if (createFormData.phone) submitData.phone = createFormData.phone.trim();
      if (createFormData.dateOfBirth) submitData.dateOfBirth = createFormData.dateOfBirth;
      if (createFormData.password) submitData.password = createFormData.password;
      if (createFormData.classroomId) submitData.classroomId = createFormData.classroomId;
      if (createFormData.sessionId) submitData.sessionId = createFormData.sessionId;
      
      // Validate that if one is selected, both must be selected
      if ((createFormData.classroomId && !createFormData.sessionId) || (!createFormData.classroomId && createFormData.sessionId)) {
        toast.error('Please select both class and session, or leave both empty');
        return;
      }

      await studentAPI.create(submitData);
      toast.success('Student created successfully');
      setShowCreateForm(false);
      setCreateFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        password: '',
        classroomId: '',
        sessionId: '',
      });
      loadStudents();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create student');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate that if one is selected, both must be selected
    if ((bulkUploadClassroomId && !bulkUploadSessionId) || (!bulkUploadClassroomId && bulkUploadSessionId)) {
      toast.error('Please select both class and session, or leave both empty to upload without assignment');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const response = await studentAPI.bulkUpload(file, {
        classroomId: bulkUploadClassroomId || undefined,
        sessionId: bulkUploadSessionId || undefined,
      });
      toast.success(
        `Upload completed: ${response.data.successful} successful, ${response.data.failed} failed${bulkUploadClassroomId ? ' and assigned to class' : ''}`
      );
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Upload errors:', response.data.errors);
      }
      loadStudents();
      setShowBulkUpload(false);
      setBulkUploadClassroomId('');
      setBulkUploadSessionId('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload students');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await studentAPI.downloadTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student-upload-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error('Failed to download template');
    }
  };

  const handleAssignStudent = async () => {
    // Check if we're assigning multiple students or a single student
    // If students are selected via checkboxes, use those; otherwise use the dropdown selection
    const studentIdsToAssign = selectedStudents.length > 0 ? selectedStudents : 
                                (assignForm.studentId ? [assignForm.studentId] : []);
    
    if (studentIdsToAssign.length === 0 || !assignForm.classroomId || !assignForm.sessionId) {
      toast.error('Please select student(s), class, and session');
      return;
    }

    // For bulk assignment, show confirmation
    if (studentIdsToAssign.length > 1) {
      const selectedClass = classrooms.find((c) => c.id === assignForm.classroomId);
      const selectedSession = sessions.find((s) => s.id === assignForm.sessionId);
      const confirmMessage = `Assign ${studentIdsToAssign.length} students to:\n` +
        `Class: ${selectedClass?.name || 'Unknown'}\n` +
        `Session: ${selectedSession?.name || 'Unknown'}\n\n` +
        `This will assign all selected students to the same class and session. Continue?`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setAssigning(true);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Assign each student
      for (const studentId of studentIdsToAssign) {
        try {
          await studentAPI.assignToClass({
            studentId,
            classroomId: assignForm.classroomId,
            sessionId: assignForm.sessionId,
          });
          successCount++;
        } catch (error: any) {
          errorCount++;
          const student = students.find((s) => s.id === studentId);
          const studentName = student ? `${student.firstName} ${student.lastName}` : studentId;
          errors.push(`${studentName}: ${error?.response?.data?.error || 'Failed to assign'}`);
        }
      }

      if (successCount > 0) {
        toast.success(
          `✅ ${successCount} student(s) assigned successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        );
      }

      if (errorCount > 0 && errors.length > 0) {
        console.error('Assignment errors:', errors);
        toast.error(
          `❌ ${errorCount} student(s) failed to assign:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...(see console for more)' : ''}`,
          { duration: 8000 }
        );
      }

      setShowAssignDialog(false);
      setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
      setSelectedStudents([]);
      loadStudents();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const currentAssignment = student?.classAssignments?.[0];
    
    if (!currentAssignment) {
      toast.error('Student is not assigned to any class');
      return;
    }

    const currentClass = classrooms.find((c) => c.id === currentAssignment.classroomId);
    const currentSession = sessions.find((s) => s.id === currentAssignment.sessionId);

    const confirmMessage = `Are you sure you want to unassign this student from:\n` +
      `Class: ${currentClass?.name || 'Unknown'}\n` +
      `Session: ${currentSession?.name || 'Unknown'}\n\n` +
      `They will be moved to the unassigned pool.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await studentAPI.unassignFromClass({ studentId });
      toast.success('Student unassigned successfully');
      loadStudents();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to unassign student');
    }
  };

  const handlePromoteStudents = async () => {
    if (promoteForm.studentIds.length === 0 || !promoteForm.targetClassroomId || !promoteForm.targetSessionId) {
      toast.error('Please select students, target class, and session');
      return;
    }

    try {
      const response = await studentAPI.promote(promoteForm);
      
      // Show detailed results
      if (response.data.results) {
        const { successful, failed } = response.data.results;
        
        if (successful.length > 0) {
          toast.success(`✅ ${successful.length} student(s) promoted successfully`);
        }
        
        if (failed.length > 0) {
          console.error('Promotion failures:', failed);
          // Show first few errors to user
          const errorMessages = failed.slice(0, 3).join('\n');
          toast.error(
            `❌ ${failed.length} student(s) failed to promote:\n${errorMessages}${failed.length > 3 ? '\n...(see console for more)' : ''}`,
            { duration: 8000 }
          );
        }
      } else {
        toast.success(response.data.message);
      }
      
      setShowPromoteDialog(false);
      setPromoteForm({ studentIds: [], targetClassroomId: '', targetSessionId: '' });
      setSelectedStudents([]);
      loadStudents();
    } catch (error: any) {
      console.error('Promotion error:', error);
      toast.error(error?.response?.data?.error || 'Failed to promote students');
    }
  };

  const handleToggleSelect = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  const copyRegistrationUrl = () => {
    if (!schoolInfo?.uniqueSlug) {
      toast.error('School does not have a unique URL slug');
      return;
    }
    const url = `${window.location.origin}/${schoolInfo.uniqueSlug}/register`;
    navigator.clipboard.writeText(url);
    toast.success('Registration URL copied to clipboard!');
  };

  if (!isSchool && !isTeacher && !isSuperAdmin) {
    return <p className="text-center text-gray-500">Only schools, teachers, and super admins can view students.</p>;
  }

  const unassignedCount = students.filter((s) => !s.isAssigned).length;
  const markedForPromotion = students.filter((s) => s.markedForPromotion).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            {isTeacher ? 'My Students' : isSuperAdmin ? 'All Students' : 'Student Management'}
          </h1>
          <p className="text-blue-100 text-lg">
          {isTeacher ? 'View students from your assigned classes' : isSuperAdmin ? 'View all students across all schools' : 'Manage students, assignments, and promotions'}
        </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="text-3xl font-bold text-blue-600 mb-1">{students.length}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {students.filter((s) => s.isAssigned).length}
          </div>
          <div className="text-sm text-gray-600">Assigned</div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
          <div className="text-3xl font-bold text-orange-600 mb-1">{unassignedCount}</div>
          <div className="text-sm text-gray-600">Unassigned</div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-1">{markedForPromotion}</div>
          <div className="text-sm text-gray-600">Marked for Promotion</div>
        </div>
      </div>

      {/* Registration URL - Only for Schools */}
      {schoolInfo?.uniqueSlug && isSchool && (
        <div className="card bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Student Self-Registration</h3>
              <p className="text-sm text-gray-600">
                Share this URL with students to allow them to register themselves:
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded mt-2 inline-block">
                {window.location.origin}/{schoolInfo.uniqueSlug}/register
              </code>
            </div>
            <button
              onClick={copyRegistrationUrl}
              className="btn-primary px-4 py-2 text-sm"
            >
              📋 Copy URL
            </button>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2">
            {isSchool && (
              <>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="btn-primary text-sm"
                >
                  {showCreateForm ? '✕ Cancel' : '➕ Add Student'}
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="btn-secondary text-sm"
                >
                  📥 Download Template
                </button>
                <button
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                  className="btn-secondary text-sm"
                >
                  {showBulkUpload ? '✕ Cancel' : '📤 Bulk Upload'}
                </button>
              </>
            )}
            {isSchool && (
              <>
                <button
                  onClick={() => {
                    // If students are selected, use them for bulk assignment
                    if (selectedStudents.length > 0) {
                      setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
                    } else {
                      // No students selected, allow single selection
                      setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
                    }
                    setShowAssignDialog(true);
                  }}
                  className="btn-primary text-sm"
                  disabled={selectedStudents.length === 0 && students.length === 0}
                >
                  ➕ Assign to Class {selectedStudents.length > 0 ? `(${selectedStudents.length} selected)` : ''}
                </button>
                {selectedStudents.length > 0 && (
                  <button
                    onClick={() => {
                      setPromoteForm({ ...promoteForm, studentIds: selectedStudents });
                      setShowPromoteDialog(true);
                    }}
                    className="btn-primary text-sm bg-purple-600 hover:bg-purple-700"
                  >
                    🎓 Promote Selected ({selectedStudents.length})
                  </button>
                )}
              </>
            )}
          </div>
        </div>


        {/* Bulk Upload Section - Only for Schools */}
        {showBulkUpload && isSchool && (
          <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Upload Students</h3>
            
            {/* Class and Session Selection (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Session (Optional)
                </label>
                <select
                  className="input-field w-full"
                  value={bulkUploadSessionId}
                  onChange={(e) => {
                    setBulkUploadSessionId(e.target.value);
                    // Clear classroom selection if session changes
                    if (!e.target.value) {
                      setBulkUploadClassroomId('');
                    }
                  }}
                  disabled={uploading}
                >
                  <option value="">Select session (optional)</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Class (Optional)
                </label>
                <select
                  className="input-field w-full"
                  value={bulkUploadClassroomId}
                  onChange={(e) => setBulkUploadClassroomId(e.target.value)}
                  disabled={uploading || !bulkUploadSessionId}
                >
                  <option value="">
                    {!bulkUploadSessionId ? 'Select session first' : 'Select class (optional)'}
                  </option>
                  {bulkUploadSessionId && classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {bulkUploadClassroomId && bulkUploadSessionId && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Students will be automatically assigned to: <strong>
                    {classrooms.find((c) => c.id === bulkUploadClassroomId)?.name}
                  </strong> in session <strong>
                    {sessions.find((s) => s.id === bulkUploadSessionId)?.name}
                  </strong>
                </p>
              </div>
            )}

            <div className="flex items-center space-x-4">
              <label className="btn-secondary cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? 'Uploading...' : '📁 Choose Excel File'}
              </label>
              <span className="text-sm text-gray-600">
                Upload an Excel file with student data. Download the template for the correct format.
                {bulkUploadClassroomId && bulkUploadSessionId && ' Students will be assigned to the selected class.'}
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
            <input
              type="text"
              placeholder="🔍 Search students..."
              className="input-field"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <select
              className="input-field"
              value={filters.sessionId}
              onChange={(e) => setFilters({ ...filters, sessionId: e.target.value })}
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={filters.classroomId}
              onChange={(e) => setFilters({ ...filters, classroomId: e.target.value })}
            >
              <option value="">All Classes</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={filters.isAssigned}
              onChange={(e) => setFilters({ ...filters, isAssigned: e.target.value })}
            >
              <option value="">All Students</option>
              <option value="true">Assigned Only</option>
              <option value="false">Unassigned Only</option>
            </select>
          </div>
          {(filters.search || filters.sessionId || filters.classroomId || filters.isAssigned) && (
            <button
              onClick={() => setFilters({ sessionId: '', classroomId: '', isAssigned: '', search: '' })}
              className="text-sm text-primary hover:text-primary-600 font-medium flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Students Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-gray-600">Loading students...</div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-600 text-lg mb-2">No students found</p>
            <p className="text-gray-500">Upload students or share the registration URL to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {isSchool && (
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length && students.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {isSchool && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleToggleSelect(student.id)}
                          className="w-4 h-4"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {student.firstName?.[0] || ''}{student.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </div>
                          {student.dateOfBirth && (
                            <div className="text-xs text-gray-500">
                              {format(new Date(student.dateOfBirth), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{student.username}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{student.email || '-'}</td>
                    <td className="py-3 px-4">
                      {student.classAssignments && student.classAssignments.length > 0 ? (
                        // Show only the current assignment (1:1 relationship)
                        <div className="text-sm">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {student.classAssignments[0].classroom?.name}
                            {student.classAssignments[0].session?.name && ` (${student.classAssignments[0].session.name})`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col space-y-1">
                        {student.isAssigned ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            ✓ Assigned
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                            Unassigned
                          </span>
                        )}
                        {student.markedForPromotion && (
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs mt-1">
                            🎓 Marked for Promotion
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            navigate(`/students/${student.id}`);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View student profile"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {isSchool && (
                          <>
                            <button
                              onClick={() => {
                                setAssignForm({
                                  studentId: student.id,
                                  classroomId: student.classAssignments?.[0]?.classroomId || '',
                                  sessionId: student.classAssignments?.[0]?.sessionId || '',
                                });
                                setShowAssignDialog(true);
                              }}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title={student.isAssigned ? "Reassign student to a different class" : "Assign student to a class"}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            {student.isAssigned && (
                              <button
                                onClick={() => handleUnassignStudent(student.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Unassign student from current class"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Dialog - Only for Schools */}
      {showAssignDialog && isSchool && (() => {
        const isBulkAssignment = selectedStudents.length > 0;
        const selectedStudent = students.find((s) => s.id === assignForm.studentId);
        const currentAssignment = selectedStudent?.classAssignments?.[0];
        const currentClass = currentAssignment ? classrooms.find((c) => c.id === currentAssignment.classroomId) : null;
        const currentSession = currentAssignment ? sessions.find((s) => s.id === currentAssignment.sessionId) : null;
        const isReassigning = currentAssignment && 
          assignForm.classroomId && assignForm.sessionId &&
          (currentAssignment.classroomId !== assignForm.classroomId || 
           currentAssignment.sessionId !== assignForm.sessionId);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">
                {isBulkAssignment 
                  ? `Assign ${selectedStudents.length} Student${selectedStudents.length > 1 ? 's' : ''} to Class`
                  : (currentAssignment ? 'Reassign Student to Class' : 'Assign Student to Class')
                }
              </h2>
              
              {/* Show selected students list for bulk assignment */}
              {isBulkAssignment && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-2">
                    Selected Students ({selectedStudents.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-green-700 space-y-1">
                      {selectedStudents.map((studentId) => {
                        const student = students.find((s) => s.id === studentId);
                        return student ? (
                          <li key={studentId}>
                            • {student.firstName} {student.lastName} ({student.username})
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {/* Show selected student info if one is pre-selected (single assignment) */}
              {!isBulkAssignment && assignForm.studentId && selectedStudent && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-1">Selected Student:</p>
                  <p className="text-sm text-green-700">
                    {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.username})
                  </p>
                </div>
              )}
              
              {!isBulkAssignment && currentAssignment && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">Current Assignment:</p>
                      <p className="text-sm text-yellow-700">
                        <strong>Class:</strong> {currentClass?.name || 'Unknown'} | 
                        <strong> Session:</strong> {currentSession?.name || 'Unknown'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to remove this student from the current class?')) {
                          await handleUnassignStudent(assignForm.studentId);
                          setShowAssignDialog(false);
                          setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
                        }
                      }}
                      className="ml-2 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                      title="Remove from class"
                    >
                      ❌ Remove Class
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> {isBulkAssignment 
                    ? `All ${selectedStudents.length} selected students will be assigned to the same class and session. A student can only belong to one class at a time.`
                    : 'A student can only belong to one class at a time. ' + 
                      (currentAssignment ? 'Reassigning will automatically unassign from the current class.' : 'Assigning to a new class will automatically unassign from any previous class.')
                  }
                </p>
              </div>

              <div className="space-y-4">
                {/* Only show student dropdown for single assignment */}
                {!isBulkAssignment && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Student
                    </label>
                    <select
                      className="input-field"
                      value={assignForm.studentId}
                      onChange={(e) => {
                        const studentId = e.target.value;
                        const student = students.find((s) => s.id === studentId);
                        setAssignForm({
                          studentId,
                          classroomId: student?.classAssignments?.[0]?.classroomId || '',
                          sessionId: student?.classAssignments?.[0]?.sessionId || '',
                        });
                      }}
                    >
                      <option value="">Choose a student...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Session</label>
                  <select
                    className="input-field"
                    value={assignForm.sessionId}
                    onChange={(e) => setAssignForm({ ...assignForm, sessionId: e.target.value })}
                  >
                    <option value="">Choose a session...</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                  <select
                    className="input-field"
                    value={assignForm.classroomId}
                    onChange={(e) => setAssignForm({ ...assignForm, classroomId: e.target.value })}
                  >
                    <option value="">Choose a class...</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!isBulkAssignment && isReassigning && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    ⚠️ <strong>Warning:</strong> You are about to reassign this student. 
                    A confirmation dialog will appear before proceeding.
                  </p>
                </div>
              )}

              <div className="flex space-x-2 mt-6">
                <button 
                  onClick={handleAssignStudent} 
                  disabled={assigning || (!isBulkAssignment && !assignForm.studentId) || !assignForm.classroomId || !assignForm.sessionId}
                  className="btn-primary flex-1"
                >
                  {assigning 
                    ? (isBulkAssignment ? `Assigning ${selectedStudents.length}...` : 'Assigning...')
                    : (isBulkAssignment 
                        ? `Assign ${selectedStudents.length} Student${selectedStudents.length > 1 ? 's' : ''}` 
                        : (currentAssignment ? 'Reassign' : 'Assign'))
                  }
                </button>
                <button
                  onClick={() => {
                    setShowAssignDialog(false);
                    setAssignForm({ studentId: '', classroomId: '', sessionId: '' });
                  }}
                  className="btn-secondary flex-1"
                  disabled={assigning}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Promote Dialog - Only for Schools */}
      {showPromoteDialog && isSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Promote Students</h2>
            <p className="text-sm text-gray-600 mb-4">
              Promoting {promoteForm.studentIds.length} student(s) to the next class
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Session
                </label>
                <select
                  className="input-field"
                  value={promoteForm.targetSessionId}
                  onChange={(e) =>
                    setPromoteForm({ ...promoteForm, targetSessionId: e.target.value })
                  }
                >
                  <option value="">Choose a session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Class
                </label>
                <select
                  className="input-field"
                  value={promoteForm.targetClassroomId}
                  onChange={(e) =>
                    setPromoteForm({ ...promoteForm, targetClassroomId: e.target.value })
                  }
                >
                  <option value="">Choose a class...</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button onClick={handlePromoteStudents} className="btn-primary flex-1">
                Promote
              </button>
              <button
                onClick={() => {
                  setShowPromoteDialog(false);
                  setPromoteForm({ studentIds: [], targetClassroomId: '', targetSessionId: '' });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {showCreateForm && isSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Add New Student</h2>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field w-full"
                    value={createFormData.firstName}
                    onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field w-full"
                    value={createFormData.lastName}
                    onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field w-full"
                    value={createFormData.username}
                    onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password (optional - defaults to ChangeMe123!)
                  </label>
                  <input
                    type="password"
                    className="input-field w-full"
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    className="input-field w-full"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    className="input-field w-full"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth (optional)
                </label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={createFormData.dateOfBirth}
                  onChange={(e) => setCreateFormData({ ...createFormData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assign to Session (optional)
                  </label>
                  <select
                    className="input-field w-full"
                    value={createFormData.sessionId}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, sessionId: e.target.value });
                      // Clear classroom selection if session changes
                      if (!e.target.value) {
                        setCreateFormData((prev) => ({ ...prev, classroomId: '' }));
                      }
                    }}
                  >
                    <option value="">Select session (optional)</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assign to Class (optional)
                  </label>
                  <select
                    className="input-field w-full"
                    value={createFormData.classroomId}
                    onChange={(e) => setCreateFormData({ ...createFormData, classroomId: e.target.value })}
                    disabled={!createFormData.sessionId}
                  >
                    <option value="">Select class (optional)</option>
                    {createFormData.sessionId && sessions
                      .find((s) => s.id === createFormData.sessionId)
                      ?.classAssignments?.map((ca: any) => (
                        <option key={ca.classroom.id} value={ca.classroom.id}>
                          {ca.classroom.name}
                        </option>
                      ))}
                  </select>
                  {!createFormData.sessionId && (
                    <p className="text-xs text-gray-500 mt-1">Please select a session first</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormData({
                      firstName: '',
                      lastName: '',
                      username: '',
                      email: '',
                      phone: '',
                      dateOfBirth: '',
                      password: '',
                      classroomId: '',
                      sessionId: '',
                    });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

