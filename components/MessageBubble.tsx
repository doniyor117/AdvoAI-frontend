'use client';

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ChevronRight, Copy, ThumbsUp, ThumbsDown, Share2, Check, Quote } from 'lucide-react';
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
      id={`message-${message.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex flex-col w-full py-4 md:py-6 scroll-mt-24 md:scroll-mt-28 ${isUser ? 'items-end' : 'items-start'}`}
    >
      {/* ── Attachments: rendered OUTSIDE and ABOVE the text bubble ── */}
      {isUser && message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 justify-end max-w-[85%] md:max-w-2xl">
          {message.attachments.map((file, idx) => {
            const isImage = (file.mime_type || '').startsWith('image/');
            const hasPreview = !!(file.local_url || file.uri);
            const ext = file.display_name.split('.').pop()?.toLowerCase() || 'file';

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

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onAttachmentClick && onAttachmentClick(file)}
                className={`relative flex flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] w-20 h-20 flex-shrink-0 ${hasPreview ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isImage && file.local_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.local_url}
                      alt={file.display_name}
                      className="w-full h-full object-cover"
                    />
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
          })}
        </div>
      )}

      {/* ── Text bubble ── */}
      <div className={`${isUser
          ? 'w-fit max-w-[85%] md:max-w-2xl bg-secondary text-secondary-foreground rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-sm'
          : 'w-full bg-transparent py-4 px-6 md:px-8 md:py-8'
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
