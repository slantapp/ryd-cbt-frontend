import { useEffect, useState } from 'react';
import { themeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { applyTheme } from '../../utils/themeUtils';
import toast from 'react-hot-toast';

// Default theme colors (used when school hasn't selected a theme)
const defaultTheme = {
  primaryColor: '#0f172a', // Dark slate - default primary color
  secondaryColor: '#1d4ed8', // Blue
  accentColor: '#facc15', // Yellow
  backgroundColor: '#ffffff', // White
  textColor: '#0f172a', // Dark slate
  logoUrl: '',
  bannerUrl: '',
};

// Pre-made professional color palettes
const colorPalettes = [
  {
    name: 'Classic Blue',
    description: 'Professional and trustworthy',
    colors: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Royal Purple',
    description: 'Elegant and sophisticated',
    colors: {
      primaryColor: '#7c3aed',
      secondaryColor: '#a78bfa',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Forest Green',
    description: 'Natural and calming',
    colors: {
      primaryColor: '#166534',
      secondaryColor: '#22c55e',
      accentColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Ocean Teal',
    description: 'Fresh and modern',
    colors: {
      primaryColor: '#0d9488',
      secondaryColor: '#14b8a6',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Crimson Red',
    description: 'Bold and energetic',
    colors: {
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Sunset Orange',
    description: 'Warm and inviting',
    colors: {
      primaryColor: '#ea580c',
      secondaryColor: '#f97316',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Midnight Navy',
    description: 'Professional and authoritative',
    colors: {
      primaryColor: '#1e293b',
      secondaryColor: '#334155',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Emerald',
    description: 'Growth and success',
    colors: {
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Rose Pink',
    description: 'Friendly and approachable',
    colors: {
      primaryColor: '#db2777',
      secondaryColor: '#ec4899',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Indigo',
    description: 'Creative and innovative',
    colors: {
      primaryColor: '#4f46e5',
      secondaryColor: '#6366f1',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Slate Gray',
    description: 'Minimalist and clean',
    colors: {
      primaryColor: '#475569',
      secondaryColor: '#64748b',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Amber Gold',
    description: 'Premium and prestigious',
    colors: {
      primaryColor: '#d97706',
      secondaryColor: '#f59e0b',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Sky Blue',
    description: 'Calm and peaceful',
    colors: {
      primaryColor: '#0284c7',
      secondaryColor: '#0ea5e9',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Violet',
    description: 'Creative and inspiring',
    colors: {
      primaryColor: '#6d28d9',
      secondaryColor: '#8b5cf6',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Lime Green',
    description: 'Fresh and energetic',
    colors: {
      primaryColor: '#65a30d',
      secondaryColor: '#84cc16',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Cyan',
    description: 'Modern and tech-forward',
    colors: {
      primaryColor: '#0891b2',
      secondaryColor: '#06b6d4',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Magenta',
    description: 'Bold and vibrant',
    colors: {
      primaryColor: '#c026d3',
      secondaryColor: '#d946ef',
      accentColor: '#fbbf24',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  },
  {
    name: 'Default (Dark Slate)',
    description: 'System default theme',
    colors: {
      primaryColor: '#0f172a',
      secondaryColor: '#1d4ed8',
      accentColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    },
  },
];

export default function ThemeSettings() {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState(defaultTheme);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);

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
      
      // Check if current theme matches any palette
      const matchingPalette = colorPalettes.find(palette => 
        palette.colors.primaryColor === (data?.primaryColor || defaultTheme.primaryColor) &&
        palette.colors.secondaryColor === (data?.secondaryColor || defaultTheme.secondaryColor)
      );
      if (matchingPalette) {
        setSelectedPalette(matchingPalette.name);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load theme');
    } finally {
      setLoading(false);
    }
  };

  const handlePaletteSelect = (palette: typeof colorPalettes[0]) => {
    const newTheme = { ...theme, ...palette.colors };
    setTheme(newTheme);
    setSelectedPalette(palette.name);
    // Apply theme immediately for preview
    applyTheme(newTheme);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await themeAPI.update(theme);
      // Apply theme immediately after saving
      applyTheme(theme);
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
      setTheme((prev) => ({ ...prev, logoUrl: response.data.logoUrl }));
      toast.success('Logo uploaded successfully');
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
      toast.success('Banner uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
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
          Default color: <span className="font-semibold">Dark Slate (#0f172a)</span> - This is used when no theme is selected
        </p>
      </div>

      {/* Color Palette Selection */}
      <div className="card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Choose a Color Palette</h2>
          <p className="text-gray-600">Select a pre-designed color combination that matches your school's brand</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-gray-600">Loading theme...</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {colorPalettes.map((palette) => {
              const isSelected = selectedPalette === palette.name;
              return (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => handlePaletteSelect(palette)}
                  className={`relative p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                    isSelected
                      ? 'border-primary shadow-lg ring-2 ring-primary ring-offset-2'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 mb-1">{palette.name}</h3>
                    <p className="text-xs text-gray-500">{palette.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="flex-1 h-12 rounded-lg border border-gray-200"
                      style={{ backgroundColor: palette.colors.primaryColor }}
                      title="Primary"
                    ></div>
                    <div
                      className="flex-1 h-12 rounded-lg border border-gray-200"
                      style={{ backgroundColor: palette.colors.secondaryColor }}
                      title="Secondary"
                    ></div>
                    <div
                      className="flex-1 h-12 rounded-lg border border-gray-200"
                      style={{ backgroundColor: palette.colors.accentColor }}
                      title="Accent"
                    ></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview and Save */}
      <form onSubmit={handleSave} className="space-y-6">
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

        {/* Save Button */}
        <div className="flex justify-end">
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
