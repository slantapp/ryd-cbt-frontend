import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ministryAPI, impersonationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function MinistrySchools() {
  const { account, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    uniqueSlug: '',
  });

  const isAuthorized = account?.role === 'MINISTRY';

  useEffect(() => {
    if (isAuthorized) {
      loadSchools();
    }
  }, [isAuthorized]);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const { data } = await ministryAPI.getSchools();
      setSchools(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await ministryAPI.createSchool(form);
      toast.success('School created successfully');
      setForm({ name: '', email: '', password: '', phone: '', address: '', uniqueSlug: '' });
      loadSchools();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create school');
    } finally {
      setCreating(false);
    }
  };

  const handleImpersonate = async (id: string) => {
    try {
      setImpersonatingId(id);
      const { data } = await impersonationAPI.start(id);
      if (!data.token) {
        toast.error('Impersonation failed: No authentication token received');
        return;
      }
      
      if (!data.account) {
        toast.error('Impersonation failed: No account data received');
        return;
      }
      
      setAuth(data.token, data.account);
      toast.success(`Now impersonating ${data.account.name}`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to impersonate');
    } finally {
      setImpersonatingId(null);
    }
  };

  if (!isAuthorized) {
    return <p className="text-center text-gray-500">Only ministry accounts can manage schools.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Create School</h2>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          {['name', 'email', 'uniqueSlug', 'phone', 'address', 'password'].map((field) => (
            <input
              key={field}
              name={field}
              type={field === 'password' ? 'password' : 'text'}
              placeholder={
                field === 'uniqueSlug'
                  ? 'Unique slug (optional)'
                  : field.charAt(0).toUpperCase() + field.slice(1)
              }
              className="input-field"
              required={!['uniqueSlug', 'phone', 'address'].includes(field)}
              value={(form as any)[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          ))}
          <button type="submit" disabled={creating} className="btn-primary col-span-full md:w-48">
            {creating ? 'Creating...' : 'Create school'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Schools</h2>
          <span className="text-sm text-gray-500">{schools.length} total</span>
        </div>
        {loading ? (
          <p className="text-gray-500">Loading schools...</p>
        ) : schools.length === 0 ? (
          <p className="text-gray-500">No schools yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Belongs To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Metrics</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{school.name}</p>
                      <p className="text-xs text-gray-500">{school.uniqueSlug && `/${school.uniqueSlug}`}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{school.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {school.parent ? (
                        <span>{school.parent.name} ({school.parent.role})</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {school.metrics ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs">Teachers: {school.metrics.teachers}</span>
                          <span className="text-xs">Sessions: {school.metrics.sessions}</span>
                          <span className="text-xs">Tests: {school.metrics.tests}</span>
                          <span className="text-xs">Students: {school.metrics.students}</span>
                          <span className="text-xs">Classes: {school.metrics.classes}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          school.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {school.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleImpersonate(school.id)}
                        disabled={impersonatingId === school.id}
                        className="px-3 py-1 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {impersonatingId === school.id ? 'Switching...' : 'Impersonate'}
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

