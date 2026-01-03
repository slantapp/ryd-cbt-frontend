import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { themeAPI } from '../../services/api';
import NotificationBell from '../NotificationBell';
import PasswordResetModal from '../PasswordResetModal';
import { applyTheme } from '../../utils/themeUtils';
import toast from 'react-hot-toast';

interface InstitutionLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  roles: string[];
  icon?: string | React.ReactNode;
  children?: NavItem[];
}

const navConfig: NavItem[] = [
  { 
    label: 'Dashboard', 
    path: '/dashboard', 
    roles: ['SUPER_ADMIN', 'MINISTRY', 'SCHOOL', 'TEACHER'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    label: 'Administration', 
    path: '#', 
    roles: ['SUPER_ADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { label: 'Ministries', path: '/ministries', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) },
      { label: 'Super Admins', path: '/admin/super-admins', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ) },
    ]
  },
  { 
    label: 'School Management', 
    path: '#', 
    roles: ['SUPER_ADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    children: [
      { label: 'Tests', path: '/tests', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ) },
      { label: 'Sessions', path: '/sessions', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) },
      { label: 'Classes', path: '/classes', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ) },
      { label: 'Teachers', path: '/teachers', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ) },
      { label: 'Students', path: '/students', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) },
      { label: 'Scores', path: '/scores', roles: ['SUPER_ADMIN'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ) },
    ]
  },
  { 
    label: 'Management', 
    path: '#', 
    roles: ['MINISTRY'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    children: [
      { label: 'Schools', path: '/schools', roles: ['MINISTRY'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) },
    ]
  },
  { 
    label: 'Academic', 
    path: '#', 
    roles: ['SCHOOL'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    children: [
      { label: 'Sessions', path: '/sessions', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) },
      { label: 'Tests', path: '/tests', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ) },
      { label: 'Scores', path: '/scores', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ) },
    ]
  },
  { 
    label: 'People', 
    path: '#', 
    roles: ['SCHOOL'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    children: [
      { label: 'Teachers', path: '/teachers', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ) },
      { label: 'Students', path: '/students', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) },
      { label: 'Admin', path: '/school-admin', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ) },
    ]
  },
  { 
    label: 'Setup', 
    path: '#', 
    roles: ['SCHOOL'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { label: 'Classes', path: '/classes', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ) },
      { label: 'Test Groups', path: '/test-groups', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ) },
      { label: 'Subjects', path: '/subjects', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ) },
      { label: 'Grading Schemes', path: '/grading-schemes', roles: ['SCHOOL', 'TEACHER'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ) },
      { label: 'Custom Fields', path: '/custom-fields', roles: ['SCHOOL'], icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ) },
    ]
  },
  { 
    label: 'Tests', 
    path: '/tests', 
    roles: ['TEACHER'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  { 
    label: 'Classes', 
    path: '/classes', 
    roles: ['TEACHER'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    )
  },
  { 
    label: 'Students', 
    path: '/students', 
    roles: ['TEACHER'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  { 
    label: 'Scores', 
    path: '/scores', 
    roles: ['TEACHER'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    label: 'Grading Schemes', 
    path: '/grading-schemes', 
    roles: ['TEACHER'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  },
];

export default function InstitutionLayout({ children }: InstitutionLayoutProps) {
  const { account, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Load and apply theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // SUPER_ADMIN without school context will get default theme from backend
        const { data } = await themeAPI.get();
        if (data) {
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
      
      // Close user menu when clicking outside
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
                    {typeof child.icon === 'string' ? (
                      <span className="mr-3">{child.icon}</span>
                    ) : (
                      <span className="mr-3 w-5 h-5 flex items-center justify-center">{child.icon}</span>
                    )}
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
            {typeof item.icon === 'string' ? (
              <span className="mr-2">{item.icon}</span>
            ) : (
              <span className="mr-2 w-5 h-5 flex items-center justify-center">{item.icon}</span>
            )}
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
        {item.icon && (
          typeof item.icon === 'string' ? (
            <span className={isMobile ? 'mr-3' : 'mr-2'}>{item.icon}</span>
          ) : (
            <span className={`${isMobile ? 'mr-3' : 'mr-2'} w-5 h-5 flex items-center justify-center`}>{item.icon}</span>
          )
        )}
        {item.label}
      </Link>
    );
  };

  const renderSidebarItem = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      const isOpen = openDropdowns.has(item.label);
      const hasActive = hasActiveChild(item);
      const visibleChildren = item.children.filter(child => child.roles.includes(account?.role || 'SCHOOL'));
      
      if (visibleChildren.length === 0) return null;

  return (
        <div key={item.label} className="mb-1">
          <button
            onClick={() => toggleDropdown(item.label)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              hasActive
                ? 'text-primary bg-primary-50'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              {typeof item.icon === 'string' ? (
                <span className="mr-3">{item.icon}</span>
              ) : (
                <span className="mr-3 w-5 h-5 flex items-center justify-center">{item.icon}</span>
              )}
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
            <div className="ml-4 mt-1 space-y-1">
              {visibleChildren.map((child) => (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={() => setOpenDropdowns(new Set())}
                  className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                    isActive(child.path)
                      ? 'text-primary bg-primary-50 font-semibold'
                      : 'text-gray-600 hover:text-primary hover:bg-gray-50'
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
        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
          isActive(item.path)
            ? 'text-primary bg-primary-50'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {item.icon && <span className="mr-3">{item.icon}</span>}
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Fixed and unscrollable */}
      <aside className="hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30">
        <div className="flex flex-col w-64 h-full bg-white border-r border-gray-200">
          {/* Logo - Fixed at top */}
          <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link
              to="/dashboard"
              className="text-xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent"
            >
              CBT Platform
            </Link>
          </div>

          {/* Navigation - Scrollable if content overflows */}
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            {visibleNav.map((item) => renderSidebarItem(item))}
          </nav>

          {/* User Menu - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary text-xs font-semibold">
                      {account?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{account?.name}</p>
                    <p className="text-xs text-gray-500 capitalize truncate">{account?.role?.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  </div>
                  <svg
                  className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center px-4 py-2 text-sm transition-colors ${
                        isActive('/profile')
                          ? 'text-primary bg-primary-50 font-semibold'
                          : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Account Settings
                    </Link>
                    {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
                      <>
                        <Link
                          to="/theme"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center px-4 py-2 text-sm transition-colors ${
                            isActive('/theme')
                              ? 'text-primary bg-primary-50 font-semibold'
                              : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                          Theme
                        </Link>
                        <Link
                          to="/audit-logs"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center px-4 py-2 text-sm transition-colors ${
                            isActive('/audit-logs')
                              ? 'text-primary bg-primary-50 font-semibold'
                              : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Audit Logs
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900 p-2"
                aria-label="Toggle menu"
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
            <div className="flex items-center space-x-4 ml-auto">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            ></div>
            <div className="relative flex flex-col w-64 max-w-[85vw] bg-white shadow-xl">
              {/* Mobile Header - Fixed */}
              <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <Link
                  to="/dashboard"
                  className="text-xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  CBT Platform
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-gray-900 p-2"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Mobile Navigation - Scrollable */}
              <nav className="flex-1 overflow-y-auto px-4 py-4">
                {visibleNav.map((item) => renderSidebarItem(item))}
              </nav>
              {/* Mobile Footer - Fixed */}
              <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/profile')
                    ? 'text-primary bg-primary-50 font-semibold'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Account Settings
              </Link>
              {(account?.role === 'SCHOOL' || account?.role === 'SCHOOL_ADMIN') && (
                <>
                  <Link
                    to="/theme"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive('/theme')
                        ? 'text-primary bg-primary-50 font-semibold'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Theme
                  </Link>
                  <Link
                    to="/audit-logs"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive('/audit-logs')
                        ? 'text-primary bg-primary-50 font-semibold'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Audit Logs
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                  className="w-full text-left flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg mt-2"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
              </div>
            </div>
          </div>
        )}


        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
      
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

