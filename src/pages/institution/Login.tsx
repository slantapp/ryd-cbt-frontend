import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'TEACHER'>('SCHOOL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <div className="space-y-4">
            <div>
              <label htmlFor="role" className="sr-only">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="input-field"
              >
                <option value="SCHOOL">School</option>
                <option value="MINISTRY">Ministry / Organisation</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="TEACHER">Teacher</option>
              </select>
            </div>
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
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`input-field ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
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
        </form>
      </div>
    </div>
  );
}

