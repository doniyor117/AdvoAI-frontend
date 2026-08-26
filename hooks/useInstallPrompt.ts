import { useEffect, useState, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Wraps the browser's native PWA install flow. `canInstall` is false once the app
 *  is already running standalone, or on browsers that never fire
 *  `beforeinstallprompt` (notably iOS Safari — no programmatic install API exists
 *  there, so the button simply doesn't appear rather than trying to fake one). */
export function useInstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = deferredPrompt.current;
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    // A used prompt can't be replayed — clear it either way.
    deferredPrompt.current = null;
    setCanInstall(false);
  }, []);

  return { canInstall, promptInstall };
}
