'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authFetch, setToken, clearToken } from '@/lib/authFetch';

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

// ── API Base ────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
        const data = await res.json();
        setUser(data.user);
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
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.token) setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Login failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  async function signup(email: string, password: string, fullName: string) {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.token) setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Registration failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  async function loginWithGoogle(credential: string) {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.token) setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.detail || 'Google sign-in failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  async function logout() {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors on logout
    }
    clearToken();
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
