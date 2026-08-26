'use client';

import React, { useState } from 'react';
import { X, Lock, Globe, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** true = "Create public link", false = "Keep private" (revoke). Returns the
   *  share URL on success, or null (revoke, or a failed request). */
  shareSession: (makePublic: boolean) => Promise<string | null>;
}

/** ChatGPT/Claude-style "Share chat" modal — a snapshot boundary, not a live
 *  toggle: creating a link fixes "up to this point" as the visible range: later
 *  messages the owner sends simply aren't on the existing link (see backend
 *  governing constraints). */
export function ShareChatModal({ isOpen, onClose, shareSession }: ShareChatModalProps) {
  const [option, setOption] = useState<'private' | 'public'>('private');
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleClose = () => {
    onClose();
    // Reset after the exit animation, not before — an instant reset would flash
    // the form back over the just-created link mid-close.
    setTimeout(() => { setOption('private'); setShareUrl(null); setIsCopied(false); }, 200);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    const url = await shareSession(option === 'public');
    setIsCreating(false);
    if (option === 'public' && url) {
      setShareUrl(url);
    } else {
      handleClose();
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API requires a secure context
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] w-full max-w-md bg-white dark:bg-[#1C2128] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Share chat</h2>
              <button onClick={handleClose} className="p-1.5 text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareUrl ? (
              <div className="p-5 flex flex-col gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">Anyone with this link can view a read-only copy of this chat, up to this point.</p>
                <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-3 py-2.5">
                  <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{shareUrl}</span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-1 self-end px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Only messages up to this point will be shared.</p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setOption('private')}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${option === 'private' ? 'border-primary bg-primary/5' : 'border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}`}
                  >
                    <Lock className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Keep private</p>
                      <p className="text-xs text-slate-400">Only you can see this chat</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setOption('public')}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${option === 'public' ? 'border-primary bg-primary/5' : 'border-black/10 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'}`}
                  >
                    <Globe className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Create public link</p>
                      <p className="text-xs text-slate-400">Anyone with the link can view this chat</p>
                    </div>
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Shared chats may be viewed by anyone with the link, without needing an account. Avoid sharing personal or sensitive information.
                </p>

                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {isCreating ? 'Working…' : option === 'public' ? 'Create share link' : 'Save'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
