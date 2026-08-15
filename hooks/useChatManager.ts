import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from './useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch, safeJson } from '@/lib/authFetch';

export type Citation = {
  id: string;
  part_id?: string;
  title: string;
  text: string;
  source_url?: string;
  /** 'corpus' = vetted legal document, resolvable via /api/documents/{id}/full.
   *  'web' = a live web search result; has no corpus document and must open
   *  `source_url` directly rather than being passed to the full-document endpoint. */
  kind?: 'corpus' | 'web';
};

export type FileAttachment = {
  document_id?: string; // Durable server-side id — the only ref that survives across turns
  kind?: 'text' | 'media';
  uri?: string; // Legacy Gemini file URI (no longer produced by the backend)
  mime_type: string;
  name?: string; // Optional during upload
  display_name: string;
  s3_key?: string; // R2 storage key — used to fetch presigned URL when local_url is gone
  local_url?: string; // Ephemeral blob URL, valid only while the page is open
  is_uploading?: boolean;
  error?: string;
  file?: File; // Store original file temporarily
};

/** True once the file is safely on the server and can be referenced in a message. */
export function isAttachmentReady(a: FileAttachment): boolean {
  return !a.error && !a.is_uploading && Boolean(a.document_id || a.uri);
}

/**
 * Strips values that cannot survive serialization: blob URLs die with the page, and a
 * File serializes to `{}`. Persisting them left broken previews after a reload.
 */
function serializeMessages(msgs: Message[]): Message[] {
  return msgs.map(msg => ({
    ...msg,
    attachments: msg.attachments?.map(a => ({
      ...a,
      local_url: undefined,
      file: undefined,
    })),
  }));
}

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
  // Persisted across navigations — without this the toggle silently resets on every
  // route change while the UI still shows it as on.
  const [useWebSearch, setUseWebSearch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('advoai_use_web_search') === 'true';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('advoai_use_web_search', String(useWebSearch));
    }
  }, [useWebSearch]);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'chat' | 'compare_contracts' | 'create_contract'>('chat');
  // Why a send attempt was ignored. Without this the send button silently did nothing
  // during an upload, which reads as "the app is broken".
  const [sendBlockedReason, setSendBlockedReason] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (cachedSidebarState !== null) return cachedSidebarState;
    return false; // Initial hydration must match server (false)
  });
  const isFirstRender = useRef(true);
  const pendingProcessed = useRef(false);
  // Guards against a slow history fetch landing after newer state. `loadMessages` re-runs
  // whenever auth resolves, so an in-flight response could clobber a just-appended reply.
  const loadGeneration = useRef(0);
  const inFlightRef = useRef<AbortController | null>(null);

  // Abort any in-flight chat request when the chat changes or the hook unmounts.
  useEffect(() => () => inFlightRef.current?.abort(), [chatId]);

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
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isNavigatingRef = useRef(false);

  const storageKey = chatId ? `advoai_chat_messages_${chatId}` : null;
  const currentSession = sessions.find(s => s.id === chatId);
  const chatTitle = currentSession?.title || '';

  // Load messages from localStorage on mount or when chatId changes
  useEffect(() => {
    if (isAuthLoading) return;

    loadGeneration.current += 1;
    const generation = loadGeneration.current;

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
        setIsHydrated(true); // Show cached content immediately without waiting for backend
      } else {
        setMessages([]);
      }

      // 2. Always fetch history from backend if authenticated to sync cross-device
      // Skip if we have a pending question for this chat, as the backend won't have the messages yet
      const hasPendingQuestion = typeof window !== 'undefined' &&
        (localStorage.getItem('advoai_pending_chat_id') === chatId || pendingProcessed.current);

      if (isAuthenticated && !hasPendingQuestion) {
        try {
          const res = await authFetch(`/api/sessions/${chatId}/messages`);
          if (res.ok && generation === loadGeneration.current) {
            const data = await safeJson(res);
            if (data.messages && data.messages.length > 0) {
              const history = data.messages.map((m: any) => ({
                id: m.id || generateId(),
                role: m.role,
                text: m.content || m.text || '',
                // The backend persists citations in `sources`, never `citations`, so
                // reading only m.citations lost them on every reload. Compare turns
                // store an OBJECT in sources ({kind:"comparison",...}) — mapping that
                // into citations would crash citations.map(), hence the array guard.
                citations: Array.isArray(m.sources) ? m.sources : m.citations,
                attachments: m.attachments
                  ? m.attachments.map((a: any) => ({
                      document_id: a.document_id,
                      display_name: a.display_name,
                      mime_type: a.mime_type,
                      s3_key: a.s3_key,
                    }))
                  : undefined,
              }));
              if (generation !== loadGeneration.current) return;
              setMessages(history);
              // Save to local storage for future use
              try {
                localStorage.setItem(storageKey!, JSON.stringify(history));
              } catch {
                console.warn('[chat] localStorage quota exceeded; skipping history cache');
              }
            } else if (!pendingProcessed.current && !parsed?.length) {
              // Backend is source of truth — but only clear the cache when we had nothing
              // locally either. Otherwise a first turn that failed before the server
              // persisted it would wipe the user's visible message AND its attachment.
              setMessages([]);
              localStorage.removeItem(storageKey!);
            }
          }
        } catch (e) {
          console.error('Failed to fetch chat history from backend', e);
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
      
      const isPending = typeof window !== 'undefined' &&
        (localStorage.getItem('advoai_pending_chat_id') === chatId || pendingProcessed.current);
      setIsHydrated(true);
      if (!isPending) setIsLoading(false);
      isNavigatingRef.current = false;
    }

    loadMessages();
  }, [chatId, storageKey, isAuthenticated, isAuthLoading]);

  // Save to localStorage when messages change (client-side cache)
  // Strip local_url (ephemeral blob URLs) before saving — they die when the page closes
  useEffect(() => {
    if (isHydrated && storageKey && messages.length > 0) {
      // Citations carry the full text of entire legal codes, so this can exceed the
      // ~5MB localStorage quota on a long chat. An unguarded setItem inside an effect
      // throws mid-render; drop the citation bodies first, then give up gracefully.
      // Error bubbles are client-side fakes; caching them makes a transient failure look
      // like a permanent part of the conversation after a reload.
      const persistable = messages.filter(m => !m.isError);
      if (persistable.length === 0) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(serializeMessages(persistable)));
      } catch {
        try {
          const slim = serializeMessages(persistable).map(m => ({
            ...m,
            citations: m.citations?.map(c => ({ ...c, text: '' })),
          }));
          localStorage.setItem(storageKey, JSON.stringify(slim));
        } catch {
          console.warn('[chat] localStorage quota exceeded; skipping cache write');
        }
      }
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
      use_web_search: useWebSearch,
    };

    if (filesToAttach.length > 0) {
      const ready = filesToAttach.filter(isAttachmentReady);

      // Previously this silently filtered to `f.uri`, so a file that failed to upload
      // still rendered in the user's bubble while never being sent — and the assistant
      // then asked for a document the user could see on screen. Fail loudly instead.
      if (ready.length !== filesToAttach.length) {
        const dropped = filesToAttach.filter(f => !isAttachmentReady(f));
        throw new Error(
          `${dropped.map(f => `'${f.display_name}'`).join(', ')} could not be attached. ` +
          `Please remove and re-attach ${dropped.length > 1 ? 'them' : 'it'}.`
        );
      }

      body.attachments = ready.map(f => ({
        document_id: f.document_id,
        uri: f.uri,
        mime_type: f.mime_type || '',
        name: f.name,
        display_name: f.display_name || '',
        s3_key: f.s3_key || null,
      }));
    }

    if (currentSessionId) {
      body.session_id = currentSessionId;
    }

    // Abort in-flight sends when the user navigates away, so the response cannot
    // land in an unmounted component (and the browser stops holding the connection).
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    const res = await authFetch('/api/chat/', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = await safeJson(res).catch(() => ({}));
      const detailMsg = typeof errData.detail === 'object' ? JSON.stringify(errData.detail) : (errData.detail || `Request failed (${res.status})`);
      throw new Error(detailMsg);
    }

    const data = await safeJson(res);

    // Map backend citations (parent documents) to frontend Citation type
    const citations: Citation[] = (data.citations || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      part_id: c.part_id as string | undefined,
      title: (c.title as string) || 'Source',
      text: (c.text as string) || '',
      source_url: (c.source_url as string) || '#',
      kind: (c.kind as 'corpus' | 'web') || 'corpus',
    }));

    return {
      answer: data.answer,
      citations,
      sources: citations,
      session_id: data.session_id || null,
    };
  }, [useWebSearch]);

  const handleSendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isNavigatingRef.current || isLoading || isAuthLoading) return;

    // Both guards live here so every entry point is covered — the suggested-prompt chips
    // call this directly and used to bypass the checks in ChatArea's onSubmit.
    if (attachments.some(a => a.is_uploading)) {
      setSendBlockedReason('Please wait for the file upload to finish.');
      return;
    }
    if (attachments.some(a => a.error)) {
      setSendBlockedReason('Remove the failed attachment before sending.');
      return;
    }
    setSendBlockedReason(null);

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

      // Store pending question for after redirect (use finalPrompt so quoted text is preserved)
      localStorage.setItem('advoai_pending_question', finalPrompt);
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

        // Save the user message under the new chat ID.
        // Must go through serializeMessages — writing newUserMsg raw persisted dead blob
        // URLs and an empty `"file": {}`, leaving a permanently broken preview.
        localStorage.setItem(
          `advoai_chat_messages_${currentChatId}`,
          JSON.stringify(serializeMessages([newUserMsg])),
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
        // Aborted by navigation, not a real failure — see the note below.
        if (err?.name === 'AbortError') return;
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
  }, [chatId, isLoading, isAuthLoading, sessionId, isAuthenticated, addSession, router, sendToBackend, attachments, quotedText]);

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

    // Stale pending keys from an abandoned navigation would otherwise sit in
    // localStorage and fire against whatever chat is opened next.
    if (pendingQuestion !== null && pendingChatId && pendingChatId !== chatId) {
      const known = sessions.some(s => s.id === pendingChatId);
      if (!known) {
        localStorage.removeItem('advoai_pending_question');
        localStorage.removeItem('advoai_pending_chat_id');
        localStorage.removeItem('advoai_pending_attachments');
      }
    }

    if (pendingQuestion !== null && pendingChatId === chatId) {
      pendingProcessed.current = true;
      const clearPendingKeys = () => {
        localStorage.removeItem('advoai_pending_question');
        localStorage.removeItem('advoai_pending_chat_id');
        localStorage.removeItem('advoai_pending_attachments');
      };

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
          clearPendingKeys();
        })
        .catch(err => {
          // We abort in-flight sends on navigation; that is not something to show
          // the user, and it would otherwise land in the chat they just opened.
          if (err?.name === 'AbortError') return;
          const errorMsg: Message = {
            id: generateId(),
            role: 'assistant',
            text: `⚠️ ${err.message || 'An error occurred. Please try again.'}`,
            isError: true,
          };
          setMessages(prev => [...prev, errorMsg]);
        })
        .finally(() => {
          // Cleared only after the call settles, never before it. The document refs
          // themselves survive in the message cache (serializeMessages keeps
          // document_id), so a failed turn stays retryable without risking the
          // auto-resend-on-reload that keeping these keys would cause.
          clearPendingKeys();
          setIsLoading(false);
        });
    }
  }, [isHydrated, chatId, isAuthenticated, sendToBackend, sessions]);

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
        document_id: data.document_id,
        kind: data.kind,
        uri: data.uri,          // null for text documents — they never touch the Files API
        // Keep the ORIGINAL mime type so the chip still reads "DOCX" rather than the
        // converted markdown type the server used internally.
        mime_type: data.mime_type || a.mime_type,
        name: data.name || tempId,
        display_name: data.display_name,
        s3_key: data.s3_key, // Store R2 key for persistent preview
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
      // Removing the offending file should clear the warning it caused.
      if (!copy.some(a => a.error || a.is_uploading)) setSendBlockedReason(null);
      return copy;
    });
  }, []);

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    useWebSearch,
    setUseWebSearch,
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
    sendBlockedReason,
    activeFeature,
    setActiveFeature,
    chatTitle,
    quotedText,
    setQuotedText,
  };
}
