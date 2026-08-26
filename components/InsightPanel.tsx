'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, X, Download, ExternalLink, AlertCircle, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { Citation, FileAttachment } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { authFetch, safeJson, downloadFile, downloadFileByKey } from '@/lib/authFetch';
import { DocxViewer } from './DocxViewer';

interface InsightPanelProps {
  isOpen: boolean;
  activeCitation: Citation | null;
  /** Every citation from the same answer as activeCitation — used to mark ALL parts
   *  actually cited from this parent document, not just the one clicked. */
  relatedCitations?: Citation[];
  activeAttachment?: FileAttachment | null;
  onClose: () => void;
}

// One accent, everywhere it appears: the currently-cited passage, and its position
// on the minimap. Nothing else in this panel is colored.
const ACCENT = '#D99B26';

type PartMeta = { id: string; part_title: string; part_index: number; char_length: number };
type Part = { id: string; part_title: string; text: string; part_index: number };
type DocMeta = {
  id: string;
  source_doc_id: string;
  title: string;
  act_type: string;
  doc_date: string | null;
  source_url: string;
  category: string;
};

const PAGE_LIMIT = 30;

function isDocxMime(mime?: string, name?: string): boolean {
  if (mime && (mime.includes('wordprocessingml') || mime === 'application/msword')) return true;
  return /\.docx?$/i.test(name || '');
}

function isPdfMime(mime?: string, name?: string): boolean {
  if (mime === 'application/pdf') return true;
  return /\.pdf$/i.test(name || '');
}

/**
 * Inline PDF rendering support in mobile browsers is inconsistent — a raw
 * `<iframe src={r2Url}>` can render blank, or force a download instead of
 * previewing, depending on the browser. Google's public docs-viewer wrapper
 * renders the PDF itself and is far more consistently embeddable across
 * mobile Chrome/Safari, so it's used here instead of the raw file URL. An
 * always-visible "open externally" link is the escape hatch if even that
 * fails to render for some reason.
 */
function PdfViewer({ url, displayName }: { url: string; displayName: string }) {
  const { t } = useLanguage();
  const [isLoaded, setIsLoaded] = useState(false);
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="flex flex-col w-full h-full min-h-[60vh] gap-2">
      <div className="relative flex-1 rounded-md overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 bg-[#FDFBF7] dark:bg-sidebar">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm">{t('insight.loading_preview')}</p>
          </div>
        )}
        <iframe
          src={viewerUrl}
          className="w-full h-full"
          title={displayName}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-center text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
      >
        {t('insight.open_source')}
      </a>
    </div>
  );
}

// ── Text matching for the in-part highlight ──────────────────
// Builds a whitespace/quote-tolerant regex from the citation snippet and matches it
// directly against the ORIGINAL part text — no normalized-index-to-original-index
// mapping needed, since the regex itself tolerates the variation.
function buildHighlightRegex(citationText: string): RegExp | null {
  const cleaned = (citationText || '').replace(/[ ]/g, ' ').trim();
  if (cleaned.length < 8) return null;
  const words = cleaned.slice(0, 400).split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = words
    .map((w) => {
      let esc = escape(w);
      esc = esc.replace(/['‘’]/g, "['‘’]");
      esc = esc.replace(/["“”]/g, '["“”]');
      return esc;
    })
    .join('\\s+');
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

function HighlightedPartText({ text, citationText, isPrimary = true }: { text: string; citationText: string; isPrimary?: boolean }) {
  const match = useMemo(() => {
    const re = buildHighlightRegex(citationText);
    if (!re) return null;
    const m = re.exec(text);
    return m ? { index: m.index, length: m[0].length } : null;
  }, [text, citationText]);

  if (!match) {
    return (
      <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert prose-headings:font-semibold max-w-none text-slate-800 dark:text-[#E6EDF3] leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  }

  const before = text.slice(0, match.index);
  const highlighted = text.slice(match.index, match.index + match.length);
  const after = text.slice(match.index + match.length);

  return (
    <div className="whitespace-pre-wrap text-sm md:text-base text-slate-800 dark:text-[#E6EDF3] leading-relaxed font-sans">
      {before}
      <mark
        className="rounded px-0.5 -mx-0.5"
        style={{ backgroundColor: isPrimary ? `${ACCENT}40` : `${ACCENT}20`, color: 'inherit', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
      >
        {highlighted}
      </mark>
      {after}
    </div>
  );
}

export function InsightPanel({ isOpen, activeCitation, relatedCitations, activeAttachment, onClose }: InsightPanelProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const partNodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isWebCitation = activeCitation?.kind === 'web';

  // ── Attachment preview: local blob → presigned R2 URL ───────
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!activeAttachment) { setPreviewUrl(null); setIsLoadingUrl(false); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeAttachment.local_url) { setPreviewUrl(activeAttachment.local_url); setIsLoadingUrl(false); return; }
    if (activeAttachment.s3_key) {
      setIsLoadingUrl(true);
      let cancelled = false;
      authFetch(`/api/chat/file/${encodeURIComponent(activeAttachment.s3_key)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!cancelled) {
            if (data?.url) setPreviewUrl(data.url);
            setIsLoadingUrl(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsLoadingUrl(false);
        });
      return () => { cancelled = true; };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(null);
    setIsLoadingUrl(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAttachment?.local_url, activeAttachment?.s3_key]);

  // ── Full-document citation view ──────────────────────────────
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);
  const [docPartsMeta, setDocPartsMeta] = useState<PartMeta[] | null>(null);
  const [docParts, setDocParts] = useState<Part[]>([]);
  const [docOffset, setDocOffset] = useState(0);
  const [docTotalParts, setDocTotalParts] = useState(0);
  const [docLoading, setDocLoading] = useState(false);
  const [docPaging, setDocPaging] = useState(false);
  const [docError, setDocError] = useState<'auth' | 'not_found' | 'error' | null>(null);
  const [targetPartId, setTargetPartId] = useState<string | null>(null);
  // True when a citation named a specific part_id but that id wasn't found in
  // the resolved document's parts — the panel still shows the document (from
  // the top) rather than failing outright, but this must be surfaced, not
  // silently swallowed (a stale/invalid part_id is otherwise indistinguishable
  // from "the cited passage happens to be first in the document").
  const [citedPartMissing, setCitedPartMissing] = useState(false);

  const citationKey = activeCitation?.id;
  const citationPartId = activeCitation?.part_id;

  // Every part actually used by this answer FROM THIS document, mapped to ITS OWN
  // citation text — each used part highlights exactly the snippet that citation
  // matched, not a border spanning the whole card. Only the part the user actually
  // clicked also gets auto-scroll.
  const usedPartCitations = useMemo(() => {
    const map = new Map<string, string>();
    // Prefer the model's verbatim quote (a real sentence/clause) over the whole
    // retrieved part's text — the quote is what buildHighlightRegex is actually
    // meant to match against; falling back to `text` only happens when the model's
    // citation block was missing/unparseable for this turn (see Batch 2).
    const activeSnippet = activeCitation?.quote || activeCitation?.text;
    if (citationPartId && activeSnippet) map.set(citationPartId, activeSnippet);
    for (const c of relatedCitations || []) {
      const snippet = c.quote || c.text;
      if (c.id === citationKey && c.part_id && snippet && !map.has(c.part_id)) {
        map.set(c.part_id, snippet);
      }
    }
    return map;
  }, [relatedCitations, citationKey, citationPartId, activeCitation?.quote, activeCitation?.text]);

  useEffect(() => {
    // Always reset first, even when we're about to bail out below — otherwise
    // a citation missing an id (malformed data) or a web citation would leave
    // the PREVIOUS citation's parts sitting in state, and they'd render as if
    // they belonged to the current one with no indication anything's wrong.
    let cancelled = false;
    partNodeRefs.current.clear();
    setDocError(null);
    setDocMeta(null);
    setDocPartsMeta(null);
    setDocParts([]);
    setTargetPartId(null);
    setCitedPartMissing(false);

    if (!isOpen || isWebCitation) { setDocLoading(false); return; }
    if (!citationKey) {
      // A citation with no id: no document can ever be resolved. Surface an
      // explicit error instead of leaving the panel stuck on a loading spinner
      // or, worse, blank with no explanation.
      setDocLoading(false);
      setDocError('error');
      return;
    }
    setDocLoading(true);

    (async () => {
      try {
        const metaRes = await authFetch(`/api/documents/${encodeURIComponent(citationKey)}/full/meta`);
        if (metaRes.status === 401) { if (!cancelled) setDocError('auth'); return; }
        if (metaRes.status === 404) { if (!cancelled) setDocError('not_found'); return; }
        if (!metaRes.ok) { if (!cancelled) setDocError('error'); return; }
        const meta = await safeJson(metaRes);
        if (cancelled) return;

        const parts: PartMeta[] = meta.parts || [];
        const targetIndex = citationPartId
          ? parts.findIndex((p) => p.id === citationPartId)
          : -1;
        const offset = targetIndex >= 0 ? Math.max(0, targetIndex - Math.floor(PAGE_LIMIT / 2)) : 0;

        const pageRes = await authFetch(
          `/api/documents/${encodeURIComponent(citationKey)}/full?offset=${offset}&limit=${PAGE_LIMIT}`
        );
        if (!pageRes.ok) { if (!cancelled) setDocError('error'); return; }
        const page = await safeJson(pageRes);
        if (cancelled) return;

        const fetchedParts: Part[] = page.parts || [];
        if (fetchedParts.length === 0) {
          // A 200 with zero parts is not success — there is nothing to show
          // and nothing to highlight. Treat it the same as any other failure
          // to load the document rather than falling through to render a bare
          // chunk of citation text with no document context around it.
          setDocError('error');
          return;
        }

        setDocMeta(meta);
        setDocPartsMeta(parts);
        setDocTotalParts(meta.total_parts ?? page.total_parts ?? 0);
        setDocParts(fetchedParts);
        setDocOffset(page.offset ?? offset);
        setTargetPartId(citationPartId || fetchedParts[0].id);
        // The citation named a specific part but it wasn't in this document's
        // part list — we still show the document (from the top), but flag it
        // so the UI can say so instead of silently looking like a match.
        setCitedPartMissing(Boolean(citationPartId) && targetIndex < 0);
      } catch {
        if (!cancelled) setDocError('error');
      } finally {
        if (!cancelled) setDocLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // Refetch every time the panel reopens (even with the same citation) — simplest
  // correct fix for "reopening the same citation must land in the same place",
  // and cheap: the endpoint carries a 60s Cache-Control.
  }, [citationKey, citationPartId, isWebCitation, isOpen]);

  // Scroll the target part into view once its node is mounted.
  useEffect(() => {
    if (!targetPartId) return;
    const node = partNodeRefs.current.get(targetPartId);
    if (node) {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [targetPartId, docParts]);

  const registerPartRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) partNodeRefs.current.set(id, node);
    else partNodeRefs.current.delete(id);
  }, []);

  // Backward navigation deliberately has no scroll-triggered equivalent: the initial
  // fetch is already centered on the cited part, and the minimap already covers the
  // whole document for jumping anywhere (including earlier). Two separate "go back"
  // controls doing the same job is exactly the confusing overlap being removed here.
  const loadMore = useCallback(async () => {
    if (!citationKey || docPaging) return;
    const nextOffset = docOffset + docParts.length;
    if (nextOffset >= docTotalParts) return;
    setDocPaging(true);
    try {
      const res = await authFetch(
        `/api/documents/${encodeURIComponent(citationKey)}/full?offset=${nextOffset}&limit=${PAGE_LIMIT}`
      );
      if (res.ok) {
        const page = await safeJson(res);
        setDocParts(prev => [...prev, ...(page.parts || [])]);
      }
    } finally {
      setDocPaging(false);
    }
  }, [citationKey, docOffset, docParts.length, docTotalParts, docPaging]);

  // Scrolling near the bottom of the loaded window quietly extends it — the ONLY
  // navigation affordances in this panel are native scroll (forward) and the
  // minimap (jump anywhere). No visible "load more" button duplicating either.
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: scrollContainerRef.current, rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const jumpToPart = useCallback(async (part: PartMeta) => {
    if (!citationKey) return;
    if (docParts.some(p => p.id === part.id)) {
      setTargetPartId(part.id);
      const node = partNodeRefs.current.get(part.id);
      node?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    setDocLoading(true);
    try {
      const offset = Math.max(0, part.part_index - Math.floor(PAGE_LIMIT / 2));
      const res = await authFetch(
        `/api/documents/${encodeURIComponent(citationKey)}/full?offset=${offset}&limit=${PAGE_LIMIT}`
      );
      if (res.ok) {
        const page = await safeJson(res);
        partNodeRefs.current.clear();
        setDocParts(page.parts || []);
        setDocOffset(page.offset ?? offset);
        setTargetPartId(part.id);
      }
    } finally {
      setDocLoading(false);
    }
  }, [citationKey, docParts]);

  // ── Minimap checkpoints: one pin per part actually cited, positioned at its
  // midpoint through the document — proportional to real content length, not part
  // count, so a three-line article and a 200-line chapter don't get equal weight.
  const minimapCheckpoints = useMemo(() => {
    if (!docPartsMeta || docPartsMeta.length === 0 || usedPartCitations.size === 0) return [];
    const totalChars = docPartsMeta.reduce((sum, p) => sum + (p.char_length || 1), 0) || 1;
    let cursor = 0;
    const checkpoints: { part: PartMeta; top: number }[] = [];
    for (const p of docPartsMeta) {
      const span = (p.char_length || 1) / totalChars;
      if (usedPartCitations.has(p.id)) {
        checkpoints.push({ part: p, top: cursor + span / 2 });
      }
      cursor += span;
    }
    return checkpoints;
  }, [docPartsMeta, usedPartCitations]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 320) newWidth = 320;
      const maxW = window.innerWidth * 0.5;
      if (newWidth > maxW) newWidth = maxW;

      if (panelRef.current) {
        panelRef.current.style.setProperty('--panel-width', `${newWidth}px`);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // If the panel unmounts mid-drag, don't leave selection disabled site-wide.
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const headerTitle = activeAttachment
    ? activeAttachment.display_name
    : (docMeta?.title || activeCitation?.title || t('insight.no_title'));

  const headerEyebrow = !activeAttachment && docMeta
    ? [docMeta.act_type, docMeta.doc_date].filter(Boolean).join(' · ')
    : null;

  const sourceHref = activeAttachment
    ? null
    : (docMeta?.source_url || activeCitation?.source_url || (activeCitation?.id ? `https://lex.uz/docs/${activeCitation.id}` : null));

  return (
    <AnimatePresence initial={false}>
      {isOpen && (activeCitation || activeAttachment) && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed -inset-4 bg-black/20 backdrop-blur-sm z-40 md:hidden transform-gpu"
            onClick={onClose}
          />

          <motion.aside
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed md:relative right-0 top-0 bottom-0 z-50 bg-[#FDFBF7] dark:bg-sidebar border-l border-slate-200 dark:border-border flex flex-col shadow-2xl md:shadow-none overflow-hidden transition-colors duration-200 flex-shrink-0 w-full md:w-[var(--panel-width)] md:max-w-[50vw]"
            style={{ '--panel-width': `420px` } as React.CSSProperties}
          >
            {/* Draggable Handle */}
            <div
              onMouseDown={startDrag}
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/20 active:bg-primary/40 z-[60] transition-colors hidden md:block"
            />
            <div className="flex flex-col h-full min-w-[320px] w-full relative">
              {/* ── Header: one line, one action group ── */}
              <div className="min-h-14 border-b border-slate-200 dark:border-border flex items-center justify-between gap-3 px-4 py-2.5 bg-[#FDFBF7]/80 dark:bg-sidebar/80 backdrop-blur-md z-10 sticky top-0 flex-shrink-0 transform-gpu">
                <div className="flex flex-col min-w-0 flex-1">
                  {headerEyebrow && (
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 truncate">
                      {headerEyebrow}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-foreground font-medium text-sm min-w-0">
                    <FileText className="w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">{headerTitle}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {activeAttachment && previewUrl && (
                    <a
                      href={previewUrl}
                      download={activeAttachment.display_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        activeAttachment.s3_key
                          ? downloadFileByKey(activeAttachment.s3_key, activeAttachment.display_name, previewUrl)
                          : downloadFile(previewUrl, activeAttachment.display_name);
                      }}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                      aria-label={t('insight.download')}
                      title={t('insight.download')}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                    aria-label="Close insight panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex">
                {/* ── Main content ── */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 bg-[#FDFBF7] dark:bg-sidebar z-0 flex flex-col">
                  {activeAttachment ? (
                    isLoadingUrl ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm">{t('insight.loading_preview')}</p>
                      </div>
                    ) : activeAttachment.mime_type?.startsWith('image/') ? (
                      previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewUrl}
                          alt={activeAttachment.display_name}
                          className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                          <FileText className="w-12 h-12 opacity-30" />
                          <p className="text-sm">{activeAttachment.display_name}</p>
                        </div>
                      )
                    ) : previewUrl && isDocxMime(activeAttachment.mime_type, activeAttachment.display_name) ? (
                      <div className="flex flex-col w-full h-full min-h-[50vh]">
                        <DocxViewer url={previewUrl} displayName={activeAttachment.display_name} s3Key={activeAttachment.s3_key} />
                      </div>
                    ) : previewUrl && isPdfMime(activeAttachment.mime_type, activeAttachment.display_name) ? (
                      <PdfViewer url={previewUrl} displayName={activeAttachment.display_name} />
                    ) : previewUrl ? (
                      <div className="flex flex-col w-full h-full min-h-[50vh] gap-2">
                        <iframe
                          src={previewUrl}
                          className="w-full h-full flex-1 border border-slate-200 dark:border-white/10 rounded-md bg-white dark:bg-black/20"
                          title={activeAttachment.display_name}
                          onError={(e) => { (e.currentTarget as HTMLIFrameElement).style.display = 'none'; }}
                        />
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="self-center text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
                        >
                          {t('insight.open_source')}
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                        <FileText className="w-12 h-12 opacity-30" />
                        <p className="text-sm">{activeAttachment.display_name}</p>
                      </div>
                    )
                  ) : isWebCitation ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t('insight.from_web')}</span>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {activeCitation?.text}
                      </div>
                    </div>
                  ) : docLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400 flex-1">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm">{t('insight.loading_preview')}</p>
                    </div>
                  ) : docError === 'auth' ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400 text-center flex-1">
                      <AlertCircle className="w-10 h-10 opacity-40" />
                      <p className="text-sm max-w-xs">{t('insight.sign_in_required')}</p>
                      <Link
                        href="/login"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                        {t('insight.sign_in_button')}
                      </Link>
                    </div>
                  ) : docError ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400 text-center flex-1">
                      <AlertCircle className="w-10 h-10 opacity-40" />
                      <p className="text-sm max-w-xs">{t('insight.doc_load_failed')}</p>
                      {sourceHref && (
                        <a
                          href={sourceHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-popover border border-border rounded-lg text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                          {t('insight.view_on_lex')}
                          <ChevronRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ) : docParts.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {citedPartMissing && (
                        <div className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{t('insight.cited_part_missing')}</span>
                        </div>
                      )}
                      {docParts.map((part) => {
                        const citationText = usedPartCitations.get(part.id);
                        // Auto-generated split titles ("{Long Title} (Part 12)") are a
                        // chunking artifact, not a real heading — repeating one above
                        // every card is noise. A genuine article/section title still shows.
                        const showTitle = part.part_title && !/\(Part\s*\d+\)\s*$/i.test(part.part_title);
                        return (
                          <div
                            key={part.id}
                            data-part-id={part.id}
                            ref={(node) => registerPartRef(part.id, node)}
                            className="py-4 first:pt-0"
                          >
                            {showTitle && (
                              <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                                {part.part_title}
                              </div>
                            )}
                            {citationText ? (
                              <HighlightedPartText text={part.text} citationText={citationText} isPrimary={part.id === targetPartId} />
                            ) : (
                              <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert prose-headings:font-semibold max-w-none text-slate-800 dark:text-[#E6EDF3] leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {docOffset + docParts.length < docTotalParts && (
                        <div ref={bottomSentinelRef} className="h-px w-full" aria-hidden="true" />
                      )}
                      {docPaging && (
                        <div className="flex justify-center py-3 text-slate-400">
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    // Transient pre-effect frame only (state was just reset, the
                    // fetch hasn't started yet) — never a resting state. Rendering
                    // `activeCitation.text` here used to silently pass off an
                    // isolated chunk as if it were the full document; every real
                    // outcome now has its own explicit branch above.
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400 flex-1" />
                  )}
                </div>

                {/* ── Scroll tape: a plain vertical line spanning the document, with one
                    pinned checkpoint per part actually cited in this answer — not a
                    dot-per-part track. The only jump control in the panel; native
                    scroll only ever extends forward from here. ── */}
                {!activeAttachment && !isWebCitation && minimapCheckpoints.length > 0 && (
                  <div className="w-6 flex-shrink-0 relative my-4 mr-2">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-slate-200/80 dark:bg-white/[0.08]" />
                    {minimapCheckpoints.map(({ part, top }) => {
                      const isActive = part.id === targetPartId;
                      return (
                        <button
                          key={part.id}
                          onClick={() => jumpToPart(part)}
                          title={part.part_title}
                          className="group absolute left-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 -m-1.5"
                          style={{ top: `${top * 100}%` }}
                          aria-label={part.part_title}
                        >
                          <span
                            className={`block rounded-full ring-2 ring-[#FDFBF7] dark:ring-sidebar shadow-sm transition-all ${
                              isActive ? 'w-3 h-3' : 'w-2 h-2 group-hover:w-2.5 group-hover:h-2.5'
                            }`}
                            style={{ backgroundColor: isActive ? ACCENT : `${ACCENT}90` }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!activeAttachment && sourceHref && (
                <div className="p-4 border-t border-slate-200 dark:border-border bg-[#FDFBF7] dark:bg-sidebar flex-shrink-0 z-10">
                  <a
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-popover border border-border rounded-lg text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    {isWebCitation ? t('insight.open_source') : t('insight.view_on_lex')}
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
