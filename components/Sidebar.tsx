'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, Plus, Scale, X, PanelLeftClose, PanelLeftOpen, Search, Settings, User, LogOut, CreditCard, FileText, GitCompare, FileSignature, Globe, ChevronDown, Check, Trash2, MoreVertical, Edit2, Pin, Shield, LogIn, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { SettingsModal } from './SettingsModal';
import { useSessions } from '@/hooks/useSessions';
import { useRouter, useParams } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onNewConsultation: () => void;
  onAgreementSummaryClick?: () => void;
  onCompareContractsClick?: () => void;
  onCreateContractClick?: () => void;
  onSessionClick?: () => void;
}

function SessionMenu({ onDelete, onRename, onPin, isPinned }: { onDelete: (e: React.MouseEvent) => void, onRename: (e: React.MouseEvent) => void, onPin: (e: React.MouseEvent) => void, isPinned?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useClickOutside([menuRef, buttonRef], () => setIsOpen(false), isOpen);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 144, // 144 is w-36
      });
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
        aria-label="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`
            }}
            className="w-36 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-[9999]"
          >
            <div className="p-1 flex flex-col">
              <button
                onClick={(e) => { setIsOpen(false); onPin(e); }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <Pin className="w-3.5 h-3.5" /> {isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={(e) => { setIsOpen(false); onRename(e); }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Rename
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-1" />
              <button
                onClick={(e) => { setIsOpen(false); onDelete(e); }}
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export function Sidebar({ isOpen, setIsOpen, onNewConsultation, onAgreementSummaryClick, onCompareContractsClick, onCreateContractClick, onSessionClick }: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const { t, lang, setLang } = useLanguage();
  const { user, isAuthenticated, isAdmin, logout, isLoading } = useAuth();
  const { settings } = usePublicSettings();

  const { sessions, deleteSession, updateSessionTitle, togglePinSession, isHydrated } = useSessions();
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.id as string | undefined;

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useClickOutside(profileMenuRef, () => {
    setIsProfileMenuOpen(false);
    setIsLangMenuOpen(false);
  }, isProfileMenuOpen);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'uz', label: "O'zbekcha" },
    { code: 'ru', label: 'Русский' }
  ];

  const handleSessionClick = (id: string) => {
    if (onSessionClick) onSessionClick();
    router.push(`/chat/${id}`);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    if (currentChatId === id) {
      router.push('/');
    }
  };

  const handleNewConsultation = () => {
    onNewConsultation();
    router.push('/');
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleRenameSubmit = (id: string) => {
    if (editingTitle.trim()) {
      updateSessionTitle(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handlePinSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    togglePinSession(id);
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout();
    router.push('/');
  };

  const filteredSessions = sessions
    .filter(session => session.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp - a.timestamp;
    });

  // Get display name and initials
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 bg-[#FDFBF7] dark:bg-sidebar border-r border-slate-200 dark:border-sidebar-border flex flex-col overflow-hidden transition-[width,transform] duration-300 ease-in-out flex-shrink-0 ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-[60px]'
        }`}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="px-3 py-3 flex items-center justify-between min-w-[256px] h-[60px]">
            <button
              className="flex-1 flex items-center gap-3 text-primary dark:text-[#E6EDF3] group/logo rounded-lg hover:bg-black/5 dark:hover:bg-white/5 p-1 -ml-1 transition-colors relative"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle sidebar"
            >
              <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-md transition-colors">
                <Image 
                  src="/advoai-logo.png" 
                  alt="AdvoAI Logo" 
                  width={40} 
                  height={40} 
                  className="object-contain transition-opacity duration-300 md:group-hover/logo:opacity-0" 
                  referrerPolicy="no-referrer" 
                  unoptimized 
                />
                <div className="absolute inset-0 items-center justify-center hidden md:flex opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300">
                  {isOpen ? <PanelLeftClose className="w-6 h-6 text-slate-500 dark:text-slate-400" /> : <PanelLeftOpen className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                </div>
              </div>
              <span className={`text-xl font-bold text-slate-900 dark:text-white transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 overflow-hidden w-0'}`}>
                {t('chatbot_name')}
              </span>
            </button>
            <button
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors active:scale-95 md:hidden"
              onClick={() => setIsOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-2 min-w-[256px] space-y-1">
            <button
              onClick={handleNewConsultation}
              className={`w-full flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors active:scale-95 group/newchat ${!isOpen ? 'md:w-9' : ''}`}
              aria-label="New Chat"
            >
              <Edit2 className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              <span className={`font-medium transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>{t('sidebar.new_consultation')}</span>
            </button>

            <div className="relative">
              {!isSearchActive && (
                <button
                  onClick={() => {
                    setIsSearchActive(true);
                    if (!isOpen && window.innerWidth >= 768) setIsOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors active:scale-95 ${!isOpen ? 'md:w-9' : ''}`}
                >
                  <Search className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                  <span className={`font-medium transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>{t('sidebar.search_chats')}</span>
                </button>
              )}
              
              {isSearchActive && (
                <div className={`relative transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setIsSearchActive(false); }}
                    placeholder={t('sidebar.search_past_sessions')}
                    className="w-full pl-9 pr-8 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-white/20 focus:border-primary dark:focus:border-white/30 transition-all text-slate-700 dark:text-[#E6EDF3] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button 
                    onClick={() => { setIsSearchActive(false); setSearchQuery(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`px-3 pb-2 mt-4 space-y-1 min-w-[256px] transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'md:opacity-0 pointer-events-none'}`}>
            <button
              onClick={() => {
                if (onAgreementSummaryClick) onAgreementSummaryClick();
                if (window.innerWidth < 768) setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors active:scale-95"
            >
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span className="truncate font-medium">{t('sidebar.agreement_summary')}</span>
            </button>
            <button
              onClick={() => {
                if (onCompareContractsClick) onCompareContractsClick();
                if (window.innerWidth < 768) setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors active:scale-95"
            >
              <GitCompare className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span className="truncate font-medium">{t('sidebar.compare_agreements')}</span>
            </button>
            <button
              onClick={() => {
                if (onCreateContractClick) onCreateContractClick();
                if (window.innerWidth < 768) setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors active:scale-95"
            >
              <FileSignature className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span className="truncate font-medium">{t('sidebar.create_agreement')}</span>
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto px-3 pb-3 pt-5 mt-2 space-y-1 min-w-[256px] transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'md:opacity-0 pointer-events-none'}`}>
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">{t('sidebar.recent_sessions')}</div>

                {isHydrated && filteredSessions.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400 text-center italic">
                    {searchQuery ? 'No matching sessions' : 'No recent sessions'}
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => {
                        if (editingSessionId !== session.id) {
                          handleSessionClick(session.id);
                        }
                      }}
                      className={`group relative w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${editingSessionId !== session.id ? 'cursor-pointer' : ''} ${currentChatId === session.id
                          ? 'bg-black/5 dark:bg-white/10 text-primary dark:text-white font-medium'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      <div className="flex items-center overflow-hidden pr-6 flex-1">
                        {editingSessionId === session.id ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleRenameSubmit(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit(session.id);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            autoFocus
                            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate flex-1 font-medium">{session.title}</span>
                        )}
                        {session.isPinned && <Pin className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                      </div>

                      {editingSessionId !== session.id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <SessionMenu
                              onDelete={(e) => handleDeleteSession(e, session.id)}
                              onRename={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(session.id);
                                setEditingTitle(session.title);
                              }}
                              onPin={(e) => handlePinSession(e, session.id)}
                              isPinned={session.isPinned}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* ── Dynamic Auth Footer ──────────────────────── */}
              <div className="mt-auto p-4 border-t border-black/5 dark:border-white/5 min-w-[256px] relative" ref={profileMenuRef}>
                <div className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'md:opacity-0 pointer-events-none'}`}>
                  {isLoading ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 opacity-50">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ) : isAuthenticated && user ? (
                    <>
                      {/* Logged-in: Profile dropdown */}
                      <AnimatePresence>
                        {isProfileMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
                          >
                            <div className="p-2 space-y-1 relative">
                              {/* Language Dropdown */}
                              <div className="relative" ref={langMenuRef}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsLangMenuOpen(!isLangMenuOpen);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors focus:outline-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <span className="font-medium">{languages.find(l => l.code === lang)?.label}</span>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                  {isLangMenuOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -5 }}
                                      className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-slate-700 rounded-lg shadow-md overflow-hidden z-[60]"
                                    >
                                      {languages.map((l) => (
                                        <button
                                          key={l.code}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLang(l.code as Language);
                                            setIsLangMenuOpen(false);
                                          }}
                                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-300 transition-colors"
                                        >
                                          <span>{l.label}</span>
                                          {lang === l.code && <Check className="w-4 h-4 text-primary dark:text-[#1F6FEB]" />}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

                              {isAdmin && (
                                <a
                                  href="/admin"
                                  onClick={() => {
                                    setIsProfileMenuOpen(false);
                                    setIsOpen(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors"
                                >
                                  <Shield className="w-4 h-4 text-primary dark:text-[#1F6FEB]" />
                                  <span>Admin Panel</span>
                                </a>
                              )}

                              <button
                                onClick={() => {
                                  setIsProfileMenuOpen(false);
                                  setIsSettingsOpen(true);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors"
                              >
                                <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <span>{t('sidebar.settings')}</span>
                              </button>

                              {settings?.ui_support_email && (
                                <a
                                  href={`mailto:${settings.ui_support_email}`}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-lg text-sm text-left transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-slate-500"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                  <span>Contact Support</span>
                                </a>
                              )}

                              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />
                              <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-left transition-colors"
                              >
                                <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
                                <span>{t('sidebar.log_out')}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors active:scale-95 ${isProfileMenuOpen ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'} text-slate-700 dark:text-slate-300`}
                      >
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="truncate font-medium block text-sm text-slate-900 dark:text-white">{displayName}</span>
                          {user.email && (
                            <span className="truncate block text-xs text-slate-500">{user.email}</span>
                          )}
                        </div>
                        <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      </button>
                    </>
                  ) : (
                    /* Not logged in: Login/Signup button */
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-[#E6EDF3] dark:bg-white/10 dark:hover:bg-white/20 rounded-full text-sm font-medium transition-all duration-300 shadow-sm shadow-inner hover:scale-[1.02] active:scale-95 border border-primary/10 dark:border-white/10"
                    >
                      <LogIn className="w-4 h-4" />
                      Log In / Sign Up
                    </Link>
                  )}
                </div>
              </div>
        </div>
      </aside>
    </>
  );
}

