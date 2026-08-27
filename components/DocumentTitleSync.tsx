'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Keeps the browser tab title in the active UI language — "AdvoAI - Legal AI"
 * in English, "AdvoAI - Huquqiy SI" in Uzbek, "AdvoAI - Юридический ИИ" in
 * Russian. Language here is a client-only preference (localStorage, not a
 * URL locale), so this can't be done via layout.tsx's static `metadata.title`
 * — that's still what the very first server-rendered paint shows.
 *
 * The App Router owns the `<title>` DOM node itself (rendered from
 * layout.tsx's static `metadata` as part of the RSC tree) and silently
 * reapplies that static English title over ours on every client-side
 * navigation — a first version here only re-ran this effect when `lang`
 * changed, so it set the title correctly once on load, then a plain
 * navigation (e.g. opening a chat from the home screen) reverted it back to
 * English with nothing left to fix it again. Rather than chase every
 * internal Next.js moment that could re-touch the tag (route change, a
 * segment re-render, prefetch, …), a MutationObserver on the `<title>`
 * element itself re-asserts ours the instant anything else changes it — this
 * is the well-known workaround for this exact App-Router-vs-client-title
 * conflict. Renders nothing; it exists purely for this side effect.
 */
export function DocumentTitleSync() {
  const { t, lang } = useLanguage();

  useEffect(() => {
    const desired = `${t('chatbot_name')} - ${t('app_tagline')}`;

    const apply = () => {
      if (document.title !== desired) document.title = desired;
    };
    apply();

    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    const observer = new MutationObserver(apply);
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
    // `t` is a plain closure (new identity every LanguageProvider render) —
    // `lang` is what actually determines `desired`, and is the right signal
    // to tear down and re-create the observer's closure over a fresh string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return null;
}
