'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Keeps the browser tab title in the active UI language — "AdvoAI - Legal AI"
 * in English, "AdvoAI - Huquqiy SI" in Uzbek, "AdvoAI - Юридический ИИ" in
 * Russian. Language here is a client-only preference (localStorage, not a
 * URL locale), so this can't be done via layout.tsx's static `metadata.title`
 * — that's still what the very first server-rendered paint shows, and this
 * takes over the instant the saved language loads from localStorage.
 * Renders nothing; it exists purely for this side effect.
 */
export function DocumentTitleSync() {
  const { t, lang } = useLanguage();

  useEffect(() => {
    // `t` is a plain closure, not memoized — it gets a new identity on every
    // LanguageProvider render, so depending on it here would re-run (harmlessly,
    // but pointlessly) far more often than the title could ever actually change.
    // `lang` is the real signal.
    document.title = `${t('chatbot_name')} - ${t('app_tagline')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return null;
}
