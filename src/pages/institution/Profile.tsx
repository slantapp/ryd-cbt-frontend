import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { institutionAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { account, setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolAdmins, setSchoolAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  useEffect(() => {
    loadProfile();
    if (account?.role === 'SCHOOL') {
      loadSchoolAdmins();
    }
  }, [account?.role]);

  const loadProfile = async () => {
    try {
      const response = await institutionAPI.getProfile();
      const data = response.data;
      
      if (!data) {
        throw new Error('No profile data received');
      }
      
      console.log('Profile data loaded:', data);
      
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
      });
      
      // Update account in store to ensure all data is available
      const token = localStorage.getItem('token');
      if (token && token.trim().length > 0) {
        // Merge with existing account data to preserve any additional fields
        const updatedAccount = {
          ...account,
          ...data,
          // Ensure parent info is preserved for teachers
          parent: data.parent || (account as any)?.parent,
        };
        setAuth(token, updatedAccount);
      } else {
        console.warn('No valid token found when updating profile');
      }
    } catch (error: any) {
      console.error('Load profile error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await institutionAPI.updateProfile(formData);
      const updatedInstitution = response.data.institution;
      
      // Merge with existing account to preserve any additional fields
      const updatedAccount = {
        ...account,
        ...updatedInstitution,
        // Ensure parent info is preserved for teachers
        parent: updatedInstitution.parent || (account as any)?.parent,
      };
      
      // Get existing token - don't update token on profile update
      const existingToken = localStorage.getItem('token');
      if (existingToken && existingToken.trim().length > 0) {
        setAuth(existingToken, updatedAccount);
      } else {
        console.warn('No valid token found when updating profile, account updated in store only');
        // Update account in store without token
        localStorage.setItem('account', JSON.stringify(updatedAccount));
        localStorage.removeItem('institution');
      }
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const loadSchoolAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const response = await institutionAPI.getSchoolAdmins();
      setSchoolAdmins(response.data);
    } catch (error: any) {
      toast.error('Failed to load school administrators');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);
    try {
      await institutionAPI.createSchoolAdmin(adminForm);
      toast.success('School administrator created successfully');
      setAdminForm({ name: '', email: '', password: '', phone: '' });
      setShowAdminForm(false);
      loadSchoolAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create school administrator');
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-gray-900">Account Settings</h1>
          {account?.role && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
              {account.role.replace('_', ' ')}
            </span>
          )}
        </div>
        <p className="mt-2 text-gray-600">
          Manage details for the logged-in account ({account?.email})
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field bg-gray-50"
                  value={account?.email || ''}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  className="input-field"
                  placeholder="Enter your institution address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* School Admin Management (only for SCHOOL role) */}
          {account?.role === 'SCHOOL' && (
            <div className="card mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">School Administrators</h2>
                <button
                  onClick={() => setShowAdminForm(!showAdminForm)}
                  className="btn-secondary text-sm"
                >
                  {showAdminForm ? 'Cancel' : '+ Create Admin'}
                </button>
              </div>

              {showAdminForm && (
                <form onSubmit={handleCreateAdmin} className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {['name', 'email', 'phone', 'password'].map((field) => (
                      <input
                        key={field}
                        name={field}
                        type={field === 'password' ? 'password' : 'text'}
                        placeholder={field === 'phone' ? 'Phone (optional)' : field.charAt(0).toUpperCase() + field.slice(1)}
                        className="input-field"
                        required={field !== 'phone'}
                        value={(adminForm as any)[field]}
                        onChange={(e) => setAdminForm({ ...adminForm, [field]: e.target.value })}
                      />
                    ))}
                  </div>
                  <button type="submit" disabled={creatingAdmin} className="btn-primary mt-4">
                    {creatingAdmin ? 'Creating...' : 'Create Administrator'}
                  </button>
                </form>
              )}

              {loadingAdmins ? (
                <p className="text-gray-500">Loading administrators...</p>
              ) : schoolAdmins.length === 0 ? (
                <p className="text-gray-500">No school administrators yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {schoolAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{admin.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{admin.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{admin.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="lg:col-span-1">
          {account?.role === 'SCHOOL' ? (
            <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Your Unique URL</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/${account?.uniqueSlug || ''}`
                  );
                  toast.success('URL copied to clipboard!');
                }}
                className="text-primary hover:text-primary-600 transition-colors p-2 rounded-lg hover:bg-white/50"
                title="Copy URL"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 mb-4">
              <code className="text-sm text-gray-900 break-all">
                {account?.uniqueSlug ? (
                  `${window.location.origin}/${account.uniqueSlug}`
                ) : (
                  <span className="text-gray-400 italic">No slug assigned yet</span>
                )}
              </code>
            </div>
            <p className="text-sm text-gray-600">
              Share this URL with your students and teachers to access the school login page.
            </p>
            </div>
          ) : account?.role === 'TEACHER' ? (
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">School Information</h3>
            </div>
            <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
              {account?.parentId ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">School Name</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {(account as any).parent?.name || 'Loading...'}
                    </p>
                  </div>
                  {(account as any).parent?.uniqueSlug && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Student Portal URL</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-gray-900 break-all flex-1">
                          {`${window.location.origin}/${(account as any).parent.uniqueSlug}`}
                        </code>
                        <button
                          onClick={() => {
                            const schoolSlug = (account as any).parent?.uniqueSlug;
                            if (schoolSlug) {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/${schoolSlug}`
                              );
                              toast.success('URL copied to clipboard!');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
                          title="Copy URL"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {(account as any).parent?.email && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">School Email</p>
                      <p className="text-sm text-gray-700">{(account as any).parent.email}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No school assigned. Contact your administrator.</p>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {account?.parentId 
                ? "This is your school's student portal URL. Students use this to access tests."
                : "Contact your administrator to be assigned to a school."}
            </p>
            </div>
          ) : (
            <div className="card bg-white border">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Unique URL</h3>
              <p className="text-sm text-gray-600">
                Unique student portal URLs are only available for school accounts.
              </p>
            </div>
          )}

          <div className="card mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              <div>
              <span className="text-gray-500">Account Status:</span>
              <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: account?.status === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                  color: account?.status === 'APPROVED' ? '#166534' : '#92400e',
                }}
              >
                {account?.status || 'UNKNOWN'}
              </span>
              </div>
              <div>
                <span className="text-gray-500">Member Since:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {account?.createdAt
                    ? new Date(account.createdAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
