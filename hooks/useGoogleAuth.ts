'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

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
    const [isLoaded, setIsLoaded] = useState(false);
    const scriptLoaded = useRef(false);
    const initialized = useRef(false);

    // Load the GIS script
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        if (scriptLoaded.current) return;

        // Check if already loaded
        if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
            scriptLoaded.current = true;
            setIsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            scriptLoaded.current = true;
            setIsLoaded(true);
        };
        document.head.appendChild(script);
    }, []);

    // Keep track of the latest onCredential callback without triggering effect re-runs
    const credentialCallbackRef = useRef(onCredential);
    useEffect(() => {
        credentialCallbackRef.current = onCredential;
    }, [onCredential]);

    // Initialize GIS when script is ready
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;
        if (initialized.current) return;

        function tryInit() {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: (response: { credential: string }) => {
                        credentialCallbackRef.current(response.credential);
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
    }, []); // Empty dependency array thanks to ref

    const renderGoogleButton = useCallback((element: HTMLElement) => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('Google Client ID not configured');
            return;
        }
        if (window.google?.accounts?.id) {
            window.google.accounts.id.renderButton(element, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                // Removed invalid width: '100%' - let it auto-size correctly
            });
        }
    }, []);

    return {
        renderGoogleButton,
        isLoaded,
        isAvailable: !!GOOGLE_CLIENT_ID,
    };
}
