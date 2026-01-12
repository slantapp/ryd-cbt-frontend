import React, { useEffect, useState, useMemo } from 'react';
import { announcementAPI, themeAPI, classroomAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  classrooms: Array<{
    id: string;
    name: string;
  }>;
}

export default function EducationalInsights() {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    classroomIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSchool = useMemo(() => {
    return account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN';
  }, [account?.role]);

  const isTeacher = useMemo(() => {
    return account?.role === 'TEACHER';
  }, [account?.role]);

  // Load theme
  useEffect(() => {
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
    if (isSchool || isTeacher) {
      loadTheme();
    }
  }, [isSchool, isTeacher]);

  // Load announcements
  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Load classrooms for all users
  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await announcementAPI.getAll();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load educational insights:', error);
      toast.error(error?.response?.data?.error || 'Failed to load educational insights');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClassrooms = async () => {
    try {
      const { data } = await classroomAPI.list();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load classrooms:', error);
      toast.error('Failed to load classrooms');
    }
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      description: '',
      youtubeUrl: '',
      classroomIds: [],
    });
    setShowForm(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      description: announcement.description || '',
      youtubeUrl: announcement.youtubeUrl || '',
      classroomIds: announcement.classrooms.map(c => c.id),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingAnnouncement) {
        // Update
        await announcementAPI.update(editingAnnouncement.id, {
          title: formData.title,
          description: formData.description || undefined,
          youtubeUrl: formData.youtubeUrl || undefined,
          classroomIds: formData.classroomIds,
        });
        toast.success('Educational Insight updated successfully');
      } else {
        // Create
        await announcementAPI.create({
          title: formData.title,
          description: formData.description || undefined,
          youtubeUrl: formData.youtubeUrl || undefined,
          classroomIds: formData.classroomIds,
        });
        toast.success('Educational Insight created successfully');
      }
      setShowForm(false);
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        description: '',
        youtubeUrl: '',
        classroomIds: [],
      });
      loadAnnouncements();
    } catch (error: any) {
      console.error('Failed to save educational insight:', error);
      toast.error(error?.response?.data?.error || 'Failed to save educational insight');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this educational insight?')) {
      return;
    }

    setDeletingId(id);
    try {
      await announcementAPI.delete(id);
      toast.success('Educational Insight deleted successfully');
      loadAnnouncements();
    } catch (error: any) {
      console.error('Failed to delete educational insight:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete educational insight');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      await announcementAPI.update(announcement.id, {
        isActive: !announcement.isActive,
      });
      toast.success(`Educational Insight ${!announcement.isActive ? 'activated' : 'deactivated'} successfully`);
      loadAnnouncements();
    } catch (error: any) {
      console.error('Failed to update educational insight:', error);
      toast.error(error?.response?.data?.error || 'Failed to update educational insight');
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  if (loading && announcements.length === 0) {
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
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Educational Insights</h1>
            <p className="text-white/80 text-lg">
              Share educational content and insights with selected classes
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-colors backdrop-blur-sm"
          >
            + Create Insight
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          className="card p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${theme?.primaryColor || '#A8518A'} 0%, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'} 100%)`
          }}
        >
          <div className="text-3xl font-bold mb-2">{announcements.length}</div>
          <div className="text-white/80">Total Insights</div>
        </div>
        <div 
          className="card p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'} 0%, ${theme?.accentColor || theme?.primaryColor || '#facc15'} 100%)`
          }}
        >
          <div className="text-3xl font-bold mb-2">
            {announcements.reduce((sum, a) => sum + a.classrooms.length, 0)}
          </div>
          <div className="text-white/80">Class Assignments</div>
        </div>
        <div 
          className="card p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${theme?.accentColor || theme?.primaryColor || '#facc15'} 0%, ${theme?.primaryColor || '#A8518A'} 100%)`
          }}
        >
          <div className="text-3xl font-bold mb-2">
            {announcements.filter(a => a.isActive).length}
          </div>
          <div className="text-white/80">Active</div>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingAnnouncement ? 'Edit Educational Insight' : 'Create Educational Insight'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter insight title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="input-field"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter insight description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a YouTube video URL (optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Classes *
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                  {/* Select All Checkbox */}
                  <div className="mb-3 pb-3 border-b border-gray-300">
                    <label className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.classroomIds.length === classrooms.length && classrooms.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, classroomIds: classrooms.map(c => c.id) });
                          } else {
                            setFormData({ ...formData, classroomIds: [] });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-semibold text-gray-700">
                        Select All ({classrooms.length} classes)
                      </span>
                    </label>
                  </div>
                  
                  {/* Individual Class Checkboxes */}
                  <div className="space-y-2">
                    {classrooms.map((classroom) => (
                      <label key={classroom.id} className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.classroomIds.includes(classroom.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, classroomIds: [...formData.classroomIds, classroom.id] });
                            } else {
                              setFormData({ ...formData, classroomIds: formData.classroomIds.filter(id => id !== classroom.id) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{classroom.name}</span>
                      </label>
                    ))}
                  </div>
                  
                  {classrooms.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No classes available
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select one or more classes that should see this insight. You can add or remove classes when editing.
                </p>
                {formData.classroomIds.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    {formData.classroomIds.length} {formData.classroomIds.length === 1 ? 'class' : 'classes'} selected
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                  style={{
                    background: `linear-gradient(135deg, ${theme?.primaryColor || '#A8518A'} 0%, ${theme?.secondaryColor || theme?.primaryColor || '#1d4ed8'} 100%)`
                  }}
                >
                  {submitting ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                    setFormData({
                      title: '',
                      description: '',
                      youtubeUrl: '',
                      classroomIds: [],
                    });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">💡</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Educational Insights Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first educational insight to share content with selected classes
          </p>
          <button onClick={handleCreate} className="btn-primary">
            Create Insight
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const youtubeId = announcement.youtubeUrl ? extractYoutubeId(announcement.youtubeUrl) : null;
            
            return (
              <div key={announcement.id} className="card hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            announcement.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {announcement.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {announcement.description && (
                        <p className="text-gray-700 mb-3">{announcement.description}</p>
                      )}
                      {announcement.classrooms.length > 0 ? (
                        <div className="mb-3">
                          <span className="text-sm text-gray-600 font-medium">Visible to classes: </span>
                          <span className="text-sm font-medium text-blue-600">
                            {announcement.classrooms.map(c => c.name).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="mb-3 text-sm text-orange-600">
                          No classes selected - this insight is not visible to any students
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>By: {announcement.createdBy.name}</span>
                        <span>•</span>
                        <span>{format(new Date(announcement.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(announcement)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          announcement.isActive
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {announcement.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        disabled={deletingId === announcement.id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {deletingId === announcement.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {youtubeId && (
                    <div className="mt-4">
                      <div className="relative" style={{ paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                          src={`https://www.youtube.com/embed/${youtubeId}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={announcement.title}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

