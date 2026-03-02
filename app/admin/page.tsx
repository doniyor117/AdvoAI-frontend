'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, FileText, MessageSquare, Activity, Loader2, Save, Settings } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Stats {
    total_users: number;
    total_documents: number;
    total_chunks: number;
    daily_active_users: number;
    daily_messages: number;
}

interface SystemSettings {
    current_llm_model: string;
    guest_message_limit: string;
    free_daily_limit: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Settings
    const [settings, setSettings] = useState<SystemSettings>({
        current_llm_model: '',
        guest_message_limit: '',
        free_daily_limit: '',
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    useEffect(() => {
        Promise.all([fetchStats(), fetchSettings()]).finally(() => setIsLoading(false));
    }, []);

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load stats');
            const data = await res.json();
            setStats(data.stats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
    }

    async function fetchSettings() {
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, { credentials: 'include' });
            if (!res.ok) return; // Settings table may not exist yet
            const data = await res.json();
            setSettings({
                current_llm_model: data.settings.current_llm_model || 'gemini-2.5-flash',
                guest_message_limit: data.settings.guest_message_limit || '3',
                free_daily_limit: data.settings.free_daily_limit || '20',
            });
        } catch {
            // Silently fail — settings might not be migrated yet
        }
    }

    async function handleSaveSettings(e: React.FormEvent) {
        e.preventDefault();
        setIsSavingSettings(true);
        setSettingsSaved(false);
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    current_llm_model: settings.current_llm_model,
                    guest_message_limit: parseInt(settings.guest_message_limit),
                    free_daily_limit: parseInt(settings.free_daily_limit),
                }),
            });
            if (res.ok) {
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 3000);
            }
        } catch {
            /* ignore */
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

    if (error) {
        return (
            <div className="p-8">
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                    {error}
                </div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Documents', value: stats?.total_documents ?? 0, icon: FileText, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Total Chunks', value: stats?.total_chunks ?? 0, icon: Activity, color: 'text-amber-600 dark:text-amber-400' },
        { label: 'Active Today', value: stats?.daily_active_users ?? 0, icon: Users, color: 'text-purple-600 dark:text-purple-400' },
        { label: 'Messages Today', value: stats?.daily_messages ?? 0, icon: MessageSquare, color: 'text-rose-600 dark:text-rose-400' },
    ];

    return (
        <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Overview of your Yurika instance</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {statCards.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardDescription className="text-sm font-medium">
                                {stat.label}
                            </CardDescription>
                            <stat.icon className={`size-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {stat.value.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* System Settings + Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Settings className="size-4 text-muted-foreground" />
                            System Settings
                        </CardTitle>
                        <CardDescription>
                            Configure LLM model and usage limits
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveSettings} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="llm_model">LLM Model</Label>
                                <Input
                                    id="llm_model"
                                    value={settings.current_llm_model}
                                    onChange={(e) => setSettings({ ...settings, current_llm_model: e.target.value })}
                                    placeholder="gemini-2.5-flash"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="guest_limit">Guest Limit</Label>
                                    <Input
                                        id="guest_limit"
                                        type="number"
                                        min="1"
                                        value={settings.guest_message_limit}
                                        onChange={(e) => setSettings({ ...settings, guest_message_limit: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">Lifetime msgs</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="daily_limit">Free Daily Limit</Label>
                                    <Input
                                        id="daily_limit"
                                        type="number"
                                        min="1"
                                        value={settings.free_daily_limit}
                                        onChange={(e) => setSettings({ ...settings, free_daily_limit: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">Per day msgs</p>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSavingSettings}>
                                {isSavingSettings ? (
                                    <Loader2 className="size-4 animate-spin mr-2" />
                                ) : settingsSaved ? (
                                    '✅ Saved!'
                                ) : (
                                    <>
                                        <Save className="size-4 mr-2" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <a
                            href="/admin/users"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                        >
                            <Users className="size-4 text-muted-foreground" />
                            <span>Manage Users</span>
                        </a>
                        <a
                            href="/admin/documents"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                        >
                            <FileText className="size-4 text-muted-foreground" />
                            <span>View Documents</span>
                        </a>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
