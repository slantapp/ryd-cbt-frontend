import { useEffect, useState } from 'react';
import { impersonationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function Impersonation() {
  const { account, setAuth, impersonationChain } = useAuthStore();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const allowedRoles = ['SUPER_ADMIN', 'MINISTRY', 'SCHOOL'];
  const isAllowed = account && allowedRoles.includes(account.role);

  useEffect(() => {
    if (isAllowed) {
      loadChildren();
    }
  }, [isAllowed]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const { data } = await impersonationAPI.listChildren();
      setChildren(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load child accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      setActing(id);
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
      // Reload children list after impersonation
      setTimeout(() => {
        loadChildren();
      }, 500);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to impersonate');
    } finally {
      setActing(null);
    }
  };

  const handleStop = async () => {
    try {
      setActing('stop');
      const { data } = await impersonationAPI.stop();
      if (!data.token) {
        toast.error('Failed to return to previous account: No authentication token received');
        return;
      }
      
      if (!data.account) {
        toast.error('Failed to return to previous account: No account data received');
        return;
      }
      
      setAuth(data.token, data.account);
      toast.success('Returned to previous account');
      // Reload children list after stopping impersonation
      setTimeout(() => {
        loadChildren();
      }, 500);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to stop impersonation');
    } finally {
      setActing(null);
    }
  };

  if (!isAllowed) {
    return <p className="text-center text-gray-500">Only super admin, ministry, or school accounts can impersonate.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Impersonation</h2>
            <p className="text-sm text-gray-500">
              Select a child account to step into their workspace instantly.
            </p>
          </div>
          {impersonationChain.length > 0 && (
            <button
              onClick={handleStop}
              disabled={acting === 'stop'}
              className="btn-primary"
            >
              {acting === 'stop' ? 'Restoring...' : 'Return to previous account'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Available Child Accounts</h3>
        {loading ? (
          <p className="text-gray-500">Loading child accounts...</p>
        ) : children.length === 0 ? (
          <p className="text-gray-500">No direct child accounts found.</p>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <div
                key={child.id}
                className="p-4 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{child.name}</p>
                  <p className="text-sm text-gray-500">{child.email}</p>
                </div>
                <button
                  onClick={() => handleStart(child.id)}
                  disabled={acting === child.id}
                  className="btn-primary"
                >
                  {acting === child.id ? 'Switching...' : `Impersonate ${child.role}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}