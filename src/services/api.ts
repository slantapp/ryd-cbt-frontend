import axios from 'axios';

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token format before sending
      if (typeof token === 'string' && token.trim().length > 0) {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      } else {
        console.warn('Invalid token format detected, removing from storage');
        localStorage.removeItem('token');
        localStorage.removeItem('account');
        localStorage.removeItem('institution');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if not already on login/register pages
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const errorMessage = error.response?.data?.error || '';
      
      // Log token errors for debugging
      if (errorMessage.includes('token') || errorMessage.includes('Token')) {
        console.error('Token validation error:', {
          message: errorMessage,
          path: currentPath,
          tokenExists: !!localStorage.getItem('token'),
        });
      }
      
      // Don't redirect if we're on login, register, or public pages
      if (!currentPath.includes('/login') && 
          !currentPath.includes('/register') && 
          !currentPath.includes('/forgot-password') &&
          !currentPath.includes('/reset-password') &&
          !currentPath.match(/^\/[^/]+$/) && // Don't redirect on student pages (slug routes)
          !currentPath.match(/^\/[^/]+\/test\//) && // Don't redirect on test pages
          !currentPath.match(/^\/[^/]+\/result$/)) { // Don't redirect on result pages
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('account');
        localStorage.removeItem('institution');
        
        // Only redirect if not already on a login page
        if (!currentPath.includes('/login') && !currentPath.includes('/student/login') && !currentPath.includes('/parent/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  validateToken: () => api.get('/auth/validate'),
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    uniqueSlug?: string;
    parentId?: string;
  }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string; role?: string; schoolId?: string }) =>
    api.post('/auth/login', data),
  studentLogin: (data: { username: string; password: string }) =>
    api.post('/auth/student/login', data),
  resetStudentPassword: (data: { username: string; currentPassword: string; newPassword: string }) =>
    api.post('/auth/student/reset-password-first-login', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  resetPasswordFirstLogin: (data: { email: string; currentPassword: string; newPassword: string }) =>
    api.post('/auth/reset-password-first-login', data),
};

// Institution
export const institutionAPI = {
  getProfile: () => api.get('/institution/profile'),
  updateProfile: (data: { name?: string; phone?: string; address?: string }) =>
    api.put('/institution/profile', data),
  createSchoolAdmin: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/institution/school-admins', data),
  getSchoolAdmins: () => api.get('/institution/school-admins'),
};

// Tests
export const testAPI = {
  create: (data: any) => api.post('/tests', data),
  getAll: () => api.get('/tests'),
  getOne: (id: string) => api.get(`/tests/${id}`),
  update: (id: string, data: any) => api.put(`/tests/${id}`, data),
  delete: (id: string) => api.delete(`/tests/${id}`),
  publish: (id: string) => api.post(`/tests/${id}/publish`),
  unpublish: (id: string) => api.post(`/tests/${id}/unpublish`),
  archive: (id: string) => api.post(`/tests/${id}/archive`),
};

// Custom Fields
export const customFieldAPI = {
  getAll: () => api.get('/custom-fields'),
  create: (data: any) => api.post('/custom-fields', data),
  update: (id: string, data: any) => api.put(`/custom-fields/${id}`, data),
  delete: (id: string) => api.delete(`/custom-fields/${id}`),
  getTestFields: (testId: string) => api.get(`/custom-fields/test/${testId}`),
  saveTestFields: (testId: string, data: any) => api.post(`/custom-fields/test/${testId}`, data),
};

// Grading
export const gradingAPI = {
  getTestsNeedingGrading: (testId: string) => api.get(`/grading/test/${testId}/needing-grading`),
  getAllStudentTests: (testId: string) => api.get(`/grading/test/${testId}/all-students`),
  getQuestionsNeedingGrading: (testId: string) => api.get(`/grading/test/${testId}/questions`),
  getQuestionAnswersForGrading: (testId: string, questionId: string) => api.get(`/grading/test/${testId}/question/${questionId}/answers`),
  getStudentTestForGrading: (studentTestId: string) => api.get(`/grading/student-test/${studentTestId}`),
  gradeAnswer: (answerId: string, data: any) => api.post(`/grading/answer/${answerId}`, data),
  gradeStudentTest: (studentTestId: string, data: any) => api.post(`/grading/student-test/${studentTestId}`, data),
  releaseScore: (studentTestId: string) => api.post(`/grading/student-test/${studentTestId}/release`),
  bulkReleaseScores: (testId: string, data?: { studentTestIds?: string[] }) => api.post(`/grading/test/${testId}/release-scores`, data || {}),
  bulkHideScores: (testId: string, data?: { studentTestIds?: string[] }) => api.post(`/grading/test/${testId}/hide-scores`, data || {}),
  hideScore: (studentTestId: string) => api.post(`/grading/student-test/${studentTestId}/hide`),
};

// Notifications
export const notificationAPI = {
  getAll: (params?: { isRead?: boolean; limit?: number }) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Parent
export const parentAPI = {
  login: (data: { email: string; password: string }) => api.post('/auth/parent/login', data),
  searchStudent: (data: { firstName: string; lastName: string; dateOfBirth: string; institutionId?: string }) => api.post('/parent/search-student', data),
  linkStudent: (data: { studentId: string }) => api.post('/parent/link-student', data),
  getLinkedStudents: () => api.get('/parent/students'),
  getStudentScores: (studentId: string) => api.get(`/parent/students/${studentId}/scores`),
  getStudentReportCard: (studentId: string, sessionId?: string) => api.get(`/parent/students/${studentId}/report-card`, { params: sessionId ? { sessionId } : {} }),
};

// Session Archive
export const sessionArchiveAPI = {
  archive: (sessionId: string, data: { archiveClassAssignments: boolean; archiveTeacherAssignments: boolean }) => api.post(`/sessions/${sessionId}/archive`, data),
  unarchive: (sessionId: string) => api.post(`/sessions/${sessionId}/unarchive`),
  getArchived: () => api.get('/sessions/archived'),
  getArchivedAssignments: (sessionId: string) => api.get(`/sessions/${sessionId}/archived-assignments`),
  getHistoricalClasses: (sessionId: string) => api.get(`/sessions/${sessionId}/historical-classes`),
  addClasses: (id: string, classroomIds: string[]) => api.post(`/sessions/${id}/classes`, { classroomIds }),
  removeClasses: (id: string, classroomIds: string[]) => api.delete(`/sessions/${id}/classes`, { data: { classroomIds } }),
};

// Audit Logs
export const auditAPI = {
  getAll: (params?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
    relatedStudentId?: string;
    relatedClassId?: string;
    relatedTestId?: string;
    page?: number;
    limit?: number;
  }) => api.get('/audit', { params }),
  getOne: (id: string) => api.get(`/audit/${id}`),
  getStats: (params?: { startDate?: string; endDate?: string }) => api.get('/audit/stats/summary', { params }),
};

// Questions
export const questionAPI = {
  create: (data: any) => api.post('/questions', data),
  bulkUpload: (testId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('testId', testId);
    return api.post('/questions/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  generateAI: (data: any) => api.post('/questions/generate-ai', data),
  getByTest: (testId: string) => api.get(`/questions/test/${testId}`),
  update: (id: string, data: any) => api.put(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
};

// Sessions
export const sessionAPI = {
  create: (data: any) => api.post('/sessions', data),
  getAll: () => api.get('/sessions'),
  getOne: (id: string) => api.get(`/sessions/${id}`),
  update: (id: string, data: any) => api.put(`/sessions/${id}`, data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  addClasses: (id: string, classroomIds: string[]) => api.post(`/sessions/${id}/classes`, { classroomIds }),
  removeClasses: (id: string, classroomIds: string[]) => api.delete(`/sessions/${id}/classes`, { data: { classroomIds } }),
};

// Students
export const studentAPI = {
  create: (data: { firstName: string; lastName: string; username: string; email?: string; phone?: string; dateOfBirth?: string; password?: string; classroomId?: string; sessionId?: string }) =>
    api.post('/students', data),
  getScores: (params?: { testId?: string; sessionId?: string; classroomId?: string }) =>
    api.get('/students/scores', { params }),
  getOverallScores: (params?: { sessionId?: string; subjectId?: string }) =>
    api.get('/students/overall-scores', { params }),
  grantRetrial: (studentTestId: string) =>
    api.post('/students/grant-retrial', { studentTestId }),
  getAll: (params?: { sessionId?: string; classroomId?: string; isAssigned?: boolean }) =>
    api.get('/students/all', { params }),
  getUnassigned: (params?: { sessionId?: string }) =>
    api.get('/students/unassigned', { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  checkUsernameAvailability: (username: string, excludeStudentId?: string) =>
    api.get('/students/check-username', { params: { username, excludeStudentId } }),
  update: (id: string, data: { firstName?: string; lastName?: string; username?: string; email?: string; phone?: string; dateOfBirth?: string }) =>
    api.put(`/students/${id}`, data),
  getMyTests: () => api.get('/students/my-tests'),
  getTest: (testId: string) => api.get(`/students/test/${testId}`),
  getTestReview: (testId: string) => api.get(`/students/test/${testId}/review`),
  bulkUpload: (file: File, options?: { classroomId?: string; sessionId?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.classroomId) {
      formData.append('classroomId', options.classroomId);
    }
    if (options?.sessionId) {
      formData.append('sessionId', options.sessionId);
    }
    return api.post('/students/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  assignToClass: (data: { studentId: string; classroomId: string; sessionId: string }) =>
    api.post('/students/assign', data),
  unassignFromClass: (data: { studentId: string }) =>
    api.post('/students/unassign', data),
  markForPromotion: (data: { studentId: string; markForPromotion: boolean }) =>
    api.post('/students/mark-promotion', data),
  promote: (data: { studentIds: string[]; targetClassroomId: string; targetSessionId: string }) =>
    api.post('/students/promote', data),
  downloadTemplate: () => api.get('/students/template', { responseType: 'blob' }),
  resetPassword: (data: { studentId: string; newPassword: string; forceReset?: boolean }) =>
    api.post('/students/admin/reset-password', {
      userId: data.studentId,
      userType: 'student',
      newPassword: data.newPassword,
      forceReset: data.forceReset,
    }),
};

// Public
export const publicAPI = {
  getInstitutionBySlug: (slug: string) =>
    api.get(`/public/institution/${slug}`),
  getTestForStudent: (slug: string, testId: string) =>
    api.get(`/public/institution/${slug}/test/${testId}`),
  getTestResult: (studentTestId: string) =>
    api.get(`/public/test-result/${studentTestId}`),
  startTest: (data: any) => api.post('/public/start-test', data),
  submitAnswer: (data: any) => api.post('/public/submit-answer', data),
  submitTest: (data: { studentTestId: string }) =>
    api.post('/public/submit-test', data),
  requestMinistry: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => api.post('/public/ministry-request', data),
  registerStudent: (data: {
    schoolSlug: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    classroomId?: string;
    sessionId?: string;
  }) => api.post('/public/register-student', data),
};

export const adminAPI = {
  createMinistry: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => api.post('/admin/ministries', data),
  getMinistries: (status?: string) =>
    api.get('/admin/ministries', { params: status ? { status } : undefined }),
  reviewMinistry: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    api.post(`/admin/ministries/${id}/review`, { decision }),
  createSuperAdmin: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => api.post('/admin/super-admins', data),
  getSuperAdmins: () => api.get('/admin/super-admins'),
  getStats: () => api.get('/admin/dashboard'),
};

export const ministryAPI = {
  createSchool: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    uniqueSlug?: string;
  }) => api.post('/ministry/schools', data),
  getSchools: () => api.get('/ministry/schools'),
  getDashboard: () => api.get('/ministry/dashboard'),
};

export const classroomAPI = {
  create: (data: { name: string; description?: string; academicSession?: string; sessionId?: string }) =>
    api.post('/classrooms', data),
  list: () => api.get('/classrooms'),
  assignTeacher: (data: { classroomId: string; teacherId: string }) =>
    api.post('/classrooms/assign', data),
  removeTeacher: (classroomId: string, teacherId: string) =>
    api.delete(`/classrooms/${classroomId}/teachers/${teacherId}`),
};

export const teacherAPI = {
  create: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/teachers', data),
  getAll: () => api.get('/teachers'),
  list: () => api.get('/teachers'),
  update: (id: string, data: { name?: string; email?: string; phone?: string; isActive?: boolean }) =>
    api.put(`/teachers/${id}`, data),
  dashboard: () => api.get('/teachers/dashboard/me'),
  downloadTemplate: () => api.get('/teachers/template', { responseType: 'blob' }),
  bulkUpload: (formData: FormData) => api.post('/teachers/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  resetPassword: (data: { teacherId: string; newPassword: string; forceReset?: boolean }) =>
    api.post('/students/admin/reset-password', {
      userId: data.teacherId,
      userType: 'teacher',
      newPassword: data.newPassword,
      forceReset: data.forceReset,
  }),
};

// Test Groups
export const testGroupAPI = {
  getAll: () => api.get('/test-groups'),
  getOne: (id: string) => api.get(`/test-groups/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/test-groups', data),
  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    api.put(`/test-groups/${id}`, data),
  delete: (id: string) => api.delete(`/test-groups/${id}`),
};

// Subjects
export const subjectAPI = {
  getAll: () => api.get('/subjects'),
  getOne: (id: string) => api.get(`/subjects/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/subjects', data),
  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Grading Schemes
export const gradingSchemeAPI = {
  getAll: () => api.get('/grading-schemes'),
  getOne: (id: string) => api.get(`/grading-schemes/${id}`),
  create: (data: { subjectId: string; sessionClassId: string; weights: Array<{ testGroupId: string; weight: number }> }) =>
    api.post('/grading-schemes', data),
  bulkCreate: (data: { subjectIds: string[]; sessionClassIds: string[]; weights: Array<{ testGroupId: string; weight: number }> }) =>
    api.post('/grading-schemes/bulk', data),
  update: (id: string, data: { weights: Array<{ testGroupId: string; weight: number }> }) =>
    api.put(`/grading-schemes/${id}`, data),
  delete: (id: string) => api.delete(`/grading-schemes/${id}`),
};

export const themeAPI = {
  get: () => api.get('/theme'),
  update: (data: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    logoUrl?: string;
    bannerUrl?: string;
  }) => api.put('/theme', data),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/theme/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadBanner: (file: File) => {
    const formData = new FormData();
    formData.append('banner', file);
    return api.post('/theme/upload-banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const impersonationAPI = {
  start: (targetId: string, reason?: string) =>
    api.post('/impersonation/start', { targetId, reason }),
  stop: () => api.post('/impersonation/stop'),
  listChildren: () => api.get('/impersonation/children'),
};

export default api;

