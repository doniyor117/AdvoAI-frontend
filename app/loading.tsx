import { LoadingMark } from '@/components/LoadingMark';

/** Next.js route-level loading UI — shown automatically during route
 *  transitions/data suspense instead of a blank flash or a generic spinner.
 *  This is the closest thing a web app has to a "PWA splash screen": a true
 *  native splash (Android/iOS home-screen launch) can only be a static image
 *  per the manifest spec, so this covers the in-app equivalent — first
 *  paint and client-side navigation waits. */
export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
      <LoadingMark size={64} />
    </div>
  );
}
