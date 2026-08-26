'use client';

import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, FileAttachment } from '@/hooks/useChatManager';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { downloadFile, downloadFileByKey } from '@/lib/authFetch';

interface GeneratedFilesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

function FileRow({ file }: { file: FileAttachment }) {
  const url = usePresignedUrl(file);
  const ext = file.display_name.split('.').pop()?.toUpperCase() || 'DOC';

  return (
    <div className="flex items-center gap-3 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#141414] px-3 py-2.5">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
        <span className="text-[9px] font-extrabold tracking-wide text-blue-600 dark:text-blue-400">
          {ext.slice(0, 4)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.display_name}</p>
        <p className="text-xs text-slate-400">{ext === 'DOCX' ? 'Word document' : ext === 'PDF' ? 'PDF document' : ext}</p>
      </div>
      <button
        type="button"
        disabled={!url}
        onClick={() => url && (file.s3_key ? downloadFileByKey(file.s3_key, file.display_name, url) : downloadFile(url, file.display_name))}
        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30 flex-shrink-0"
        aria-label={`Download ${file.display_name}`}
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

/** A flat list of every file the assistant has generated in this chat — Claude's
 *  "Artifacts"-style panel, deliberately NOT built on InsightPanel's machinery
 *  (citation highlighting, drag-resize, the document viewer) since a download list
 *  needs none of it. Attachments already live in `messages` client-side, so this
 *  needs no fetch of its own. */
export function GeneratedFilesPanel({ isOpen, onClose, messages }: GeneratedFilesPanelProps) {
  const files = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => m.attachments || []);

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

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {files.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No files generated yet</p>
                </div>
              ) : (
                files.map((file, idx) => <FileRow key={`${file.document_id || file.s3_key}-${idx}`} file={file} />)
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
