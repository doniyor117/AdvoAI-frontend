import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch, safeJson } from '@/lib/authFetch';

// ── Types ───────────────────────────────────────────────────

export type ChatSession = {
  id: string;
  title: string;
  timestamp: number;       // kept for backwards compat (maps to updated_at)
  isPinned?: boolean;
  rolling_summary?: string;
};

// ── localStorage fallback for guest users ───────────────────

const GUEST_SESSIONS_KEY = 'yurika_guest_sessions';
const SESSIONS_EVENT = 'yurika_sessions_updated';

function loadGuestSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(GUEST_SESSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveGuestSessions(sessions: ChatSession[]) {
  localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event(SESSIONS_EVENT));
}

// ── Hook ────────────────────────────────────────────────────

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const isFetchingRef = useRef(false);

  // ── Convert server session → ChatSession shape ──────────
  const mapServerSession = useCallback((s: Record<string, unknown>): ChatSession => ({
    id: s.id as string,
    title: (s.title as string) || 'New Chat',
    timestamp: s.updated_at ? new Date(s.updated_at as string).getTime() : Date.now(),
    isPinned: (s.is_pinned as boolean) || false,
    rolling_summary: (s.rolling_summary as string) || '',
  }), []);

  // ── Fetch sessions from API (auth users) ────────────────
  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await authFetch('/api/sessions');
      if (res.ok) {
        const data = await safeJson(res);
        const mapped = (data.sessions || []).map(mapServerSession);
        setSessions(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      isFetchingRef.current = false;
      setIsHydrated(true);
    }
  }, [isAuthenticated, mapServerSession]);

  // ── Init: load from API (auth) or localStorage (guest) ──
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    } else {
      setSessions(loadGuestSessions());
      setIsHydrated(true);
    }
  }, [isAuthenticated, fetchSessions]);

  // Guest localStorage sync across tabs
  useEffect(() => {
    if (isAuthenticated) return;
    const handler = (e: StorageEvent) => {
      if (e.key === GUEST_SESSIONS_KEY) setSessions(loadGuestSessions());
    };
    const customHandler = () => setSessions(loadGuestSessions());
    window.addEventListener('storage', handler);
    window.addEventListener(SESSIONS_EVENT, customHandler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(SESSIONS_EVENT, customHandler);
    };
  }, [isAuthenticated]);

  // ── Actions ─────────────────────────────────────────────────

  /** Creates a new session. Returns the new session (with server UUID for auth users). */
  const addSession = useCallback(async (session: ChatSession): Promise<ChatSession> => {
    if (!isAuthenticated) {
      // Guest: localStorage
      const newSessions = [session, ...sessions];
      setSessions(newSessions);
      saveGuestSessions(newSessions);
      return session;
    }

    // Auth: create on server, get UUID back
    try {
      const res = await authFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: session.title }),
      });

      if (res.ok) {
        const data = await safeJson(res);
        const serverSession = mapServerSession(data.session);
        setSessions(prev => [serverSession, ...prev]);
        return serverSession;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }

    // Fallback: use client-side session
    setSessions(prev => [session, ...prev]);
    return session;
  }, [isAuthenticated, sessions, mapServerSession]);

  /** Rename a session. */
  const updateSessionTitle = useCallback(async (id: string, title: string) => {
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));

    if (!isAuthenticated) {
      const updated = sessions.map(s => s.id === id ? { ...s, title } : s);
      saveGuestSessions(updated);
      return;
    }

    try {
      await authFetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error('Failed to rename session:', err);
      // Revert on error
      fetchSessions();
    }
  }, [isAuthenticated, sessions, fetchSessions]);

  /** Toggle pin. */
  const togglePinSession = useCallback(async (id: string) => {
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));

    if (!isAuthenticated) {
      const updated = sessions.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s);
      saveGuestSessions(updated);
      return;
    }

    try {
      await authFetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle_pin: true }),
      });
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      fetchSessions();
    }
  }, [isAuthenticated, sessions, fetchSessions]);

  /** Delete a session. */
  const deleteSession = useCallback(async (id: string) => {
    // Optimistic update
    setSessions(prev => prev.filter(s => s.id !== id));

    if (!isAuthenticated) {
      const updated = sessions.filter(s => s.id !== id);
      saveGuestSessions(updated);
      localStorage.removeItem(`yurika_chat_messages_${id}`);
      return;
    }

    try {
      await authFetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete session:', err);
      fetchSessions();
    }
    // Clean up local message cache
    localStorage.removeItem(`yurika_chat_messages_${id}`);
  }, [isAuthenticated, sessions, fetchSessions]);

  /** Force refresh from API. */
  const refreshSessions = useCallback(() => {
    if (isAuthenticated) {
      fetchSessions();
    } else {
      setSessions(loadGuestSessions());
    }
  }, [isAuthenticated, fetchSessions]);

  return {
    sessions,
    addSession,
    updateSessionTitle,
    togglePinSession,
    deleteSession,
    refreshSessions,
    isHydrated,
  };
}
