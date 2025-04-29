import React, { useState } from "react";
import { DIProvider, useServicesInitialized } from "../../lib/di/di-provider";
import ChatPanel from "./chat-panel";
import NewChatModal from "./new-chat-modal";

const ChatPanelContainer: React.FC = () => {
  const isServicesInitialized = useServicesInitialized();
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // If services are not initialized yet, show a loading indicator
  if (!isServicesInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Initializing services...</span>
      </div>
    );
  }

  return (
    <>
      <ChatPanel />
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />

      {/* Floating new chat button, could be placed elsewhere in the layout */}
      <button
        onClick={() => setIsNewChatModalOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600"
      >
        <span className="text-2xl">+</span>
      </button>
    </>
  );
};

const ChatPanelPage: React.FC = () => {
  return (
    <DIProvider>
      <div className="flex h-full bg-white">
        <ChatPanelContainer />
      </div>
    </DIProvider>
  );
};

export default ChatPanelPage;
