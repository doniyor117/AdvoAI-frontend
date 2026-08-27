'use client';

import React from 'react';
import { X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, FileAttachment } from '@/hooks/useChatManager';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { downloadFile, downloadFileByKey } from '@/lib/authFetch';
import { fileExtension, getFileIconSrc } from '@/lib/fileIcons';

interface GeneratedFilesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  /** Same handler the chat's own file cards use — opens a document/PDF in the
   *  InsightPanel sidebar, or an image in its fullscreen viewer. Reusing it here
   *  (rather than a bespoke preview) is what makes clicking a row in this panel
   *  behave identically to clicking the same file inline in the conversation. */
  onAttachmentClick?: (file: FileAttachment) => void;
}

function FileRow({ file, onAttachmentClick }: { file: FileAttachment; onAttachmentClick?: (f: FileAttachment) => void }) {
  const url = usePresignedUrl(file);
  const isImage = (file.mime_type || '').startsWith('image/');
  const ext = fileExtension(file.display_name);
  const iconSrc = getFileIconSrc(file.display_name);

  return (
    <button
      type="button"
      onClick={() => onAttachmentClick?.(file)}
      className="flex items-center gap-3 w-full text-left rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#141414] px-3 py-2.5 hover:border-black/20 dark:hover:border-white/20 transition-colors"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-50 dark:bg-white/5 flex-shrink-0 overflow-hidden">
        {isImage ? (
          url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-4 h-4 text-slate-400" />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconSrc} alt="" className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.display_name}</p>
        <p className="text-xs text-slate-400">{isImage ? (ext === 'DOC' ? 'IMAGE' : ext) : ext}</p>
      </div>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); url && (file.s3_key ? downloadFileByKey(file.s3_key, file.display_name, url) : downloadFile(url, file.display_name)); }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && url) { e.stopPropagation(); file.s3_key ? downloadFileByKey(file.s3_key, file.display_name, url) : downloadFile(url, file.display_name); } }}
        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
        aria-label={`Download ${file.display_name}`}
      >
        <Download className="w-4 h-4" />
      </span>
    </button>
  );
}

function FileSection({ title, files, onAttachmentClick }: { title: string; files: FileAttachment[]; onAttachmentClick?: (f: FileAttachment) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">{title}</h3>
      <div className="flex flex-col gap-2">
        {files.map((file, idx) => (
          <FileRow key={`${file.document_id || file.s3_key || file.display_name}-${idx}`} file={file} onAttachmentClick={onAttachmentClick} />
        ))}
      </div>
    </div>
  );
}

/** Every file that's ridden along with this chat — Claude's "Artifacts"-style
 *  panel, deliberately NOT built on InsightPanel's machinery (citation
 *  highlighting, drag-resize, the document viewer) since a download list needs
 *  none of it. Split into what the assistant produced vs. what the user
 *  attached, since conflating them read as AdvoAI claiming the user's own
 *  uploads as its own output. Attachments already live in `messages`
 *  client-side, so this needs no fetch of its own. */
export function GeneratedFilesPanel({ isOpen, onClose, messages, onAttachmentClick }: GeneratedFilesPanelProps) {
  const generatedFiles = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => m.attachments || []);
  const uploadedFiles = messages
    .filter(m => m.role === 'user')
    .flatMap(m => m.attachments || []);
  const isEmpty = generatedFiles.length === 0 && uploadedFiles.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed -inset-4 bg-black/20 backdrop-blur-sm z-40 md:hidden transform-gpu"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 34 }}
            className="fixed md:relative right-0 top-0 bottom-0 z-50 bg-[#FDFBF7] dark:bg-sidebar border-l border-slate-200 dark:border-border flex flex-col shadow-2xl md:shadow-none overflow-hidden flex-shrink-0 w-full max-w-sm"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Files</h2>
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" aria-label="Close files panel">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
              {isEmpty ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No files yet</p>
                </div>
              ) : (
                <>
                  <FileSection title="Generated" files={generatedFiles} onAttachmentClick={onAttachmentClick} />
                  <FileSection title="Uploaded" files={uploadedFiles} onAttachmentClick={onAttachmentClick} />
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
