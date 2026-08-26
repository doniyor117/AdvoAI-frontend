'use client';

import { useEffect, useRef, useState } from 'react';

interface LoadingMarkProps {
  size?: number;
  className?: string;
  /** Skip the build-up animation and render the settled mark immediately —
   *  for a loading gate that has already played the reveal once this
   *  session (see ChatArea's boot gate) or any other spot where the reveal
   *  would just be repetitive rather than a first impression. */
  static?: boolean;
  /** Fires once the mark has visibly finished — on video `ended`, or
   *  immediately for the static/fallback paths (nothing to wait for). Use
   *  this to gate a content swap on "let the animation complete," not a
   *  guessed timeout. */
  onEnded?: () => void;
}

/** The brand mark's build-up animation (scale resolves, then the star rays
 *  build up around it) as a genuinely transparent clip — no backplate, so it
 *  sits directly on whatever background it's placed over. Plays once and
 *  holds on the settled mark rather than looping (a hard loop back to frame
 *  one would pop the star back out of existence). Falls back to the static
 *  round badge for prefers-reduced-motion or if alpha-channel WebM playback
 *  fails to start (Safari has inconsistent VP9-alpha support). */
export function LoadingMark({ size = 28, className = '', static: forceStatic = false, onEnded }: LoadingMarkProps) {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [videoErrored, setVideoErrored] = useState(false);
  const firedRef = useRef(false);

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
      src="/advoai-mark.webm"
      autoPlay
      muted
      playsInline
      onEnded={() => {
        if (!firedRef.current) {
          firedRef.current = true;
          onEnded?.();
        }
      }}
      onError={() => setVideoErrored(true)}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
