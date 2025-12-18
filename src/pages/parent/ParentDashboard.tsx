import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface LinkedStudent {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    institution: {
      id: string;
      name: string;
      uniqueSlug: string;
    };
  };
  verified: boolean;
  createdAt: string;
}

export default function ParentDashboard() {
  const { account } = useAuthStore();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchData, setSearchData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    institutionId: '',
  });
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadLinkedStudents();
  }, []);

  const loadLinkedStudents = async () => {
    try {
      const response = await parentAPI.getLinkedStudents();
      setLinkedStudents(response.data);
    } catch (error: any) {
      toast.error('Failed to load linked students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const response = await parentAPI.searchStudent(searchData);
      setSearchResult(response.data);
      toast.success('Student found!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Student not found');
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkStudent = async (studentId: string) => {
    try {
      await parentAPI.linkStudent({ studentId });
      toast.success('Student linked successfully');
      setSearchResult(null);
      setSearchData({ firstName: '', lastName: '', dateOfBirth: '', institutionId: '' });
      setShowSearch(false);
      loadLinkedStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to link student');
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
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold mb-3">Welcome Back! 👋</h1>
              <p className="text-blue-100 text-xl mb-2">Hello, {account?.name}</p>
              <p className="text-blue-200">Track your child's academic progress and achievements</p>
            </div>
            <div className="hidden md:block text-8xl opacity-20">🎓</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Children</h2>
            <p className="text-gray-600">Manage and view your children's academic information</p>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn-primary px-6 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
          >
            {showSearch ? '✕ Cancel' : '+ Add Child'}
          </button>
        </div>

        {showSearch && (
          <div className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-inner">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Search for Your Child</h3>
                <p className="text-gray-600 text-sm">Enter your child's information to link their account</p>
              </div>
            </div>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={searchData.firstName}
                    onChange={(e) => setSearchData({ ...searchData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={searchData.lastName}
                    onChange={(e) => setSearchData({ ...searchData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={searchData.dateOfBirth}
                  onChange={(e) => setSearchData({ ...searchData, dateOfBirth: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for verification
                </p>
              </div>
              <button
                type="submit"
                disabled={searching}
                className="btn-primary"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResult && (
              <div className="mt-6 p-6 bg-white border-2 border-blue-300 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {searchResult.student.firstName?.[0] || ''}{searchResult.student.lastName?.[0] || ''}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">
                        {searchResult.student.firstName} {searchResult.student.lastName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        📚 {searchResult.student.institution.name}
                      </p>
                    </div>
                  </div>
                  {searchResult.isLinked ? (
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      ✓ Already Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleLinkStudent(searchResult.student.id)}
                      className="btn-primary px-6 py-3 font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                    >
                      + Link Student
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {linkedStudents.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
              <span className="text-7xl">👨‍👩‍👧‍👦</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Children Linked Yet</h3>
            <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
              Start by searching for your child using their name and date of birth. Once linked, you'll be able to view their academic progress and report cards.
            </p>
            {!showSearch && (
              <button
                onClick={() => setShowSearch(true)}
                className="btn-primary text-lg px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                + Add Your First Child
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {linkedStudents.map((link) => (
              <div 
                key={link.id} 
                className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-blue-300 transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {link.student.firstName?.[0] || ''}{link.student.lastName?.[0] || ''}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {link.student.firstName} {link.student.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">📚 {link.student.institution.name}</p>
                    {link.verified ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending Verification
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    to={`/parent/students/${link.student.id}/scores`}
                    className="block w-full btn-secondary text-center py-3 font-semibold"
                  >
                    📊 View Scores
                  </Link>
                  <Link
                    to={`/parent/students/${link.student.id}/report-card`}
                    className="block w-full btn-primary text-center py-3 font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    📄 Report Card
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

