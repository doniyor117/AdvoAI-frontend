import { useEffect, type RefObject } from 'react';

export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent) => {
      const refArray = Array.isArray(refs) ? refs : [refs];
      const isOutside = refArray.every(
        (ref) => ref.current && !ref.current.contains(event.target as Node)
      );
      if (isOutside) {
        handler();
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [refs, handler, enabled]);
}
