'use client';

import React from 'react';
import { useChatManager } from '@/hooks/useChatManager';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { InsightPanel } from '@/components/InsightPanel';
import { AgreementSummary } from '@/components/AgreementSummary';
import { use } from 'react';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const {
    messages,
    inputValue,
    setInputValue,
    isInsightOpen,
    activeCitation,
    isLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    handleSendMessage,
    handleCitationClick,
    closeInsightPanel,
    isHydrated,
    activeFeature,
    setActiveFeature,
    chatTitle
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
        onSessionClick={() => setActiveFeature('chat')}
      />
      
      {activeFeature === 'agreement_summary' ? (
        <AgreementSummary 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      ) : (
        <ChatArea 
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          onCitationClick={handleCitationClick}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isHydrated={isHydrated}
          chatTitle={chatTitle}
        />
      )}

      <InsightPanel 
        isOpen={isInsightOpen}
        activeCitation={activeCitation}
        onClose={closeInsightPanel}
      />
    </div>
  );
}
