import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { themeAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { applyTheme } from '../utils/themeUtils';

interface ThemeData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl: string;
  bannerUrl: string;
}

const defaultTheme: ThemeData = {
  primaryColor: '#A8518A',
  secondaryColor: '#1d4ed8',
  accentColor: '#facc15',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  logoUrl: '',
  bannerUrl: '',
};

interface ThemeContextType {
  theme: ThemeData;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  loading: true,
  refreshTheme: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { account } = useAuthStore();
  const [theme, setTheme] = useState<ThemeData>(defaultTheme);
  const [loading, setLoading] = useState(true);

  const loadTheme = async () => {
    try {
      // Apply default theme immediately to prevent flash
      applyTheme(defaultTheme);
      
      if (account && (account.role === 'SCHOOL' || account.role === 'TEACHER' || account.role === 'SCHOOL_ADMIN')) {
        const { data } = await themeAPI.get();
        if (data) {
          const loadedTheme = { ...defaultTheme, ...data };
          setTheme(loadedTheme);
          applyTheme(loadedTheme);
        } else {
          setTheme(defaultTheme);
        }
      } else {
        setTheme(defaultTheme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();
  }, [account?.id, account?.role]);

  const refreshTheme = async () => {
    await loadTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}


