'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Settings, Lock, Crown } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminSettings() {
    const { user } = useAuth();
    const isRootAdmin = user?.role === 'root_admin';
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<any>({
        current_llm_model: '',
        current_router_model: '',
        guest_message_limit: '',
        free_daily_limit: '',
        free_daily_doc_limit: '',
        free_daily_image_limit: '',
        guest_doc_limit: '',
        guest_image_limit: '',
        custom_main_prompt: '',
        custom_router_prompt: '',
        override_prompts_enabled: false,
        rag_top_k: '',
        override_rag_top_k: false,
        custom_api_keys: '',
        global_notification: '',
        global_notification_type: 'info',
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    // Password Security State
    const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    useEffect(() => {
        fetchSettings().finally(() => setIsLoading(false));
    }, []);

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);

        if (passwords.new_password !== passwords.confirm_password) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (passwords.new_password.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await authFetch('/api/admin/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: passwords.current_password,
                    new_password: passwords.new_password
                })
            });

            if (res.ok) {
                setPasswordSuccess(true);
                setPasswords({ current_password: '', new_password: '', confirm_password: '' });
            } else {
                const data = await res.json();
                setPasswordError(data.detail || "Failed to update password.");
            }
        } catch (err) {
            setPasswordError("Network error. Please try again.");
        } finally {
            setIsChangingPassword(false);
        }
    }

    async function fetchSettings() {
        try {
            const res = await authFetch('/api/admin/settings');
            if (!res.ok) return;
            const data = await res.json();
            setSettings({
                current_llm_model: data.settings.current_llm_model || 'gemini-2.5-flash',
                current_router_model: data.settings.current_router_model || 'gemma-4-31b-it',
                guest_message_limit: data.settings.guest_message_limit || '3',
                free_daily_limit: data.settings.free_daily_limit || '20',
                free_daily_doc_limit: data.settings.free_daily_doc_limit || '10',
                free_daily_image_limit: data.settings.free_daily_image_limit || '10',
                guest_doc_limit: data.settings.guest_doc_limit || '2',
                guest_image_limit: data.settings.guest_image_limit || '2',
                custom_main_prompt: data.settings.custom_main_prompt || '',
                custom_router_prompt: data.settings.custom_router_prompt || '',
                override_prompts_enabled: data.settings.override_prompts_enabled === 'true',
                rag_top_k: data.settings.rag_top_k || '10',
                override_rag_top_k: data.settings.override_rag_top_k === 'true',
                custom_api_keys: data.settings.custom_api_keys || '',
                global_notification: data.settings.global_notification || '',
                global_notification_type: data.settings.global_notification_type || 'info',
            });
        } catch {
            // ignore
        }
    }

    async function handleSaveSettings(e: React.FormEvent) {
        e.preventDefault();
        setIsSavingSettings(true);
        setSettingsSaved(false);
        try {
            const res = await authFetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_llm_model: settings.current_llm_model,
                    current_router_model: settings.current_router_model,
                    guest_message_limit: parseInt(settings.guest_message_limit),
                    free_daily_limit: parseInt(settings.free_daily_limit),
                    free_daily_doc_limit: parseInt(settings.free_daily_doc_limit),
                    free_daily_image_limit: parseInt(settings.free_daily_image_limit),
                    guest_doc_limit: parseInt(settings.guest_doc_limit),
                    guest_image_limit: parseInt(settings.guest_image_limit),
                    custom_main_prompt: settings.custom_main_prompt,
                    custom_router_prompt: settings.custom_router_prompt,
                    override_prompts_enabled: settings.override_prompts_enabled,
                    rag_top_k: parseInt(settings.rag_top_k || '10'),
                    override_rag_top_k: settings.override_rag_top_k,
                    custom_api_keys: settings.custom_api_keys,
                    global_notification: settings.global_notification,
                    global_notification_type: settings.global_notification_type,
                }),
            });
            if (res.ok) {
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 3000);
            }
        } catch {
        } finally {
            setIsSavingSettings(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Configure AdvoAI system preferences</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="size-4 text-muted-foreground" />
                        System Settings
                    </CardTitle>
                    <CardDescription>Configure LLM model and usage limits</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        {/* Models */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="llm_model" className="flex items-center gap-1.5">
                                    Main LLM Model
                                    {!isRootAdmin && <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-normal"><Lock className="size-3" /> Root Admin Only</span>}
                                </Label>
                                <Input id="llm_model" value={settings.current_llm_model} onChange={e => setSettings({...settings, current_llm_model: e.target.value})} placeholder="gemini-2.5-flash" disabled={!isRootAdmin} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="router_model" className="flex items-center gap-1.5">
                                    Router LLM Model
                                    {!isRootAdmin && <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-normal"><Lock className="size-3" /> Root Admin Only</span>}
                                </Label>
                                <Input id="router_model" value={settings.current_router_model} onChange={e => setSettings({...settings, current_router_model: e.target.value})} placeholder="gemma-4-31b-it" disabled={!isRootAdmin} />
                            </div>
                        </div>

                        {/* Limits */}
                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h3 className="font-semibold text-sm">Usage Limits</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Guest Msgs</Label>
                                    <Input type="number" min="1" value={settings.guest_message_limit} onChange={e => setSettings({...settings, guest_message_limit: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Free Daily Msgs</Label>
                                    <Input type="number" min="1" value={settings.free_daily_limit} onChange={e => setSettings({...settings, free_daily_limit: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Guest Docs</Label>
                                    <Input type="number" min="0" value={settings.guest_doc_limit} onChange={e => setSettings({...settings, guest_doc_limit: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Free Daily Docs</Label>
                                    <Input type="number" min="0" value={settings.free_daily_doc_limit} onChange={e => setSettings({...settings, free_daily_doc_limit: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Guest Images</Label>
                                    <Input type="number" min="0" value={settings.guest_image_limit} onChange={e => setSettings({...settings, guest_image_limit: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Free Daily Images</Label>
                                    <Input type="number" min="0" value={settings.free_daily_image_limit} onChange={e => setSettings({...settings, free_daily_image_limit: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* RAG & Prompts */}
                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h3 className="font-semibold text-sm">Retrieval & Prompts</h3>
                            <div className="space-y-2">
                                <Label>RAG Top-K (Documents to Retrieve)</Label>
                                <Input type="number" min="1" value={settings.rag_top_k} onChange={e => setSettings({...settings, rag_top_k: e.target.value})} />
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <input type="checkbox" id="override_rag_top_k" checked={settings.override_rag_top_k} onChange={e => setSettings({...settings, override_rag_top_k: e.target.checked})} />
                                <Label htmlFor="override_rag_top_k">Override Dynamic Top-K with Global Setting</Label>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <input type="checkbox" id="override_prompts" checked={settings.override_prompts_enabled} onChange={e => setSettings({...settings, override_prompts_enabled: e.target.checked})} />
                                <Label htmlFor="override_prompts">Enable Prompt Overrides</Label>
                            </div>
                            <div className="space-y-2">
                                <Label>Custom Main LLM Prompt</Label>
                                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={settings.custom_main_prompt} onChange={e => setSettings({...settings, custom_main_prompt: e.target.value})} disabled={!settings.override_prompts_enabled} />
                            </div>
                            <div className="space-y-2">
                                <Label>Custom Router LLM Prompt</Label>
                                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={settings.custom_router_prompt} onChange={e => setSettings({...settings, custom_router_prompt: e.target.value})} disabled={!settings.override_prompts_enabled} />
                            </div>
                        </div>

                        {/* Global Notification */}
                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h3 className="font-semibold text-sm">Global Notification Banner</h3>
                            <div className="space-y-2">
                                <Label>Notification Message (leave blank to disable)</Label>
                                <Input value={settings.global_notification} onChange={e => setSettings({...settings, global_notification: e.target.value})} placeholder="e.g. Scheduled maintenance at midnight" />
                            </div>
                            <div className="space-y-2">
                                <Label>Notification Type</Label>
                                <Select value={settings.global_notification_type} onValueChange={val => setSettings({...settings, global_notification_type: val})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Info (Blue)</SelectItem>
                                        <SelectItem value="warning">Warning (Yellow)</SelectItem>
                                        <SelectItem value="error">Error (Red)</SelectItem>
                                        <SelectItem value="success">Success (Green)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* API Keys */}
                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                Custom API Keys
                                {!isRootAdmin && (
                                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-normal">
                                        <Crown className="size-3" /> Root Admin Only
                                    </span>
                                )}
                            </h3>
                            <div className="space-y-2">
                                <Label>Custom Google API Keys (comma-separated)</Label>
                                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed" value={settings.custom_api_keys} onChange={e => setSettings({...settings, custom_api_keys: e.target.value})} placeholder="AIzaSy... , AIzaSy... " disabled={!isRootAdmin} />
                                <p className="text-xs text-muted-foreground mt-1">If provided, these will override the API keys in your .env file and enable automatic key rolling.</p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSavingSettings}>
                            {isSavingSettings ? <Loader2 className="size-4 animate-spin mr-2" /> : settingsSaved ? '✅ Saved!' : <><Save className="size-4 mr-2" />Save Settings</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Security Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="size-4 text-muted-foreground" />
                        Security Settings
                    </CardTitle>
                    <CardDescription>Update your admin panel password</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        {passwordError && (
                            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="text-sm text-emerald-600 bg-emerald-500/10 p-3 rounded-md">
                                Password updated successfully!
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="current_password">Current Password (leave blank if none set)</Label>
                            <Input id="current_password" type="password" value={passwords.current_password} onChange={e => setPasswords({...passwords, current_password: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_password">New Password</Label>
                            <Input id="new_password" type="password" value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} required minLength={6} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirm New Password</Label>
                            <Input id="confirm_password" type="password" value={passwords.confirm_password} onChange={e => setPasswords({...passwords, confirm_password: e.target.value})} required minLength={6} />
                        </div>
                        <Button type="submit" disabled={isChangingPassword}>
                            {isChangingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
