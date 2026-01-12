import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { themeAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PromoProgram() {
  const { account } = useAuthStore();
  const [programs, setPrograms] = useState<any[]>([]);
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
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call when backend endpoint is ready
      // const { data } = await promoProgramAPI.getAll();
      // Ensure data is always an array
      const data: any[] = []; // Placeholder - replace with actual API call
      setPrograms(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load programs:', error);
      toast.error(error?.response?.data?.error || 'Failed to load promotion programs');
      // Ensure programs is always an array even on error
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-4xl font-bold mb-2">Promotion Programs</h1>
          <p className="text-white/80 text-lg">Manage student promotion programs</p>
        </div>
      </div>

      {/* Programs List */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Programs</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : !programs || programs.length === 0 ? (
          <p className="text-gray-500">No promotion programs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(programs) && programs.map((program: any) => (
                  <tr key={program.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {program.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {program.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          program.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {program.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
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


