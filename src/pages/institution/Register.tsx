import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI, publicAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    uniqueSlug: '',
  });
  const [mode, setMode] = useState<'school' | 'ministry'>('school');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      if (mode === 'ministry') {
        await publicAPI.requestMinistry({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
        });
        toast.success('Request submitted! A super admin will review it shortly.');
        navigate('/login');
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        const { confirmPassword, ...data } = formData;
        const response = await authAPI.register(data);
        const { token, institution } = response.data;
        
        if (!token) {
          toast.error('Registration failed: No authentication token received');
          return;
        }
        
        if (!institution) {
          toast.error('Registration failed: No account data received');
          return;
        }
        
        setAuth(token, institution);
        toast.success('Registration successful!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-600"
            >
              sign in to existing account
            </Link>
          </p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('school')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold ${
              mode === 'school' ? 'bg-white shadow text-primary' : 'text-gray-600'
            }`}
          >
            Register School
          </button>
          <button
            type="button"
            onClick={() => setMode('ministry')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold ${
              mode === 'ministry' ? 'bg-white shadow text-primary' : 'text-gray-600'
            }`}
          >
            Ministry Request
          </button>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              name="name"
              type="text"
              required
              className="input-field"
              placeholder={mode === 'school' ? 'School Name' : 'Ministry / Organisation Name'}
              value={formData.name}
              onChange={handleChange}
            />
            <input
              name="email"
              type="email"
              required
              className="input-field"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
            />
            {mode === 'school' && (
              <input
                name="uniqueSlug"
                type="text"
                className="input-field"
                placeholder="Unique URL slug (optional)"
                value={formData.uniqueSlug}
                onChange={handleChange}
              />
            )}
            <input
              name="phone"
              type="tel"
              className="input-field"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={handleChange}
            />
            <input
              name="address"
              type="text"
              className="input-field"
              placeholder="Address (optional)"
              value={formData.address}
              onChange={handleChange}
            />
            <input
              name="password"
              type="password"
              required
              className="input-field"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
            {mode === 'school' && (
              <input
                name="confirmPassword"
                type="password"
                required
                className="input-field"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading
                ? 'Submitting...'
                : mode === 'school'
                ? 'Create school account'
                : 'Submit ministry request'}
            </button>
          </div>
          {mode === 'ministry' && (
            <p className="text-xs text-gray-500 text-center">
              Super admin must approve ministry requests before you can sign in.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

