import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    if (slug) {
      loadSchoolInfo();
    }
  }, [slug]);

  const loadSchoolInfo = async () => {
    try {
      const { data } = await publicAPI.getInstitutionBySlug(slug!);
      setSchoolInfo(data);
    } catch (error: any) {
      toast.error('School not found');
      navigate('/');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await publicAPI.registerStudent({
        schoolSlug: slug!,
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      });
      toast.success('Registration successful! Please wait for class assignment from your school.');
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: '',
        dateOfBirth: '',
      });
      // Optionally redirect after a delay
      setTimeout(() => {
        navigate(`/${slug}`);
      }, 2000);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!schoolInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-10 border border-blue-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎓</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Student Registration</h2>
            <p className="text-gray-600 text-lg">{schoolInfo.name}</p>
            <p className="text-gray-500 text-sm mt-2">Create your student account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  className="input-field"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  name="lastName"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Username *
              </label>
              <input
                name="username"
                type="text"
                required
                className="input-field"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password *
              </label>
              <input
                name="password"
                type="password"
                required
                className="input-field"
                placeholder="Create a password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                className="input-field"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength={6}
              />
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900 mb-2">
                Additional Information (Optional)
              </summary>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    className="input-field"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    className="input-field"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    className="input-field"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </details>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-gray-500">
              After registration, your school will assign you to a class.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

