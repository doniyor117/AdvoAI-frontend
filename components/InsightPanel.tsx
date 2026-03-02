'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Citation } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';

interface InsightPanelProps {
  isOpen: boolean;
  activeCitation: Citation | null;
  onClose: () => void;
}

export function InsightPanel({ isOpen, activeCitation, onClose }: InsightPanelProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence initial={false}>
      {isOpen && activeCitation && (
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
            initial={{ x: '100%', width: 0 }}
            animate={{ x: 0, width: '100%' }}
            exit={{ x: '100%', width: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed md:relative right-0 top-0 bottom-0 z-50 bg-[#fafafa] dark:bg-[#0a0a0a] border-l border-black/5 dark:border-white/5 flex flex-col shadow-2xl md:shadow-none overflow-hidden md:w-96 md:max-w-md transition-colors duration-200"
            style={{ minWidth: 0 }}
          >
            <div className="flex flex-col h-full min-w-[320px] md:min-w-[384px] relative">
              <div className="h-14 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 bg-[#fafafa]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-10 sticky top-0 flex-shrink-0 transform-gpu">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500 font-medium text-sm">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[240px] md:max-w-[280px]">{activeCitation.title}</span>
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

              <div className="flex-1 overflow-y-auto p-6 bg-[#fafafa] dark:bg-[#0a0a0a] z-0">
                <div className="font-serif prose prose-slate dark:prose-invert prose-headings:text-xl prose-headings:font-semibold max-w-none text-slate-800 dark:text-[#E6EDF3]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeCitation.text}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="p-4 border-t border-black/5 dark:border-white/5 bg-[#fafafa] dark:bg-[#0a0a0a] flex-shrink-0 z-10">
                <a
                  href={activeCitation.source_url || `https://lex.uz/docs/${activeCitation.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-[#E6EDF3] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  {t('insight.view_on_lex')}
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
