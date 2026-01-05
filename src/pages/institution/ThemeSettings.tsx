import { useEffect, useState } from 'react';
import { themeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { applyTheme } from '../../utils/themeUtils';
import { triggerThemeReload } from '../../components/layout/InstitutionLayout';
import toast from 'react-hot-toast';

// Default theme colors (RYD brand colors)
const defaultTheme = {
  primaryColor: '#A8518A', // RYD primary color
  secondaryColor: '#1d4ed8', // Blue
  accentColor: '#facc15', // Yellow
  backgroundColor: '#ffffff', // White
  textColor: '#0f172a', // Dark slate
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
      const loadedTheme = { ...defaultTheme, ...data };
      setTheme(loadedTheme);
      
      // Apply theme when loaded
      applyTheme(loadedTheme);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load theme');
    } finally {
      setLoading(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await themeAPI.update(theme);
      // Reload theme to get the latest logoUrl from database
      const { data } = await themeAPI.get();
      const updatedTheme = { ...defaultTheme, ...data };
      setTheme(updatedTheme);
      // Apply theme immediately after saving
      applyTheme(updatedTheme);
      // Trigger theme reload in layout
      triggerThemeReload();
      toast.success('Theme updated and applied successfully');
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
      const newLogoUrl = response.data.logoUrl;
      const updatedTheme = { ...theme, logoUrl: newLogoUrl };
      setTheme(updatedTheme);
      // Apply theme immediately with new logo
      applyTheme(updatedTheme);
      // Also save the theme to ensure logoUrl is persisted
      await themeAPI.update(updatedTheme);
      // Trigger theme reload in layout to refresh logo
      triggerThemeReload();
      toast.success('Logo uploaded and saved successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
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
      // Trigger theme reload in layout
      triggerThemeReload();
      toast.success('Banner uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleRevert = async () => {
    if (!window.confirm('Are you sure you want to revert to the default RYD theme colors? This will reset all your custom colors.')) {
      return;
    }

    setSaving(true);
    try {
      const revertedTheme = {
        ...theme,
        primaryColor: defaultTheme.primaryColor,
        secondaryColor: defaultTheme.secondaryColor,
        accentColor: defaultTheme.accentColor,
        backgroundColor: defaultTheme.backgroundColor,
        textColor: defaultTheme.textColor,
      };
      
      await themeAPI.update(revertedTheme);
      const { data } = await themeAPI.get();
      const updatedTheme = { ...defaultTheme, ...data };
      setTheme(updatedTheme);
      applyTheme(updatedTheme);
      triggerThemeReload();
      toast.success('Theme reverted to default RYD colors');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to revert theme');
    } finally {
      setSaving(false);
    }
  };

  if (!isSchool) {
    return <p className="text-center text-gray-500">Only schools can configure theme settings.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Theme Settings</h1>
        <p className="text-gray-600">Customize your school's branding and color scheme</p>
        <p className="text-sm text-gray-500 mt-2">
          Default primary color: <span className="font-semibold">RYD Purple (#A8518A)</span> - Click "Revert to Default" to restore default colors
        </p>
      </div>

      {/* Color Selection */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Customize Colors</h2>
            <p className="text-gray-600">Choose your own colors for your school's branding</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-gray-600">Loading theme...</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, primaryColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, primaryColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="flex-1 input-field font-mono text-sm"
                    placeholder="#0f172a"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, secondaryColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, secondaryColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="flex-1 input-field font-mono text-sm"
                    placeholder="#1d4ed8"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, accentColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, accentColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="flex-1 input-field font-mono text-sm"
                    placeholder="#facc15"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.backgroundColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, backgroundColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.backgroundColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, backgroundColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="flex-1 input-field font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.textColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, textColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.textColor}
                    onChange={(e) => {
                      const newTheme = { ...theme, textColor: e.target.value };
                      setTheme(newTheme);
                      applyTheme(newTheme);
                    }}
                    className="flex-1 input-field font-mono text-sm"
                    placeholder="#0f172a"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Preview Card */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
          <div
            className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg"
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
              <div className="flex items-center gap-4 mb-6">
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
                    CBT Exam Platform
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-lg p-4 text-sm font-semibold text-center transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
                >
                  Primary Button
                </div>
                <div
                  className="rounded-lg p-4 text-sm font-semibold text-center transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.accentColor, color: theme.textColor }}
                >
                  Accent Highlight
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo and Banner Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">School Logo</h3>
              {theme.logoUrl && !theme.logoUrl.startsWith('http') ? (
              <div className="space-y-3">
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
                    <p className="text-sm text-gray-700">Logo uploaded</p>
                      <button
                        type="button"
                      onClick={() => setTheme((prev) => ({ ...prev, logoUrl: '' }))}
                        className="text-sm text-red-600 hover:text-red-700 mt-1"
                      >
                      Remove
                      </button>
                  </div>
                  </div>
                </div>
              ) : (
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
                    onChange={(e) => setTheme((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

          {/* Banner */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Banner Image</h3>
              {theme.bannerUrl && !theme.bannerUrl.startsWith('http') ? (
              <div className="space-y-3">
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.bannerUrl}`}
                    alt="Banner"
                  className="w-full h-24 object-cover border border-gray-200 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">Banner uploaded</p>
                    <button
                      type="button"
                    onClick={() => setTheme((prev) => ({ ...prev, bannerUrl: '' }))}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                    Remove
                    </button>
                  </div>
                </div>
              ) : (
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
                    {uploadingBanner ? 'Uploading...' : 'Upload banner (max 5MB)'}
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
                    onChange={(e) => setTheme((prev) => ({ ...prev, bannerUrl: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
      </div>

        {/* Save and Revert Buttons */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleRevert}
            disabled={saving}
            className="btn-secondary px-6 py-3 text-lg"
          >
            Revert to Default
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-8 py-3 text-lg"
          >
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </form>
    </div>
  );
}
