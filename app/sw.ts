import { CacheFirst, Serwist } from 'serwist';
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
 * Only content-hashed Next.js static assets are handled by this service worker
 * at all. Everything else — API calls, page navigations — is deliberately left
 * UNMATCHED so Serwist never intercepts the fetch event for them: they go
 * straight through to the browser's own fetch, exactly as if there were no
 * service worker in the path.
 *
 * An earlier version explicitly wrapped `/api/*` and navigation requests in a
 * `NetworkOnly()` handler to guarantee they were never served from cache. That
 * backfired: when the underlying network fetch failed (a flaky mobile
 * connection was enough), the strategy's rejection surfaced as a raw
 * `net::ERR_FAILED` page instead of Chrome's own, more resilient native
 * offline/retry handling for a normal (unintercepted) navigation. Not
 * matching these requests achieves the identical "never cached" guarantee —
 * there is no cache entry to serve — without taking on that fragility.
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static-assets',
    }),
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
