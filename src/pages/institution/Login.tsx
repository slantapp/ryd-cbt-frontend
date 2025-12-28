import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'TEACHER' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole: 'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'TEACHER' | 'STUDENT') => {
    if (selectedRole === 'STUDENT') {
      navigate('/student/login');
      return;
    }
    setRole(selectedRole);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      setError('Please select your role');
      toast.error('Please select your role');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login({ email, password, role });
      
      // Extract token and institution from response
      const token = response.data?.token;
      const institution = response.data?.institution;
      const requiresPasswordReset = response.data?.requiresPasswordReset === true;
      
      if (!token) {
        console.error('Login failed: No token in response', response.data);
        setError('Login failed: No authentication token received');
        toast.error('Login failed: No authentication token received');
        return;
      }
      
      if (!institution) {
        console.error('Login failed: No institution in response', response.data);
        setError('Login failed: No account data received');
        toast.error('Login failed: No account data received');
        return;
      }
      
      // Set mustResetPassword flag in institution object
      const institutionWithResetFlag = {
        ...institution,
        mustResetPassword: requiresPasswordReset || institution.mustResetPassword || false,
      };
      
      setAuth(token, institutionWithResetFlag);
      toast.success(requiresPasswordReset ? 'Login successful! Please reset your password.' : 'Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Extract error message from response
      let errorMessage = 'Invalid email or password. Please try again.';
      
      // Handle rate limiting (429)
      if (error.response?.status === 429) {
        errorMessage = error.response?.data?.message || 
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary-600"
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
          <div className="space-y-3">
            {!role && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I am a:
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('MINISTRY')}
                    className="px-4 py-3 text-left rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-gray-50 text-gray-700 transition-all"
                  >
                    I am a Ministry/Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('SCHOOL')}
                    className="px-4 py-3 text-left rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-gray-50 text-gray-700 transition-all"
                  >
                    I am a School Administrator
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('TEACHER')}
                    className="px-4 py-3 text-left rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-gray-50 text-gray-700 transition-all"
                  >
                    I am a Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('STUDENT')}
                    className="px-4 py-3 text-left rounded-lg border-2 border-gray-200 hover:border-primary hover:bg-gray-50 text-gray-700 transition-all"
                  >
                    I am a Student
                  </button>
                </div>
              </>
            )}
            {role && (
              <div className="flex items-center justify-between p-3 bg-primary-50 border-2 border-primary rounded-lg">
                <div className="flex items-center">
                  <span className="text-primary font-semibold">
                    {role === 'MINISTRY' && 'I am a Ministry/Organization'}
                    {role === 'SCHOOL' && 'I am a School Administrator'}
                    {role === 'TEACHER' && 'I am a Teacher'}
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
                  className="text-sm text-primary hover:text-primary-600 font-medium"
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
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-primary hover:text-primary-600"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

