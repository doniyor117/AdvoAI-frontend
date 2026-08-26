import { LoadingMark } from '@/components/LoadingMark';

/** Next.js route-level loading UI — shown automatically during route
 *  transitions/data suspense instead of a blank flash or a generic spinner.
 *  This is the closest thing a web app has to a "PWA splash screen": a true
 *  native splash (Android/iOS home-screen launch) can only be a static image
 *  per the manifest spec, so this covers the in-app equivalent — first
 *  paint and client-side navigation waits.
 *
 *  Static, not animated: Next unmounts this the moment the route resolves,
 *  which on a fast connection can be well under a second — not enough for
 *  the mark's ~4s build-up to even get going, let alone finish. Racing this
 *  against ChatArea's own boot gate (which *can* hold for one full loop)
 *  read as two logos fighting each other. The one animated reveal per
 *  session lives in ChatArea; this screen is just the quiet placeholder
 *  underneath it. */
export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
      <LoadingMark size={64} static />
    </div>
  );
}
