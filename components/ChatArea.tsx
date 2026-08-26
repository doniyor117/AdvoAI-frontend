'use client';

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Send, Paperclip, Scale, Menu, PanelLeftOpen, ArrowDown, ArrowUp, FileText, TrendingUp, Key, ClipboardList, HelpCircle, Calculator, ChevronDown, Star, Edit2, FolderPlus, Trash2, X, Image as ImageIcon, CornerDownLeft, Quote, Globe, Plus } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from 'motion/react';
import { MessageBubble } from './MessageBubble';
import { Message, Citation, FileAttachment } from '@/hooks/useChatManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions } from '@/hooks/useSessions';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { TextSelectionTooltip } from './TextSelectionTooltip';
import { useRouter, useParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

interface ChatAreaProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSendMessage: (text: string) => void;
  isLoading: boolean;
  onCitationClick: (citation: Citation, messageCitations: Citation[]) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isHydrated?: boolean;
  chatTitle?: string;
  attachments?: FileAttachment[];
  uploadFile?: (file: File) => void;
  removeAttachment?: (idx: number) => void;
  onAttachmentClick?: (attachment: FileAttachment) => void;
  quotedText?: string;
  setQuotedText?: (val: string) => void;
  sendBlockedReason?: string | null;
  useWebSearch?: boolean;
  setUseWebSearch?: (val: boolean) => void;
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
  chatTitle = '',
  attachments = [],
  uploadFile,
  removeAttachment,
  onAttachmentClick,
  quotedText = '',
  setQuotedText,
  sendBlockedReason = null,
  useWebSearch = false,
  setUseWebSearch
}: ChatAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastScrollTop = useRef(0);
  const [isTitleMenuOpen, setIsTitleMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const titleMenuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { deleteSession, updateSessionTitle, togglePinSession, sessions } = useSessions();
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.id as string | undefined;
  const { settings } = usePublicSettings();

  const handleQuoteSelection = (text: string) => {
    if (setQuotedText) {
      setQuotedText(text);
      setTimeout(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        } else {
            const textarea = document.querySelector('textarea');
            if (textarea) textarea.focus();
        }
      }, 150);
    }
  };

  const currentSession = currentChatId ? sessions.find(s => s.id === currentChatId) : null;
  const isPinned = currentSession?.isPinned;
  
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  useEffect(() => {
    const prompts = t('chat.empty_state_prompts') as string[];
    if (prompts && Array.isArray(prompts) && prompts.length > 0) {
      const shuffled = [...prompts].sort(() => 0.5 - Math.random());
      setRandomPrompts(shuffled.slice(0, 3));
    }
  }, [t, currentChatId]);
  // ── Dynamic greeting logic ───────────────────────────────
  const firstName = (() => {
    if (!user?.full_name) return '';
    return user.full_name.split(' ')[0];
  })();

  const [randomSeed] = React.useState(() => Math.random());

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

    // Flatten and pick random using the stable seed
    const all = pools.flat();
    const msg = all[Math.floor(randomSeed * all.length)] || 'How can I help you today?';
    return msg.replace('{name}', name);
  }, [firstName, t, sessions.length, randomSeed]);

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    if (messages.length > 0) return;
    const timer = setTimeout(() => setGreeting(getGreeting()), 0);
    return () => clearTimeout(timer);
  }, [messages.length, getGreeting]);

  useClickOutside(titleMenuRef, () => setIsTitleMenuOpen(false), isTitleMenuOpen);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Show button only when scrolling up and not near bottom
    if (isNearBottom) {
      setShowScrollButton(false);
    } else if (scrollTop < lastScrollTop.current - 5) {
      // Scrolling up significantly
      setShowScrollButton(true);
    } else if (scrollTop > lastScrollTop.current + 5) {
      // Scrolling down significantly
      setShowScrollButton(false);
    }
    
    lastScrollTop.current = scrollTop;
  };

  const scrollToBottom = (force = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: force ? 'instant' : 'smooth' });
  };

  const scrollToMessage = (id: string, force = false) => {
    const el = document.getElementById(`message-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: force ? 'instant' : 'smooth', block: 'start' });
    } else {
      scrollToBottom(force);
    }
  };

  const prevIsLoading = useRef(isLoading);
  const lastMessageId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentLastId = messages.length > 0 ? messages[messages.length - 1].id : undefined;
    const isNewMessageId = currentLastId !== lastMessageId.current && currentLastId !== undefined;
    const isStartedLoading = isLoading && !prevIsLoading.current;

    if (isNewMessageId || isStartedLoading) {
      const isInitial = lastMessageId.current === undefined;
      // Slight delay to ensure DOM is ready
      setTimeout(() => {
        if (isStartedLoading) {
          const loadingEl = document.getElementById('loading-indicator');
          if (loadingEl) {
            loadingEl.scrollIntoView({ behavior: isInitial ? 'instant' : 'smooth', block: 'start' });
          } else {
            scrollToBottom(isInitial);
          }
        } else if (isNewMessageId && currentLastId) {
          scrollToMessage(currentLastId, isInitial);
        }
      }, 50);
    }
    
    lastMessageId.current = currentLastId;
    prevIsLoading.current = isLoading;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading]);

  const onSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || (!inputValue.trim() && attachments.length === 0)) return;
    handleSendMessage(inputValue);
  };

  const renderInputArea = (isCentered: boolean) => (
    <div className={`w-full max-w-4xl mx-auto relative ${!isCentered ? 'px-0 md:px-4' : 'px-4 mt-4'}`}>
      <AnimatePresence>
        {showScrollButton && !isCentered && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => scrollToBottom(true)}
              className="absolute -top-14 left-1/2 -translate-x-1/2 p-2 bg-white/90 dark:bg-[#1C2128]/90 backdrop-blur-sm border border-black/5 dark:border-white/5 rounded-full shadow-lg text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-foreground hover:scale-[1.05] transition-all z-20 active:scale-95"
              aria-label="Scroll to bottom"
            >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <form
        onSubmit={onSubmit}
        className={`border transition-all duration-300 flex flex-col overflow-hidden ${
          isCentered
            ? 'bg-white dark:bg-[#262626] border-slate-200 dark:border-white/5 rounded-[24px] md:rounded-3xl shadow-xl'
            : 'bg-[#FDFBF7] dark:bg-[#262626] border-slate-200/60 dark:border-white/5 rounded-[24px] md:rounded-3xl shadow-xl md:shadow-xl border mx-2 mb-2 md:mx-0 md:mb-0'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {quotedText && (
          <div className="flex items-center justify-between mx-4 mt-3 mb-1 p-2.5 bg-slate-100 dark:bg-[#1C2128] border border-slate-200 dark:border-white/5 rounded-xl group/quote">
            <div className="flex items-center gap-2 overflow-hidden text-slate-700 dark:text-slate-300">
              <div className="w-5 h-5 flex items-center justify-center bg-white dark:bg-[#0d1117] rounded shadow-sm text-amber-500 flex-shrink-0">
                <Quote className="w-3 h-3" />
              </div>
              <span className="text-[11px] sm:text-xs font-medium truncate">
                {t('chat.quote_selection')}: <span className="opacity-80 font-normal">&quot;{quotedText.substring(0, 40)}{quotedText.length > 40 ? '...' : ''}&quot;</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQuotedText?.('')}
              className="p-1 rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2 flex-shrink-0"
              aria-label="Remove quote"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sendBlockedReason && (
          <div className="px-5 pt-3 -mb-1">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {sendBlockedReason}
            </p>
          </div>
        )}

        {attachments.length > 0 && removeAttachment && (
          <div className="flex items-center gap-3 px-5 pt-4 pb-1 flex-wrap">
            {attachments.map((file, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  if (onAttachmentClick && file.local_url && !file.is_uploading) {
                    onAttachmentClick(file);
                  }
                }}
                className={`relative flex-shrink-0 w-20 h-20 rounded-2xl shadow-sm group overflow-hidden border border-slate-200 dark:border-white/10 ${(!file.is_uploading && file.local_url) ? 'cursor-pointer' : ''}`}
              >
                {/* Full-square thumbnail for images, file card for docs */}
                {file.is_uploading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#1a1a1a]">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] text-slate-400">Uploading…</span>
                  </div>
                ) : file.error ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 dark:bg-red-900/20 px-1 border border-red-200 dark:border-red-900/50">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-[8px] leading-tight font-medium text-red-600 dark:text-red-400 w-full text-center px-0.5 line-clamp-3" title={file.error}>
                      {file.error || 'Error'}
                    </span>
                  </div>
                ) : file.mime_type?.startsWith('image/') && file.local_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.local_url}
                    alt={file.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50 dark:bg-[#1a1a1a] px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                      {file.display_name.split('.').pop()?.slice(0, 4) || 'DOC'}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 w-full text-center truncate px-1">
                      {file.display_name}
                    </span>
                  </div>
                )}
                {/* Gradient label strip for images */}
                {!file.is_uploading && !file.error && file.mime_type?.startsWith('image/') && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pt-3 pb-1">
                    <span className="text-[9px] text-white font-medium truncate block">{file.display_name}</span>
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(idx);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <TextareaAutosize
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
              // If the paste event contains files (like an image), handle them as attachments
              if (uploadFile) {
                Array.from(e.clipboardData.files).forEach(file => uploadFile(file));
              }
            }
          }}
          disabled={isLoading}
          maxLength={4000}
          placeholder={t('chat.input_placeholder')}
          className="w-full px-4 py-3 md:p-5 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-base font-sans text-slate-800 dark:text-[#E6EDF3] placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          minRows={1}
          maxRows={6}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <input 
            type="file" 
            multiple 
            className="hidden" 
            ref={fileInputRef} 
            accept=".pdf,.txt,.md,.csv,.html,.htm,.doc,.docx,.rtf,.png,.jpg,.jpeg,.webp,.gif"
            onChange={(e) => {
              if (e.target.files && uploadFile) {
                Array.from(e.target.files).forEach(file => uploadFile(file));
              }
              e.target.value = ''; // Reset to allow same file re-upload
            }}
          />
          <DropdownMenu open={isToolsMenuOpen} onOpenChange={setIsToolsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
                  isToolsMenuOpen
                    ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                aria-label={t('chat.tools_menu')}
                aria-expanded={isToolsMenuOpen}
              >
                <Plus className={`w-5 h-5 transition-transform ${isToolsMenuOpen ? 'rotate-45' : ''}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-64 bg-white dark:bg-[#1C2128] border-black/5 dark:border-white/5 rounded-xl shadow-lg p-1"
            >
              <DropdownMenuItem
                onSelect={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer focus:bg-slate-100 dark:focus:bg-white/5 focus:text-inherit"
              >
                <Paperclip className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{t('chat.attach_files')}</span>
              </DropdownMenuItem>

              {isAuthenticated && setUseWebSearch && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setUseWebSearch(!useWebSearch);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer focus:bg-slate-100 dark:focus:bg-white/5 focus:text-inherit"
                  aria-pressed={useWebSearch}
                >
                  <Globe className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{t('chat.web_search_toggle')}</span>
                  <span
                    className={`relative inline-flex w-9 h-5 flex-shrink-0 items-center rounded-full transition-colors ${
                      useWebSearch ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        useWebSearch ? 'translate-x-[18px]' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={(!inputValue.trim() && attachments.length === 0) || isLoading || inputValue.length > 4000 || attachments.some(a => a.error) || attachments.some(a => a.is_uploading)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 ${(inputValue.trim() || attachments.length > 0) && !isLoading && inputValue.length <= 4000 && !attachments.some(a => a.error) && !attachments.some(a => a.is_uploading)
                ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:scale-[1.05]'
                : 'bg-black/5 dark:bg-white/5 text-slate-400 dark:text-slate-600'
                }`}
              aria-label="Send message"
            >
              {isLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <ArrowUp className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );



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
    <main className="flex-1 flex flex-col h-full relative min-w-0 bg-[#fafafa] dark:bg-[#0a0a0a] transition-[width,background-color] duration-300 ease-out">
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
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2 active:scale-95 flex-shrink-0 md:hidden"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors md:hidden mr-2"
                aria-label="Close sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Branding / Title Logic */}
            {messages.length === 0 ? (
              !isSidebarOpen && (
                <div className="flex items-center gap-3 text-slate-900 dark:text-[#E6EDF3] flex-1 justify-center md:justify-start pr-8 md:pr-0 md:pl-1">
                  <Image src="/advoai-logo.png" alt="AdvoAI Logo" width={40} height={40} className="w-10 h-10 object-contain md:hidden" referrerPolicy="no-referrer" unoptimized />
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{t('chatbot_name')}</span>
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
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 md:px-8 py-4 md:py-8 z-0 relative flex flex-col pt-24"
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
            className="flex-1 flex flex-col items-center justify-center text-center w-full px-4"
          >
            <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
              <motion.h1 variants={itemVariants} className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-[#E6EDF3] mb-8 tracking-tight">
                {greeting}
              </motion.h1>

              <motion.div variants={itemVariants} className="w-full relative z-20">
                {renderInputArea(true)}
              </motion.div>

              {randomPrompts.length > 0 && (
                <motion.div variants={itemVariants} className="hidden md:flex w-full flex-col md:flex-row flex-wrap items-center justify-center gap-y-1 md:gap-y-2 md:gap-x-4 mt-6">
                  {randomPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="group flex items-center gap-2 bg-transparent rounded-xl px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200 transition-all duration-200 cursor-pointer w-full md:w-auto justify-center md:justify-start"
                    >
                      {prompt}
                      <CornerDownLeft className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-0 flex-1 pb-24 md:pb-32">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onCitationClick={onCitationClick}
                onAttachmentClick={onAttachmentClick}
              />
            ))}

            <AnimatePresence>
              {/* Once the streaming assistant placeholder exists, its own inline
                  indicator (MessageBubble) takes over — showing this one too would
                  stack two spinners for the whole answer, not just the brief gap
                  before the placeholder is created. */}
              {isLoading && !messages.some(m => m.role === 'assistant' && m.isStreaming) && (
                <motion.div
                  id="loading-indicator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col justify-start py-4 md:py-6 mb-2 md:mb-0 scroll-mt-24 md:scroll-mt-28"
                >
                  <div className="bg-transparent text-slate-500 dark:text-slate-400 flex items-center gap-3 pl-1 md:pl-0">
                    <Image src="/advoai-logo.png" alt="AdvoAI Logo" width={24} height={24} className="w-6 h-6 object-contain animate-pulse" referrerPolicy="no-referrer" unoptimized />
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {t('chat.processing', { chatbot_name: t('chatbot_name') })}
                      </span>
                      <div className="flex space-x-1 mt-1">
                        <div className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                        <div className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                        <div className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
            {/* Hidden until the reply actually settles — showing it (and the
                per-message action row) while still searching/streaming reads
                as commenting on an answer that doesn't exist yet. */}
            {!isLoading && !messages.some(m => m.isStreaming) && (
              <div className="text-center text-[10px] md:text-xs text-neutral-400 dark:text-neutral-500 pt-8 pb-4">
                {t('chat.footer_disclaimer', { chatbot_name: t('chatbot_name') })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom when messages exist OR on mobile when empty) */}
      {(messages.length > 0) && (
        <div className={`absolute bottom-0 left-0 right-0 md:p-4 flex-shrink-0 z-20 pb-0 md:pb-6 pt-12 pointer-events-none bg-gradient-to-t from-background via-background/90 to-transparent ${messages.length === 0 ? 'block md:hidden' : 'block'}`}>
          <div className="pointer-events-auto">
            {renderInputArea(false)}
          </div>
        </div>
      )}

      <TextSelectionTooltip onQuote={handleQuoteSelection} />
    </main>
  );
}
