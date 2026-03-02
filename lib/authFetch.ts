/**
 * authFetch — drop-in replacement for fetch() that attaches the JWT
 * from localStorage as an Authorization: Bearer header.
 *
 * Usage:  import { authFetch } from '@/lib/authFetch';
 *         const res = await authFetch('/api/sessions');
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'yurika_token';

// ── Token helpers ────────────────────────────────────────────

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
}

// ── authFetch ────────────────────────────────────────────────

export async function authFetch(
    path: string,
    options: RequestInit = {},
): Promise<Response> {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    const token = getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include', // keep cookie fallback
    });
}
