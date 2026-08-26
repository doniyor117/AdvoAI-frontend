'use client';

import { useEffect, useState } from 'react';

/** The brand mark's build-up animation (scale resolves, then the star rays
 *  build up around it) as a genuinely transparent clip — no backplate, so it
 *  sits directly on whatever background it's placed over. Plays once and
 *  holds on the settled mark rather than looping (a hard loop back to frame
 *  one would pop the star back out of existence). Falls back to the static
 *  round badge for prefers-reduced-motion or if alpha-channel WebM playback
 *  fails to start (Safari has inconsistent VP9-alpha support). */
export function LoadingMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  const [fallback, setFallback] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setFallback(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (fallback) {
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
      onError={() => setFallback(true)}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
