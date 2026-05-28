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
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
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
  const isAdmin = user?.role === 'admin';

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
      if (res.ok) {
        // Backend handles HttpOnly cookie
        setUser(data.user as User);
        return { success: true };
      }
      return { success: false, error: (data.detail as string) || 'Login failed.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Login] Error:', msg);
      return { success: false, error: msg };
    }
  }

  async function signup(email: string, password: string, fullName: string) {
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await safeJson(res);
      if (res.ok) {
        // Backend handles HttpOnly cookie
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

  async function loginWithGoogle(credential: string) {
    try {
      const res = await authFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await safeJson(res);
      if (res.ok) {
        // Backend handles HttpOnly cookie
        setUser(data.user as User);
        return { success: true };
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
    // Backend handles clearing HttpOnly cookie via /api/auth/logout
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
        signup,
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
