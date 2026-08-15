import { CacheFirst, NetworkOnly, Serwist } from 'serwist';
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';

// This declares the value of `injectionPoint` so that TypeScript doesn't
// complain about `self.__SW_MANIFEST` being undefined.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Any request whose path starts with `/api/` must NEVER be served from the
 * service worker cache. Chat/session data lives behind these routes, and a
 * cached response here means stale chat history / sidebar state — a real
 * reported bug. This is checked first and short-circuits caching entirely
 * for that whole path prefix, regardless of what runtime caching rules
 * follow below.
 */
const isApiRequest = (pathname: string) => pathname.startsWith('/api/');

const runtimeCaching: RuntimeCaching[] = [
  // Content-hashed Next.js static assets (JS/CSS chunks) are safe to cache
  // aggressively: the filename changes whenever the content does, so a
  // cache hit is never stale.
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static-assets',
    }),
  },
  // Explicitly force every `/api/*` request to go straight to the network,
  // with no caching layer involved at all. This rule exists so that even if
  // a future edit reorders/adds rules above, API traffic is still pinned to
  // network-only behavior.
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && isApiRequest(url.pathname),
    handler: new NetworkOnly(),
  },
  // HTML navigations (page loads/route transitions): never serve a stale
  // page shell. Network-only means we always fetch fresh, falling back to
  // the browser's own offline handling if there's no connection, rather
  // than resurrecting a cached page.
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && request.mode === 'navigate',
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
});

serwist.addEventListeners();
