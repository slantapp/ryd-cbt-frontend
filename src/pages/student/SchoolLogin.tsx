import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI, authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { ThemeConfig } from '../../types';

interface InstitutionData {
  institution: {
    id: string;
    name: string;
    uniqueSlug: string;
  };
  theme?: ThemeConfig;
}

export default function SchoolLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [data, setData] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('student');
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  
  // Teacher form
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    password: '',
  });
  
  // Student form
  const [studentForm, setStudentForm] = useState({
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState({
    teacher: false,
    student: false,
  });

  useEffect(() => {
    if (slug) {
      loadInstitution();
    }
  }, [slug]);

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

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherLoading(true);

    try {
      const response = await authAPI.login({
        email: teacherForm.email,
        password: teacherForm.password,
        role: 'TEACHER',
        schoolId: data?.institution.id,
      });

      if (!response.data.token || !response.data.institution) {
        toast.error('Login failed: Invalid response from server');
        return;
      }

      // Validate teacher belongs to this school
      if (response.data.institution.parentId !== data?.institution.id) {
        toast.error('You do not belong to this school');
        return;
      }

      // Set mustResetPassword flag in institution object (same as normal login)
      const requiresPasswordReset = response.data.requiresPasswordReset === true;
      const institutionWithResetFlag = {
        ...response.data.institution,
        mustResetPassword: requiresPasswordReset || response.data.institution.mustResetPassword || false,
      };

      setAuth(response.data.token, institutionWithResetFlag);
      toast.success(requiresPasswordReset ? 'Login successful! Please reset your password.' : 'Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Login failed';
      toast.error(errorMsg);
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoading(true);

    try {
      const response = await authAPI.studentLogin(studentForm);

      if (!response.data.token || !response.data.student) {
        toast.error('Login failed: Invalid response from server');
        return;
      }

      // Validate student belongs to this school
      if (response.data.student.institutionId !== data?.institution.id) {
        toast.error('You do not belong to this school');
        return;
      }

      // Set mustResetPassword flag (same as normal login)
      const requiresPasswordReset = response.data.requiresPasswordReset === true || response.data.student.mustResetPassword === true;

      // Convert student to account format
      const studentAccount = {
        id: response.data.student.id,
        name: `${response.data.student.firstName} ${response.data.student.lastName}`,
        email: response.data.student.email || response.data.student.username,
        role: 'STUDENT' as const,
        username: response.data.student.username,
        firstName: response.data.student.firstName,
        lastName: response.data.student.lastName,
        institutionId: response.data.student.institutionId,
        institution: response.data.student.institution,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE' as const,
        mustResetPassword: requiresPasswordReset || false,
      };

      setAuth(response.data.token, studentAccount as any);
      toast.success(requiresPasswordReset ? 'Login successful! Please reset your password.' : 'Login successful!');
      navigate('/student/dashboard');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Login failed';
      toast.error(errorMsg);
    } finally {
      setStudentLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          backgroundColor: data?.theme?.backgroundColor || '#f8fafc',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Institution not found</h1>
          <p className="text-gray-600">The institution you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const theme = {
    primaryColor: data.theme?.primaryColor || '#1d4ed8',
    secondaryColor: data.theme?.secondaryColor || '#2563eb',
    backgroundColor: data.theme?.backgroundColor || '#f8fafc',
    textColor: data.theme?.textColor || '#0f172a',
    logoUrl: data.theme?.logoUrl || '',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
    >
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header with Logo */}
          <div
            className="px-8 py-6 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
              color: 'white',
            }}
          >
            {theme.logoUrl && !theme.logoUrl.startsWith('http') ? (
              <img
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.logoUrl}`}
                alt={data.institution.name}
                className="h-20 w-auto mx-auto mb-4 object-contain"
                onError={(e) => {
                  // Fallback to ui-avatars if image fails to load
                  const target = e.target as HTMLImageElement;
                  const schoolName = encodeURIComponent(data.institution.name);
                  const themeColor = theme.primaryColor?.replace('#', '') || '1d4ed8';
                  target.src = `https://ui-avatars.com/api/?name=${schoolName}&background=${themeColor}&color=fff&size=128&bold=true`;
                }}
              />
            ) : theme.logoUrl && theme.logoUrl.startsWith('http') ? (
              <img
                src={theme.logoUrl}
                alt={data.institution.name}
                className="h-20 w-auto mx-auto mb-4 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const schoolName = encodeURIComponent(data.institution.name);
                  const themeColor = theme.primaryColor?.replace('#', '') || '1d4ed8';
                  target.src = `https://ui-avatars.com/api/?name=${schoolName}&background=${themeColor}&color=fff&size=128&bold=true`;
                }}
              />
            ) : (
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.institution.name)}&background=${theme.primaryColor?.replace('#', '') || '1d4ed8'}&color=fff&size=128&bold=true`}
                alt={data.institution.name}
                className="h-20 w-20 mx-auto mb-4 rounded-full object-cover"
              />
            )}
            <h1 className="text-3xl font-bold mb-2">{data.institution.name}</h1>
            <p className="text-white/90 text-sm">Login to your account</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'student'
                  ? 'border-b-2 text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                borderBottomColor: activeTab === 'student' ? theme.primaryColor : 'transparent',
                color: activeTab === 'student' ? theme.primaryColor : undefined,
              }}
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'teacher'
                  ? 'border-b-2 text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                borderBottomColor: activeTab === 'teacher' ? theme.primaryColor : 'transparent',
                color: activeTab === 'teacher' ? theme.primaryColor : undefined,
              }}
            >
              Teacher Login
            </button>
          </div>

          {/* Forms */}
          <div className="p-8">
            {activeTab === 'student' ? (
              <form onSubmit={handleStudentLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter your username"
                    value={studentForm.username}
                    onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.student ? 'text' : 'password'}
                      required
                      className="input-field pr-10"
                      placeholder="Enter your password"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    />
                    {studentForm.password && (
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, student: !showPassword.student })}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword.student ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={studentLoading}
                  className="w-full btn-primary py-3 text-lg font-semibold shadow-lg disabled:opacity-50"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {studentLoading ? 'Logging in...' : 'Login as Student'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleTeacherLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="Enter your email"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.teacher ? 'text' : 'password'}
                      required
                      className="input-field pr-10"
                      placeholder="Enter your password"
                      value={teacherForm.password}
                      onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                    />
                    {teacherForm.password && (
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, teacher: !showPassword.teacher })}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword.teacher ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={teacherLoading}
                  className="w-full btn-primary py-3 text-lg font-semibold shadow-lg disabled:opacity-50"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {teacherLoading ? 'Logging in...' : 'Login as Teacher'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

