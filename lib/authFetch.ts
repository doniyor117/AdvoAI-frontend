/**
 * authFetch — drop-in replacement for fetch() that attaches the JWT
 * from localStorage as an Authorization: Bearer header.
 *
 * Usage:  import { authFetch, safeJson } from '@/lib/authFetch';
 *         const res = await authFetch('/api/sessions');
 *         const data = await safeJson(res);
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const TOKEN_KEY = 'advoai_token';

// Token helpers removed. The backend sets an HttpOnly cookie automatically.

// ── Safe JSON parser ─────────────────────────────────────────

/**
 * Safely parse a response as JSON.
 * If the server returned HTML (e.g. HF standby page, 502, or 404),
 * this throws a clear error instead of crashing on invalid JSON.
 */
export async function safeJson(res: Response): Promise<any> {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
        const html = await res.text();
        console.error(
            `[authFetch] Received HTML instead of JSON from ${res.url} (status ${res.status}):\n`,
            html.slice(0, 500),
        );
        throw new Error(
            `Backend returned HTML (status ${res.status}). The server may be starting up — please try again in 30 seconds.`,
        );
    }

    if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.error(
            `[authFetch] Unexpected content-type "${contentType}" from ${res.url} (status ${res.status}):\n`,
            text.slice(0, 500),
        );
        throw new Error(
            `Unexpected response from backend (status ${res.status}, type: ${contentType || 'none'}).`,
        );
    }

    return res.json();
}

// ── Forced download ──────────────────────────────────────────

/**
 * Forces a real "Save As" download instead of letting the browser navigate to
 * and render the file inline. The HTML `download` attribute on an `<a>` is
 * silently ignored by browsers when the URL is cross-origin — and R2
 * presigned URLs always are — so a plain `<a href download>` just opens the
 * file (rendering it inline for any content-type the browser knows how to
 * display, e.g. `text/markdown`) instead of saving it. Fetching the bytes and
 * downloading via a same-origin `blob:` URL sidesteps that restriction.
 *
 * Falls back to a plain navigation if the fetch itself fails (e.g. the
 * bucket's CORS policy doesn't allow cross-origin reads), so this can only
 * improve on the previous always-reachable behavior, never regress it.
 */
function saveBlob(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
}

export async function downloadFile(url: string, filename: string): Promise<void> {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download fetch failed (${res.status})`);
        saveBlob(await res.blob(), filename);
    } catch (err) {
        console.warn('[downloadFile] Falling back to direct navigation:', err);
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Same as downloadFile(), but fetches through this backend's own
 * `/api/chat/file/{s3_key}/raw` proxy (via authFetch, so it carries the Bearer
 * token) instead of hitting the R2 presigned URL directly. R2 buckets have no
 * CORS policy by default, which blocks `fetch()`/blob reads from a different
 * origin even though direct navigation to the same URL works fine — proxying
 * through our own, already-correctly-configured-for-CORS API sidesteps that
 * without needing any bucket-level configuration change.
 *
 * Falls back to the presigned-URL variant (downloadFile) if `fallbackUrl` is
 * given and the proxy fetch fails, so a proxy outage degrades gracefully
 * instead of breaking the download entirely.
 */
export async function downloadFileByKey(s3Key: string, filename: string, fallbackUrl?: string): Promise<void> {
    try {
        const res = await authFetch(`/api/chat/file/${encodeURIComponent(s3Key)}/raw`);
        if (!res.ok) throw new Error(`Download fetch failed (${res.status})`);
        saveBlob(await res.blob(), filename);
    } catch (err) {
        console.warn('[downloadFileByKey] Falling back:', err);
        if (fallbackUrl) {
            await downloadFile(fallbackUrl, filename);
        }
    }
}

// ── authFetch ────────────────────────────────────────────────

export async function authFetch(
    path: string,
    options: RequestInit = {},
): Promise<Response> {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;

    // Debug: log the URL on first call so we can verify in prod console
    if (process.env.NODE_ENV === 'development') {
        console.debug(`[authFetch] ${options.method || 'GET'} ${url}`);
    }

    const headers = new Headers(options.headers || {});

    // Bearer token is the PRIMARY auth mechanism (backend checks it before cookies).
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('advoai_token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    // IMPORTANT: do NOT use credentials: 'include'.
    // The backend is cross-origin (Hugging Face), and HF's edge proxy answers
    // CORS preflight (OPTIONS) WITHOUT `Access-Control-Allow-Credentials: true`.
    // A credentialed request therefore fails the preflight and never reaches the
    // app ("Failed to fetch"). By omitting credentials we send a normal CORS
    // request that the proxy's preflight allows, and authenticate purely via the
    // Bearer token above. The HttpOnly cookie is not usable cross-origin anyway.
    return fetch(url, {
        ...options,
        headers,
        credentials: 'omit',
    });
}
