import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, impersonationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminMinistries() {
  const { account, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('ALL');
  const [ministries, setMinistries] = useState<any[]>([]);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });

  const isAuthorized = account?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isAuthorized) {
      loadMinistries();
    }
  }, [status, isAuthorized]);

  const loadMinistries = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getMinistries(status === 'ALL' ? undefined : status);
      setMinistries(data.ministries);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load ministries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminAPI.createMinistry(form);
      toast.success('Ministry created successfully');
      setForm({ name: '', email: '', password: '', phone: '', address: '' });
      loadMinistries();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create ministry');
    } finally {
      setCreating(false);
    }
  };

  const handleReview = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await adminAPI.reviewMinistry(id, decision);
      toast.success(`Request ${decision.toLowerCase()}`);
      loadMinistries();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Action failed');
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
    return <p className="text-center text-gray-500">Only super admins can manage ministries.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Create Ministry / Organisation</h2>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          {['name', 'email', 'phone', 'address', 'password'].map((field) => (
            <input
              key={field}
              name={field}
              type={field === 'password' ? 'password' : 'text'}
              required={field !== 'phone' && field !== 'address'}
              placeholder={field === 'name' ? 'Name' : field === 'email' ? 'Email' : field === 'phone' ? 'Phone' : field === 'address' ? 'Address' : 'Password'}
              className="input-field"
              value={(form as any)[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          ))}
          <button type="submit" disabled={creating} className="btn-primary col-span-full md:w-48">
            {creating ? 'Creating...' : 'Create ministry'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Ministries
            {status !== 'ALL' && <span className="ml-2 text-sm text-gray-500">({status.toLowerCase()})</span>}
          </h2>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="input-field w-40"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
        </div>
        {loading ? (
          <p className="text-gray-500">Loading ministries...</p>
        ) : ministries.length === 0 ? (
          <p className="text-gray-500">No ministries found for this filter.</p>
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
                {ministries.map((ministry) => (
                  <tr key={ministry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{ministry.name}</p>
                      <p className="text-xs text-gray-500">{ministry.phone || 'No phone'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{ministry.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ministry.parent ? (
                        <span>{ministry.parent.name} ({ministry.parent.role})</span>
                      ) : (
                        <span className="text-gray-400">Root</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {ministry.metrics ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs">Schools: {ministry.metrics.schools}</span>
                          <span className="text-xs">Teachers: {ministry.metrics.teachers}</span>
                          <span className="text-xs">Sessions: {ministry.metrics.sessions}</span>
                          <span className="text-xs">Tests: {ministry.metrics.tests}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          ministry.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : ministry.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {ministry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ministry.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleReview(ministry.id, 'APPROVED')}
                              className="px-2 py-1 text-xs font-semibold rounded bg-primary text-white hover:bg-primary-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(ministry.id, 'REJECTED')}
                              className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {ministry.status === 'APPROVED' && (
                          <button
                            onClick={() => handleImpersonate(ministry.id)}
                            disabled={impersonatingId === ministry.id}
                            className="px-3 py-1 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {impersonatingId === ministry.id ? 'Switching...' : 'Impersonate'}
                          </button>
                        )}
                      </div>
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

