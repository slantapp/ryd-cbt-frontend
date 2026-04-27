import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import studentImage from '../../assets/student.jpg';

export default function StudentLogin() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const [resetData, setResetData] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const currentPasswordInputRef = useRef<HTMLInputElement>(null);
  const newPasswordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAutoLogin = searchParams.get('auto') === '1';
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    if (!isAutoLogin) return;
    navigate(`/sso/redirect?${searchParams.toString()}`, { replace: true });
  }, [isAutoLogin, navigate, searchParams]);

  // Partner / deep-link: ?username=...&password=...&auto=1
  useEffect(() => {
    if (autoLoginStarted.current) return;
    if (searchParams.get('auto') !== '1') return;
    const u = searchParams.get('username')?.trim();
    const p = searchParams.get('password') ?? '';
    if (!u || !p) return;
    autoLoginStarted.current = true;
    setFormData({ username: u, password: p });

    (async () => {
      setLoading(true);
      try {
        const response = await authAPI.studentLogin({ username: u, password: p });
        if (response.data.requiresPasswordReset) {
          setRequiresPasswordReset(true);
          setResetData(response.data.student);
          return;
        }
        if (!response.data.token || !response.data.student) {
          toast.error('Login failed');
          return;
        }
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
        };
        setAuth(response.data.token, studentAccount as any);
        toast.success('Login successful!');
        navigate('/student/dashboard');
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Login failed');
        autoLoginStarted.current = false;
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, setAuth, navigate]);

  // Check for auto-filled password
  useEffect(() => {
    const checkAutoFill = () => {
      if (passwordInputRef.current && passwordInputRef.current.value && !formData.password) {
        setFormData(prev => ({ ...prev, password: passwordInputRef.current!.value }));
      }
      if (currentPasswordInputRef.current && currentPasswordInputRef.current.value && !currentPassword) {
        setCurrentPassword(currentPasswordInputRef.current.value);
      }
      if (newPasswordInputRef.current && newPasswordInputRef.current.value && !newPassword) {
        setNewPassword(newPasswordInputRef.current.value);
      }
      if (confirmPasswordInputRef.current && confirmPasswordInputRef.current.value && !confirmPassword) {
        setConfirmPassword(confirmPasswordInputRef.current.value);
      }
    };

    checkAutoFill();
    const timer = setTimeout(checkAutoFill, 100);
    return () => clearTimeout(timer);
  }, [formData.password, currentPassword, newPassword, confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.studentLogin(formData);
      
      if (response.data.requiresPasswordReset) {
        setRequiresPasswordReset(true);
        setResetData(response.data.student);
      } else {
        if (!response.data.token) {
          toast.error('Login failed: No authentication token received');
          return;
        }
        
        if (!response.data.student) {
          toast.error('Login failed: No student data received');
          return;
        }
        
        // Convert student to account format for auth store
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
        };
        
        setAuth(response.data.token, studentAccount as any);
        toast.success('Login successful!');
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetStudentPassword({
        username: resetData.username,
        currentPassword,
        newPassword,
      });
      
      if (response.data.token && response.data.student) {
        // Convert student object to account format for auth store (same format as handleLogin)
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
          mustResetPassword: false,
        };
        
        // Login immediately after password reset
        setAuth(response.data.token, studentAccount as any);
        toast.success('Password reset successful! Logging you in...');
        navigate('/student/dashboard');
      } else {
        toast.success('Password reset successful! Please login again.');
        setRequiresPasswordReset(false);
        setResetData(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFormData({ username: '', password: '' });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const themeColor = '#a8518a'; // Primary color

  if (isAutoLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#88167a]" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Redirecting...</h1>
          <p className="text-sm text-gray-600 mt-2">Signing you in securely. Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Image with Overlay and Quote */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${studentImage})` }}
        />
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: themeColor,
            opacity: 0.75,
            mixBlendMode: 'multiply'
          }}
        />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              "Education is the most powerful weapon which you can use to change the world."
            </h2>
            <p className="text-xl text-white/90 font-medium">
              - Nelson Mandela
            </p>
            <div className="mt-8 pt-8 border-t border-white/30">
              <p className="text-lg text-white/80">
                Every great achievement begins with a single step. Your journey to excellence starts here.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-extrabold mb-2" style={{ color: themeColor }}>Student Login</h2>
              <p className="text-gray-500 text-sm mt-2">Access your tests and assignments</p>
            </div>

          {!requiresPasswordReset ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <input
                  name="username"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-10"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  {(formData.password || (passwordInputRef.current && passwordInputRef.current.value)) && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
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
                disabled={loading}
                className="w-full py-3 text-lg font-semibold text-white shadow-lg disabled:opacity-50 transition-opacity hover:opacity-90 rounded-lg"
                style={{ backgroundColor: themeColor }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Contact your school
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  You need to reset your password before you can login. Please enter your current password and create a new password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    ref={currentPasswordInputRef}
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-10"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  {(currentPassword || (currentPasswordInputRef.current && currentPasswordInputRef.current.value)) && (
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                    {showCurrentPassword ? (
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    ref={newPasswordInputRef}
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-10"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                  {(newPassword || (newPasswordInputRef.current && newPasswordInputRef.current.value)) && (
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showNewPassword ? (
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    ref={confirmPasswordInputRef}
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-10"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                  />
                  {(confirmPassword || (confirmPasswordInputRef.current && confirmPasswordInputRef.current.value)) && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showConfirmPassword ? (
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
                disabled={loading}
                className="w-full py-3 text-lg font-semibold text-white shadow-lg disabled:opacity-50 transition-opacity hover:opacity-90 rounded-lg"
                style={{ backgroundColor: themeColor }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequiresPasswordReset(false);
                  setResetData(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full btn-secondary text-sm"
              >
                Back to Login
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

