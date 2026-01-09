import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { themeAPI } from '../../services/api';
import { applyTheme } from '../../utils/themeUtils';

export default function Help() {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState<any>({
    primaryColor: '#A8518A',
    secondaryColor: '#1d4ed8',
    accentColor: '#facc15',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
  });

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
  }, []);

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

      {/* Video Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
          Video Tutorials
        </h2>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600 mb-2">
                Video tutorials will be available here soon.
              </p>
              <p className="text-sm text-gray-500">
                YouTube links can be added later to embed tutorial videos.
              </p>
            </div>
          </div>
        </div>
      </div>

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

