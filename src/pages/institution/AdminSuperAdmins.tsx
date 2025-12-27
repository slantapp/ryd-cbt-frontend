import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminSuperAdmins() {
  const { account } = useAuthStore();
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const isAuthorized = account?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isAuthorized) {
      loadSuperAdmins();
    }
  }, [isAuthorized]);

  const loadSuperAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getSuperAdmins();
      setSuperAdmins(data.superAdmins);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load super admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminAPI.createSuperAdmin(form);
      toast.success('Super admin created successfully');
      setForm({ name: '', email: '', password: '', phone: '' });
      loadSuperAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create super admin');
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthorized) {
    return <p className="text-center text-gray-500">Only super admin accounts can access this page.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">Super Admin Management</h1>
          <p className="text-purple-100 text-lg">Create and manage super administrator accounts</p>
        </div>
      </div>

      {/* Create Form */}
      <div className="card border-2 border-purple-200 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Super Admin</h2>
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
            placeholder="Phone (optional)"
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full md:w-auto"
            >
              {creating ? 'Creating...' : 'Create Super Admin'}
            </button>
          </div>
        </form>
      </div>

      {/* Super Admins List */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Super Admins</h2>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-gray-600">Loading super admins...</div>
          </div>
        ) : superAdmins.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No super admins found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {superAdmins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium">{admin.name}</td>
                    <td className="py-3 px-4 text-gray-700">{admin.email}</td>
                    <td className="py-3 px-4 text-gray-600">{admin.phone || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(admin.createdAt).toLocaleDateString()}
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


