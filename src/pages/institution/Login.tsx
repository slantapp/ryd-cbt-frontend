import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'SCHOOL_ADMIN' | 'TEACHER' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const autoRydRef = useRef(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAutoLogin = searchParams.get('auto') === '1';

  useEffect(() => {
    if (!isAutoLogin) return;
    navigate(`/sso/redirect?${searchParams.toString()}`, { replace: true });
  }, [isAutoLogin, navigate, searchParams]);

  // Check for auto-filled password
  useEffect(() => {
    const checkAutoFill = () => {
      if (passwordInputRef.current) {
        const input = passwordInputRef.current;
        // Check if input has a value (including auto-filled)
        if (input.value && !password) {
          setPassword(input.value);
        }
      }
    };

    // Check immediately and after a short delay (for auto-fill)
    checkAutoFill();
    const timer = setTimeout(checkAutoFill, 100);
    return () => clearTimeout(timer);
  }, [password]);

  const handleRoleSelect = (selectedRole: 'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT') => {
    if (selectedRole === 'STUDENT') {
      navigate('/student/login');
      return;
    }
    setRole(selectedRole);
    setError(null);
  };

  const loginWithRole = useCallback(
    async (
      emailIn: string,
      passwordIn: string,
      roleIn: 'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'SCHOOL_ADMIN' | 'TEACHER',
    ) => {
      setLoading(true);
      setError(null);
      try {
        let response;
        if (roleIn === 'SCHOOL_ADMIN') {
          try {
            response = await authAPI.login({ email: emailIn, password: passwordIn, role: 'SCHOOL_ADMIN' });
          } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 404) {
              try {
                response = await authAPI.login({ email: emailIn, password: passwordIn, role: 'SCHOOL' });
              } catch (schoolError: any) {
                throw schoolError;
              }
            } else {
              throw error;
            }
          }
        } else {
          response = await authAPI.login({ email: emailIn, password: passwordIn, role: roleIn });
        }

        const token = response.data?.token;
        const institution = response.data?.institution;
        const requiresPasswordReset = response.data?.requiresPasswordReset === true;

        if (!token) {
          setError('Login failed: No authentication token received');
          toast.error('Login failed: No authentication token received');
          return;
        }

        if (!institution) {
          setError('Login failed: No account data received');
          toast.error('Login failed: No account data received');
          return;
        }

        const institutionWithResetFlag = {
          ...institution,
          mustResetPassword: requiresPasswordReset || institution.mustResetPassword || false,
        };

        setAuth(token, institutionWithResetFlag);
        toast.success(
          requiresPasswordReset ? 'Login successful! Please reset your password.' : 'Login successful!',
        );
        navigate('/dashboard');
      } catch (error: any) {
        let errorMessage = 'Invalid email or password. Please try again.';

        if (error.response?.status === 429) {
          errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            'Too many login attempts. Please wait 15 minutes or restart the backend server to reset the limit.';
          setError(errorMessage);
          toast.error(errorMessage, { duration: 6000 });
          return;
        }

        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [navigate, setAuth],
  );

  // RYD Partner deep-link: /login?email=...&password=...&auto=1&role=SCHOOL
  useEffect(() => {
    if (autoRydRef.current) return;
    if (searchParams.get('auto') !== '1') return;
    const e = searchParams.get('email')?.trim();
    const p = searchParams.get('password') ?? '';
    if (!e || !p) return;
    const r = (searchParams.get('role') || 'SCHOOL').toUpperCase();
    const mapRole = (): 'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'SCHOOL_ADMIN' | 'TEACHER' | null => {
      if (r === 'SCHOOL' || r === 'SCHOOL_ADMIN' || r === 'MINISTRY' || r === 'TEACHER' || r === 'SUPER_ADMIN') {
        return r as 'SCHOOL' | 'SCHOOL_ADMIN' | 'MINISTRY' | 'TEACHER' | 'SUPER_ADMIN';
      }
      return 'SCHOOL';
    };
    const roleIn = mapRole();
    autoRydRef.current = true;
    setEmail(e);
    setPassword(p);
    if (roleIn === 'SCHOOL' || roleIn === 'SCHOOL_ADMIN') {
      setRole(roleIn === 'SCHOOL' ? 'SCHOOL' : 'SCHOOL_ADMIN');
    } else {
      setRole(roleIn);
    }
    if (roleIn === 'SCHOOL' || roleIn === 'SCHOOL_ADMIN') {
      void loginWithRole(
        e,
        p,
        roleIn === 'SCHOOL' ? 'SCHOOL' : 'SCHOOL_ADMIN',
      );
    } else if (roleIn) {
      void loginWithRole(e, p, roleIn);
    }
  }, [searchParams, loginWithRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role) {
      setError('Please select your role');
      toast.error('Please select your role');
      return;
    }

    await loginWithRole(email, password, role);
  };

  const primaryColor = '#a8518a'; // Primary color

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
    <div className="min-h-screen flex overflow-hidden bg-gray-50">
      {/* Left Side - Hero image only */}
      <div className="hidden lg:flex lg:w-1/2 fixed left-0 top-0 bottom-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 lg:ml-[50%] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-8">
          <div>
            <h2 className="text-center text-3xl font-extrabold mb-2" style={{ color: primaryColor }}>
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link
                to="/register"
                className="font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                create a new account
              </Link>
            </p>
          </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-red-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}
          
          {/* Role Selection Buttons */}
          <div className="space-y-4">
            {!role && (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                  Select your role to continue
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('STUDENT')}
                    className="w-full flex items-center px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-gray-700 transition-all hover:shadow-md"
                    style={{
                      borderColor: 'currentColor',
                      '--hover-border': primaryColor,
                      '--hover-bg': `${primaryColor}10`,
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m0 0v-7m0 7H9m3 0h3" />
                    </svg>
                    <span className="font-medium">I am a Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('TEACHER')}
                    className="w-full flex items-center px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 transition-all hover:shadow-md"
                    style={{
                      borderColor: '#e5e7eb',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">I am a Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('SCHOOL_ADMIN')}
                    className="w-full flex items-center px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 transition-all hover:shadow-md"
                    style={{
                      borderColor: '#e5e7eb',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium">I am a School Administrator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('MINISTRY')}
                    className="w-full flex items-center px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 transition-all hover:shadow-md"
                    style={{
                      borderColor: '#e5e7eb',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium">I am a Ministry/Organization</span>
                  </button>
                </div>
              </>
            )}
            {role && (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}10`, border: `2px solid ${primaryColor}` }}>
                <div className="flex items-center">
                  <span className="font-semibold" style={{ color: primaryColor }}>
                    {role === 'MINISTRY' && 'I am a Ministry/Organization'}
                    {(role === 'SCHOOL' || role === 'SCHOOL_ADMIN') && 'I am a School Administrator'}
                    {role === 'TEACHER' && 'I am a Teacher'}
                    {role === 'SUPER_ADMIN' && 'I am a Super Admin'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRole(null);
                    setEmail('');
                    setPassword('');
                    setError(null);
                  }}
                  className="text-sm font-medium transition-colors"
                  style={{ color: primaryColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Change
                </button>
              </div>
            )}
            </div>

          {/* Login Form - Only show if role is selected */}
          {role && (
            <div className="space-y-4 border-t pt-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`input-field ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
                <div className="relative">
              <input
                    ref={passwordInputRef}
                id="password"
                name="password"
                    type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                    className={`input-field pr-10 ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
                  {(password || (passwordInputRef.current && passwordInputRef.current.value)) && (
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

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium transition-colors hover:underline"
                style={{ color: primaryColor }}
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-lg font-semibold text-white shadow-lg disabled:opacity-50 transition-opacity hover:opacity-90 rounded-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  );
}

