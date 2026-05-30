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
import { Loader2, Plus, ExternalLink, Pencil, Trash2, Eye, X, Search, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { authFetch } from '@/lib/authFetch';

interface DocumentRecord {
    id: string;
    source_doc_id: string;
    title: string;
    act_type: string | null;
    doc_date: string | null;
    source_url: string;
    category?: string;
    is_active: boolean;
    created_at: string;
    chunk_count: number;
}

export default function AdminDocumentsPage() {
    const { user } = useAuth();
    const isRootAdmin = user?.role === 'root_admin';
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Ingest form
    const [ingestUrlsText, setIngestUrlsText] = useState('');
    const [ingestCategory, setIngestCategory] = useState('General');
    const [isIngesting, setIsIngesting] = useState(false);
    const [ingestResult, setIngestResult] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // Ingestion Jobs
    const [jobs, setJobs] = useState<any[]>([]);

    // Edit metadata
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editActType, setEditActType] = useState('');

    // View document
    const [viewingDoc, setViewingDoc] = useState<{ title: string; markdown: string; source_url: string } | null>(null);
    const [isLoadingView, setIsLoadingView] = useState(false);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters and Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [actTypeFilter, setActTypeFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        fetchDocuments();
        fetchJobs();
        const interval = setInterval(() => {
            fetchJobs();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Extract unique act types for the filter dropdown
    const uniqueActTypes = Array.from(new Set(documents.map(d => d.act_type).filter(Boolean))) as string[];
    const uniqueCategories = Array.from(new Set(documents.map(d => d.category).filter(Boolean))) as string[];

    // Filter documents
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (doc.source_doc_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = actTypeFilter === 'all' || doc.act_type === actTypeFilter;
        const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
    });

    async function fetchDocuments() {
        try {
            const res = await authFetch('/api/admin/documents');
            if (!res.ok) throw new Error('Failed to load documents');
            const data = await res.json();
            setDocuments(data.documents);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load documents');
        } finally {
            setIsLoading(false);
        }
    }

    async function fetchJobs() {
        try {
            const res = await authFetch('/api/admin/ingestion-jobs');
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs);
            }
        } catch {
            // ignore
        }
    }

    async function handleIngest(e: React.FormEvent) {
        e.preventDefault();
        if (!ingestUrlsText.trim()) return;

        const urls = ingestUrlsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        if (urls.length === 0) return;

        setIsIngesting(true);
        setIngestResult('');

        try {
            const res = await authFetch('/api/admin/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, category: ingestCategory }),
            });
            const data = await res.json();
            if (res.ok) {
                setIngestResult(`✅ ${data.message}`);
                setIngestUrlsText('');
                fetchJobs();
                setTimeout(() => setDialogOpen(false), 2000);
            } else {
                setIngestResult(`❌ ${data.detail || 'Ingestion setup failed.'}`);
            }
        } catch {
            setIngestResult('❌ Network error during ingestion.');
        } finally {
            setIsIngesting(false);
        }
    }

    async function handleSaveMetadata(docId: string) {
        if (!editTitle.trim()) return;
        try {
            await authFetch(`/api/admin/documents/${docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: editTitle, 
                    category: editCategory, 
                    act_type: editActType 
                }),
            });
            setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: editTitle, category: editCategory, act_type: editActType } : d));
        } catch {
            /* ignore */
        }
        setEditingId(null);
    }
    
    function startEditing(doc: DocumentRecord) {
        setEditingId(doc.id);
        setEditTitle(doc.title || doc.source_doc_id || '');
        setEditCategory(doc.category || 'General');
        setEditActType(doc.act_type || '');
    }
    async function handleViewDocument(docId: string) {
        setIsLoadingView(true);
        try {
            const res = await authFetch(`/api/admin/documents/${docId}`);
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
            await authFetch(`/api/admin/documents/${docId}`, {
                method: 'DELETE',
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                                <Label htmlFor="urls">Lex.uz Document URLs (One per line)</Label>
                                <textarea
                                    id="urls"
                                    value={ingestUrlsText}
                                    onChange={(e) => setIngestUrlsText(e.target.value)}
                                    placeholder="https://lex.uz/docs/12345&#10;https://lex.uz/docs/67890"
                                    className="w-full min-h-[100px] flex rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isIngesting}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category/Folder</Label>
                                <Input
                                    id="category"
                                    value={ingestCategory}
                                    onChange={(e) => setIngestCategory(e.target.value)}
                                    placeholder="e.g. Civil Code, Tax Code, Constitution"
                                    disabled={isIngesting}
                                    required
                                />
                            </div>
                            
                            {ingestResult && (
                                <div className={`p-3 rounded-md text-sm ${ingestResult.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by title or ID..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={actTypeFilter} onValueChange={setActTypeFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Act Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Act Types</SelectItem>
                            {uniqueActTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Bulk Ingestion Jobs Progress */}
            {jobs.length > 0 && (
                <Card className="overflow-hidden border-border/50 mb-6">
                    <CardContent className="p-0 overflow-x-auto">
                        <div className="p-4 border-b border-border/50 bg-muted/50 font-medium text-sm flex justify-between items-center">
                            <span>Ingestion Jobs Progress</span>
                            <Button variant="ghost" size="sm" onClick={fetchDocuments} className="h-8 text-xs">
                                Refresh Documents
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>URL</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.slice(0, 5).map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-mono text-xs truncate max-w-[200px]">{job.url}</TableCell>
                                        <TableCell>
                                            {job.status === 'completed' && <Badge className="bg-emerald-500">Completed</Badge>}
                                            {job.status === 'processing' && <Badge className="bg-blue-500 animate-pulse">Processing</Badge>}
                                            {job.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                                            {job.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(job.updated_at).toLocaleTimeString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {job.error_message || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Documents Table */}
            <Card className="overflow-hidden border-border/50">
                <CardContent className="p-0 overflow-x-auto">
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
                            {filteredDocuments.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="max-w-xs">
                                            {editingId === doc.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <Input
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="h-7 text-sm"
                                                        placeholder="Title"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveMetadata(doc.id);
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={editCategory}
                                                            onChange={(e) => setEditCategory(e.target.value)}
                                                            className="h-7 text-xs w-24"
                                                            placeholder="Category"
                                                        />
                                                        <Input
                                                            value={editActType}
                                                            onChange={(e) => setEditActType(e.target.value)}
                                                            className="h-7 text-xs w-24"
                                                            placeholder="Type"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            onClick={() => handleSaveMetadata(doc.id)}
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
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-medium text-sm text-foreground whitespace-normal break-words" title={doc.title}>
                                                        {doc.title || doc.source_doc_id}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-1">
                                                        <span>ID: {doc.source_doc_id}</span>
                                                        {doc.category && doc.category !== 'General' && (
                                                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{doc.category}</Badge>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {editingId === doc.id ? (
                                            <span className="text-xs text-muted-foreground italic">Editing...</span>
                                        ) : doc.act_type ? (
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
                                                title="Edit Metadata"
                                                onClick={() => startEditing(doc)}
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
                                            {isRootAdmin ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    title="Delete Document"
                                                    onClick={() => setDeletingId(doc.id)}
                                                >
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    title="Root admin only"
                                                    disabled
                                                >
                                                    <Lock className="size-4 text-muted-foreground/40" />
                                                </Button>
                                            )}
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
