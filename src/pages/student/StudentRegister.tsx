import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI, authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { generateUsername } from '../../utils/usernameUtils';
import studentImage from '../../assets/student.jpg';

export default function StudentRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
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
      
      // Auto-generate username if both names are present
      if (name === 'firstName' && value && formData.lastName) {
        const generatedUsername = generateUsername(value, formData.lastName);
        if (generatedUsername) {
          newData.username = generatedUsername;
        }
      } else if (name === 'lastName' && value && formData.firstName) {
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

      // Register the student
      const registerResponse = await publicAPI.registerStudent({
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

      // Get the registered username (from response or form data)
      const username = registerResponse.data?.username || formData.username;

      // Immediately log in the student
      try {
        const loginResponse = await authAPI.studentLogin({
          username: username,
          password: formData.password,
        });

        if (!loginResponse.data.token || !loginResponse.data.student) {
          toast.error('Registration successful, but login failed. Please log in manually.');
          navigate(`/${slug}/login`);
          return;
        }

        // Validate student belongs to this school
        if (loginResponse.data.student.institutionId !== schoolInfo?.institution?.id) {
          toast.error('Registration successful, but there was an issue with your account. Please contact your school.');
          navigate(`/${slug}/login`);
          return;
        }

        // Set mustResetPassword flag
        const requiresPasswordReset = loginResponse.data.requiresPasswordReset === true || loginResponse.data.student.mustResetPassword === true;

        // Convert student to account format
        const studentAccount = {
          id: loginResponse.data.student.id,
          name: `${loginResponse.data.student.firstName} ${loginResponse.data.student.lastName}`,
          email: loginResponse.data.student.email || loginResponse.data.student.username,
          role: 'STUDENT' as const,
          username: loginResponse.data.student.username,
          firstName: loginResponse.data.student.firstName,
          lastName: loginResponse.data.student.lastName,
          institutionId: loginResponse.data.student.institutionId,
          institution: loginResponse.data.student.institution,
          createdAt: new Date().toISOString(),
          status: 'ACTIVE' as const,
          mustResetPassword: requiresPasswordReset || false,
        };

        // Set auth and mark as newly registered
        setAuth(loginResponse.data.token, studentAccount as any);
        
        // Store flag to show username modal on dashboard
        localStorage.setItem('showUsernameModal', 'true');
        localStorage.setItem('registeredUsername', username);
        
        toast.success('Registration successful! Redirecting to dashboard...');
        
        // Navigate to dashboard (modal will show there)
        navigate('/student/dashboard');
      } catch (loginError: any) {
        // Registration succeeded but login failed
        toast.error('Registration successful, but automatic login failed. Please log in manually.');
        navigate(`/${slug}/login`);
      }
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

  // Get theme from school info
  const theme = schoolInfo?.theme || schoolInfo?.institution?.themeConfig || {};
  const themeColor = theme.primaryColor || '#1d4ed8';
  const logoUrl = theme.logoUrl;

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Image with Overlay and Quote (Fixed) */}
      <div className="hidden lg:flex lg:w-1/2 fixed left-0 top-0 bottom-0 overflow-y-auto">
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

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 lg:ml-[50%] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="p-8 md:p-10">
            <div className="text-center mb-8">
              {logoUrl && (
                <div className="mb-6">
                  {logoUrl.startsWith('http') ? (
                    <img
                      src={logoUrl}
                      alt={schoolInfo?.institution?.name || schoolInfo?.name || 'School'}
                      className="h-20 w-auto mx-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <img
                      src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${logoUrl}`}
                      alt={schoolInfo?.institution?.name || schoolInfo?.name || 'School'}
                      className="h-20 w-auto mx-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              )}
              <h2 className="text-3xl md:text-4xl font-extrabold mb-2" style={{ color: themeColor }}>Student Registration</h2>
              <p className="text-gray-600 text-lg">{schoolInfo?.institution?.name || schoolInfo?.name || 'School'}</p>
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
              className="w-full py-3 text-lg font-semibold text-white shadow-lg disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: themeColor }}
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
    </div>
  );
}

