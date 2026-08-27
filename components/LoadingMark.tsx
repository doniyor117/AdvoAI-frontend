'use client';

import { useEffect, useRef, useState } from 'react';

interface LoadingMarkProps {
  size?: number;
  className?: string;
  /** Skip the build-up animation and render the settled mark immediately —
   *  for a loading gate that has already played the reveal once this page
   *  load (see ChatArea's boot gate) or any other spot where the reveal
   *  would just be repetitive rather than a first impression. */
  static?: boolean;
  /** Keep replaying the clip for as long as it's mounted, instead of
   *  holding on the settled mark after one play — for a dedicated loading
   *  screen that might outlast a single ~4s cycle. `onEnded` still fires
   *  exactly once, on the first cycle, so "wait for one full loop" gating
   *  logic doesn't need to know this is looping underneath. Off by default;
   *  turn it on for any indicator tied to an indeterminate, possibly-long
   *  wait (e.g. `GeneratingIndicator` in MessageBubble.tsx) — there, settling
   *  after one ~4s cycle while generation is still ongoing reads as stuck,
   *  not resolved. Leave off for a one-shot reveal that's actually done. */
  loop?: boolean;
  /** Fires once the mark has visibly finished its first cycle — on video
   *  `ended` (before any loop-triggered restart), or immediately for the
   *  static/fallback paths (nothing to wait for). Use this to gate a
   *  content swap on "let the animation complete," not a guessed timeout. */
  onEnded?: () => void;
}

/** The brand mark's build-up animation (scale resolves, then the star rays
 *  build up around it) as a genuinely transparent clip — no backplate, so it
 *  sits directly on whatever background it's placed over. By default plays
 *  once and holds on the settled mark rather than looping (a hard loop back
 *  to frame one would pop the star back out of existence — fine for a
 *  dedicated loading screen that expects continuous motion, distracting for
 *  a small inline indicator). Falls back to the static round badge for
 *  prefers-reduced-motion or if alpha-channel WebM playback fails to start
 *  (Safari has inconsistent VP9-alpha support). */
export function LoadingMark({ size = 28, className = '', static: forceStatic = false, loop = false, onEnded }: LoadingMarkProps) {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [videoErrored, setVideoErrored] = useState(false);
  const firedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isStatic = forceStatic || reducedMotion || videoErrored;

  useEffect(() => {
    if (isStatic && !firedRef.current) {
      firedRef.current = true;
      onEnded?.();
    }
  }, [isStatic, onEnded]);

  if (isStatic) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/advoai-logo.png"
        alt=""
        className={`rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src="/advoai-mark.webm"
      autoPlay
      muted
      playsInline
      onEnded={() => {
        if (!firedRef.current) {
          firedRef.current = true;
          onEnded?.();
        }
        if (loop) {
          const v = videoRef.current;
          if (v) {
            v.currentTime = 0;
            v.play().catch(() => {});
          }
        }
      }}
      onError={() => setVideoErrored(true)}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
