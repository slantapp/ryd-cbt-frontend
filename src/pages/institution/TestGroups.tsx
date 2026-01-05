import { useEffect, useState } from 'react';
import { testGroupAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface TestGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TestGroups() {
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadTestGroups();
  }, []);

  const loadTestGroups = async () => {
    try {
      setLoading(true);
      const response = await testGroupAPI.getAll();
      setTestGroups(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load test groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (editingId) {
        await testGroupAPI.update(editingId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        toast.success('Test group updated successfully');
      } else {
        await testGroupAPI.create({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        toast.success('Test group created successfully');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '' });
      loadTestGroups();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save test group');
    }
  };

  const handleEdit = (testGroup: TestGroup) => {
    setEditingId(testGroup.id);
    setFormData({
      name: testGroup.name,
      description: testGroup.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test group? This cannot be undone if it is being used by tests.')) {
      return;
    }

    try {
      await testGroupAPI.delete(id);
      toast.success('Test group deleted successfully');
      loadTestGroups();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete test group');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading test groups...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Test Groups</h1>
          <p className="mt-2 text-gray-600">Manage test groups (Assignment, Quiz, etc.)</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Create Test Group
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingId ? 'Edit Test Group' : 'Create Test Group'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Assignment, Quiz, Final Assessment"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                className="input-field"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this test group"
                rows={3}
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Create'} Test Group
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Test Groups List */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Test Groups</h2>
        {testGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No test groups yet. Create your first test group to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Description</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Status</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {testGroups.map((testGroup) => (
                    <tr key={testGroup.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 md:px-6 py-3 font-semibold text-gray-900 text-xs sm:text-sm">{testGroup.name}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-gray-700 hidden md:table-cell">{testGroup.description || '-'}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 hidden sm:table-cell">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            testGroup.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {testGroup.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleEdit(testGroup)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors text-xs sm:text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(testGroup.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors text-xs sm:text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



