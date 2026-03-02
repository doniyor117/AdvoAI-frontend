'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, ExternalLink, Pencil, Trash2, Eye, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DocumentRecord {
    id: string;
    source_doc_id: string;
    title: string;
    act_type: string | null;
    doc_date: string | null;
    source_url: string;
    is_active: boolean;
    created_at: string;
    chunk_count: number;
}

export default function AdminDocumentsPage() {
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Ingest form
    const [ingestUrl, setIngestUrl] = useState('');
    const [isIngesting, setIsIngesting] = useState(false);
    const [ingestResult, setIngestResult] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // Edit title
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // View document
    const [viewingDoc, setViewingDoc] = useState<{ title: string; markdown: string; source_url: string } | null>(null);
    const [isLoadingView, setIsLoadingView] = useState(false);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    async function fetchDocuments() {
        try {
            const res = await fetch(`${API_URL}/api/admin/documents`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load documents');
            const data = await res.json();
            setDocuments(data.documents);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleIngest(e: React.FormEvent) {
        e.preventDefault();
        if (!ingestUrl.trim()) return;

        setIsIngesting(true);
        setIngestResult('');

        try {
            const res = await fetch(`${API_URL}/api/admin/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ url: ingestUrl, device: 'cpu' }),
            });
            const data = await res.json();
            if (res.ok) {
                setIngestResult('✅ Document ingested successfully!');
                setIngestUrl('');
                fetchDocuments();
            } else {
                setIngestResult(`❌ ${data.detail || 'Ingestion failed.'}`);
            }
        } catch {
            setIngestResult('❌ Network error during ingestion.');
        } finally {
            setIsIngesting(false);
        }
    }

    async function handleSaveTitle(docId: string) {
        if (!editTitle.trim()) return;
        try {
            await fetch(`${API_URL}/api/admin/documents/${docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title: editTitle }),
            });
            setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: editTitle } : d));
        } catch {
            /* ignore */
        }
        setEditingId(null);
    }

    async function handleViewDocument(docId: string) {
        setIsLoadingView(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/documents/${docId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setViewingDoc({
                    title: data.document.title,
                    markdown: data.document.full_markdown,
                    source_url: data.document.source_url,
                });
            }
        } catch {
            /* ignore */
        } finally {
            setIsLoadingView(false);
        }
    }

    async function handleDelete(docId: string) {
        setIsDeleting(true);
        try {
            await fetch(`${API_URL}/api/admin/documents/${docId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch {
            /* ignore */
        } finally {
            setIsDeleting(false);
            setDeletingId(null);
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Documents</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {documents.length} ingested document{documents.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Ingest Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="size-4 mr-2" />
                            Ingest Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ingest New Document</DialogTitle>
                            <DialogDescription>
                                Enter a Lex.uz URL to ingest a legal document into the RAG database.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleIngest} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="ingestUrl">Document URL</Label>
                                <Input
                                    id="ingestUrl"
                                    type="url"
                                    placeholder="https://lex.uz/docs/-7904841"
                                    value={ingestUrl}
                                    onChange={(e) => setIngestUrl(e.target.value)}
                                    required
                                />
                            </div>

                            {ingestResult && (
                                <div className={`rounded-lg px-3 py-2 text-sm ${ingestResult.startsWith('✅')
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                                    }`}>
                                    {ingestResult}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isIngesting}>
                                {isIngesting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Ingesting (this may take a while)...
                                    </>
                                ) : (
                                    'Start Ingestion'
                                )}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Documents Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Chunks</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Ingested</TableHead>
                                <TableHead className="w-32 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="max-w-xs">
                                            {editingId === doc.id ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="h-7 text-sm"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveTitle(doc.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => handleSaveTitle(doc.id)}
                                                    >
                                                        ✓
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        <X className="size-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-medium text-sm text-foreground truncate" title={doc.title}>
                                                        {doc.title || doc.source_doc_id}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        ID: {doc.source_doc_id}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {doc.act_type ? (
                                            <Badge variant="outline" className="text-xs">{doc.act_type}</Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {doc.chunk_count}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {doc.doc_date || '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                title="View Document"
                                                onClick={() => handleViewDocument(doc.id)}
                                            >
                                                <Eye className="size-4 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                title="Edit Title"
                                                onClick={() => { setEditingId(doc.id); setEditTitle(doc.title); }}
                                            >
                                                <Pencil className="size-4 text-muted-foreground" />
                                            </Button>
                                            <a
                                                href={doc.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center size-8 rounded-md hover:bg-accent transition-colors"
                                                title="View on Lex.uz"
                                            >
                                                <ExternalLink className="size-4 text-muted-foreground" />
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                title="Delete Document"
                                                onClick={() => setDeletingId(doc.id)}
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {documents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No documents ingested yet. Use the button above to add one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* View Document Modal */}
            <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="font-serif">{viewingDoc?.title || 'Document'}</DialogTitle>
                        <DialogDescription>
                            Full document content (Markdown)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {isLoadingView ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="size-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="font-serif prose prose-slate dark:prose-invert prose-headings:text-lg prose-headings:font-semibold max-w-none text-sm leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {viewingDoc?.markdown || ''}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                    {viewingDoc?.source_url && (
                        <DialogFooter>
                            <a
                                href={viewingDoc.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                <ExternalLink className="size-3" />
                                View on Lex.uz
                            </a>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete Document</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this document and all its associated vector chunks.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeletingId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={() => deletingId && handleDelete(deletingId)}
                        >
                            {isDeleting ? (
                                <Loader2 className="size-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="size-4 mr-2" />
                            )}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
