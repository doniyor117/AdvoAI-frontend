"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Zap, AlertCircle } from "lucide-react";

interface Chunk {
    id: number;
    document_part_id: number;
    text: string;
    similarity: number;
}

interface RAGResult {
    query: string;
    matched_chunks: Chunk[];
    parent_documents_count: number;
}

export default function RAGPlayground() {
    const [query, setQuery] = useState('');
    const [topK, setTopK] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<RAGResult | null>(null);
    const [error, setError] = useState('');

    async function handleTestRAG(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const token = localStorage.getItem('advoai_token') || document.cookie.split('advoai_token=')[1]?.split(';')[0];
            const res = await fetch('/api/admin/rag-test', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ query, top_k: topK }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to run RAG pipeline');
            }

            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">RAG Retrieval Playground</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Test the pgvector search pipeline. See exact chunks and similarity scores retrieved for a query.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Search className="size-4 text-muted-foreground" />
                            Search Parameters
                        </CardTitle>
                        <CardDescription>Enter a test query to see what context gets retrieved.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleTestRAG} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="query">Test Query</Label>
                                <textarea
                                    id="query"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Enter a legal question..."
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="top_k">Top-K Chunks to Retrieve</Label>
                                <Input
                                    id="top_k"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={topK}
                                    onChange={(e) => setTopK(parseInt(e.target.value))}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !query.trim()}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                        Running Pipeline...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="size-4 mr-2" />
                                        Test Retrieval
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-center gap-3 text-destructive">
                            <AlertCircle className="size-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Results</h2>
                                <div className="text-sm text-muted-foreground">
                                    Found {result.matched_chunks.length} chunks from {result.parent_documents_count} unique documents.
                                </div>
                            </div>
                            
                            {result.matched_chunks.length === 0 ? (
                                <Card>
                                    <CardContent className="py-8 text-center text-muted-foreground">
                                        No chunks retrieved.
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {result.matched_chunks.map((chunk, index) => (
                                        <Card key={chunk.id} className="overflow-hidden">
                                            <div className="bg-muted px-4 py-2 flex items-center justify-between text-xs font-medium border-b border-border/50">
                                                <span className="text-muted-foreground">Rank #{index + 1}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-muted-foreground">Part ID: {chunk.document_part_id}</span>
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                        chunk.similarity > 0.8 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                        chunk.similarity > 0.7 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                                        'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                    }`}>
                                                        Score: {chunk.similarity.toFixed(4)}
                                                    </span>
                                                </div>
                                            </div>
                                            <CardContent className="p-4 text-sm whitespace-pre-wrap font-mono bg-accent/5">
                                                {chunk.text}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
