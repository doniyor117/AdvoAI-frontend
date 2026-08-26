'use client';

import React, { useState, memo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, ChevronDown, Copy, ThumbsUp, ThumbsDown, Share2, Check, Quote, AlertCircle, Download, Scale, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Citation, FileAttachment, StreamStage } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { authFetch, downloadFile, downloadFileByKey } from '@/lib/authFetch';

/** A single attachment card — shows image thumbnail (local or from R2) or file-type card */
/**
 * A document AdvoAI produced, offered as a download.
 * Uses the same presigned-URL endpoint that powers attachment previews.
 */
function GeneratedFileCard({ file, onAttachmentClick }: { file: FileAttachment; onAttachmentClick?: (f: FileAttachment) => void }) {
  const url = usePresignedUrl(file);
  const ext = file.display_name.split('.').pop()?.toUpperCase() || 'DOC';

  return (
    <button
      type="button"
      onClick={() => onAttachmentClick?.(file)}
      className="flex items-center gap-3 w-full max-w-md text-left rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#141414] px-4 py-3 shadow-sm hover:border-black/20 dark:hover:border-white/20 transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
        <span className="text-[10px] font-extrabold tracking-wide text-blue-600 dark:text-blue-400">
          {ext.slice(0, 4)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {file.display_name}
        </p>
        <p className="text-xs text-slate-400">
          {ext === 'DOCX' ? 'Word document' : ext === 'PDF' ? 'PDF document' : ext}
        </p>
      </div>
      {url ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); file.s3_key ? downloadFileByKey(file.s3_key, file.display_name, url) : downloadFile(url, file.display_name); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); file.s3_key ? downloadFileByKey(file.s3_key, file.display_name, url) : downloadFile(url, file.display_name); } }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </span>
      ) : (
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
      )}
    </button>
  );
}

function AttachmentThumbnail({
  file,
  onAttachmentClick,
}: {
  file: FileAttachment;
  onAttachmentClick?: (f: FileAttachment) => void;
}) {
  const isImage = (file.mime_type || '').startsWith('image/');
  const ext = file.display_name.split('.').pop()?.toLowerCase() || 'file';
  const imgSrc = usePresignedUrl(file); // null while loading
  const hasPreview = !!(imgSrc || file.s3_key);

  const iconColors: Record<string, string> = {
    pdf:  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    doc:  'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    docx: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    txt:  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    csv:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    md:   'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    rtf:  'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    html: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  };
  const iconColor = iconColors[ext] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

  // A failed or still-uploading attachment used to render exactly like a healthy one,
  // so the chat showed a document the model had never received.
  if (file.error) {
    return (
      <div
        title={file.error}
        className="relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 w-20 h-20 flex-shrink-0 px-1"
      >
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-[8px] font-medium text-red-600 dark:text-red-400 w-full text-center leading-tight line-clamp-2 px-0.5">
          Not sent
        </span>
        <span className="text-[7px] text-red-500/80 w-full text-center truncate px-0.5">
          {file.display_name}
        </span>
      </div>
    );
  }

  if (file.is_uploading) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#1a1a1a] w-20 h-20 flex-shrink-0">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[8px] text-slate-400">Uploading…</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAttachmentClick && onAttachmentClick(file)}
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] w-20 h-20 flex-shrink-0 ${hasPreview ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {isImage ? (
        <>
          {imgSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt={file.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/80">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pt-3 pb-1">
            <span className="text-[8px] text-white font-medium leading-tight truncate block">{file.display_name}</span>
          </div>
        </>
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-1 ${iconColor} px-1`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/60 dark:bg-black/20 mb-0.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wide">{ext.slice(0, 4)}</span>
          </div>
          <span className="text-[8px] font-medium w-full text-center truncate px-1 opacity-80 leading-tight">{file.display_name}</span>
        </div>
      )}
    </button>
  );
}

function getDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** A real favicon for a web result's domain — the same "little site logos" pattern
 *  Google's AI Overview uses — with a graceful fallback to a generic globe glyph if
 *  the domain has none or the request fails. Google's public favicon endpoint needs
 *  no API key. */
function SourceFavicon({ url, size = 20 }: { url?: string; size?: number }) {
  const domain = getDomain(url);
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return (
      <div
        className="rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Globe className="text-slate-400" style={{ width: size * 0.55, height: size * 0.55 }} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
      alt=""
      onError={() => setFailed(true)}
      className="rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * The verified legal sources behind an answer, collapsed into a single control
 * that expands into a list — the pattern Google's AI Overview / AI Mode uses for
 * its source list, adapted to this app's tokens. Collapsed by default so a long
 * answer doesn't end in a wall of chips; the stacked icon preview and count are
 * enough to signal "grounded in N documents" at a glance. Labeled explicitly as
 * OUR database (not just "Sources") so it reads unambiguously distinct from the
 * live-web dropdown next to it.
 */
function SourcesDropdown({
  citations,
  onCitationClick,
}: {
  citations: Citation[];
  onCitationClick: (citation: Citation, messageCitations: Citation[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2.5 py-1 pr-2 -ml-1 pl-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
        aria-expanded={isOpen}
      >
        <div className="flex -space-x-2">
          {citations.slice(0, 3).map((cit, i) => (
            <div
              key={`${cit.id}-${i}`}
              className="w-5 h-5 rounded-full bg-accent/15 ring-2 ring-background dark:ring-[#0a0a0a] flex items-center justify-center"
              style={{ zIndex: 3 - i }}
            >
              <Scale className="w-2.5 h-2.5 text-accent" />
            </div>
          ))}
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
          {t('chat.corpus_sources_label')} ({citations.length})
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-1 min-w-[240px] max-w-sm">
              {citations.map((cit, index) => (
                <button
                  key={`${cit.id}-${index}`}
                  onClick={() => onCitationClick(cit, citations)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-left transition-colors group/item"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{cit.title}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">Lex.uz</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover/item:text-slate-500 dark:group-hover/item:text-slate-400 group-hover/item:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Live web results — visibly quieter and structurally distinct from
 * SourcesDropdown's verified corpus citations, so a random webpage is never
 * mistaken for vetted legislation. Also collapsed for the same reason: an answer
 * shouldn't end in a wall of links. Real per-domain favicons (not a generic globe
 * per item) so it reads like an actual source list, not a placeholder.
 */
function WebSourcesDropdown({ citations }: { citations: Citation[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2.5 py-1 pr-2 -ml-1 pl-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
        aria-expanded={isOpen}
      >
        <div className="flex -space-x-2">
          {citations.slice(0, 3).map((cit, i) => (
            <div key={`${cit.id}-${i}`} className="ring-2 ring-background dark:ring-[#0a0a0a] rounded-full" style={{ zIndex: 3 - i }}>
              <SourceFavicon url={cit.source_url} size={20} />
            </div>
          ))}
        </div>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
          {t('chat.from_the_web')} ({citations.length})
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-0.5 min-w-[240px] max-w-sm">
              {citations.map((cit, index) => (
                <a
                  key={`${cit.id}-${index}`}
                  href={cit.source_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-left transition-colors group/item"
                >
                  <SourceFavicon url={cit.source_url} size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{cit.title}</p>
                    {getDomain(cit.source_url) && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{getDomain(cit.source_url)}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onCitationClick: (citation: Citation, messageCitations: Citation[]) => void;
  onAttachmentClick?: (attachment: FileAttachment) => void;
}

/** Small rocking-scale indicator shown while an assistant reply is still
 *  generating — the trailing marker sits below the text exactly like Claude's,
 *  and doubles as the "give me a second" cue before any text has arrived yet.
 *  It tilts side to side (never a full spin) and disappears the moment the
 *  reply settles, rather than animating some separate "done" pose. */
function GeneratingIndicator({ statusLabel }: { statusLabel?: StreamStage | null }) {
  const { t } = useLanguage();
  const label = statusLabel ? t(`chat.status_${statusLabel}`) : null;

  return (
    <div className="flex items-center gap-2 mt-2 h-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/advoai-scale.png"
        alt=""
        className="w-4 h-4 scale-balance"
      />
      {label && (
        <span className="text-sm font-medium shimmer-text">{label}</span>
      )}
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({ message, onCitationClick, onAttachmentClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isShared, setIsShared] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API requires a secure context (HTTPS)
      console.warn('[MessageBubble] Copy failed — secure context required');
    }
  };

  const handleFeedback = (value: 'up' | 'down') => {
    // A toggle, not a one-shot vote — clicking the active choice again clears it.
    setFeedback(prev => (prev === value ? null : value));
  };

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text: message.text });
        return;
      }
      await navigator.clipboard.writeText(message.text);
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    } catch {
      // AbortError when the user cancels the native share sheet — not a failure.
    }
  };

  return (
    <motion.div
      id={`message-${message.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex flex-col w-full scroll-mt-24 md:scroll-mt-28 ${isUser ? 'items-end pt-6 md:pt-8 pb-0' : 'items-start pt-0 pb-6 md:pb-8'}`}
    >
      {/* ── Attachments: rendered OUTSIDE and ABOVE the text bubble ── */}
      {/* User attachments are thumbnails; assistant attachments are generated
          documents, so they get a download card instead. This block used to be
          gated on `isUser`, which made returning a file to the user impossible. */}
      {isUser && message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 justify-end max-w-[85%] md:max-w-2xl">
          {message.attachments.map((file, idx) => (
            <AttachmentThumbnail
              key={idx}
              file={file}
              onAttachmentClick={onAttachmentClick}
            />
          ))}
        </div>
      )}

      {!isUser && message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-col gap-2 mb-3 w-full px-6 md:px-8">
          {message.attachments.map((file, idx) => (
            <GeneratedFileCard key={idx} file={file} onAttachmentClick={onAttachmentClick} />
          ))}
        </div>
      )}

      {/* ── Text bubble ── */}
      <div className={`${isUser
          ? 'w-fit max-w-[85%] md:max-w-2xl bg-secondary text-secondary-foreground rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-sm'
          : message.isError
            // isError was set but never read, so failures looked identical to answers.
            ? 'w-full rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-900/15 pt-3 pb-4 px-6 md:px-8 md:pt-4 md:pb-6'
            : 'w-full bg-transparent pt-3 pb-4 px-6 md:px-8 md:pt-4 md:pb-6'
        }`}>
        <div className={`prose max-w-none break-words ${isUser ? 'prose-sm md:prose-base prose-slate dark:prose-invert prose-p:my-0 prose-headings:my-0 font-sans font-medium text-slate-700 dark:text-slate-200' : 'prose-slate dark:prose-invert font-serif text-base md:text-lg leading-[1.6] md:leading-[1.7] prose-p:mb-6 prose-ul:mb-6 prose-ol:mb-6'}`}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              blockquote: ({node, ...props}) => (
                <div className={`relative pl-8 pr-4 py-3 my-3 rounded-2xl text-[13px] md:text-sm font-normal italic leading-relaxed ${isUser ? 'bg-black/5 dark:bg-black/20 text-slate-700 dark:text-slate-300' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/5'}`}>
                  <Quote className={`absolute top-3 left-3 w-4 h-4 rotate-180 opacity-40 ${isUser ? 'text-slate-500' : 'text-primary'}`} />
                  <div className="[&>p]:m-0">{props.children}</div>
                </div>
              )
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>

        {!isUser && message.isStreaming && (
          <GeneratingIndicator statusLabel={message.statusLabel} />
        )}

        {message.citations && message.citations.length > 0 && (() => {
          const corpusCitations = message.citations.filter(c => (c.kind || 'corpus') === 'corpus');
          const webCitations = message.citations.filter(c => c.kind === 'web');
          return (
            <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap items-start gap-x-5 gap-y-3">
              {corpusCitations.length > 0 && (
                <SourcesDropdown citations={corpusCitations} onCitationClick={onCitationClick} />
              )}
              {webCitations.length > 0 && (
                <WebSourcesDropdown citations={webCitations} />
              )}
            </div>
          );
        })()}

        {/* Action Buttons for AdvoAI — hidden until the reply has actually
            settled; showing "copy/like/share" on an empty, still-generating
            bubble offers actions on content that doesn't exist yet. */}
        {!isUser && !message.isStreaming && message.text && (
          <div className="mt-4 flex items-center gap-1 opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
              aria-label="Copy message"
              title="Copy"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleFeedback('up')}
              className={`p-1.5 rounded-md transition-colors ${
                feedback === 'up'
                  ? 'text-emerald-600 bg-emerald-500/10'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              aria-pressed={feedback === 'up'}
              aria-label="Mark as helpful"
              title="Helpful"
            >
              <ThumbsUp className="w-4 h-4" fill={feedback === 'up' ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className={`p-1.5 rounded-md transition-colors ${
                feedback === 'down'
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              aria-pressed={feedback === 'down'}
              aria-label="Mark as not helpful"
              title="Not helpful"
            >
              <ThumbsDown className="w-4 h-4" fill={feedback === 'down' ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
              aria-label="Share message"
              title="Share"
            >
              {isShared ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});
