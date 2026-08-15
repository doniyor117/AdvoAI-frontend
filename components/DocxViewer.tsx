'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/authFetch';

interface DocxViewerProps {
  url: string;
  displayName: string;
}

const RENDER_TIMEOUT_MS = 20_000;

/**
 * Renders a .docx file in place using docx-preview. `docx-preview` declares `jszip`
 * as a real npm dependency (see its own package.json) and resolves it via normal
 * module resolution when imported as an ES module — no `window.JSZip` global, no
 * vendored script tag, none of the setup a UMD `<script>`-tag approach would need.
 */
export function DocxViewer({ url, displayName }: DocxViewerProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');

  // Legacy .doc is CFBF binary, not an OOXML zip — docx-preview can never parse it.
  const isLegacyDoc = /\.doc$/i.test(displayName) && !/\.docx$/i.test(displayName);

  useEffect(() => {
    if (isLegacyDoc) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([
          import('docx-preview'),
          fetch(url, { signal: controller.signal }),
        ]);
        if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
        const blob = await res.blob();

        if (cancelled || !containerRef.current) return;
        // The container must already be mounted and visible before rendering —
        // docx-preview computes page layout from its actual box size.
        containerRef.current.innerHTML = '';
        await renderAsync(blob, containerRef.current, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
        });
        if (!cancelled) setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('DocxViewer render failed:', err);
        setStatus('error');
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [url, isLegacyDoc]);

  if (isLegacyDoc || status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
          {isLegacyDoc
            ? t('insight.docx_legacy_unsupported')
            : t('insight.docx_render_failed')}
        </p>
        <a
          href={url}
          download={displayName}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.preventDefault(); downloadFile(url, displayName); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {t('insight.download')}
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 p-3 md:p-6">
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">{t('insight.loading_preview')}</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={`docx-preview-container mx-auto max-w-full shadow-lg [&_.docx-wrapper]:!bg-transparent [&_.docx]:!bg-white [&_.docx]:!shadow-none ${status === 'ready' ? '' : 'hidden'}`}
      />
    </div>
  );
}
