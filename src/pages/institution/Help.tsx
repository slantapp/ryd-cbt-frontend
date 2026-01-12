import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { themeAPI, helpAPI } from '../../services/api';
import { applyTheme } from '../../utils/themeUtils';

interface HelpContent {
  id: string;
  title: string;
  description?: string;
  youtubeUrl?: string;
  order: number;
}

export default function Help() {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
  });
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apply default theme immediately
    applyTheme({
      primaryColor: '#A8518A',
      secondaryColor: '#1d4ed8',
      accentColor: '#facc15',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
    });

    // Load theme
    const loadTheme = async () => {
      try {
        const { data } = await themeAPI.get();
        if (data) {
          setTheme(data);
          applyTheme(data);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    loadTheme();

    // Load help content
    loadHelpContent();
  }, []);

  const loadHelpContent = async () => {
    setLoading(true);
    try {
      const { data } = await helpAPI.getPublic();
      setHelpContent(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load help content:', error);
      setHelpContent([]);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-4xl font-bold mb-2">Help Center</h1>
        <p className="text-white/90 text-lg">
          Find answers to common questions and learn how to use the platform
        </p>
      </div>

      {/* Instructions Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
          Getting Started
        </h2>
        <div className="space-y-4">
          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">1. Setting Up Your Institution</h3>
            <p className="text-gray-700">
              Navigate to your profile settings to customize your institution's information, 
              upload your logo, and configure your branding colors.
            </p>
          </div>

          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">2. Creating Classes</h3>
            <p className="text-gray-700">
              Go to Setup &gt; Classes to create your classes. Assign teachers to classes 
              and link classes to academic sessions as needed.
            </p>
          </div>

          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">3. Managing Students</h3>
            <p className="text-gray-700">
              Add students individually or use bulk upload. Assign students to classes 
              and manage their information from the Students page under People.
            </p>
          </div>

          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">4. Creating Tests</h3>
            <p className="text-gray-700">
              Navigate to Academic &gt; Tests to create new tests. Add questions manually, 
              import from the question bank, or use bulk upload. Assign tests to specific 
              classes and set timing parameters.
            </p>
          </div>

          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">5. Question Bank</h3>
            <p className="text-gray-700">
              Build your question bank by adding questions organized by subject and grade level. 
              Reuse questions across multiple tests to save time.
            </p>
          </div>

          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">6. Grading Schemes</h3>
            <p className="text-gray-700">
              Set up grading schemes for different subjects and classes. Define weights for 
              test groups (e.g., Assignments, Mid-term, Final) to calculate overall scores automatically.
            </p>
          </div>

          <div className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
            <h3 className="text-lg font-semibold mb-2">7. Viewing Scores</h3>
            <p className="text-gray-700">
              Access student scores from the Scores page. View individual test results, 
              overall scores per subject, and generate reports.
            </p>
          </div>
        </div>
      </div>

      {/* Published Help Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-500">Loading help content...</p>
        </div>
      ) : helpContent.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
            Help Resources
          </h2>
          <div className="space-y-6">
            {helpContent.map((item) => (
              <div key={item.id} className="border-l-4 pl-4" style={{ borderColor: primaryColor }}>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                {item.description && (
                  <p className="text-gray-700 mb-3">{item.description}</p>
                )}
                {item.youtubeUrl && (
                  <div className="mt-3">
                    <a
                      href={item.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      Watch Video Tutorial
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Additional Resources */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
          Additional Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Support</h3>
            <p className="text-sm text-gray-600">
              Need additional help? Contact our support team for assistance with any questions or issues.
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Documentation</h3>
            <p className="text-sm text-gray-600">
              Comprehensive guides and documentation are available in the knowledge base.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

