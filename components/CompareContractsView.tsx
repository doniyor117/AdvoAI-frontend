'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, FileText, ArrowLeft, Plus, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { FileAttachment } from '@/hooks/useChatManager';

interface CompareContractsViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onBack: () => void;
  uploadFile?: (file: File) => Promise<void>;
  setInputValue?: (text: string) => void;
}

export function CompareContractsView({ isSidebarOpen, setIsSidebarOpen, onBack, uploadFile, setInputValue }: CompareContractsViewProps) {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 4)); // Max 4 files
    }
  };

  const handleCompare = async () => {
    if (files.length < 2) return;
    if (!uploadFile || !setInputValue) {
      setError("Chat manager is not fully connected.");
      return;
    }
    
    setIsComparing(true);
    setError(null);
    
    try {
      // Start upload for all files
      for (const file of files) {
        uploadFile(file).catch(console.error);
      }
      
      const prompt = (t('prompts.compare_contracts') as string) || "Compare these contracts. Identify discrepancies, missing clauses, and risks.";
      setInputValue(prompt);
      
      // Transition back to chat interface
      setFiles([]);
      setIsComparing(false);
      onBack();
    } catch (err: any) {
      console.error("Comparison error:", err);
      setError(err.message || "Failed to prepare comparison.");
      setIsComparing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] dark:bg-[#0a0a0a] h-full relative transition-all duration-300">
      {/* Header */}
      <header className="flex-none h-14 border-b border-gray-200/50 dark:border-[#2A2A2A] bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="font-outfit font-medium text-gray-900 dark:text-white">
              Shartnomalarni taqqoslash
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="max-w-4xl w-full flex flex-col gap-8 mt-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-outfit font-semibold text-gray-900 dark:text-white">
              Compare Contracts
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-merriweather max-w-xl mx-auto">
              Upload up to 4 contracts (e.g. Primary Contract vs Counterparty Draft) to instantly identify discrepancies, missing clauses, and risks.
            </p>
          </div>

          {!comparisonResult ? (
            <>
              {/* Upload Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {files.map((file, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={idx}
                    className="p-6 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-outfit font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </motion.div>
                ))}

                {files.length < 4 && (
                  <label className="p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-[#333] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 h-24">
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept=".pdf,.txt,.md,.csv,.html,.htm,.doc,.docx,.rtf"
                      onChange={handleFileUpload}
                    />
                    <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 font-outfit">Add Document</span>
                  </label>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleCompare}
                  disabled={files.length < 2 || isComparing}
                  className="px-8 py-4 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isComparing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-5 h-5" />
                  )}
                  {isComparing ? "Analyzing..." : "Analyze & Compare"}
                </button>
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#111111] shadow-xl"
            >
              <h3 className="text-xl font-outfit font-semibold text-gray-900 dark:text-white mb-4">Comparison Results</h3>
              <div className="prose dark:prose-invert font-merriweather text-gray-600 dark:text-gray-300">
                {comparisonResult}
              </div>
              <button
                onClick={() => {
                  setFiles([]);
                  setComparisonResult(null);
                }}
                className="mt-8 px-6 py-2 bg-gray-100 dark:bg-[#1A1A1A] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] text-gray-900 dark:text-white rounded-lg font-outfit font-medium transition-colors"
              >
                Start New Comparison
              </button>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
