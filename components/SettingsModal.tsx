'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Monitor, Moon, Sun, Loader2, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}



export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'account'>('general');
  const [mounted, setMounted] = useState(false);

  // Account form state
  const [fullName, setFullName] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => setMounted(true), []);

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setSaveState('idle');
    }
  }, [isOpen, user]);

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaveState('saving');
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });

      if (res.ok) {
        setSaveState('saved');
        await refreshUser(); // Sync auth state immediately
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      }
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  if (!mounted) return null;

  const tabs = [
    { key: 'general' as const, label: t('settings.general') as string },
    { key: 'account' as const, label: t('settings.account') as string },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed -inset-4 bg-black/50 backdrop-blur-sm z-[60] transform-gpu"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-0 right-0 bottom-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-2xl bg-white dark:bg-[#161B22] rounded-t-2xl md:rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[90vh] md:max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-[#E6EDF3]">
                {t('settings.title') as string}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Settings Sidebar (Tabs on Mobile) */}
              <div className="flex md:flex-col w-full md:w-48 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-2 md:p-4 gap-1 md:space-y-1 bg-slate-50 dark:bg-[#0F1117] overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 md:w-full text-left px-4 md:px-3 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === tab.key
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-[#E6EDF3]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Settings Content */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                {activeTab === 'general' && (
                  <div className="space-y-6 md:space-y-8">
                    {/* Theme Section */}
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        {t('settings.theme') as string}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {[
                          { key: 'light', icon: Sun, label: 'Light' },
                          { key: 'dark', icon: Moon, label: 'Dark' },
                          { key: 'system', icon: Monitor, label: 'System' },
                        ].map(({ key, icon: Icon, label }) => (
                          <button
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 transition-all ${theme === key
                              ? 'border-primary dark:border-[#1F6FEB] bg-primary/5 dark:bg-[#1F6FEB]/10 text-primary dark:text-[#1F6FEB]'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                              }`}
                          >
                            <Icon className="w-5 h-5 md:w-6 md:h-6 mb-1.5 md:mb-2" />
                            <span className="text-xs md:text-sm font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="space-y-6 md:space-y-8">
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        {t('settings.account') as string}
                      </h3>

                      {!user ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Please log in to manage your account settings.
                        </p>
                      ) : (
                        <form onSubmit={handleSaveAccount} className="space-y-5">
                          {/* Full Name */}
                          <div className="space-y-1.5">
                            <label
                              htmlFor="settings-fullname"
                              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                              {t('settings.full_name') as string}
                            </label>
                            <input
                              id="settings-fullname"
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:focus:ring-[#1F6FEB]/50 dark:focus:border-[#1F6FEB] transition-all"
                              placeholder="Your name"
                            />
                          </div>

                          {/* Email (read-only) */}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                              {t('settings.email') as string}
                            </label>
                            <div className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1117] text-slate-500 dark:text-slate-500 text-sm cursor-not-allowed">
                              {user.email}
                            </div>
                          </div>

                          {/* Save Button */}
                          <button
                            type="submit"
                            disabled={saveState === 'saving' || !fullName.trim() || fullName.trim() === (user.full_name || '')}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${saveState === 'saved'
                              ? 'bg-emerald-500 text-white'
                              : saveState === 'error'
                                ? 'bg-red-500 text-white'
                                : 'bg-primary dark:bg-[#1F6FEB] text-white hover:bg-primary/90 dark:hover:bg-[#1F6FEB]/90'
                              }`}
                          >
                            {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saveState === 'saved' && <Check className="w-4 h-4" />}
                            {saveState === 'saving'
                              ? (t('settings.saving') as string)
                              : saveState === 'saved'
                                ? (t('settings.saved') as string)
                                : saveState === 'error'
                                  ? (t('settings.save_error') as string)
                                  : (t('settings.save_changes') as string)}
                          </button>
                        </form>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
