import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from './useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';

export type Citation = {
  id: string;
  title: string;
  text: string;
  source_url?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'yurika';
  text: string;
  citations?: Citation[];
};

// ── Fingerprint (simple hash for guest tracking) ────────────
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getFingerprint(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('yurika_fingerprint');
  if (stored) return stored;

  const fp = generateId();
  localStorage.setItem('yurika_fingerprint', fp);
  return fp;
}

export function useChatManager(chatId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'chat' | 'agreement_summary'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yurika_sidebar_open');
      if (saved !== null) {
        setIsSidebarOpen(saved === 'true');
      } else {
        setIsSidebarOpen(window.innerWidth >= 768);
      }
    }
  }, []);

  const router = useRouter();
  const { addSession, sessions } = useSessions();
  const { isAuthenticated } = useAuth();
  const isNavigatingRef = useRef(false);

  const storageKey = chatId ? `yurika_chat_messages_${chatId}` : null;
  const currentSession = sessions.find(s => s.id === chatId);
  const chatTitle = currentSession?.title || '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      localStorage.setItem('yurika_sidebar_open', String(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  // Load messages from localStorage on mount or when chatId changes
  useEffect(() => {
    if (chatId) {
      const saved = localStorage.getItem(storageKey!);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved messages', e);
        }
      } else {
        setMessages([]);
      }
      // For auth users, the chatId IS the backend session ID (UUID)
      if (isAuthenticated) {
        setSessionId(chatId);
      } else {
        // Guest: restore from localStorage mapping
        const savedSessionId = localStorage.getItem(`yurika_session_${chatId}`);
        if (savedSessionId) setSessionId(savedSessionId);
      }
    } else {
      setMessages([]);
      setSessionId(null);
    }
    setIsHydrated(true);
    setIsLoading(false);
    isNavigatingRef.current = false;
  }, [chatId, storageKey, isAuthenticated]);

  // Save to localStorage when messages change (client-side cache)
  useEffect(() => {
    if (isHydrated && storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, isHydrated, storageKey]);

  // ── Send message to backend ───────────────────────────────
  const sendToBackend = useCallback(async (
    question: string,
    currentSessionId: string | null,
  ): Promise<{
    answer: string;
    citations: Citation[];
    session_id: string | null;
  }> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Fingerprint': getFingerprint(),
    };

    const body: Record<string, unknown> = {
      question,
      top_k: 5,
    };

    if (currentSessionId) {
      body.session_id = currentSessionId;
    }

    const res = await authFetch('/api/chat/', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Request failed (${res.status})`);
    }

    const data = await res.json();

    // Map backend citations (parent documents) to frontend Citation type
    const citations: Citation[] = (data.citations || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      title: (c.title as string) || 'Source',
      text: (c.text as string) || '',
      source_url: (c.source_url as string) || '#',
    }));

    return {
      answer: data.answer,
      citations,
      session_id: data.session_id || null,
    };
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || isNavigatingRef.current || isLoading) return;

    const trimmed = text.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
    };

    let currentChatId = chatId;

    // ── New chat flow ────────────────────────────────────────
    if (!currentChatId) {
      isNavigatingRef.current = true;

      const tempTitle = trimmed.substring(0, 30) + (trimmed.length > 30 ? '...' : '');

      // Create session (async for auth users → server UUID, sync for guests → timestamp)
      const guestFallbackId = Date.now().toString();

      // Optimistic: prepare for navigation
      setInputValue('');
      setMessages([newUserMsg]);

      // Store pending question for after redirect
      localStorage.setItem('yurika_pending_question', trimmed);

      (async () => {
        try {
          const created = await addSession({
            id: guestFallbackId,
            title: tempTitle,
            timestamp: Date.now(),
          });
          currentChatId = created.id; // Server UUID for auth, guestFallbackId for guest
        } catch {
          currentChatId = guestFallbackId;
        }

        // Save the user message under the new chat ID
        localStorage.setItem(
          `yurika_chat_messages_${currentChatId}`,
          JSON.stringify([newUserMsg]),
        );
        localStorage.setItem('yurika_pending_chat_id', currentChatId);

        startTransition(() => {
          router.push(`/chat/${currentChatId}`);
        });
      })();

      return;
    }

    // ── Existing chat flow ───────────────────────────────────
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsLoading(true);

    sendToBackend(trimmed, sessionId)
      .then(result => {
        if (result.session_id && currentChatId) {
          setSessionId(result.session_id);
          // Guest: save mapping
          if (!isAuthenticated) {
            localStorage.setItem(`yurika_session_${currentChatId}`, result.session_id);
          }
        }

        const yurikaMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'yurika',
          text: result.answer,
          citations: result.citations.length > 0 ? result.citations : undefined,
        };
        setMessages(prev => [...prev, yurikaMsg]);
      })
      .catch(err => {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'yurika',
          text: `⚠️ ${err.message || 'An error occurred. Please try again.'}`,
        };
        setMessages(prev => [...prev, errorMsg]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [chatId, isLoading, sessionId, isAuthenticated, addSession, router, sendToBackend]);

  // Handle pending question after redirect (new chat flow)
  useEffect(() => {
    if (!isHydrated || !chatId) return;

    const pendingQuestion = localStorage.getItem('yurika_pending_question');
    const pendingChatId = localStorage.getItem('yurika_pending_chat_id');

    if (pendingQuestion && pendingChatId === chatId) {
      localStorage.removeItem('yurika_pending_question');
      localStorage.removeItem('yurika_pending_chat_id');

      // For auth users, the chatId is the server session UUID
      const backendSessionId = isAuthenticated ? chatId : null;

      setIsLoading(true);
      sendToBackend(pendingQuestion, backendSessionId)
        .then(result => {
          if (result.session_id) {
            setSessionId(result.session_id);
            if (!isAuthenticated) {
              localStorage.setItem(`yurika_session_${chatId}`, result.session_id);
            }
          }

          const yurikaMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'yurika',
            text: result.answer,
            citations: result.citations.length > 0 ? result.citations : undefined,
          };
          setMessages(prev => [...prev, yurikaMsg]);
        })
        .catch(err => {
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'yurika',
            text: `⚠️ ${err.message || 'An error occurred. Please try again.'}`,
          };
          setMessages(prev => [...prev, errorMsg]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isHydrated, chatId, isAuthenticated, sendToBackend]);

  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    setIsInsightOpen(true);
  }, []);

  const closeInsightPanel = () => {
    setIsInsightOpen(false);
  };

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isInsightOpen,
    activeCitation,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    handleSendMessage,
    handleCitationClick,
    closeInsightPanel,
    isHydrated,
    activeFeature,
    setActiveFeature,
    chatTitle,
  };
}
