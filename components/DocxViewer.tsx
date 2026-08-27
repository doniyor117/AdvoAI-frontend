'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { authFetch, downloadFile, downloadFileByKey } from '@/lib/authFetch';

interface DocxViewerProps {
  url: string;
  displayName: string;
  /** When present, the blob is fetched through this backend's own /raw proxy
   *  (authFetch, so it carries the Bearer token) instead of the presigned R2 URL
   *  directly — R2 has no CORS policy by default, which blocks `fetch()` even
   *  though a plain link to the same URL works fine for navigation/download. */
  s3Key?: string;
}

const RENDER_TIMEOUT_MS = 20_000;

/**
 * Renders a .docx file in place using docx-preview. `docx-preview` declares `jszip`
 * as a real npm dependency (see its own package.json) and resolves it via normal
 * module resolution when imported as an ES module — no `window.JSZip` global, no
 * vendored script tag, none of the setup a UMD `<script>`-tag approach would need.
 */
export function DocxViewer({ url, displayName, s3Key }: DocxViewerProps) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  // The page's own natural (unscaled) size in px, measured once right after
  // render — docx-preview lays out each page at the Word document's real page
  // width (e.g. ~816px for Letter), which is what made the panel's own
  // scrollable width fixed regardless of how wide the sidebar was dragged.
  // `scale` maps that fixed width onto whatever's actually available, applied
  // as a CSS transform (so text/tables shrink as a unit like a PDF page,
  // rather than reflowing), recomputed live via ResizeObserver so dragging the
  // sidebar rescales it continuously — matching PdfViewer's own auto-fit.
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);

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
        const fetchBlob = s3Key
          ? authFetch(`/api/chat/file/${encodeURIComponent(s3Key)}/raw`, { signal: controller.signal })
          : fetch(url, { signal: controller.signal });
        const [{ renderAsync }, res] = await Promise.all([
          import('docx-preview'),
          fetchBlob,
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
        if (cancelled) return;
        // Measure the natural (pre-transform) size once, from the real DOM
        // docx-preview just built — transforms never affect layout size, so this
        // has to happen before any scale is applied, not derived from it. Scale
        // is computed right here too (not left for the ResizeObserver effect to
        // catch up on its next tick), so status flips to 'ready' with the
        // correct fit-width scale already applied — no one-frame flash at 1x.
        const wrapperEl = containerRef.current.querySelector<HTMLElement>('.docx-preview-wrapper');
        if (wrapperEl) {
          const size = { width: wrapperEl.scrollWidth, height: wrapperEl.scrollHeight };
          setNaturalSize(size);
          if (rootRef.current && size.width > 0) {
            const cs = getComputedStyle(rootRef.current);
            const paddingX = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
            const available = rootRef.current.clientWidth - paddingX;
            if (available > 0) setScale(available / size.width);
          }
        }
        setStatus('ready');
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
  }, [url, s3Key, isLegacyDoc]);

  // Recomputes the fit-width scale whenever the panel itself is resized (the
  // sidebar drag-handle) — reads the ROOT's content-box width (clientWidth minus
  // its own padding, via computed style rather than a hardcoded px guess, since
  // that padding is responsive: p-3 on mobile, md:p-6 from that breakpoint up).
  useEffect(() => {
    if (!naturalSize || naturalSize.width <= 0 || !rootRef.current) return;
    const el = rootRef.current;
    const update = () => {
      const cs = getComputedStyle(el);
      const paddingX = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
      const available = el.clientWidth - paddingX;
      if (available > 0) setScale(available / naturalSize.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalSize]);

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
          onClick={(e) => { e.preventDefault(); s3Key ? downloadFileByKey(s3Key, displayName, url) : downloadFile(url, displayName); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {t('insight.download')}
        </a>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="w-full h-full overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 p-3 md:p-6">
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">{t('insight.loading_preview')}</p>
        </div>
      )}
      {/* Reserves exactly the SCALED footprint (transforms don't affect layout
          size, so without this the scroll area would still reflect the page's
          full unscaled height/width, leaving dead space). Width left at 100% —
          it's already sized to match `available` by construction (scale =
          available / natural), so the scaled child lines up flush, not centered
          — no more of the earlier cutoff-on-the-left trap. */}
      <div
        className={status === 'ready' ? '' : 'hidden'}
        style={naturalSize ? { width: '100%', height: naturalSize.height * scale, overflow: 'hidden' } : undefined}
      >
        <div
          ref={containerRef}
          // docx-preview's own injected stylesheet centers each page with
          // `align-items: center` on a horizontal flex axis. The generated wrapper's
          // real class is `${className}-wrapper` / page sections are `${className}`
          // (className: 'docx-preview' is passed to renderAsync below) — i.e. the
          // actual DOM classes are `docx-preview-wrapper` / `docx-preview`, NOT
          // `docx-wrapper` / `docx`. Left-aligning (rather than the library's own
          // centering) keeps this predictable once transform-scaled below.
          className="docx-preview-container shadow-lg [&_.docx-preview-wrapper]:!bg-transparent [&_.docx-preview-wrapper]:!items-start [&_.docx-preview-wrapper]:!p-0 [&_.docx-preview]:!bg-white [&_.docx-preview]:!shadow-none"
          style={naturalSize ? { width: naturalSize.width, transform: `scale(${scale})`, transformOrigin: 'top left' } : undefined}
        />
      </div>
    </div>
  );
}
