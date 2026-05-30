'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Monitor, Moon, Sun, Loader2, Check, Eye, EyeOff, Download, Smartphone } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { authFetch, safeJson } from '@/lib/authFetch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}



export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'security'>('general');
  const [mounted, setMounted] = useState(false);

  // Account form state
  const [fullName, setFullName] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSaveState, setPassSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Admin Password Update State
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmNewAdminPassword, setConfirmNewAdminPassword] = useState('');
  const [adminPassError, setAdminPassError] = useState('');
  const [adminPassSaveState, setAdminPassSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [emailStep, setEmailStep] = useState<'request' | 'verify'>('request');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailSaveState, setEmailSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const [allowDataCollection, setAllowDataCollection] = useState(user?.allow_data_collection ?? true);
  const [privacySaveState, setPrivacySaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (user && user.allow_data_collection !== undefined) {
      setAllowDataCollection(user.allow_data_collection);
    }
  }, [user]);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const { renderGoogleButton, isAvailable: isGoogleAvailable } = useGoogleAuth({
    onCredential: handleLinkGoogle,
  });

  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  useEffect(() => {
    if (activeTab === 'security' && isGoogleAvailable && googleButtonRef.current) {
        setTimeout(() => {
            if (googleButtonRef.current) renderGoogleButton(googleButtonRef.current);
        }, 100);
    }
  }, [activeTab, isGoogleAvailable, renderGoogleButton]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPassError('New passwords do not match');
      return;
    }
    setPassSaveState('saving');
    setPassError('');
    try {
      const res = await authFetch('/api/account/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setPassSaveState('saved');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPassSaveState('idle'), 3000);
      } else {
        setPassSaveState('error');
        setPassError(data.detail || 'Failed to update password');
      }
    } catch {
      setPassSaveState('error');
      setPassError('An unexpected error occurred');
    }
  }

  async function handleUpdateAdminPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newAdminPassword !== confirmNewAdminPassword) {
      setAdminPassError('New passwords do not match');
      return;
    }
    setAdminPassSaveState('saving');
    setAdminPassError('');
    try {
      const res = await authFetch('/api/account/update-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_admin_password: currentAdminPassword, new_admin_password: newAdminPassword }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setAdminPassSaveState('saved');
        setCurrentAdminPassword('');
        setNewAdminPassword('');
        setConfirmNewAdminPassword('');
        setTimeout(() => setAdminPassSaveState('idle'), 3000);
      } else {
        setAdminPassSaveState('error');
        setAdminPassError(data.detail || 'Failed to update admin password');
      }
    } catch {
      setAdminPassSaveState('error');
      setAdminPassError('An unexpected error occurred');
    }
  }

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaveState('saving');
    setEmailError('');
    try {
      const res = await authFetch('/api/account/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: newEmail }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setEmailStep('verify');
        setEmailSaveState('idle');
      } else {
        setEmailSaveState('error');
        setEmailError(data.detail || 'Failed to request email change');
      }
    } catch {
      setEmailSaveState('error');
      setEmailError('An unexpected error occurred');
    }
  }

  async function handleVerifyEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaveState('saving');
    setEmailError('');
    try {
      const res = await authFetch('/api/account/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: newEmail, otp: emailOtp }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setEmailSaveState('saved');
        setEmailStep('request');
        setNewEmail('');
        setEmailOtp('');
        await refreshUser();
        setTimeout(() => setEmailSaveState('idle'), 3000);
      } else {
        setEmailSaveState('error');
        setEmailError(data.detail || 'Failed to verify email change');
      }
    } catch {
      setEmailSaveState('error');
      setEmailError('An unexpected error occurred');
    }
  }

  async function handleLinkGoogle(credential: string) {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const res = await authFetch('/api/account/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        await refreshUser();
      } else {
        setGoogleError(data.detail || 'Failed to link Google account');
      }
    } catch {
      setGoogleError('An unexpected error occurred');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleUnlinkGoogle() {
    if (!confirm('Are you sure you want to unlink your Google account?')) return;
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const res = await authFetch('/api/account/unlink-google', {
        method: 'POST',
      });
      const data = await safeJson(res);
      if (res.ok) {
        await refreshUser();
      } else {
        setGoogleError(data.detail || 'Failed to unlink Google account');
      }
    } catch {
      setGoogleError('An unexpected error occurred');
    } finally {
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (isOpen && user) {
      const timer = setTimeout(() => {
        setFullName(user.full_name || '');
        setAllowDataCollection(user.allow_data_collection ?? true);
        setSaveState('idle');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user]);

  async function handleSavePrivacy(newVal: boolean) {
    setAllowDataCollection(newVal);
    setPrivacySaveState('saving');
    try {
      const res = await authFetch('/api/account/update-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_data_collection: newVal }),
      });
      if (res.ok) {
        setPrivacySaveState('saved');
        await refreshUser();
        setTimeout(() => setPrivacySaveState('idle'), 2000);
      } else {
        setPrivacySaveState('error');
        setAllowDataCollection(!newVal); // revert
      }
    } catch {
      setPrivacySaveState('error');
      setAllowDataCollection(!newVal); // revert
    }
  }

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
    { key: 'security' as const, label: t('settings.security') as string || 'Security' },
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

                    {/* App Installation Section */}
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        App Installation
                      </h3>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1117] flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Download className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-[#E6EDF3]">Install AdvoAI</h4>
                            <p className="text-xs text-slate-500">Download the app for quick access from your home screen.</p>
                          </div>
                        </div>

                        {isInstalled ? (
                          <div className="text-sm font-medium text-emerald-600 flex items-center gap-2 mt-2">
                            <Check className="w-4 h-4" /> App is already installed!
                          </div>
                        ) : isInstallable ? (
                          <button
                            onClick={promptInstall}
                            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Install App
                          </button>
                        ) : (
                          <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2 border border-blue-100 dark:border-blue-900/50">
                            <Smartphone className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>To install on iOS Safari, tap the <strong>Share</strong> button at the bottom of the screen, then select <strong>Add to Home Screen</strong>.</p>
                          </div>
                        )}
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

                {activeTab === 'security' && (
                  <div className="space-y-6 md:space-y-8">
                    {/* Password Update */}
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        {t('settings.change_password') as string || 'Change Password'}
                      </h3>
                      {!user?.has_password && user?.is_google_linked && (
                        <p className="text-sm text-slate-500 mb-4">{t('settings.google_no_password') as string}</p>
                      )}
                      
                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        {passError && <p className="text-sm text-red-500">{passError}</p>}
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.current_password') as string || 'Current Password'}</label>
                          <div className="relative">
                            <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10" />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.new_password') as string || 'New Password'}</label>
                          <div className="relative">
                            <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10" />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.confirm_new_password') as string || 'Confirm New Password'}</label>
                          <div className="relative">
                            <input type={showConfirmPassword ? "text" : "password"} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10" />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <button type="submit" disabled={passSaveState === 'saving'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary dark:bg-[#1F6FEB] text-white">
                          {passSaveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                          {passSaveState === 'saved' ? (t('settings.saved') as string || 'Saved') : (t('settings.update_password') as string || 'Update Password')}
                        </button>
                      </form>
                    </section>

                    {/* Admin Password Update */}
                    {user?.role === 'admin' && (
                      <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                          Update Admin Password
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Set or change your secondary password used to unlock the Admin Panel.</p>
                        <form onSubmit={handleUpdateAdminPassword} className="space-y-4">
                          {adminPassError && <p className="text-sm text-red-500">{adminPassError}</p>}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Current Admin Password (leave empty if none)</label>
                            <input type="password" value={currentAdminPassword} onChange={(e) => setCurrentAdminPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Admin Password</label>
                            <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Admin Password</label>
                            <input type="password" value={confirmNewAdminPassword} onChange={(e) => setConfirmNewAdminPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                          <button type="submit" disabled={adminPassSaveState === 'saving'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-900 dark:bg-slate-700 text-white">
                            {adminPassSaveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {adminPassSaveState === 'saved' ? 'Saved' : 'Update Admin Password'}
                          </button>
                        </form>
                      </section>
                    )}

                    {/* Email Change */}
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        {t('settings.change_email') as string || 'Change Email Address'}
                      </h3>
                      {emailStep === 'request' ? (
                        <form onSubmit={handleRequestEmailChange} className="space-y-4">
                          {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.new_email') as string || 'New Email Address'}</label>
                            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                          <button type="submit" disabled={emailSaveState === 'saving'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary dark:bg-[#1F6FEB] text-white">
                            {emailSaveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('settings.request_email_change') as string || 'Request Email Change'}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyEmailChange} className="space-y-4">
                          {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.verification_code') as string || 'Verification Code'}</label>
                            <input type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} required maxLength={6} placeholder="123456" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1117] text-slate-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-center tracking-widest" />
                          </div>
                          <button type="submit" disabled={emailSaveState === 'saving'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary dark:bg-[#1F6FEB] text-white">
                            {emailSaveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('settings.verify_and_update') as string || 'Verify & Update'}
                          </button>
                          <button type="button" onClick={() => setEmailStep('request')} className="w-full text-xs text-slate-500 mt-2">{t('settings.cancel') as string || 'Cancel'}</button>
                        </form>
                      )}
                    </section>

                    {/* Google Linked Account */}
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        {t('settings.linked_accounts') as string || 'Linked Accounts'}
                      </h3>
                      {googleError && <p className="text-sm text-red-500 mb-2">{googleError}</p>}
                      <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-[#E6EDF3] text-sm">{t('settings.google_account') as string || 'Google Account'}</p>
                            <p className="text-xs text-slate-500">
                              {user?.is_google_linked ? (t('settings.connected') as string || 'Connected') : (t('settings.not_connected') as string || 'Not connected')}
                            </p>
                          </div>
                        </div>
                        
                        {user?.is_google_linked ? (
                          <button onClick={handleUnlinkGoogle} disabled={googleLoading} className="px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            {t('settings.disconnect') as string || 'Disconnect'}
                          </button>
                        ) : (
                          <div className="flex justify-center">
                            {!isGoogleAvailable || googleLoading ? (
                                <button disabled className="px-3 py-1.5 text-sm border rounded-md opacity-50 cursor-not-allowed">
                                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (t('settings.connect') as string || 'Connect')}
                                </button>
                            ) : (
                                <div ref={googleButtonRef} />
                            )}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Privacy */}
                    <section>
                      <h3 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-[#E6EDF3] mb-3 md:mb-4 uppercase tracking-wider">
                        Data & Privacy
                      </h3>
                      <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="pr-4">
                          <p className="font-medium text-slate-900 dark:text-[#E6EDF3] text-sm">Allow session review for product improvement</p>
                          <p className="text-xs text-slate-500 mt-1">
                            If enabled, your anonymized chat sessions and usage statistics can be used by our team to improve the AdvoAI system.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={allowDataCollection}
                            onChange={(e) => handleSavePrivacy(e.target.checked)}
                            disabled={privacySaveState === 'saving'}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      {privacySaveState === 'error' && (
                        <p className="text-xs text-red-500 mt-2">Failed to update privacy settings. Please try again.</p>
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
