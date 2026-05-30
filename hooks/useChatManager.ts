import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from './useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch, safeJson } from '@/lib/authFetch';

export type Citation = {
  id: string;
  title: string;
  text: string;
  source_url?: string;
};

export type FileAttachment = {
  uri?: string; // Optional during upload
  mime_type: string;
  name?: string; // Optional during upload
  display_name: string;
  local_url?: string;
  is_uploading?: boolean;
  error?: string;
  file?: File; // Store original file temporarily
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  attachments?: FileAttachment[];
  isError?: boolean;
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
  const stored = localStorage.getItem('advoai_fingerprint');
  // Strip dashes so it passes backend hex-only regex ^[a-f0-9]{16,64}$
  if (stored) return stored.replace(/-/g, '');

  const fp = generateId().replace(/-/g, '');
  localStorage.setItem('advoai_fingerprint', fp);
  return fp;
}

// Module-level cache to persist sidebar state across route navigations
// without causing a hydration mismatch on the initial page load.
let cachedSidebarState: boolean | null = null;

export function useChatManager(chatId?: string) {
  const draftKey = `advoai_draft_${chatId || 'new'}`;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [quotedText, setQuotedText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [activeAttachment, setActiveAttachment] = useState<FileAttachment | null>(null);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'chat' | 'agreement_summary' | 'compare_contracts' | 'create_contract'>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (cachedSidebarState !== null) return cachedSidebarState;
    return false; // Initial hydration must match server (false)
  });
  const isFirstRender = useRef(true);
  const pendingProcessed = useRef(false);

  useEffect(() => {
    if (cachedSidebarState === null && typeof window !== 'undefined') {
      setIsSidebarOpen(false);
      cachedSidebarState = false;
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      cachedSidebarState = isSidebarOpen;
    }
  }, [isSidebarOpen]);

  const router = useRouter();
  const { addSession, sessions } = useSessions();
  const { isAuthenticated } = useAuth();
  const isNavigatingRef = useRef(false);

  const storageKey = chatId ? `advoai_chat_messages_${chatId}` : null;
  const currentSession = sessions.find(s => s.id === chatId);
  const chatTitle = currentSession?.title || '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
    }
  }, [isSidebarOpen]);

  // Load messages from localStorage on mount or when chatId changes
  useEffect(() => {
    async function loadMessages() {
      if (!chatId) {
        setMessages([]);
        setSessionId(null);
        setIsHydrated(true);
        setIsLoading(false);
        isNavigatingRef.current = false;
        return;
      }

      // 1. Try local storage first (it has citations/attachments)
      const saved = localStorage.getItem(storageKey!);
      let parsed = null;
      if (saved) {
        try {
          parsed = JSON.parse(saved);
          // Validate cache structure to ensure we don't load old broken messages
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].text !== 'string') {
            parsed = null;
          }
        } catch (e) {
          console.error('Failed to parse saved messages', e);
        }
      }

      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      } else {
        setMessages([]);
        // 2. If empty and authenticated, fallback to fetching history from backend
        if (isAuthenticated) {
          try {
            const res = await authFetch(`/api/sessions/${chatId}/messages`);
            if (res.ok) {
              const data = await safeJson(res);
              if (data.messages && data.messages.length > 0) {
                const history = data.messages.map((m: any) => ({
                  id: m.id || generateId(),
                  role: m.role,
                  text: m.content || m.text || '',
                  citations: m.citations,
                  attachments: m.attachments,
                }));
                setMessages(history);
                // Save to local storage for future use
                localStorage.setItem(storageKey!, JSON.stringify(history));
              }
            }
          } catch (e) {
            console.error('Failed to fetch chat history from backend', e);
          }
        }
      }

      // For auth users, the chatId IS the backend session ID (UUID)
      if (isAuthenticated) {
        setSessionId(chatId);
      } else {
        // Guest: restore from localStorage mapping
        const savedSessionId = localStorage.getItem(`advoai_session_${chatId}`);
        if (savedSessionId) setSessionId(savedSessionId);
      }
      
      setIsHydrated(true);
      setIsLoading(false);
      isNavigatingRef.current = false;
    }
    
    loadMessages();
  }, [chatId, storageKey, isAuthenticated]);

  // Save to localStorage when messages change (client-side cache)
  useEffect(() => {
    if (isHydrated && storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, isHydrated, storageKey]);

  // ── Draft Preservation ────────────────────────────────────
  // Load draft on mount or chatId change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setInputValue(savedDraft);
      } else {
        setInputValue(''); // Clear if no draft
      }
    }
  }, [draftKey]);

  // Save draft whenever inputValue changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (inputValue.trim()) {
        localStorage.setItem(draftKey, inputValue);
      } else {
        localStorage.removeItem(draftKey); // Cleanup if empty
      }
    }
  }, [inputValue, draftKey]);

  // ── Send message to backend ───────────────────────────────
  const sendToBackend = useCallback(async (
    question: string,
    currentSessionId: string | null,
    filesToAttach: FileAttachment[] = [],
  ): Promise<{
    answer: string;
    citations: Citation[];
    sources?: Citation[];
    session_id: string | null;
    error?: string;
  }> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Fingerprint': getFingerprint(),
    };

    const body: Record<string, unknown> = {
      question,
      top_k: 5,
    };

    if (filesToAttach.length > 0) {
      body.attachments = filesToAttach.map(f => ({
        uri: f.uri,
        mime_type: f.mime_type,
        name: f.name,
        display_name: f.display_name,
      }));
    }

    if (currentSessionId) {
      body.session_id = currentSessionId;
    }

    const res = await authFetch('/api/chat/', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await safeJson(res).catch(() => ({}));
      throw new Error(errData.detail || `Request failed (${res.status})`);
    }

    const data = await safeJson(res);

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
      sources: citations,
      session_id: data.session_id || null,
    };
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isNavigatingRef.current || isLoading) return;
    
    // Check if we are still uploading
    if (attachments.some(a => a.is_uploading)) {
      return;
    }

    const currentAttachments = [...attachments];

    // ── Prepend Quote if exists ──────────────────────────────
    let finalPrompt = trimmed;
    if (quotedText) {
      // Split the quote by newlines and prepend > to each line to form a proper markdown blockquote
      const quoteBlock = quotedText.split('\n').map(line => `> ${line}`).join('\n');
      finalPrompt = `${quoteBlock}\n\n${trimmed}`;
      setQuotedText(''); // Clear after using
    }

    const newUserMsg: Message = {
      id: generateId(),
      role: 'user',
      text: finalPrompt,
      attachments: currentAttachments,
    };

    let currentChatId = chatId;

    // ── New chat flow ────────────────────────────────────────
    if (!currentChatId) {
      isNavigatingRef.current = true;

      const tempTitle = trimmed ? (trimmed.substring(0, 30) + (trimmed.length > 30 ? '...' : '')) : 'File Upload';

      // Create session (async for auth users → server UUID, sync for guests → timestamp)
      const guestFallbackId = generateId();

      // Optimistic: prepare for navigation
      setInputValue('');
      setAttachments([]);

      // Store pending question for after redirect
      localStorage.setItem('advoai_pending_question', trimmed);
      if (currentAttachments.length > 0) {
        // Can't reliably pass files through localstorage across redirects because of Object URLs and Blobs.
        // We'll stringify the finalized attachments (which have URIs)
        localStorage.setItem('advoai_pending_attachments', JSON.stringify(currentAttachments));
      }

      (async () => {
        try {
          const created = await addSession({
            id: guestFallbackId,
            title: tempTitle,
            timestamp: Date.now(),
          });
          currentChatId = created.id; // Server UUID for auth, guestFallbackId for guest
        } catch (err) {
          console.error("Failed to create chat session", err);
          setInputValue(trimmed);
          isNavigatingRef.current = false;
          alert("Failed to create chat. Please check your connection or try again.");
          return;
        }

        // Save the user message under the new chat ID
        localStorage.setItem(
          `advoai_chat_messages_${currentChatId}`,
          JSON.stringify([newUserMsg]),
        );
        localStorage.setItem('advoai_pending_chat_id', currentChatId);

        startTransition(() => {
          router.push(`/chat/${currentChatId}`);
        });
      })();

      return;
    }

    // ── Existing chat flow ───────────────────────────────────
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setAttachments([]);
    setIsLoading(true);

    sendToBackend(finalPrompt, sessionId, currentAttachments)
      .then(result => {
        if (result.session_id && currentChatId) {
          setSessionId(result.session_id);
          // Guest: save mapping
          if (!isAuthenticated) {
            localStorage.setItem(`advoai_session_${currentChatId}`, result.session_id);
          }
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          text: result.answer,
          citations: result.sources || [],
        };
        setMessages(prev => [...prev, assistantMsg]);
      })
      .catch(err => {
        const errorMsg: Message = {
          id: generateId(),
          role: 'assistant',
          text: `⚠️ ${err.message || 'An error occurred. Please try again.'}`,
          isError: true,
        };
        setMessages(prev => [...prev, errorMsg]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [chatId, isLoading, sessionId, isAuthenticated, addSession, router, sendToBackend, attachments, quotedText]);

  // Handle pending question after redirect (new chat flow)
  useEffect(() => {
    if (!isHydrated || !chatId || pendingProcessed.current) return;

    const pendingQuestion = localStorage.getItem('advoai_pending_question');
    const pendingChatId = localStorage.getItem('advoai_pending_chat_id');
    const pendingAttachmentsRaw = localStorage.getItem('advoai_pending_attachments');
    
    let pendingAttachments: FileAttachment[] = [];
    if (pendingAttachmentsRaw) {
      try { pendingAttachments = JSON.parse(pendingAttachmentsRaw); } catch(e) {}
    }

    if (pendingQuestion && pendingChatId === chatId) {
      pendingProcessed.current = true;
      localStorage.removeItem('advoai_pending_question');
      localStorage.removeItem('advoai_pending_chat_id');
      localStorage.removeItem('advoai_pending_attachments');

      // For auth users, the chatId is the server session UUID
      const backendSessionId = isAuthenticated ? chatId : null;

      setIsLoading(true);
      sendToBackend(pendingQuestion, backendSessionId, pendingAttachments)
        .then(result => {
          if (result.session_id) {
            setSessionId(result.session_id);
            if (!isAuthenticated) {
              localStorage.setItem(`advoai_session_${chatId}`, result.session_id);
            }
          }

          const assistantMsg: Message = {
            id: generateId(),
            role: 'assistant',
            text: result.answer,
            citations: result.sources || [],
          };
          setMessages(prev => [...prev, assistantMsg]);
        })
        .catch(err => {
          const errorMsg: Message = {
            id: generateId(),
            role: 'assistant',
            text: `⚠️ ${err.message || 'An error occurred. Please try again.'}`,
            isError: true,
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
    setActiveAttachment(null);
    setIsInsightOpen(true);
  }, []);

  const handleAttachmentClick = useCallback((attachment: FileAttachment) => {
    setActiveAttachment(attachment);
    setActiveCitation(null);
    setIsInsightOpen(true);
  }, []);

  const closeInsightPanel = useCallback(() => {
    setIsInsightOpen(false);
    setTimeout(() => {
      setActiveCitation(null);
      setActiveAttachment(null);
    }, 300); // Wait for exit animation
  }, []);

  const handleSetIsSidebarOpen = useCallback((open: boolean) => {
    setIsSidebarOpen(open);
    if (open) {
      setIsInsightOpen(false);
    }
  }, []);

// ── Allowed file types (mirrors backend whitelist) ────────────────────────
// These must stay in sync with SUPPORTED_MIME_TYPES in app/routes/chat.py
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'text/rtf',
  // Images
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.txt', '.md', '.csv', '.html', '.htm',
  '.doc', '.docx', '.rtf',
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
]);

const REJECTION_HINTS: Record<string, string> = {
  'video/': 'Videos are not supported.',
  'audio/': 'Audio files are not supported.',
  'application/vnd.ms-excel': 'Excel files are not supported. Please export as CSV.',
  'application/vnd.openxmlformats-officedocument.spreadsheetml': 'Excel files are not supported. Please export as CSV.',
  'application/zip': 'ZIP archives are not supported. Please upload individual files.',
  '.zip': 'ZIP archives are not supported.',
  '.xlsx': 'Excel files are not supported. Please export as CSV.',
  '.xls': 'Excel files are not supported. Please export as CSV.',
  '.mp4': 'Videos are not supported.',
  '.mov': 'Videos are not supported.',
  '.mp3': 'Audio files are not supported.',
};

function getFileValidationError(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();

  // Check extension-based rejection hints first (most user-friendly)
  if (REJECTION_HINTS[ext]) return REJECTION_HINTS[ext];

  // Check MIME-based rejection hints
  for (const [prefix, hint] of Object.entries(REJECTION_HINTS)) {
    if (mime.startsWith(prefix)) return hint;
  }

  // Check whitelist
  const mimeOk = mime && ALLOWED_MIME_TYPES.has(mime.split(';')[0].trim());
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return `'${file.name}' is not a supported file type. Accepted: PDF, DOCX, DOC, TXT, MD, CSV, RTF, HTML, and images (PNG, JPEG, WebP, GIF).`;
  }

  return null; // File is valid
}

  const uploadFile = useCallback(async (file: File) => {
    const MAX_MB = 10;
    
    // Client-side validation — instant feedback, no server round-trip
    const validationError = getFileValidationError(file);
    if (validationError) {
      const tempId = generateId();
      setAttachments(prev => [...prev, {
        display_name: file.name,
        mime_type: file.type,
        is_uploading: false,
        name: tempId,
        error: validationError,
      }]);
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      const tempId = generateId();
      setAttachments(prev => [...prev, {
        display_name: file.name,
        mime_type: file.type,
        is_uploading: false,
        name: tempId,
        error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${MAX_MB}MB.`,
      }]);
      return;
    }

    const local_url = URL.createObjectURL(file);
    const tempId = generateId();
    
    setAttachments(prev => [...prev, {
      display_name: file.name,
      mime_type: file.type,
      local_url,
      is_uploading: true,
      name: tempId, // temp id
    }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // NOTE: We need the full URL since authFetch handles authorization
      // Wait, authFetch adds the headers. We MUST NOT set Content-Type so the browser sets the boundary automatically.
      const headers = new Headers();
      headers.append('X-Fingerprint', getFingerprint());
      
      const token = localStorage.getItem('advoai_token');
      if (token) {
        headers.append('Authorization', `Bearer ${token}`);
      }

      const res = await authFetch('/api/chat/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errData = await safeJson(res).catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await safeJson(res);
      
      setAttachments(prev => prev.map(a => a.name === tempId ? {
        ...a,
        uri: data.uri,
        mime_type: data.mime_type,
        name: data.name,
        display_name: data.display_name,
        is_uploading: false,
      } : a));
    } catch (err: any) {
      setAttachments(prev => prev.map(a => a.name === tempId ? {
        ...a,
        is_uploading: false,
        error: err.message,
      } : a));
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed && removed.local_url) {
        URL.revokeObjectURL(removed.local_url);
      }
      return copy;
    });
  }, []);

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    attachments,
    uploadFile,
    removeAttachment,
    isInsightOpen,
    activeCitation,
    activeAttachment,
    setActiveAttachment,
    handleAttachmentClick,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen: handleSetIsSidebarOpen,
    handleSendMessage,
    handleCitationClick,
    closeInsightPanel,
    isHydrated,
    activeFeature,
    setActiveFeature,
    chatTitle,
    quotedText,
    setQuotedText,
  };
}
