'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Citation, FileAttachment } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { authFetch } from '@/lib/authFetch';

interface InsightPanelProps {
  isOpen: boolean;
  activeCitation: Citation | null;
  activeAttachment?: FileAttachment | null;
  onClose: () => void;
}

export function InsightPanel({ isOpen, activeCitation, activeAttachment, onClose }: InsightPanelProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);

  // Resolve the preview URL: local blob URL → presigned R2 URL → null
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
    };
  }, []);

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
            style={{ '--panel-width': `384px` } as React.CSSProperties}
          >
            {/* Draggable Handle */}
            <div 
              onMouseDown={startDrag}
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/20 active:bg-primary/40 z-[60] transition-colors hidden md:block"
            />
            <div className="flex flex-col h-full min-w-[320px] w-full relative">
              <div className="h-14 border-b border-slate-200 dark:border-border flex items-center justify-between px-4 bg-[#FDFBF7]/80 dark:bg-sidebar/80 backdrop-blur-md z-10 sticky top-0 flex-shrink-0 transform-gpu">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[240px] md:max-w-[280px]">
                    {activeAttachment ? activeAttachment.display_name : activeCitation?.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                  aria-label="Close insight panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-[#FDFBF7] dark:bg-sidebar z-0 flex flex-col">
                {activeAttachment ? (
                  isLoadingUrl ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm">Loading preview...</p>
                    </div>
                  ) : activeAttachment.mime_type?.startsWith('image/') ? (
                    previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={activeAttachment.display_name}
                        className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                        <FileText className="w-12 h-12 opacity-30" />
                        <p className="text-sm">{activeAttachment.display_name}</p>
                        <p className="text-xs opacity-60">Image preview not available</p>
                      </div>
                    )
                  ) : previewUrl ? (
                    <div className="flex flex-col w-full h-full min-h-[50vh]">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-white/5">
                            <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-sm text-foreground truncate">{activeAttachment.display_name}</p>
                            <p className="text-xs text-muted-foreground uppercase">{activeAttachment.display_name.split('.').pop() || 'FILE'}</p>
                          </div>
                        </div>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
                        >
                          Download / Open
                        </a>
                      </div>
                      <iframe
                        src={previewUrl}
                        className="w-full h-full flex-1 border border-slate-200 dark:border-white/10 rounded-md bg-white dark:bg-black/20"
                        title={activeAttachment.display_name}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                      <FileText className="w-12 h-12 opacity-30" />
                      <p className="text-sm">{activeAttachment.display_name}</p>
                      <p className="text-xs opacity-60">Preview not available</p>
                    </div>
                  )
                ) : (
                  <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert prose-headings:font-semibold max-w-none text-slate-800 dark:text-[#E6EDF3] leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeCitation?.text || ''}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {!activeAttachment && activeCitation && (
                <div className="p-4 border-t border-slate-200 dark:border-border bg-[#FDFBF7] dark:bg-sidebar flex-shrink-0 z-10">
                  <a
                    href={activeCitation.source_url || `https://lex.uz/docs/${activeCitation.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-popover border border-border rounded-lg text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    {t('insight.view_on_lex')}
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
