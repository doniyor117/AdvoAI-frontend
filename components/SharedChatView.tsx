'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { Message, Citation, FileAttachment } from '@/hooks/useChatManager';

type SharedMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[] | null;
  attachments?: FileAttachment[] | null;
};

/** Renders a shared chat's messages read-only — no sidebar, no input box, no
 *  action row (MessageBubble's `readOnly` prop suppresses all of that). A
 *  disclaimer banner up top and a CTA to start a real chat at the bottom, matching
 *  the Claude reference. */
export function SharedChatView({ title, messages }: { title: string; messages: SharedMessage[] }) {
  const asMessages: Message[] = messages.map(m => ({
    id: m.id,
    role: m.role,
    text: m.content,
    citations: m.sources || undefined,
    attachments: m.attachments || undefined,
  }));

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col">
      <div className="bg-amber-50 dark:bg-amber-900/15 border-b border-amber-200/70 dark:border-amber-900/30 px-4 py-2.5 flex items-center justify-center gap-2 text-center">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-400">
          This is a shared copy of a chat with AdvoAI. Content may include mistakes or unverified information.
        </p>
      </div>

      <header className="flex items-center gap-2.5 px-4 md:px-8 h-16 flex-shrink-0">
        <Image src="/advoai-logo.png" alt="AdvoAI" width={28} height={28} className="w-7 h-7 object-contain" unoptimized />
        <span className="font-semibold text-slate-800 dark:text-slate-100">{title}</span>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-3 md:px-8 pb-12">
        {asMessages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCitationClick={() => {}}
            readOnly
          />
        ))}
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-[#fafafa] dark:from-[#0a0a0a] via-[#fafafa]/95 dark:via-[#0a0a0a]/95 to-transparent pt-10 pb-6 flex justify-center">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg hover:bg-primary/90 transition-colors"
        >
          Ask AdvoAI your own question
        </Link>
      </div>
    </div>
  );
}
