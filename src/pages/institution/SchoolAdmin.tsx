import { useEffect, useState } from 'react';
import { institutionAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function SchoolAdmin() {
  const { account } = useAuthStore();
  const [schoolAdmins, setSchoolAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const isAuthorized = account?.role === 'SCHOOL';

  useEffect(() => {
    if (isAuthorized) {
      loadSchoolAdmins();
    }
  }, [isAuthorized]);

  const loadSchoolAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await institutionAPI.getSchoolAdmins();
      setSchoolAdmins(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load school admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await institutionAPI.createSchoolAdmin(form);
      toast.success('School admin created successfully');
      setForm({ name: '', email: '', password: '', phone: '' });
      loadSchoolAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create school admin');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (adminId: string, currentIsActive: boolean) => {
    const newIsActive = !currentIsActive;
    setUpdatingStatus(adminId);
    try {
      await institutionAPI.updateSchoolAdminStatus(adminId, newIsActive);
      toast.success(`School admin ${newIsActive ? 'activated' : 'deactivated'} successfully`);
      loadSchoolAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update school admin status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (!isAuthorized) {
    return <p className="text-center text-gray-500">Only school accounts can access this page.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">School Admin Management</h1>
          <p className="text-primary-100 text-lg">Create and manage school administrator accounts</p>
        </div>
      </div>

      {/* Create Form */}
      <div className="card border-2 border-primary-200 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create School Admin</h2>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            className="input-field"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="input-field"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="input-field"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone (Optional)"
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div className="md:col-span-2">
            <button type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? 'Creating...' : 'Create School Admin'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">School Admins</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : schoolAdmins.length === 0 ? (
          <p className="text-gray-500">No school admins created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schoolAdmins.map((admin) => (
                  <tr key={admin.id} className={!admin.isActive ? 'bg-gray-50 opacity-75' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {admin.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleToggleStatus(admin.id, admin.isActive)}
                        disabled={updatingStatus === admin.id}
                        className={`${
                          admin.isActive
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updatingStatus === admin.id
                          ? 'Updating...'
                          : admin.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


