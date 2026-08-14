'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft, Plus, CheckCircle2, ArrowRightLeft, X, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { authFetch, safeJson } from '@/lib/authFetch';

const MIN_DOCS = 2;
const MAX_DOCS = 4;
const MAX_MB = 10;

type Slot = {
  id: string;
  file: File;
  status: 'uploading' | 'ready' | 'error';
  document_id?: string;
  error?: string;
};

type ComparisonRow = {
  clause: string;
  values: { doc_id: string; text?: string | null }[];
  status: 'match' | 'differs' | 'missing';
  severity: 'info' | 'warn' | 'risk';
  note?: string | null;
};

type Comparison = {
  documents: { id: string; label: string; document_id?: string }[];
  rows: ComparisonRow[];
  summary: string;
};

interface CompareContractsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onBack: () => void;
}

const severityStyles: Record<string, string> = {
  risk: 'bg-red-50 dark:bg-red-900/15',
  warn: 'bg-amber-50 dark:bg-amber-900/15',
  info: '',
};

function StatusBadge({ status, severity }: { status: string; severity: string }) {
  if (status === 'match') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-label="Match" />;
  }
  const color = severity === 'risk' ? 'text-red-500' : 'text-amber-500';
  return <AlertTriangle className={`w-4 h-4 ${color}`} aria-label={status} />;
}

export function CompareContractsView({ onBack }: CompareContractsViewProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tr = (key: string, fallback: string) => {
    const v = t(key) as string;
    return v && v !== key ? v : fallback;
  };

  /**
   * Uploads are awaited and tracked per file. The previous version fired them off with
   * `.catch(console.error)` and immediately navigated away, so "Compare" could run
   * against files that had not finished uploading.
   */
  const uploadOne = useCallback(async (slot: Slot) => {
    const form = new FormData();
    form.append('file', slot.file);
    try {
      const res = await authFetch('/api/chat/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const errData = await safeJson(res).catch(() => ({}));
        throw new Error(errData.detail || `Upload failed (${res.status})`);
      }
      const data = await safeJson(res);
      setSlots(prev => prev.map(s =>
        s.id === slot.id ? { ...s, status: 'ready', document_id: data.document_id } : s));
    } catch (e: any) {
      setSlots(prev => prev.map(s =>
        s.id === slot.id ? { ...s, status: 'error', error: e.message } : s));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files).slice(0, MAX_DOCS - slots.length);
    e.target.value = '';

    const newSlots: Slot[] = incoming.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: file.size > MAX_MB * 1024 * 1024 ? 'error' : 'uploading',
      error: file.size > MAX_MB * 1024 * 1024
        ? `File is too large (${(file.size / 1048576).toFixed(1)}MB). Maximum is ${MAX_MB}MB.`
        : undefined,
    }));

    setSlots(prev => [...prev, ...newSlots]);
    newSlots.filter(s => s.status === 'uploading').forEach(uploadOne);
  };

  const removeSlot = (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    setError(null);
  };

  const readySlots = slots.filter(s => s.status === 'ready');
  const isUploading = slots.some(s => s.status === 'uploading');
  const canCompare = readySlots.length >= MIN_DOCS && !isUploading && !isComparing
    && !slots.some(s => s.status === 'error');

  const handleCompare = async () => {
    if (!canCompare) return;
    setIsComparing(true);
    setError(null);
    try {
      const res = await authFetch('/api/documents/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: readySlots.map(s => s.document_id),
          language: typeof document !== 'undefined'
            ? localStorage.getItem('advoai_lang') || 'uz' : 'uz',
        }),
      });
      if (!res.ok) {
        const errData = await safeJson(res).catch(() => ({}));
        throw new Error(errData.detail || `Comparison failed (${res.status})`);
      }
      const data = await safeJson(res);
      setComparison(data.comparison);
      setSessionId(data.session_id);
    } catch (e: any) {
      setError(e.message || 'The comparison could not be completed.');
    } finally {
      setIsComparing(false);
    }
  };

  const reset = () => {
    setSlots([]);
    setComparison(null);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] dark:bg-[#0a0a0a] h-full relative transition-all duration-300">
      <header className="flex-none h-14 border-b border-gray-200/50 dark:border-[#2A2A2A] bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="font-outfit font-medium text-gray-900 dark:text-white">
              {tr('compare.title', 'Compare contracts')}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="max-w-5xl w-full flex flex-col gap-8 mt-4">

          {!comparison ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-outfit font-semibold text-gray-900 dark:text-white">
                  {tr('compare.heading', 'Compare contracts')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-merriweather max-w-xl mx-auto">
                  {tr('compare.subheading',
                    `Upload ${MIN_DOCS}–${MAX_DOCS} contracts to see clause-by-clause differences, missing protections, and risks.`)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map(slot => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={slot.id}
                    className={`p-5 rounded-xl border flex items-center gap-4 backdrop-blur-xl ${
                      slot.status === 'error'
                        ? 'border-red-300 dark:border-red-900/60 bg-red-50/60 dark:bg-red-900/10'
                        : 'border-gray-200 dark:border-[#2A2A2A] bg-white/60 dark:bg-[#111111]/60'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-outfit font-medium text-gray-900 dark:text-white truncate">
                        {slot.file.name}
                      </p>
                      <p className={`text-sm truncate ${slot.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {slot.status === 'uploading' && 'Uploading…'}
                        {slot.status === 'ready' && `${(slot.file.size / 1024).toFixed(1)} KB`}
                        {slot.status === 'error' && slot.error}
                      </p>
                    </div>
                    {slot.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    {slot.status === 'ready' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    <button
                      onClick={() => removeSlot(slot.id)}
                      className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 flex-shrink-0"
                      aria-label={`Remove ${slot.file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}

                {slots.length < MAX_DOCS && (
                  <label className="p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-[#333] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 h-24">
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.txt,.md,.csv,.html,.htm,.doc,.docx,.rtf"
                      onChange={handleFileSelect}
                    />
                    <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 font-outfit">
                      {tr('compare.add_document', 'Add document')}
                    </span>
                  </label>
                )}
              </div>

              {error && (
                <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleCompare}
                  disabled={!canCompare}
                  className="px-8 py-4 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isComparing
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <ArrowRightLeft className="w-5 h-5" />}
                  {isComparing
                    ? tr('compare.analyzing', 'Analyzing…')
                    : tr('compare.action', 'Analyze & compare')}
                </button>
                {!canCompare && !isComparing && (
                  <p className="text-xs text-gray-400">
                    {isUploading
                      ? tr('compare.wait_upload', 'Waiting for uploads to finish…')
                      : tr('compare.need_more', `Add at least ${MIN_DOCS} documents.`)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-sm">
                <h3 className="text-lg font-outfit font-semibold text-gray-900 dark:text-white mb-2">
                  {tr('compare.results', 'Comparison results')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 font-merriweather leading-relaxed">
                  {comparison.summary}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#2A2A2A]">
                      <th className="text-left font-outfit font-semibold text-gray-700 dark:text-gray-200 px-4 py-3 w-8"></th>
                      <th className="text-left font-outfit font-semibold text-gray-700 dark:text-gray-200 px-4 py-3">
                        {tr('compare.clause', 'Clause')}
                      </th>
                      {comparison.documents.map(d => (
                        <th key={d.id} className="text-left font-outfit font-semibold text-gray-700 dark:text-gray-200 px-4 py-3">
                          <span className="block truncate max-w-[180px]" title={d.label}>{d.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 dark:border-[#1e1e1e] last:border-0 ${severityStyles[row.severity] || ''}`}>
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={row.status} severity={row.severity} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-gray-900 dark:text-white">{row.clause}</p>
                          {row.note && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{row.note}</p>
                          )}
                        </td>
                        {comparison.documents.map(d => {
                          const value = row.values.find(v => v.doc_id === d.id);
                          return (
                            <td key={d.id} className="px-4 py-3 align-top text-gray-600 dark:text-gray-300">
                              {value?.text ?? (
                                <span className="italic text-gray-400">
                                  {tr('compare.absent', 'not present')}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {sessionId && (
                  <button
                    onClick={() => router.push(`/chat/${sessionId}`)}
                    className="px-6 py-3 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {tr('compare.continue_in_chat', 'Continue in chat')}
                  </button>
                )}
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-gray-100 dark:bg-[#1A1A1A] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] text-gray-900 dark:text-white rounded-xl font-outfit font-medium transition-colors"
                >
                  {tr('compare.new_comparison', 'New comparison')}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
