import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { themeAPI } from '../../services/api';
import { applyTheme } from '../../utils/themeUtils';
import PasswordResetModal from '../PasswordResetModal';
import UsernameModal from '../UsernameModal';

interface StudentLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: '📊' },
  { label: 'Educational Insights', path: '/student/announcements', icon: '💡' },
];

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { account, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<any>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState<string>('');

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Load and apply theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { data } = await themeAPI.get();
        if (data) {
          setTheme(data);
          applyTheme(data);
        }
      } catch (error) {
        // Silently fail - use default theme
        console.error('Failed to load theme:', error);
      }
    };

    if (account) {
      loadTheme();
    }
  }, [account]);

  // Show password reset modal when mustResetPassword is true
  useEffect(() => {
    if (account?.mustResetPassword && account?.role === 'STUDENT') {
      setShowPasswordResetModal(true);
    } else {
      setShowPasswordResetModal(false);
    }
  }, [account?.mustResetPassword, account?.role]);

  // Show username modal when student first lands on dashboard after registration
  useEffect(() => {
    if (
      account?.role === 'STUDENT' && 
      location.pathname === '/student/dashboard' && 
      !showPasswordResetModal
    ) {
      // Check if this is a newly registered student
      const shouldShowModal = localStorage.getItem('showUsernameModal') === 'true';
      const storedUsername = localStorage.getItem('registeredUsername');
      
      if (shouldShowModal && storedUsername) {
        // Store username in state before clearing localStorage
        setRegisteredUsername(storedUsername);
        // Show modal once when dashboard loads (after password reset modal if needed)
        const timer = setTimeout(() => {
          setShowUsernameModal(true);
          // Clear the flag so it doesn't show again
          localStorage.removeItem('showUsernameModal');
          localStorage.removeItem('registeredUsername');
        }, 500); // Small delay to ensure password reset modal appears first if needed
        return () => clearTimeout(timer);
      }
    }
  }, [account?.role, location.pathname, showPasswordResetModal]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-background, #f9fafb)' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link to="/student/dashboard" className="flex items-center space-x-2">
                {theme?.logoUrl && !theme.logoUrl.startsWith('http') ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${theme.logoUrl}`}
                    alt={account?.institution?.name || 'School Logo'}
                    className="h-10 w-auto max-w-[120px] object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const schoolName = encodeURIComponent(account?.institution?.name || 'School');
                      const themeColor = theme?.primaryColor?.replace('#', '') || '1d4ed8';
                      target.src = `https://ui-avatars.com/api/?name=${schoolName}&background=${themeColor}&color=fff&size=64&bold=true`;
                    }}
                  />
                ) : theme?.logoUrl && theme.logoUrl.startsWith('http') ? (
                  <img
                    src={theme.logoUrl}
                    alt={account?.institution?.name || 'School Logo'}
                    className="h-10 w-auto max-w-[120px] object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const schoolName = encodeURIComponent(account?.institution?.name || 'School');
                      const themeColor = theme?.primaryColor?.replace('#', '') || '1d4ed8';
                      target.src = `https://ui-avatars.com/api/?name=${schoolName}&background=${themeColor}&color=fff&size=64&bold=true`;
                    }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(to bottom right, var(--theme-primary, #1d4ed8), var(--theme-secondary, var(--theme-primary, #1d4ed8)))`
                    }}
                  >
                    <span className="text-2xl">🎓</span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-lg font-bold" style={{ color: 'var(--theme-text, #111827)' }}>
                    {account?.institution?.name || 'Student Portal'}
                  </div>
                  <div className="text-xs text-gray-500">Student Dashboard</div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? ''
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={isActive(item.path) ? {
                    backgroundColor: 'var(--theme-primary-50, #eff6ff)',
                    color: 'var(--theme-primary-700, #1d4ed8)',
                  } : {}}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900">
                  {account?.firstName} {account?.lastName}
                </div>
                <div className="text-xs text-gray-500">Student</div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive(item.path)
                      ? ''
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={isActive(item.path) ? {
                    backgroundColor: 'var(--theme-primary-50, #eff6ff)',
                    color: 'var(--theme-primary-700, #1d4ed8)',
                  } : {}}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-200">
                <div className="px-4 py-2 text-sm text-gray-900 font-medium">
                  {account?.firstName} {account?.lastName}
                </div>
                <div className="px-4 pb-2 text-xs text-gray-500">Student</div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 {account?.institution?.name || 'CBT Platform'}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Password Reset Modal */}
      {account?.mustResetPassword && account?.role === 'STUDENT' && (
        <PasswordResetModal
          isOpen={showPasswordResetModal}
          userEmail={account.email || account.username || ''}
          onClose={() => setShowPasswordResetModal(false)}
        />
      )}

      {/* Username Modal */}
      {showUsernameModal && (
        <UsernameModal
          isOpen={showUsernameModal}
          username={registeredUsername || account?.username || ''}
          onClose={() => {
            setShowUsernameModal(false);
            setRegisteredUsername('');
          }}
        />
      )}
    </div>
  );
}

