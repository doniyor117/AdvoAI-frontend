'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook that loads Google Identity Services and provides a trigger function.
 * Uses the popup flow (google.accounts.id.prompt or renderButton).
 */

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: Record<string, unknown>) => void;
                    prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
                    renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
                    cancel: () => void;
                };
            };
        };
    }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface UseGoogleAuthOptions {
    onCredential: (credential: string) => void;
}

export function useGoogleAuth({ onCredential }: UseGoogleAuthOptions) {
    const scriptLoaded = useRef(false);
    const initialized = useRef(false);

    // Load the GIS script
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        if (scriptLoaded.current) return;

        // Check if already loaded
        if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
            scriptLoaded.current = true;
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            scriptLoaded.current = true;
        };
        document.head.appendChild(script);
    }, []);

    // Initialize GIS when script is ready
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        if (initialized.current) return;

        function tryInit() {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: { credential: string }) => {
                        onCredential(response.credential);
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
                initialized.current = true;
            }
        }

        // Try immediately, then retry with interval
        tryInit();
        if (!initialized.current) {
            const interval = setInterval(() => {
                tryInit();
                if (initialized.current) clearInterval(interval);
            }, 200);
            return () => clearInterval(interval);
        }
    }, [onCredential]);

    const triggerGoogleLogin = useCallback(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('Google Client ID not configured');
            return;
        }
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt((notification) => {
                // If One Tap is not displayed (e.g. user dismissed it before),
                // we fall back to a rendered button approach — but prompt() is the
                // simplest path and works in most cases.
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    console.log('Google One Tap was not displayed or skipped. User may need to clear cookies or try again.');
                }
            });
        }
    }, []);

    return {
        triggerGoogleLogin,
        isAvailable: !!GOOGLE_CLIENT_ID,
    };
}
