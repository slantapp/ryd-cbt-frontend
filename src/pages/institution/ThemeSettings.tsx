import { useEffect, useState } from 'react';
import { themeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const defaultTheme = {
  primaryColor: '#0f172a',
  secondaryColor: '#1d4ed8',
  accentColor: '#facc15',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  logoUrl: '',
  bannerUrl: '',
};

export default function ThemeSettings() {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const isSchool = account?.role === 'SCHOOL';

  useEffect(() => {
    if (isSchool) {
      loadTheme();
    }
  }, [isSchool]);

  const loadTheme = async () => {
    try {
      setLoading(true);
      const { data } = await themeAPI.get();
      setTheme({ ...defaultTheme, ...data });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load theme');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setTheme((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await themeAPI.update(theme);
      toast.success('Theme updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update theme');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await themeAPI.uploadLogo(file);
      setTheme((prev) => ({ ...prev, logoUrl: response.data.logoUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingBanner(true);
    try {
      const response = await themeAPI.uploadBanner(file);
      setTheme((prev) => ({ ...prev, bannerUrl: response.data.bannerUrl }));
      toast.success('Banner uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      e.target.value = ''; // Reset input
    }
  };

  if (!isSchool) {
    return <p className="text-center text-gray-500">Only schools can configure theme settings.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Brand Theme</h2>
        {loading ? (
          <p className="text-gray-500">Loading theme...</p>
        ) : (
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSave}>
            {Object.entries({
              primaryColor: 'Primary color',
              secondaryColor: 'Secondary color',
              accentColor: 'Accent color',
              backgroundColor: 'Background color',
              textColor: 'Text color',
            }).map(([field, label]) => (
              <div key={field}>
                <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
                <input
                  type="color"
                  value={(theme as any)[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="w-full h-10 rounded border"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600 mb-1 block">Logo</label>
              {theme.logoUrl && !theme.logoUrl.startsWith('http') ? (
                // Uploaded logo (path starts with /uploads)
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <img
                      src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.logoUrl}`}
                      alt="Logo"
                      className="h-16 w-16 object-contain border border-gray-200 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">Logo uploaded successfully</p>
                      <button
                        type="button"
                        onClick={() => handleChange('logoUrl', '')}
                        className="text-sm text-red-600 hover:text-red-700 mt-1"
                      >
                        Remove logo
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    To change the logo, remove it first, then upload a new one or enter a URL.
                  </div>
                </div>
              ) : (
                // No logo uploaded, show upload and URL options
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadingLogo ? 'Uploading...' : 'Upload logo (max 5MB)'}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Enter logo URL:</label>
                    <input
                      type="url"
                      className="input-field mt-1"
                      placeholder="https://example.com/logo.png"
                      value={theme.logoUrl || ''}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-600 mb-1 block">Banner</label>
              {theme.bannerUrl && !theme.bannerUrl.startsWith('http') ? (
                // Uploaded banner (path starts with /uploads)
                <div className="space-y-2">
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.bannerUrl}`}
                    alt="Banner"
                    className="w-full h-32 object-cover border border-gray-200 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">Banner uploaded successfully</p>
                    <button
                      type="button"
                      onClick={() => handleChange('bannerUrl', '')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove banner
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    To change the banner, remove it first, then upload a new one or enter a URL.
                  </div>
                </div>
              ) : (
                // No banner uploaded, show upload and URL options
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadingBanner ? 'Uploading...' : 'Upload banner image (max 5MB)'}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Enter banner URL:</label>
                    <input
                      type="url"
                      className="input-field mt-1"
                      placeholder="https://example.com/banner.png"
                      value={theme.bannerUrl || ''}
                      onChange={(e) => handleChange('bannerUrl', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn-primary md:col-span-2 md:w-48">
              {saving ? 'Saving...' : 'Save theme'}
            </button>
          </form>
        )}
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        <div
          className="rounded-xl overflow-hidden border-2 border-gray-200"
          style={{
            backgroundColor: theme.backgroundColor,
            color: theme.textColor,
          }}
        >
          {/* Banner Preview */}
          {theme.bannerUrl && (
            <div className="w-full h-32 overflow-hidden">
              <img
                src={theme.bannerUrl.startsWith('http') ? theme.bannerUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.bannerUrl}`}
                alt="Banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-4">
              {theme.logoUrl ? (
                <img
                  src={theme.logoUrl.startsWith('http') ? theme.logoUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.logoUrl}`}
                  alt="Logo"
                  className="h-12 w-12 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                >
                  {account?.name?.[0] || 'S'}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">{account?.name}</p>
                <p className="text-sm" style={{ color: theme.secondaryColor }}>
                  CBT exam branding preview
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div
                className="rounded-lg p-4 text-sm font-semibold text-center"
                style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
              >
                Primary Button
              </div>
              <div
                className="rounded-lg p-4 text-sm font-semibold text-center"
                style={{ backgroundColor: theme.accentColor, color: theme.textColor }}
              >
                Accent Highlight
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

