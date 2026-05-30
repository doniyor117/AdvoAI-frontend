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
import { use } from 'react';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { FileAttachment } from '@/hooks/useChatManager';

function FullscreenImageViewer({ attachment, onClose }: { attachment: FileAttachment, onClose: () => void }) {
  const imgSrc = usePresignedUrl(attachment);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors z-50"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
      {imgSrc ? (
        <motion.img 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          src={imgSrc} 
          alt={attachment.display_name}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white/70">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Loading image...</p>
        </div>
      )}
    </motion.div>
  );
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
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
    removeAttachment,
    quotedText,
    setQuotedText
  } = useChatManager(resolvedParams.id);

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
          quotedText={quotedText}
          setQuotedText={setQuotedText}
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
          <FullscreenImageViewer 
            attachment={activeAttachment} 
            onClose={() => setActiveAttachment(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
