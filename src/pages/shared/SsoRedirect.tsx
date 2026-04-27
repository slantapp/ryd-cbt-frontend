import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type InstitutionRole = 'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'SCHOOL_ADMIN' | 'TEACHER';

function isInstitutionRole(v: string | null): v is InstitutionRole {
  return v === 'SUPER_ADMIN' || v === 'MINISTRY' || v === 'SCHOOL' || v === 'SCHOOL_ADMIN' || v === 'TEACHER';
}

export default function SsoRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const payload = useMemo(() => {
    const role = (searchParams.get('role') || '').toUpperCase();
    return {
      role,
      email: searchParams.get('email')?.trim() || '',
      username: searchParams.get('username')?.trim() || '',
      password: searchParams.get('password') || '',
      auto: searchParams.get('auto') === '1',
    };
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    if (!payload.auto) {
      navigate('/login', { replace: true });
      return;
    }

    const run = async () => {
      try {
        // Student flow
        if ((payload.role === 'STUDENT' || !!payload.username) && payload.username && payload.password) {
          const response = await authAPI.studentLogin({
            username: payload.username,
            password: payload.password,
          });
          if (cancelled) return;
          if (!response.data?.token || !response.data?.student) {
            throw new Error('Student SSO login failed');
          }
          const s = response.data.student;
          const studentAccount = {
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            email: s.email || s.username,
            role: 'STUDENT' as const,
            username: s.username,
            firstName: s.firstName,
            lastName: s.lastName,
            institutionId: s.institutionId,
            institution: s.institution,
            createdAt: new Date().toISOString(),
            status: 'ACTIVE' as const,
          };
          setAuth(response.data.token, studentAccount as any);
          navigate('/student/dashboard', { replace: true });
          return;
        }

        // Institution flow
        if (!isInstitutionRole(payload.role)) {
          throw new Error('Invalid SSO role');
        }
        if (!payload.email || !payload.password) {
          throw new Error('Missing SSO credentials');
        }
        const response = await authAPI.login({
          email: payload.email,
          password: payload.password,
          role: payload.role,
        });
        if (cancelled) return;
        if (!response.data?.token || !response.data?.institution) {
          throw new Error('Institution SSO login failed');
        }
        const institutionWithResetFlag = {
          ...response.data.institution,
          mustResetPassword:
            response.data.requiresPasswordReset === true ||
            response.data.institution?.mustResetPassword ||
            false,
        };
        setAuth(response.data.token, institutionWithResetFlag);
        navigate('/dashboard', { replace: true });
      } catch (e: any) {
        if (cancelled) return;
        toast.error(e?.response?.data?.error || e?.message || 'Auto login failed');
        navigate('/login', { replace: true });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [payload, navigate, setAuth]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#88167a]" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Redirecting...</h1>
        <p className="text-sm text-gray-600 mt-2">
          Signing you in securely. Please wait.
        </p>
      </div>
    </div>
  );
}

