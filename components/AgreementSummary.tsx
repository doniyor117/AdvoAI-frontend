'use client';

import React, { useState } from 'react';
import { Plus, UploadCloud, X, File as FileIcon, Menu, PanelLeftOpen, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AgreementSummaryProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onBack?: () => void;
  uploadFile?: (file: File) => Promise<void>;
  setInputValue?: (text: string) => void;
}

export function AgreementSummary({ isSidebarOpen, setIsSidebarOpen, onBack, uploadFile, setInputValue }: AgreementSummaryProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSummarize = async () => {
    if (!file) return;
    if (!uploadFile || !setInputValue || !onBack) {
      setError("Chat manager is not fully connected.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Start upload
      uploadFile(file).catch(console.error);
      
      const prompt = (t('prompts.summarize_agreement') as string) || "Please summarize this agreement. Highlight key clauses, obligations, and potential risks.";
      setInputValue(prompt);
      
      // Transition back to chat interface
      setFile(null);
      setIsProcessing(false);
      onBack();
    } catch (err: any) {
      console.error("Summary error:", err);
      setError(err.message || "Failed to prepare summary.");
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full relative min-w-0 bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Header */}
      <header className="h-14 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-10 sticky top-0 border-b border-black/5 dark:border-white/5 flex items-center px-4 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2 active:scale-95 md:hidden"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          {!isSidebarOpen && (
            <div className="flex items-center gap-1.5 text-primary dark:text-[#E6EDF3] font-bold hidden md:flex pl-1">
              <Scale className="w-5 h-5 md:hidden" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">{t('chatbot_name')}</span>
            </div>
          )}
          
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors md:hidden active:scale-95"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl flex flex-col items-center"
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-[#E6EDF3] mb-2 text-center">
            Agreement summary
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-xl text-sm md:text-base">
            Summarize the agreement to quickly review key clauses, obligations, and potential risks.
          </p>

          <div 
            className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-200 ${
              isDragging 
                ? 'border-primary bg-primary/5 dark:border-[#1F6FEB] dark:bg-[#1F6FEB]/10' 
                : 'border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-[#161B22] dark:hover:bg-[#1C2128]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 dark:bg-[#1F6FEB]/20 rounded-full flex items-center justify-center mb-4 text-primary dark:text-[#1F6FEB]">
                  <FileIcon className="w-8 h-8" />
                </div>
                <p className="font-medium text-slate-800 dark:text-[#E6EDF3] mb-1 text-center truncate max-w-[200px] md:max-w-xs">{file.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={() => setFile(null)}
                  className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
                  <Plus className="w-8 h-8" />
                </div>
                <label className="cursor-pointer text-center flex flex-col items-center">
                  <span className="text-primary hover:underline font-medium block">
                    Drag & drop files or browse files on your device
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.md,.csv,.html,.htm,.doc,.docx,.rtf,.png,.jpg,.jpeg,.webp,.gif"
                  />
                </label>
              </>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-red-500 mt-4 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">{error}</p>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 mb-8 text-center">
            Supported formats: PDF, DOC, DOCX, HTML, TXT, MD, CSV, RTF, PNG, JPEG, WebP, GIF (max 10MB)
          </p>

          <button 
            disabled={!file || isProcessing}
            onClick={handleSummarize}
            className={`w-full py-3.5 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              file && !isProcessing
                ? 'bg-primary hover:bg-primary-hover text-white dark:bg-[#1F6FEB] dark:hover:bg-[#388bfd] shadow-sm active:scale-[0.98]' 
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              'Summarize'
            )}
          </button>
        </motion.div>
      </div>
    </main>
  );
}
