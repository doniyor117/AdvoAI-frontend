'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Citation, FileAttachment } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';

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
                  <iframe 
                    src={activeAttachment.local_url || activeAttachment.uri} 
                    className="w-full h-full flex-1 border-0 rounded-md bg-white dark:bg-black/20"
                    title={activeAttachment.display_name}
                  />
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
