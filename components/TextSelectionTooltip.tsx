'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquareQuote } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TextSelectionTooltipProps {
  onQuote: (text: string) => void;
}

export function TextSelectionTooltip({ onQuote }: TextSelectionTooltipProps) {
  const { t } = useLanguage();
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect | null; isMobile: boolean } | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setSelection(null);
          return;
        }

        // Ensure selection is inside a message bubble
        if (sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        let container = range.commonAncestorContainer;
        let element = container.nodeType === 3 ? container.parentElement : (container as HTMLElement);

        if (!element?.closest('.prose')) {
          setSelection(null);
          return;
        }

        const isMobile = window.innerWidth < 768;

        setSelection({
          text: sel.toString().trim(),
          rect: isMobile ? null : range.getBoundingClientRect(),
          isMobile
        });
      }, 50); // Debounce slightly
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    // Also listen to mouseup and touchend for better reliability
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!selection) return null;

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuote(selection.text);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const content = (
    <AnimatePresence>
      <motion.div
        initial={selection.isMobile ? { opacity: 0, y: 20, x: '-50%' } : { opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
        animate={selection.isMobile ? { opacity: 1, y: 0, x: '-50%' } : { opacity: 1, scale: 1, y: 0, x: '-50%' }}
        exit={selection.isMobile ? { opacity: 0, y: 20, x: '-50%' } : { opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={
          selection.isMobile
            ? {
                position: 'fixed',
                bottom: '100px', // slightly above input bar
                left: '50%',
                zIndex: 9999,
              }
            : {
                position: 'absolute',
                top: `${(selection.rect?.top || 0) + window.scrollY - 45}px`,
                left: `${(selection.rect?.left || 0) + window.scrollX + ((selection.rect?.width || 0) / 2)}px`,
                zIndex: 9999,
              }
        }
        className="pointer-events-auto"
      >
        <button
          onClick={handleQuoteClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border border-slate-700 dark:border-slate-200"
        >
          <MessageSquareQuote className="w-4 h-4" />
          <span className="text-sm font-semibold">{t('chat.quote_selection')}</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
