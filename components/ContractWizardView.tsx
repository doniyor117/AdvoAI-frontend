'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, FileSignature, Briefcase, Home, Shield, ChevronRight, Loader2, Download, MessageSquare, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { authFetch, safeJson } from '@/lib/authFetch';

type FieldDef = { key: string; label: string; placeholder?: string; type?: 'text' | 'textarea' };

type TemplateDef = {
  id: string;               // must match a key in the backend CONTRACT_TEMPLATES
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  fields: FieldDef[];
};

const PARTY_FIELDS = (aLabel: string, bLabel: string): FieldDef[] => [
  { key: aLabel, label: aLabel, placeholder: 'Name, address, requisites' },
  { key: bLabel, label: bLabel, placeholder: 'Name, address, requisites' },
];

const TEMPLATES: TemplateDef[] = [
  {
    id: 'Employment', titleKey: 'employment_contract', descKey: 'employment_desc', icon: Briefcase,
    fields: [
      ...PARTY_FIELDS('Employer', 'Employee'),
      { key: 'Position', label: 'Position', placeholder: 'e.g. Software developer' },
      { key: 'Monthly salary', label: 'Monthly salary', placeholder: 'e.g. 8 000 000 so\'m' },
      { key: 'Working hours', label: 'Working hours', placeholder: 'e.g. 40 hours per week' },
      { key: 'Term', label: 'Term', placeholder: 'e.g. 01.01.2026 – 31.12.2026' },
    ],
  },
  {
    id: 'NDA', titleKey: 'nda', descKey: 'nda_desc', icon: Shield,
    fields: [
      ...PARTY_FIELDS('Disclosing Party', 'Receiving Party'),
      { key: 'Confidential information', label: 'What is confidential', type: 'textarea',
        placeholder: 'e.g. source code, client lists, pricing' },
      { key: 'Confidentiality period', label: 'Confidentiality period', placeholder: 'e.g. 3 years' },
    ],
  },
  {
    id: 'Lease', titleKey: 'lease', descKey: 'lease_desc', icon: Home,
    fields: [
      ...PARTY_FIELDS('Landlord', 'Tenant'),
      { key: 'Property address', label: 'Property address', placeholder: 'Full address' },
      { key: 'Monthly rent', label: 'Monthly rent', placeholder: 'e.g. 5 000 000 so\'m' },
      { key: 'Payment date', label: 'Payment due date', placeholder: 'e.g. the 5th of each month' },
      { key: 'Term', label: 'Term', placeholder: 'e.g. 12 months from 01.01.2026' },
    ],
  },
  {
    id: 'Service', titleKey: 'service_agreement', descKey: 'service_desc', icon: FileSignature,
    fields: [
      ...PARTY_FIELDS('Client', 'Contractor'),
      { key: 'Services', label: 'Services provided', type: 'textarea',
        placeholder: 'Describe the scope of work' },
      { key: 'Price', label: 'Price', placeholder: 'e.g. 15 000 000 so\'m' },
      { key: 'Payment terms', label: 'Payment terms', placeholder: 'e.g. 50% upfront, 50% on delivery' },
      { key: 'Deadline', label: 'Deadline', placeholder: 'e.g. within 30 days' },
    ],
  },
];

interface ContractWizardViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onBack: () => void;
}

type DraftResult = {
  session_id: string;
  display_name: string;
  s3_key: string;
  chat_note: string;
};

export function ContractWizardView({ onBack }: ContractWizardViewProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const [selected, setSelected] = useState<TemplateDef | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isDrafting, setIsDrafting] = useState(false);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tr = (key: string, fallback: string) => {
    const v = t(key) as string;
    return v && v !== key ? v : fallback;
  };

  const fetchDownloadUrl = async (s3_key: string) => {
    try {
      const res = await authFetch(`/api/chat/file/${encodeURIComponent(s3_key)}`);
      if (res.ok) {
        const data = await safeJson(res);
        setDownloadUrl(data.url);
      }
    } catch {
      /* the chat message carries a working download card as a fallback */
    }
  };

  const submit = async (regenerate = false) => {
    if (!selected) return;
    setIsDrafting(true);
    setError(null);
    if (regenerate) setDownloadUrl(null);
    try {
      const res = await authFetch('/api/documents/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_type: selected.id,
          answers,
          session_id: regenerate ? result?.session_id : undefined,
          language: typeof window !== 'undefined'
            ? localStorage.getItem('advoai_lang') || 'uz' : 'uz',
        }),
      });
      if (!res.ok) {
        const errData = await safeJson(res).catch(() => ({}));
        throw new Error(errData.detail || `Drafting failed (${res.status})`);
      }
      const data = await safeJson(res);
      setResult(data);
      fetchDownloadUrl(data.s3_key);
    } catch (e: any) {
      setError(e.message || 'The document could not be generated.');
    } finally {
      setIsDrafting(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setAnswers({});
    setResult(null);
    setDownloadUrl(null);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] dark:bg-[#0a0a0a] h-full relative transition-all duration-300">
      <header className="flex-none h-14 border-b border-gray-200/50 dark:border-[#2A2A2A] bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (selected && !result ? setSelected(null) : onBack())}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="font-outfit font-medium text-gray-900 dark:text-white">
              {tr('wizard.title', 'Create a contract')}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="max-w-3xl w-full flex flex-col gap-8 mt-4">

          {/* ── Done: the generated file ── */}
          {result ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-outfit font-semibold text-gray-900 dark:text-white">
                  {tr('wizard.ready', 'Your document is ready')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-merriweather max-w-xl mx-auto">
                  {result.chat_note}
                </p>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">DOCX</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-outfit font-medium text-gray-900 dark:text-white truncate">
                    {result.display_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Word document</p>
                </div>
                {downloadUrl ? (
                  <a
                    href={downloadUrl}
                    download={result.display_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold text-sm transition-colors flex items-center gap-2 flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    {tr('wizard.download', 'Download')}
                  </a>
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400 flex-shrink-0" />
                )}
              </div>

              {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => router.push(`/chat/${result.session_id}`)}
                  className="px-6 py-3 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {tr('wizard.refine_in_chat', 'Refine in chat')}
                </button>
                <button
                  onClick={() => submit(true)}
                  disabled={isDrafting}
                  className="px-6 py-3 bg-gray-100 dark:bg-[#1A1A1A] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] text-gray-900 dark:text-white rounded-xl font-outfit font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {tr('wizard.regenerate', 'Regenerate')}
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-gray-100 dark:bg-[#1A1A1A] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] text-gray-900 dark:text-white rounded-xl font-outfit font-medium transition-colors"
                >
                  {tr('wizard.new_document', 'New document')}
                </button>
              </div>
            </motion.div>

          /* ── Step 2: fill in the details ── */
          ) : selected ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-outfit font-semibold text-gray-900 dark:text-white">
                  {tr(`wizard.${selected.titleKey}`, selected.id)}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-merriweather">
                  {tr('wizard.fill_details',
                    'Fill in what you know. Anything you leave blank becomes a clearly marked placeholder.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selected.fields.map(field => (
                  <div
                    key={field.key}
                    className={field.type === 'textarea' ? 'md:col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}
                  >
                    <label htmlFor={field.key} className="text-sm font-medium text-gray-700 dark:text-gray-300 font-outfit">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.key}
                        rows={3}
                        value={answers[field.key] || ''}
                        placeholder={field.placeholder}
                        onChange={e => setAnswers(a => ({ ...a, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    ) : (
                      <input
                        id={field.key}
                        type="text"
                        value={answers[field.key] || ''}
                        placeholder={field.placeholder}
                        onChange={e => setAnswers(a => ({ ...a, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    )}
                  </div>
                ))}
              </div>

              {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex justify-center">
                <button
                  onClick={() => submit(false)}
                  disabled={isDrafting}
                  className="px-8 py-4 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isDrafting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSignature className="w-5 h-5" />}
                  {isDrafting
                    ? tr('wizard.drafting', 'Drafting…')
                    : tr('wizard.generate', 'Generate document')}
                </button>
              </div>
            </motion.div>

          /* ── Step 1: pick a template ── */
          ) : (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-outfit font-semibold text-gray-900 dark:text-white">
                  {tr('wizard.choose', 'What would you like to create?')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-merriweather max-w-xl mx-auto">
                  {tr('wizard.choose_desc',
                    'Pick a template, answer a few questions, and get a ready-made Word document.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelected(tmpl)}
                    className="p-6 text-left rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white/60 dark:bg-[#111111]/60 hover:border-blue-500 dark:hover:border-blue-500 backdrop-blur-xl transition-all group flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1A1A1A] group-hover:bg-blue-500/10 flex items-center justify-center flex-shrink-0 transition-colors">
                      <tmpl.icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-outfit font-medium text-gray-900 dark:text-white mb-1">
                        {tr(`wizard.${tmpl.titleKey}`, tmpl.id)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {tr(`wizard.${tmpl.descKey}`, '')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 self-center" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
