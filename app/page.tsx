'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatManager } from '@/hooks/useChatManager';
import { useSessions } from '@/hooks/useSessions';
import { useAuth } from '@/contexts/AuthContext';
import { syncGuestChatOnLogin } from '@/lib/migrateGuestChat';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { InsightPanel } from '@/components/InsightPanel';
import { CompareContractsView } from '@/components/CompareContractsView';
import { ContractWizardView } from '@/components/ContractWizardView';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';

function AppContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { refreshSessions } = useSessions();
  const hasSyncedGuestChatRef = useRef(false);

  // Every successful auth path (login, signup, and the Google-consent flow)
  // eventually lands here on '/'. Running the guest-chat migration from this
  // single spot — rather than duplicating it in each auth page — means none
  // of them can forget to call it. Guard with a ref so it fires exactly once
  // per sign-in, not on every re-render while isAuthenticated stays true.
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || hasSyncedGuestChatRef.current) return;
    hasSyncedGuestChatRef.current = true;

    let cancelled = false;
    (async () => {
      const destination = await syncGuestChatOnLogin();
      if (cancelled) return;
      if (destination.startsWith('/chat/')) {
        refreshSessions();
        router.push(destination);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isAuthenticated, router, refreshSessions]);

  const {
    messages,
    inputValue,
    setInputValue,
    isInsightOpen,
    activeCitation,
    activeMessageCitations,
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
    sendBlockedReason,
    activeFeature,
    setActiveFeature,
    chatTitle,
    attachments,
    uploadFile,
    removeAttachment,
    quotedText,
    setQuotedText,
    useWebSearch,
    setUseWebSearch,
    regenerateMessage,
    setActiveVariant,
    editMessage,
    reportMessage,
    fetchVariantInfo,
  } = useChatManager();

  const { settings } = usePublicSettings();
  const notification = settings?.global_notification;
  const notificationType = settings?.global_notification_type || 'info';

  const getNotificationIcon = () => {
    switch(notificationType) {
      case 'error': return <AlertCircle className="w-4 h-4 mr-2" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 mr-2" />;
      default: return <Info className="w-4 h-4 mr-2" />;
    }
  };

  const getNotificationColors = () => {
    switch(notificationType) {
      case 'error': return "bg-red-500 text-white";
      case 'warning': return "bg-amber-500 text-white";
      default: return "bg-blue-500 text-white";
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#fafafa] dark:bg-[#0a0a0a] overflow-hidden relative">
      {notification && (
        <div className={`w-full ${getNotificationColors()} px-4 py-2 text-sm flex items-center justify-center font-medium z-50 shadow-sm`}>
          {getNotificationIcon()}
          <span>{notification}</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onNewConsultation={() => { 
          setIsSidebarOpen(false); 
          setActiveFeature('chat');
        }} 
        onCompareContractsClick={() => setActiveFeature('compare_contracts')}
        onCreateContractClick={() => setActiveFeature('create_contract')}
        onSessionClick={() => setActiveFeature('chat')}
      />
      
      {activeFeature === 'compare_contracts' ? (
        <CompareContractsView 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onBack={() => setActiveFeature('chat')}
        />
      ) : activeFeature === 'create_contract' ? (
        <ContractWizardView 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onBack={() => setActiveFeature('chat')}
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
          sendBlockedReason={sendBlockedReason}
          useWebSearch={useWebSearch}
          setUseWebSearch={setUseWebSearch}
          regenerateMessage={regenerateMessage}
          setActiveVariant={setActiveVariant}
          editMessage={editMessage}
          reportMessage={reportMessage}
          fetchVariantInfo={fetchVariantInfo}
        />
      )}

      <InsightPanel
        isOpen={isInsightOpen}
        activeCitation={activeCitation}
        relatedCitations={activeMessageCitations}
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
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
