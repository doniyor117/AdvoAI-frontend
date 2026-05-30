'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, MessageSquare, Activity, Loader2, Zap, Settings, ArrowRight } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import Link from 'next/link';

interface Stats {
    total_users: number;
    total_documents: number;
    total_document_parts: number;
    total_chunks: number;
    daily_active_users: number;
    daily_messages: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats().finally(() => setIsLoading(false));
    }, []);

    async function fetchStats() {
        try {
            const res = await authFetch('/api/admin/stats');
            if (!res.ok) throw new Error('Failed to load stats');
            const data = await res.json();
            setStats(data.stats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
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
        { label: 'Document Parts', value: stats?.total_document_parts ?? 0, icon: Settings, color: 'text-emerald-500 dark:text-emerald-300' },
        { label: 'Vector Chunks', value: stats?.total_chunks ?? 0, icon: Activity, color: 'text-amber-600 dark:text-amber-400' },
        { label: 'Active Today', value: stats?.daily_active_users ?? 0, icon: Users, color: 'text-purple-600 dark:text-purple-400' },
        { label: 'Messages Today', value: stats?.daily_messages ?? 0, icon: MessageSquare, color: 'text-rose-600 dark:text-rose-400' },
    ];

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome to the AdvoAI admin control panel.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                    <Card key={stat.label} className="border-border/50 hover:border-primary/20 transition-colors">
                        <div className="flex flex-row items-center justify-between px-6 pt-6 pb-2">
                            <CardDescription className="text-sm font-medium">
                                {stat.label}
                            </CardDescription>
                            <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 ${stat.color} flex-shrink-0`}>
                                <stat.icon className="size-4 shrink-0" />
                            </div>
                        </div>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">
                                {stat.value.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions Grid */}
            <div className="mt-8">
                <h2 className="text-xl font-bold font-serif mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/admin/analytics">
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-border/50 group">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Activity className="size-5" />
                                        </div>
                                        Detailed Analytics
                                    </div>
                                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>View message volume, active users charts, and query routing statistics over time.</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/settings">
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-border/50 group">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                            <Settings className="size-5" />
                                        </div>
                                        System Settings
                                    </div>
                                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>Configure LLM models, update usage limits, set global notification banners, and manage prompts.</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/documents">
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-border/50 group">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                            <FileText className="size-5" />
                                        </div>
                                        Manage Documents
                                    </div>
                                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>Ingest new legal documents, view chunking status, and manage the knowledge base.</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/playground">
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-border/50 group">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                                            <Zap className="size-5" />
                                        </div>
                                        RAG Playground
                                    </div>
                                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>Test the retrieval pipeline, verify chunk matching, and optimize search queries.</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}
