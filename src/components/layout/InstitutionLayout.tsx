import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { impersonationAPI } from '../../services/api';
import NotificationBell from '../NotificationBell';
import PasswordResetModal from '../PasswordResetModal';
import toast from 'react-hot-toast';

interface InstitutionLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  roles: string[];
  icon?: string;
  children?: NavItem[];
}

const navConfig: NavItem[] = [
  { 
    label: 'Dashboard', 
    path: '/dashboard', 
    roles: ['SUPER_ADMIN', 'MINISTRY', 'SCHOOL', 'TEACHER'],
    icon: '📊'
  },
  { 
    label: 'Administration', 
    path: '#', 
    roles: ['SUPER_ADMIN'],
    icon: '⚙️',
    children: [
      { label: 'Ministries', path: '/ministries', roles: ['SUPER_ADMIN'], icon: '🏛️' },
      { label: 'Impersonation', path: '/impersonation', roles: ['SUPER_ADMIN'], icon: '👤' },
    ]
  },
  { 
    label: 'Management', 
    path: '#', 
    roles: ['MINISTRY'],
    icon: '🏢',
    children: [
      { label: 'Schools', path: '/schools', roles: ['MINISTRY'], icon: '🏫' },
      { label: 'Impersonation', path: '/impersonation', roles: ['MINISTRY'], icon: '👤' },
    ]
  },
  { 
    label: 'Academic', 
    path: '#', 
    roles: ['SCHOOL'],
    icon: '📚',
    children: [
      { label: 'Tests', path: '/tests', roles: ['SCHOOL'], icon: '📝' },
      { label: 'Sessions', path: '/sessions', roles: ['SCHOOL'], icon: '📅' },
      { label: 'Classes', path: '/classes', roles: ['SCHOOL'], icon: '🎓' },
      { label: 'Teachers', path: '/teachers', roles: ['SCHOOL'], icon: '👨‍🏫' },
      { label: 'Students', path: '/students', roles: ['SCHOOL'], icon: '👥' },
      { label: 'Scores', path: '/scores', roles: ['SCHOOL'], icon: '📊' },
    ]
  },
  { 
    label: 'Settings', 
    path: '#', 
    roles: ['SCHOOL'],
    icon: '🎨',
    children: [
      { label: 'Theme', path: '/theme', roles: ['SCHOOL'], icon: '🎨' },
      { label: 'Custom Fields', path: '/custom-fields', roles: ['SCHOOL'], icon: '📋' },
      { label: 'Impersonation', path: '/impersonation', roles: ['SCHOOL'], icon: '👤' },
    ]
  },
  { 
    label: 'Teaching', 
    path: '#', 
    roles: ['TEACHER'],
    icon: '📖',
    children: [
      { label: 'Tests', path: '/tests', roles: ['TEACHER'], icon: '📝' },
      { label: 'Classes', path: '/classes', roles: ['TEACHER'], icon: '🎓' },
    ]
  },
  { 
    label: 'Profile', 
    path: '/profile', 
    roles: ['SUPER_ADMIN', 'MINISTRY', 'SCHOOL', 'TEACHER'],
    icon: '👤'
  },
  { 
    label: 'Audit Logs', 
    path: '/audit-logs', 
    roles: ['SUPER_ADMIN', 'MINISTRY', 'SCHOOL', 'SCHOOL_ADMIN'],
    icon: '📋'
  },
];

export default function InstitutionLayout({ children }: InstitutionLayoutProps) {
  const { account, logout, setAuth, impersonationChain } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [stopping, setStopping] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '#') return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => isActive(child.path));
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const visibleNav = navConfig.filter((item) => item.roles.includes(account?.role || 'SCHOOL'));

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach(key => {
        const ref = dropdownRefs.current[key];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStopImpersonation = async () => {
    try {
      setStopping(true);
      const { data } = await impersonationAPI.stop();
      if (!data.token) {
        toast.error('Failed to return to previous account: No authentication token received');
        return;
      }
      
      if (!data.account) {
        toast.error('Failed to return to previous account: No account data received');
        return;
      }
      
      setAuth(data.token, data.account);
      toast.success('Returned to previous account');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to stop impersonation');
    } finally {
      setStopping(false);
    }
  };

  const renderNavItem = (item: NavItem, isMobile = false) => {
    if (item.children && item.children.length > 0) {
      const isOpen = openDropdowns.has(item.label);
      const hasActive = hasActiveChild(item);
      const visibleChildren = item.children.filter(child => child.roles.includes(account?.role || 'SCHOOL'));
      
      if (visibleChildren.length === 0) return null;

      if (isMobile) {
        return (
          <div key={item.label} className="border-b border-gray-200">
            <button
              onClick={() => toggleDropdown(item.label)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                hasActive ? 'text-primary bg-primary-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <div className="bg-gray-50">
                {visibleChildren.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => {
                      setOpenDropdowns(new Set());
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center px-8 py-2 text-sm transition-colors ${
                      isActive(child.path)
                        ? 'text-primary bg-primary-100 font-semibold'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{child.icon}</span>
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={item.label} className="relative" ref={el => dropdownRefs.current[item.label] = el}>
          <button
            onClick={() => toggleDropdown(item.label)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-all rounded-lg ${
              hasActive
                ? 'text-primary bg-primary-50'
                : 'text-gray-700 hover:text-primary hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
            <svg
              className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              {visibleChildren.map((child) => (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={() => setOpenDropdowns(new Set())}
                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                    isActive(child.path)
                      ? 'text-primary bg-primary-50 font-semibold'
                      : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{child.icon}</span>
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => isMobile && setMobileMenuOpen(false)}
        className={`${isMobile ? 'block' : 'inline-flex'} items-center ${isMobile ? 'px-4 py-3' : 'px-4 py-2'} text-sm font-medium transition-all ${isMobile ? 'border-b border-gray-200' : 'rounded-lg'} ${
          isActive(item.path)
            ? 'text-primary bg-primary-50'
            : 'text-gray-700 hover:text-primary hover:bg-gray-50'
        }`}
      >
        {item.icon && <span className={isMobile ? 'mr-3' : 'mr-2'}>{item.icon}</span>}
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center flex-1">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  to="/dashboard"
                  className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent"
                >
                  CBT Platform
                </Link>
              </div>
              <div className="hidden lg:flex lg:ml-8 lg:space-x-1">
                {visibleNav.map((item) => renderNavItem(item, false))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{account?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{account?.role?.toLowerCase().replace('_', ' ')}</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-700 hover:text-gray-900 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="hidden sm:block text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {visibleNav.map((item) => renderNavItem(item, true))}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-t border-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        )}
        {impersonationChain.length > 0 && (
          <div className="bg-amber-50 border-t border-amber-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
              <p className="text-sm text-amber-900">
                You are impersonating this account. Actions will be audited.
              </p>
              <button
                onClick={handleStopImpersonation}
                disabled={stopping}
                className="text-sm font-medium text-amber-900 bg-amber-200 hover:bg-amber-300 rounded px-3 py-1 transition-colors disabled:opacity-60"
              >
                {stopping ? 'Restoring...' : 'Return to previous account'}
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">{children}</main>
      
      {/* Password Reset Modal - shows when teacher/student must reset password */}
      {account?.mustResetPassword && (account.role === 'TEACHER' || account.role === 'STUDENT') && (
        <PasswordResetModal
          isOpen={true}
          userEmail={account.email}
          onClose={() => {
            // Modal cannot be closed until password is reset
            // This is handled by updating account in the modal after successful reset
          }}
        />
      )}
    </div>
  );
}

