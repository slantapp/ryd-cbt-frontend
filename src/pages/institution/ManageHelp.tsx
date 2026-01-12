import { useState, useEffect } from 'react';
import { helpAPI, themeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface HelpContent {
  id: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  userTypes?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ManageHelp() {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    userTypes: [] as string[],
    isActive: true,
  });

  const availableUserTypes = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'MINISTRY', label: 'Ministry' },
    { value: 'SCHOOL', label: 'School' },
    { value: 'SCHOOL_ADMIN', label: 'School Admin' },
    { value: 'TEACHER', label: 'Teacher' },
    { value: 'STUDENT', label: 'Student' },
  ];
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAuthorized = account?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isAuthorized) {
      loadTheme();
      loadHelpContent();
    }
  }, [isAuthorized]);

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

  const loadHelpContent = async () => {
    setLoading(true);
    try {
      const { data } = await helpAPI.getAll();
      setHelpContent(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load help content:', error);
      toast.error(error?.response?.data?.error || 'Failed to load help content');
      setHelpContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      youtubeUrl: '',
      userTypes: [],
            isActive: true,
    });
    setShowForm(true);
  };

  const handleEdit = (item: HelpContent) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      youtubeUrl: item.youtubeUrl || '',
      userTypes: item.userTypes || [],
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const handleUserTypeToggle = (userType: string) => {
    setFormData((prev) => {
      const currentUserTypes = prev.userTypes || [];
      if (currentUserTypes.includes(userType)) {
        return { ...prev, userTypes: currentUserTypes.filter((t) => t !== userType) };
      } else {
        return { ...prev, userTypes: [...currentUserTypes, userType] };
      }
    });
  };

  const handleSelectAllUserTypes = () => {
    setFormData((prev) => {
      const currentUserTypes = prev.userTypes || [];
      if (currentUserTypes.length === availableUserTypes.length) {
        return { ...prev, userTypes: [] };
      } else {
        return { ...prev, userTypes: availableUserTypes.map((t) => t.value) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingItem) {
        // Update
        await helpAPI.update(editingItem.id, {
          title: formData.title,
          description: formData.description || undefined,
          youtubeUrl: formData.youtubeUrl || undefined,
          userTypes: formData.userTypes && formData.userTypes.length > 0 ? formData.userTypes : undefined,
          isActive: formData.isActive,
        });
        toast.success('Help content updated successfully');
      } else {
        // Create
        await helpAPI.create({
          title: formData.title,
          description: formData.description || undefined,
          youtubeUrl: formData.youtubeUrl || undefined,
          userTypes: formData.userTypes && formData.userTypes.length > 0 ? formData.userTypes : undefined,
          isActive: formData.isActive,
        });
        toast.success('Help content created successfully');
      }
      setShowForm(false);
      setEditingItem(null);
      loadHelpContent();
    } catch (error: any) {
      console.error('Failed to save help content:', error);
      toast.error(error?.response?.data?.error || 'Failed to save help content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this help content?')) {
      return;
    }

    setDeletingId(id);
    try {
      await helpAPI.delete(id);
      toast.success('Help content deleted successfully');
      loadHelpContent();
    } catch (error: any) {
      console.error('Failed to delete help content:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete help content');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (item: HelpContent) => {
    try {
      await helpAPI.update(item.id, {
        isActive: !item.isActive,
      });
      toast.success(`Help content ${!item.isActive ? 'activated' : 'deactivated'} successfully`);
      loadHelpContent();
    } catch (error: any) {
      console.error('Failed to toggle help content status:', error);
      toast.error(error?.response?.data?.error || 'Failed to update help content status');
    }
  };

  if (!isAuthorized) {
    return <p className="text-center text-gray-500">Only super admins can access this page.</p>;
  }

  const primaryColor = theme?.primaryColor || '#A8518A';
  const secondaryColor = theme?.secondaryColor || '#1d4ed8';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-8 text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        <h1 className="text-4xl font-bold mb-2">Manage Help Content</h1>
        <p className="text-white/90 text-lg">
          Create and manage help content that will appear on the Help page
        </p>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <button onClick={handleCreate} className="btn-primary">
          + Create Help Content
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingItem ? 'Edit Help Content' : 'Create Help Content'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="Enter title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={4}
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visible To (User Types)
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    Select which user types can see this help content. Leave empty to show to all users.
                  </p>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {/* Select All Checkbox */}
                      <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.userTypes && formData.userTypes.length === availableUserTypes.length && availableUserTypes.length > 0}
                          onChange={handleSelectAllUserTypes}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">Select All</span>
                      </label>
                      <div className="border-t border-gray-200 my-2"></div>
                      {/* Individual User Type Checkboxes */}
                      {availableUserTypes.map((userType) => (
                        <label
                          key={userType.value}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.userTypes && formData.userTypes.includes(userType.value)}
                            onChange={() => handleUserTypeToggle(userType.value)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm text-gray-700">{userType.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.userTypes && formData.userTypes.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                      {formData.userTypes.length} user type(s) selected
                    </p>
                  )}
                </div>

<div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active (visible on Help page)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingItem(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Help Content</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : helpContent.length === 0 ? (
            <p className="text-gray-500">No help content created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      YouTube URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visible To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {helpContent.map((item) => (
                    <tr key={item.id} className={!item.isActive ? 'bg-gray-50' : ''}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {item.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.youtubeUrl ? (
                          <a
                            href={item.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(item.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`${
                            item.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deletingId === item.id ? 'Deleting...' : 'Delete'}
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
    </div>
  );
}

