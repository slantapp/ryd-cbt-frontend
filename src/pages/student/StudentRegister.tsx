import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { generateUsername } from '../../utils/usernameUtils';

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
    classroomId: '',
    sessionId: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'firstName' || name === 'lastName') {
      const newData = { ...formData, [name]: value };
      
      // Auto-generate username if both names are present and username is empty
      if (name === 'firstName' && value && formData.lastName && !formData.username) {
        const generatedUsername = generateUsername(value, formData.lastName);
        if (generatedUsername) {
          newData.username = generatedUsername;
        }
      } else if (name === 'lastName' && value && formData.firstName && !formData.username) {
        const generatedUsername = generateUsername(formData.firstName, value);
        if (generatedUsername) {
          newData.username = generatedUsername;
        }
      }
      
      setFormData(newData);
    } else {
      setFormData({ ...formData, [name]: value });
    }
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
      // Validate that if one is selected, both must be selected
      if ((formData.classroomId && !formData.sessionId) || (!formData.classroomId && formData.sessionId)) {
        toast.error('Please select both session and class, or leave both empty');
        setLoading(false);
        return;
      }

      await publicAPI.registerStudent({
        schoolSlug: slug!,
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        classroomId: formData.classroomId || undefined,
        sessionId: formData.sessionId || undefined,
      });
      toast.success(formData.classroomId ? 'Registration successful! You have been assigned to your selected class. Please log in to continue.' : 'Registration successful! Please wait for class assignment from your school. Please log in to continue.');
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        classroomId: '',
        sessionId: '',
      });
      // Redirect to login page after registration
      setTimeout(() => {
        navigate('/student/login');
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
                Username <span className="text-gray-500 text-xs font-normal">(Auto-generated if empty)</span>
              </label>
              <input
                name="username"
                type="text"
                required
                className="input-field"
                placeholder="Will be auto-generated from name"
                value={formData.username}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.username ? 'You can edit this username' : 'Username will be generated automatically when you enter your name'}
              </p>
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

            {/* Class Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Class Selection (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Session
                  </label>
                  <select
                    name="sessionId"
                    className="input-field"
                    value={formData.sessionId}
                    onChange={(e) => {
                      setFormData({ ...formData, sessionId: e.target.value, classroomId: '' });
                    }}
                  >
                    <option value="">Select session (optional)</option>
                    {schoolInfo?.sessions?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    name="classroomId"
                    className="input-field"
                    value={formData.classroomId}
                    onChange={handleChange}
                    disabled={!formData.sessionId}
                  >
                    <option value="">Select class (optional)</option>
                    {formData.sessionId && schoolInfo?.sessions
                      ?.find((s: any) => s.id === formData.sessionId)
                      ?.classAssignments?.map((ca: any) => (
                        <option key={ca.classroom.id} value={ca.classroom.id}>
                          {ca.classroom.name}
                        </option>
                      ))}
                  </select>
                  {!formData.sessionId && (
                    <p className="text-xs text-gray-500 mt-1">Please select a session first</p>
                  )}
                </div>
              </div>
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
              {formData.classroomId 
                ? 'You will be assigned to the selected class upon registration. This cannot be changed later.' 
                : 'You can select a class during registration, or your school will assign you to a class later. Class selection cannot be changed after registration.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

