import React, { useEffect, useState } from 'react';
import { announcementAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  createdAt: string;
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

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await announcementAPI.getStudent();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load announcements:', error);
      toast.error(error?.response?.data?.error || 'Failed to load announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading announcements...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">💡 Educational Insights</h1>
          <p className="text-white/80 text-lg">
            Educational content and insights shared by your school and teachers
          </p>
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">💡</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Educational Insights</h3>
          <p className="text-gray-600">
            You don't have any educational insights at the moment. Check back later!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => {
            const youtubeId = announcement.youtubeUrl ? extractYoutubeId(announcement.youtubeUrl) : null;
            
            return (
              <div key={announcement.id} className="card hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-gray-900">{announcement.title}</h3>
                      </div>
                      
                      {announcement.description && (
                        <div className="mb-4">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {announcement.description}
                          </p>
                        </div>
                      )}

                      {announcement.classrooms.length > 0 && (
                        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">For classes:</span>
                          <span>{announcement.classrooms.map(c => c.name).join(', ')}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">By:</span>
                          <span>{announcement.createdBy.name}</span>
                        </div>
                        <span>•</span>
                        <span>{format(new Date(announcement.createdAt), 'MMMM d, yyyy • h:mm a')}</span>
                      </div>
                    </div>
                  </div>

                  {youtubeId && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Video:</h4>
                      <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
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

