'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Send, Paperclip, Scale, Menu, PanelLeftOpen, ArrowDown, FileText, TrendingUp, Key, ClipboardList, HelpCircle, Calculator, ChevronDown, Star, Edit2, FolderPlus, Trash2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'motion/react';
import { MessageBubble } from './MessageBubble';
import { Message, Citation } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { useRouter, useParams } from 'next/navigation';

interface ChatAreaProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSendMessage: (text: string) => void;
  isLoading: boolean;
  onCitationClick: (citation: Citation) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isHydrated?: boolean;
  chatTitle?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const iconMap: Record<string, React.ElementType> = {
  FileText,
  TrendingUp,
  Key,
  ClipboardList,
  HelpCircle,
  Calculator,
  Scale
};

export function ChatArea({
  messages,
  inputValue,
  setInputValue,
  handleSendMessage,
  isLoading,
  onCitationClick,
  isSidebarOpen,
  setIsSidebarOpen,
  isHydrated = true,
  chatTitle = ''
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTitleMenuOpen, setIsTitleMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const titleMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { deleteSession, updateSessionTitle, togglePinSession, sessions } = useSessions();
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.id as string | undefined;

  const currentSession = currentChatId ? sessions.find(s => s.id === currentChatId) : null;
  const isPinned = currentSession?.isPinned;
  // ── Dynamic greeting logic ───────────────────────────────
  const firstName = (() => {
    if (!user?.full_name) return '';
    return user.full_name.split(' ')[0];
  })();

  const getGreeting = React.useCallback(() => {
    const hour = new Date().getHours();
    const name = firstName;

    // Build candidate pools
    const pools: string[][] = [];

    if (name) {
      // Named generic
      const named = t('chat.welcome_messages_named') as string[];
      pools.push(named);

      // Returning users (they have sessions)
      if (sessions.length > 0) {
        const returning = t('chat.welcome_messages_returning') as string[];
        pools.push(returning);
      }

      // Time-based
      if (hour >= 5 && hour < 12) {
        pools.push(t('chat.welcome_messages_morning') as string[]);
      } else if (hour >= 17 && hour < 21) {
        pools.push(t('chat.welcome_messages_evening') as string[]);
      } else if (hour >= 21 || hour < 5) {
        pools.push(t('chat.welcome_messages_night') as string[]);
      }
    } else {
      // Guest — no name
      const generic = t('chat.welcome_messages_generic') as string[];
      pools.push(generic);

      if (hour >= 21 || hour < 5) {
        // Night messages that don't need a name
        const nightMsgs = (t('chat.welcome_messages_night') as string[]).filter(m => !m.includes('{name}'));
        if (nightMsgs.length > 0) pools.push(nightMsgs);
      }
    }

    // Flatten and pick random
    const all = pools.flat();
    const msg = all[Math.floor(Math.random() * all.length)] || 'How can I help you today?';
    return msg.replace('{name}', name);
  }, [firstName, t, sessions.length]);

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
  }, [messages.length, getGreeting]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (titleMenuRef.current && !titleMenuRef.current.contains(event.target as Node)) {
        setIsTitleMenuOpen(false);
      }
    };
    if (isTitleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTitleMenuOpen]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = (force = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const onSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || !inputValue.trim()) return;
    handleSendMessage(inputValue);
  };

  const renderInputArea = (isCentered: boolean) => (
    <div className={`w-full max-w-3xl mx-auto relative ${isCentered ? 'mt-4' : ''}`}>
      <AnimatePresence>
        {showScrollButton && !isCentered && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom(true)}
            className="absolute -top-14 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-[#1C2128] border border-black/5 dark:border-white/5 rounded-full shadow-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-20 active:scale-95"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <form
        onSubmit={onSubmit}
        className={`bg-white dark:bg-[#1C2128] border border-black/5 dark:border-white/5 rounded-2xl shadow-md transition-all duration-300 flex flex-col overflow-hidden ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <TextareaAutosize
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={isLoading}
          maxLength={4000}
          placeholder={t('chat.input_placeholder')}
          className="w-full py-4 px-4 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-[15px] text-slate-800 dark:text-[#E6EDF3] placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed"
          minRows={1}
          maxRows={6}
        />

        <div className="flex items-center justify-between px-2 pb-2">
          <button
            type="button"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {inputValue.length} / 4000
            </span>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || inputValue.length > 4000}
              className={`p-2 rounded-xl transition-all duration-300 active:scale-95 ${inputValue.trim() && !isLoading && inputValue.length <= 4000
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-md hover:bg-slate-800 dark:hover:bg-slate-200'
                : 'bg-black/5 dark:bg-white/5 text-slate-400 dark:text-slate-600'
                }`}
              aria-label="Send message"
            >
              {isLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </form>
      <div className="text-center mt-3 text-xs text-neutral-500">
        {t('chat.footer_disclaimer', { chatbot_name: t('chatbot_name') })}
      </div>
    </div>
  );

  const promptsRow1 = t('chat.marquee_items_row1') as { text: string, icon: string | null, iconColor?: string }[];
  const promptsRow2 = t('chat.marquee_items_row2') as { text: string, icon: string | null, iconColor?: string }[];

  const renderPromptButton = (prompt: { text: string, icon: string | null, iconColor?: string }, idx: number, row: number, group: number) => {
    const IconComponent = prompt.icon ? iconMap[prompt.icon] : null;
    return (
      <button
        key={`row${row}-g${group}-${idx}`}
        onClick={() => handleSendMessage(prompt.text)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-[#1C2128]/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-[12px] md:text-[13px] font-medium text-slate-600 dark:text-slate-400 shadow-sm hover:shadow hover:bg-white dark:hover:bg-[#1C2128] hover:text-slate-800 dark:hover:text-[#E6EDF3] hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-95 whitespace-nowrap"
      >
        {IconComponent && <IconComponent className={`w-3.5 h-3.5 opacity-70 ${prompt.iconColor || ''}`} />}
        {prompt.text}
      </button>
    );
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const handleRenameSubmit = () => {
    if (currentChatId && editingTitleValue.trim()) {
      updateSessionTitle(currentChatId, editingTitleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDelete = () => {
    if (currentChatId) {
      deleteSession(currentChatId);
      router.push('/');
    }
  };

  const handlePin = () => {
    if (currentChatId) {
      togglePinSession(currentChatId);
    }
  };

  const displayTitle = chatTitle
    ? (chatTitle.length > 30 ? chatTitle.substring(0, 30) + '...' : chatTitle)
    : '';

  return (
    <main className="flex-1 flex flex-col h-full relative min-w-0 bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Background Pattern for Empty State */}
      {messages.length === 0 && (
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-200/50 dark:from-white/[0.02] to-[#fafafa] dark:to-[#0a0a0a] pointer-events-none" />
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 h-24 z-30 pointer-events-none flex flex-col justify-start">
        {/* Invisible Ribbon with Fading Mask */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa] via-[#fafafa]/90 to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a]/90 dark:to-transparent pointer-events-none" />

        <div className="relative z-10 flex items-center px-4 h-14 pointer-events-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2 active:scale-95 flex-shrink-0"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <PanelLeftOpen className="w-5 h-5 hidden md:block" />
                <Menu className="w-5 h-5 md:hidden" />
              </button>
            )}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors md:hidden active:scale-95 flex-shrink-0"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Branding / Title Logic */}
            {messages.length === 0 ? (
              !isSidebarOpen && (
                <div className="flex items-center gap-3 text-slate-900 dark:text-[#E6EDF3] flex-1 justify-center md:justify-start pr-8 md:pr-0">
                  <Image src="/yurika-logo.png" alt="Yurika Logo" width={36} height={36} className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{t('chatbot_name')}</span>
                </div>
              )
            ) : (
              <div className="relative flex-1 flex items-center" ref={titleMenuRef}>
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white outline-none border border-primary/20 dark:border-white/20 w-full max-w-sm"
                  />
                ) : (
                  <button
                    onClick={() => setIsTitleMenuOpen(!isTitleMenuOpen)}
                    className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-600 dark:text-slate-300 group max-w-full"
                  >
                    <h1 className="font-medium text-[15px] truncate">
                      {displayTitle}
                    </h1>
                    {isPinned && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 fill-amber-500" />}
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform ${isTitleMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}

                <AnimatePresence>
                  {isTitleMenuOpen && !isEditingTitle && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#1C2128] border border-black/5 dark:border-white/5 rounded-xl shadow-lg overflow-hidden z-50"
                    >
                      <div className="p-1 flex flex-col">
                        <button
                          onClick={() => {
                            setIsTitleMenuOpen(false);
                            handlePin();
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Star className="w-4 h-4 text-slate-400" /> {isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={() => {
                            setIsTitleMenuOpen(false);
                            setEditingTitleValue(chatTitle || '');
                            setIsEditingTitle(true);
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" /> Rename
                        </button>
                        <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-1" />
                        <button
                          onClick={() => {
                            setIsTitleMenuOpen(false);
                            handleDelete();
                          }}
                          className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-4 md:p-8 space-y-6 z-0 relative flex flex-col pt-20"
      >
        {!isHydrated ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto relative z-10 w-full md:mb-12"
          >
            <div className="flex flex-col items-center w-full max-w-2xl mb-8 px-4 sm:px-8 md:px-0">
              <motion.h2 variants={itemVariants} className="text-xl md:text-3xl font-semibold text-slate-800 dark:text-[#E6EDF3] mb-4 tracking-tight">
                {greeting}
              </motion.h2>

              <motion.div variants={itemVariants} className="w-full overflow-hidden mask-gradient flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity duration-500">
                {/* Row 1 */}
                <div className="flex w-max animate-marquee pause-on-hover">
                  {[1, 2].map((group) => (
                    <div key={`group1-${group}`} className="flex gap-2 pr-2">
                      {promptsRow1.map((prompt, idx) => renderPromptButton(prompt, idx, 1, group))}
                    </div>
                  ))}
                </div>

                {/* Row 2 */}
                <div className="flex w-max animate-marquee-reverse pause-on-hover">
                  {[1, 2].map((group) => (
                    <div key={`group2-${group}`} className="flex gap-2 pr-2">
                      {promptsRow2.map((prompt, idx) => renderPromptButton(prompt, idx, 2, group))}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="w-full px-4 hidden md:block">
              {renderInputArea(true)}
            </motion.div>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-0 flex-1 pb-32">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onCitationClick={onCitationClick} />
            ))}

            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex justify-start py-6"
                >
                  <div className="bg-transparent text-slate-500 dark:text-slate-400 flex items-center gap-3">
                    <Scale className="w-5 h-5 text-slate-900 dark:text-white animate-pulse" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('chat.processing', { chatbot_name: t('chatbot_name') })}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom when messages exist OR on mobile when empty) */}
      {(messages.length > 0 || true) && (
        <div className={`absolute bottom-0 left-0 right-0 p-4 flex-shrink-0 z-20 pb-6 pointer-events-none ${messages.length === 0 ? 'block md:hidden' : 'block'}`}>
          <div className="pointer-events-auto">
            {renderInputArea(false)}
          </div>
        </div>
      )}
    </main>
  );
}
