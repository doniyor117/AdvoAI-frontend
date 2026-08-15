/**
 * migrateGuestChat — moves a guest's local-only conversation onto their account
 * right after they log in or sign up.
 *
 * Guest chats live entirely in localStorage (see `useChatManager.ts` and
 * `useSessions.ts`): the session list is `advoai_guest_sessions`, and each
 * session's messages are cached under `advoai_chat_messages_{sessionId}`.
 * Once authenticated, that data is orphaned — the sidebar only ever reads
 * server sessions for authenticated users — so without this, the guest's
 * conversation would simply vanish.
 *
 * Call `syncGuestChatOnLogin()` from ONE centralized place after auth
 * resolves to `true` (see app/page.tsx). It is safe to call unconditionally:
 * if there is nothing to migrate it returns '/' without making a network call.
 */

import { authFetch, safeJson } from '@/lib/authFetch';
import { GUEST_SESSIONS_KEY, loadGuestSessions, saveGuestSessions, type ChatSession } from '@/hooks/useSessions';
import type { Message, FileAttachment } from '@/hooks/useChatManager';

const MAX_IMPORT_MESSAGES = 200;
const IMPORT_TIMEOUT_MS = 15000;

// `app/page.tsx` guards its call to `syncGuestChatOnLogin()` with a `useRef` so it
// fires at most once per component mount — but the home route REMOUNTS on every
// navigation to '/', which resets that ref. Without a guard that survives across
// mounts, landing on '/' repeatedly after login (e.g. clicking "New Chat") walked
// through the accumulated guest-session backlog one entry at a time, silently
// importing each leftover local session (often old single-message test chats) as
// its own new server session on every visit. This flag makes the decision once per
// browser instead. `AuthContext.logout()` clears it so a different user signing in
// on the same browser still gets one migration attempt.
export const GUEST_CHAT_MIGRATION_ATTEMPTED_KEY = 'advoai_guest_chat_migration_attempted';

type ImportAttachment = {
  document_id: string;
  display_name?: string;
  mime_type?: string;
  s3_key?: string;
};

type ImportMessage = {
  role: 'user' | 'assistant';
  text: string;
  sources?: unknown;
  attachments?: ImportAttachment[];
};

function chatMessagesKey(sessionId: string): string {
  return `advoai_chat_messages_${sessionId}`;
}

function readGuestMessages(sessionId: string): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(chatMessagesKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Same validity check useChatManager applies when loading its cache —
    // guards against a corrupted/old cache shape reaching the import call.
    if (parsed.length > 0 && typeof parsed[0]?.text !== 'string') return [];
    return parsed as Message[];
  } catch {
    return [];
  }
}

function toImportMessages(messages: Message[]): ImportMessage[] {
  const usable = messages
    // Client-side error bubbles (network failures, etc.) are never real
    // conversation turns and the backend's role CHECK constraint wouldn't
    // accept them anyway.
    .filter(m => !m.isError && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .map((m): ImportMessage => ({
      role: m.role,
      text: m.text,
      sources: m.citations,
      attachments: (m.attachments || [])
        .filter((a): a is FileAttachment & { document_id: string } => Boolean(a.document_id))
        .map(a => ({
          document_id: a.document_id,
          display_name: a.display_name,
          mime_type: a.mime_type,
          s3_key: a.s3_key,
        })),
    }));

  // Backend rejects imports over 200 messages (422). Extremely unlikely for a
  // guest chat, but truncate to the most recent turns rather than failing the
  // whole login.
  return usable.length > MAX_IMPORT_MESSAGES ? usable.slice(-MAX_IMPORT_MESSAGES) : usable;
}

/** Removes every localStorage trace of the migrated guest chat. Only ever
 *  called after a confirmed successful import. */
function clearMigratedGuestChat(sessionId: string, remainingGuestSessions: ChatSession[]) {
  localStorage.removeItem(chatMessagesKey(sessionId));
  localStorage.removeItem(`advoai_draft_${sessionId}`);
  localStorage.removeItem(`advoai_session_${sessionId}`);

  // Clear pending-question keys too, but only if they still point at the
  // chat we just migrated — an unrelated pending navigation must survive.
  if (localStorage.getItem('advoai_pending_chat_id') === sessionId) {
    localStorage.removeItem('advoai_pending_question');
    localStorage.removeItem('advoai_pending_chat_id');
    localStorage.removeItem('advoai_pending_attachments');
  }

  saveGuestSessions(remainingGuestSessions);
}

/**
 * Migrates the guest's current conversation onto their newly authenticated
 * account. Returns the URL the caller should navigate to.
 *
 * - `/chat/{id}`  — a guest chat was found and successfully imported.
 * - `/`           — nothing to migrate, or the import failed for any reason
 *                    (network error, non-200, missing session id). Guest
 *                    data is left completely untouched in the failure case
 *                    so the user keeps their conversation and can retry.
 */
export async function syncGuestChatOnLogin(): Promise<string> {
  if (typeof window === 'undefined') return '/';

  if (localStorage.getItem(GUEST_CHAT_MIGRATION_ATTEMPTED_KEY) === '1') return '/';
  localStorage.setItem(GUEST_CHAT_MIGRATION_ATTEMPTED_KEY, '1');

  const guestSessions = loadGuestSessions();
  if (guestSessions.length === 0) return '/';

  // `addSession` (guest branch, useSessions.ts) prepends new sessions, so the
  // first entry is the most recently active guest chat — the "current" one.
  const target = guestSessions[0];
  const guestMessages = readGuestMessages(target.id);
  if (guestMessages.length === 0) return '/';

  const payload = { messages: toImportMessages(guestMessages) };
  if (payload.messages.length === 0) return '/';

  try {
    const res = await authFetch('/api/sessions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
    });

    if (!res.ok) return '/';

    const data = await safeJson(res);
    const newSessionId = data?.session?.id;
    if (!newSessionId || typeof newSessionId !== 'string') return '/';

    // Only now — with a confirmed real session id in hand — is it safe to
    // touch localStorage. A previous attempt at this feature deleted guest
    // data before checking the response body, silently wiping conversations
    // whenever the response shape was unexpected.
    clearMigratedGuestChat(target.id, guestSessions.filter(s => s.id !== target.id));

    return `/chat/${newSessionId}`;
  } catch {
    // Network error, timeout/abort, or a JSON parse failure — leave
    // everything untouched and let the user retry.
    return '/';
  }
}
