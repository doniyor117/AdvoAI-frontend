'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, FileSignature, Briefcase, Home, Shield, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { FileAttachment } from '@/hooks/useChatManager';

interface ContractWizardViewProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onBack: () => void;
  handleSendMessage?: (text: string) => void;
}

const TEMPLATE_KEYS = [
  { id: 'employment', titleKey: 'employment_contract', descKey: 'employment_desc', icon: Briefcase },
  { id: 'nda', titleKey: 'nda', descKey: 'nda_desc', icon: Shield },
  { id: 'lease', titleKey: 'lease', descKey: 'lease_desc', icon: Home },
  { id: 'service', titleKey: 'service_agreement', descKey: 'service_desc', icon: FileSignature },
];

export function ContractWizardView({ isSidebarOpen, setIsSidebarOpen, onBack, handleSendMessage }: ContractWizardViewProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'interview' | 'template'>('template');
  const [isDrafting, setIsDrafting] = useState(false);

  const handleStartTemplate = (templateId: string) => {
    setIsDrafting(true);
    if (handleSendMessage) {
      if (templateId === 'custom') {
        const customPrompt = (t('prompts.draft_custom_contract') as string) || "I want to draft a new custom contract. Please ask me questions to guide me through the drafting process.";
        handleSendMessage(customPrompt);
      } else {
        const templatePrompt = ((t('prompts.draft_template_contract') as string) || "I want to draft a new {templateId} contract. Please use the standard template as a base.").replace('{templateId}', templateId);
        handleSendMessage(templatePrompt);
      }
      onBack();
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
              <FileSignature className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="font-outfit font-medium text-gray-900 dark:text-white">
              {t('wizard.title') as string || 'Shartnoma yaratish'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="max-w-4xl w-full flex flex-col gap-8 mt-4">
          
          {/* Segmented Control */}
          <div className="flex p-1 bg-gray-200/50 dark:bg-[#1A1A1A] rounded-xl self-center">
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-6 py-2 rounded-lg font-outfit text-sm font-medium transition-all ${
                activeTab === 'interview' 
                  ? 'bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('wizard.guided_interview') as string || 'Guided Interview'}
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`px-6 py-2 rounded-lg font-outfit text-sm font-medium transition-all ${
                activeTab === 'template' 
                  ? 'bg-[#0A2540] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('wizard.start_template') as string || 'Start from Template'}
            </button>
          </div>

          {activeTab === 'template' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {TEMPLATE_KEYS.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleStartTemplate(tmpl.id)}
                    className="p-6 text-left rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-white/60 dark:bg-[#111111]/60 hover:border-blue-500 dark:hover:border-blue-500 backdrop-blur-xl transition-all group flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1A1A1A] group-hover:bg-blue-500/10 flex items-center justify-center flex-shrink-0 transition-colors">
                      <tmpl.icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-outfit font-medium text-gray-900 dark:text-white mb-1">
                        {t(`wizard.${tmpl.titleKey}`) as string}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {t(`wizard.${tmpl.descKey}`) as string}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 self-center" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-[#2A2A2A] rounded-3xl bg-white/30 dark:bg-[#111111]/30">
                <FileSignature className="w-12 h-12 text-blue-500 mb-4" />
                <h3 className="text-xl font-outfit font-semibold text-gray-900 dark:text-white">
                  Interactive Drafting
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md font-merriweather">
                  AdvoAI will ask you a series of questions about the parties, terms, and conditions to generate a custom legal document from scratch.
                </p>
                <button 
                  onClick={() => handleStartTemplate('custom')}
                  className="mt-6 px-8 py-3 bg-[#0A2540] hover:bg-[#113255] text-white rounded-xl font-outfit font-semibold transition-colors"
                >
                  Start Interview
                </button>
              </div>
            )}

        </div>
      </div>
    </div>
  );
}
