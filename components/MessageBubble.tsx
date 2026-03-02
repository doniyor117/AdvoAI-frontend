'use client';

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, Copy, ThumbsUp, ThumbsDown, Share2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Message, Citation } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageBubbleProps {
  message: Message;
  onCitationClick: (citation: Citation) => void;
}

export const MessageBubble = memo(function MessageBubble({ message, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = async () => {
    try {
      // navigator.clipboard is only available in secure contexts (HTTPS)
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.text);
      } else {
        // Fallback for HTTP environments
        const textarea = document.createElement('textarea');
        textarea.value = message.text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      console.warn('Copy failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex flex-col w-full border-b border-slate-100 dark:border-white/5 py-6 last:border-b-0 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`${isUser
          ? 'w-fit max-w-[85%] md:max-w-2xl bg-slate-200 dark:bg-white/10 rounded-2xl px-4 py-2.5 md:px-5 md:py-3 text-slate-900 dark:text-white'
          : 'w-full bg-transparent py-2 px-4 md:px-5'
        }`}>
        <div className={`prose prose-sm md:prose-base max-w-none break-words leading-relaxed ${isUser ? 'prose-slate dark:prose-invert prose-p:my-0 prose-headings:my-0' : 'prose-slate dark:prose-invert font-serif'}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.text}
          </ReactMarkdown>
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-2">
            {message.citations.map((cit, index) => (
              <button
                key={`${cit.id}-${index}`}
                onClick={() => onCitationClick(cit)}
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {t('chat.cite')}: {cit.title.split(',')[1]?.trim() || cit.title}
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons for Yurika */}
        {!isUser && (
          <div className="mt-4 flex items-center gap-1 opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
              aria-label="Copy message"
              title="Copy"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" aria-label="Mark as helpful" title="Helpful">
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" aria-label="Mark as not helpful" title="Not helpful">
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" aria-label="Share message" title="Share">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});
