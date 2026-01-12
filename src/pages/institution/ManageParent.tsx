import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { themeAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ManageParent() {
  const { id } = useParams<{ id: string }>();
  const { account } = useAuthStore();
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });

  useEffect(() => {
    // Apply default theme immediately
    const defaultTheme = {
      primaryColor: '#A8518A',
      secondaryColor: '#1d4ed8',
      accentColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    };
    
    // Load theme
    const loadTheme = async () => {
      try {
        const { data } = await themeAPI.get();
        if (data) {
          setTheme(data);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    
    if (account && (account.role === 'SCHOOL' || account.role === 'TEACHER' || account.role === 'SCHOOL_ADMIN')) {
      loadTheme();
    }
  }, [account]);

  useEffect(() => {
    if (id) {
      loadParent();
    }
  }, [id]);

  const loadParent = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call when backend endpoint is ready
      // const { data } = await parentAPI.getById(id);
      // setParent(data);
      console.log('Loading parent with ID:', id);
      // Placeholder - replace with actual API call
      setParent(null);
    } catch (error: any) {
      console.error('Failed to load parent:', error);
      toast.error(error?.response?.data?.error || 'Failed to load parent information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div 
        className="rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(to right, ${theme?.primaryColor || '#A8518A'}, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'}, ${theme?.accentColor || theme?.primaryColor || '#facc15'})`
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">Manage Parent</h1>
          <p className="text-white/80 text-lg">Parent ID: {id}</p>
        </div>
      </div>

      {/* Parent Information */}
      <div className="card">
        {parent ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">Parent Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{parent.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{parent.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Parent information not found.</p>
            <p className="text-gray-400 text-sm mt-2">Parent ID: {id}</p>
          </div>
        )}
      </div>
    </div>
  );
}


