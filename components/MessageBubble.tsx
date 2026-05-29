'use client';

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, Copy, ThumbsUp, ThumbsDown, Share2, Check, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Message, Citation, FileAttachment } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';

interface MessageBubbleProps {
  message: Message;
  onCitationClick: (citation: Citation) => void;
  onAttachmentClick?: (attachment: FileAttachment) => void;
}

export const MessageBubble = memo(function MessageBubble({ message, onCitationClick, onAttachmentClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const { t } = useLanguage();

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex flex-col w-full py-4 md:py-6 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`${isUser
          ? 'w-fit max-w-[85%] md:max-w-2xl bg-secondary text-secondary-foreground rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-sm'
          : 'w-full bg-transparent py-4 px-6 md:px-8 md:py-8'
        }`}>
        
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.attachments.map((file, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAttachmentClick && onAttachmentClick(file)}
                className="flex items-center gap-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors border border-black/10 dark:border-white/10 rounded-xl p-2 pr-4 w-fit shadow-sm text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  {(file.mime_type || '').startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="flex flex-col max-w-[120px]">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{file.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className={`prose max-w-none break-words ${isUser ? 'prose-sm md:prose-base prose-slate dark:prose-invert prose-p:my-0 prose-headings:my-0 font-sans font-medium text-slate-700 dark:text-slate-200' : 'prose-slate dark:prose-invert font-serif text-base md:text-lg leading-[1.6] md:leading-[1.7] prose-p:mb-6 prose-ul:mb-6 prose-ol:mb-6'}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.text}
          </ReactMarkdown>
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row flex-wrap gap-2">
            {message.citations.map((cit, index) => (
              <button
                key={`${cit.id}-${index}`}
                onClick={() => onCitationClick(cit)}
                className="flex items-center justify-between md:justify-start gap-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent font-medium w-full md:w-auto text-xs md:text-sm px-3 py-2 md:px-2.5 md:py-1.5 rounded-md transition-colors shadow-sm"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{t('chat.cite')}: {cit.title.split(',')[1]?.trim() || cit.title}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 opacity-70 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons for AdvoAI */}
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
