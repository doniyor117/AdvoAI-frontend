'use client';

import React from 'react';
import { useChatManager } from '@/hooks/useChatManager';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { InsightPanel } from '@/components/InsightPanel';
import { AgreementSummary } from '@/components/AgreementSummary';
import { CompareContractsView } from '@/components/CompareContractsView';
import { ContractWizardView } from '@/components/ContractWizardView';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

function AppContent() {
  const {
    messages,
    inputValue,
    setInputValue,
    isInsightOpen,
    activeCitation,
    activeAttachment,
    setActiveAttachment,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    handleSendMessage,
    handleCitationClick,
    handleAttachmentClick,
    closeInsightPanel,
    isHydrated,
    activeFeature,
    setActiveFeature,
    chatTitle,
    attachments,
    uploadFile,
    removeAttachment
  } = useChatManager();

  return (
    <div className="flex h-screen w-full bg-[#fafafa] dark:bg-[#0a0a0a] overflow-hidden relative">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNewConsultation={() => { 
          setIsSidebarOpen(false); 
          setActiveFeature('chat');
        }} 
        onAgreementSummaryClick={() => setActiveFeature('agreement_summary')}
        onCompareContractsClick={() => setActiveFeature('compare_contracts')}
        onCreateContractClick={() => setActiveFeature('create_contract')}
        onSessionClick={() => setActiveFeature('chat')}
      />
      
      {activeFeature === 'agreement_summary' ? (
        <AgreementSummary 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onBack={() => setActiveFeature('chat')}
          uploadFile={uploadFile}
          setInputValue={setInputValue}
        />
      ) : activeFeature === 'compare_contracts' ? (
        <CompareContractsView 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onBack={() => setActiveFeature('chat')}
          uploadFile={uploadFile}
          setInputValue={setInputValue}
        />
      ) : activeFeature === 'create_contract' ? (
        <ContractWizardView 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onBack={() => setActiveFeature('chat')}
          handleSendMessage={handleSendMessage}
        />
      ) : (
        <ChatArea 
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          onCitationClick={handleCitationClick}
          onAttachmentClick={handleAttachmentClick}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isHydrated={isHydrated}
          chatTitle={chatTitle}
          attachments={attachments}
          uploadFile={uploadFile}
          removeAttachment={removeAttachment}
        />
      )}

      <InsightPanel 
        isOpen={isInsightOpen}
        activeCitation={activeCitation}
        activeAttachment={activeAttachment}
        onClose={closeInsightPanel}
      />

      <AnimatePresence>
        {activeAttachment && (activeAttachment.mime_type || '').startsWith('image/') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 md:p-8"
            onClick={() => setActiveAttachment(null)}
          >
            <button 
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
              onClick={() => setActiveAttachment(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              src={activeAttachment.local_url || activeAttachment.uri} 
              alt={activeAttachment.display_name}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
