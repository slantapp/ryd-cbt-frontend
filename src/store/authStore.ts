import { create } from 'zustand';
import { Institution } from '../types';

interface AuthState {
  token: string | null;
  account: Institution | null;
  impersonationChain: string[];
  isAuthenticated: boolean;
  setAuth: (token: string, account: Institution) => void;
  logout: () => void;
}

const decodeImpersonationChain = (token: string | null): string[] => {
  if (!token) return [];
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    return decoded.impersonationChain || [];
  } catch {
    return [];
  }
};

export const useAuthStore = create<AuthState>((set) => {
  const storedToken = localStorage.getItem('token');
  const storedAccount =
    localStorage.getItem('account') || localStorage.getItem('institution');
  
  // Validate stored token format
  let validToken: string | null = null;
  if (storedToken) {
    // Basic JWT format validation (should have 3 parts separated by dots)
    const parts = storedToken.split('.');
    if (parts.length === 3 && parts.every(part => part.length > 0)) {
      validToken = storedToken;
    } else {
      console.warn('Invalid token format in storage, clearing...');
      localStorage.removeItem('token');
      localStorage.removeItem('account');
      localStorage.removeItem('institution');
    }
  }
  
  const initialChain = decodeImpersonationChain(validToken);
  let parsedAccount = null;
  
  try {
    if (storedAccount) {
      parsedAccount = JSON.parse(storedAccount);
    }
  } catch (error) {
    console.error('Error parsing stored account:', error);
    localStorage.removeItem('account');
    localStorage.removeItem('institution');
  }

  return {
    token: validToken,
    account: parsedAccount,
    impersonationChain: initialChain,
    isAuthenticated: !!validToken,
    setAuth: (token, account) => {
      // Validate token before storing
      if (!token) {
        console.error('Invalid token provided to setAuth: token is null or undefined', { token, account });
        return;
      }
      
      if (typeof token !== 'string') {
        console.error('Invalid token provided to setAuth: token is not a string', { token, tokenType: typeof token, account });
        return;
      }
      
      const trimmedToken = token.trim();
      if (trimmedToken.length === 0) {
        console.error('Invalid token provided to setAuth: token is empty string', { account });
        return;
      }
      
      const parts = trimmedToken.split('.');
      if (parts.length !== 3 || !parts.every(part => part.length > 0)) {
        console.error('Invalid JWT token format: token does not have 3 parts', { 
          partsCount: parts.length,
          partsLengths: parts.map(p => p.length),
          tokenPrefix: trimmedToken.substring(0, 20) + '...',
        });
        return;
      }
      
      localStorage.setItem('token', trimmedToken);
      localStorage.setItem('account', JSON.stringify(account));
      localStorage.removeItem('institution');
      set({
        token: trimmedToken,
        account,
        impersonationChain: decodeImpersonationChain(trimmedToken),
        isAuthenticated: true,
      });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('account');
      localStorage.removeItem('institution');
      set({
        token: null,
        account: null,
        impersonationChain: [],
        isAuthenticated: false,
      });
    },
  };
});

