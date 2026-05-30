'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Eye, ShieldAlert, FileText, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SessionRecord {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    title: string | null;
    created_at: string;
    updated_at: string;
    allow_data_collection: boolean;
}

interface MessageRecord {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    sources: any[];
}

export default function AdminSessionsPage() {
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
    const [messages, setMessages] = useState<MessageRecord[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    async function fetchSessions() {
        try {
            const res = await authFetch('/api/admin/sessions');
            if (!res.ok) throw new Error('Failed to load sessions');
            const data = await res.json();
            setSessions(data.sessions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleViewSession(session: SessionRecord) {
        setSelectedSession(session);
        setIsDialogOpen(true);
        setIsLoadingMessages(true);
        setMessages([]);

        try {
            const res = await authFetch(`/api/admin/sessions/${session.id}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch {
            // Error silently, maybe show a toast in future
        } finally {
            setIsLoadingMessages(false);
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

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Session Audit Log</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review chat sessions. Note: Opted-out user data is redacted.
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden border-border/50">
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Session ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead>Privacy</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No sessions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sessions.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-mono text-xs">{s.id.split('-')[0]}...</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{s.full_name || 'Unknown'}</span>
                                                <span className="text-xs text-muted-foreground">{s.email || 'Guest'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={s.title || 'New Chat'}>
                                            {s.title || 'New Chat'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(s.updated_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {s.allow_data_collection ? (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                                    Allowed
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                                    Opted-Out
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewSession(s)}>
                                                <Eye className="size-4 mr-2" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center justify-between">
                            <span>Session Transcripts</span>
                            {!selectedSession?.allow_data_collection && (
                                <Badge variant="destructive" className="ml-4">
                                    <ShieldAlert className="size-3 mr-1" /> Data Redacted
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/20">
                        {isLoadingMessages ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="size-8 animate-spin text-primary" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12">No messages found.</div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold uppercase text-slate-500">{msg.role}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className={`p-4 rounded-xl max-w-[85%] text-sm ${msg.role === 'user' 
                                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                                    }`}>
                                        {msg.content === '[REDACTED - User opted out of data collection]' ? (
                                            <div className="flex items-center gap-2 opacity-75 italic">
                                                <ShieldAlert className="size-4" />
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className={`prose max-w-none text-sm ${msg.role === 'user' ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white' : 'dark:prose-invert'}`}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                        
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-xs font-semibold mb-2 flex items-center gap-1 opacity-80">
                                                    <FileText className="size-3" /> Sources cited:
                                                </p>
                                                <ul className="space-y-1">
                                                    {msg.sources.map((s: any, i: number) => (
                                                        <li key={i} className="text-xs opacity-75 truncate flex items-center gap-1">
                                                            <ChevronRight className="size-3" /> {s.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
