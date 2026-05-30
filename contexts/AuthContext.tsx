'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authFetch, safeJson } from '@/lib/authFetch';

// ── Types ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'guest' | 'free' | 'admin';
  auth_provider: 'email' | 'google';
  email_verified: boolean;
  has_password?: boolean;
  is_google_linked?: boolean;
  allow_data_collection?: boolean;
  terms_accepted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendRegistrationOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string, otp: string, allowDataCollection: boolean) => Promise<{ success: boolean; error?: string }>;
  submitConsent: (allowDataCollection: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'root_admin';

  // Fetch current user on mount
  useEffect(() => {
    refreshUser();
  }, []);

  async function refreshUser() {
    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await safeJson(res);
        setUser(data.user as User);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await safeJson(res);
      if (res.ok && data.token) {
        localStorage.setItem('advoai_token', data.token);
        setUser(data.user as User);
        return { success: true, requiresConsent: !data.user.terms_accepted };
      }
      return { success: false, error: (data.detail as string) || 'Login failed.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Login] Error:', msg);
      return { success: false, error: msg };
    }
  }

  async function sendRegistrationOtp(email: string) {
    try {
      const res = await authFetch('/api/auth/send-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await safeJson(res);
      if (res.ok) return { success: true };
      return { success: false, error: (data.detail as string) || 'Failed to send verification code.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  async function signup(email: string, password: string, fullName: string, otp: string, allowDataCollection: boolean) {
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, otp, allow_data_collection: allowDataCollection }),
      });

      const data = await safeJson(res);
      if (res.ok && data.token) {
        localStorage.setItem('advoai_token', data.token);
        setUser(data.user as User);
        return { success: true };
      }
      return { success: false, error: (data.detail as string) || 'Registration failed.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Register] Error:', msg);
      return { success: false, error: msg };
    }
  }

  async function submitConsent(allowDataCollection: boolean) {
    try {
      const res = await authFetch('/api/auth/submit-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_data_collection: allowDataCollection }),
      });

      const data = await safeJson(res);
      if (res.ok) {
        setUser(data.user as User);
        return { success: true };
      }
      return { success: false, error: (data.detail as string) || 'Failed to submit consent.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Consent] Error:', msg);
      return { success: false, error: msg };
    }
  }

  async function loginWithGoogle(credential: string) {
    try {
      const res = await authFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await safeJson(res);
      if (res.ok && data.token) {
        localStorage.setItem('advoai_token', data.token);
        setUser(data.user as User);
        return { success: true, requiresConsent: !data.user.terms_accepted };
      }
      return { success: false, error: (data.detail as string) || 'Google sign-in failed.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[GoogleAuth] Error:', msg);
      return { success: false, error: msg };
    }
  }

  async function logout() {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('advoai_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        sendRegistrationOtp,
        signup,
        submitConsent,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
