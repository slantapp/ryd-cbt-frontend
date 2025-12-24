import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

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
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

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
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
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
        setFormData({ username: '', password: '' });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-10 border border-blue-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎓</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Student Login</h2>
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
                <input
                  name="password"
                  type="password"
                  required
                  className="input-field"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg disabled:opacity-50"
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
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg disabled:opacity-50"
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
  );
}

