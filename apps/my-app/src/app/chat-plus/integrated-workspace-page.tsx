"use client";

import React, { useState } from "react";
import { Logger } from "tslog";
import { DIProvider, useServicesInitialized } from "../../lib/di/di-provider";
import WorkspaceTreeViewer from "../explorer/workspace-tree-viewer";
import FilePreviewPanel from "../explorer/file-preview-panel";
import ChatPanel from "../chat/chat-panel";
import NewChatModal from "../chat/new-chat-modal";

const logger = new Logger({ name: "integrated-workspace-page" });

const IntegratedWorkspacePage: React.FC = () => {
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const isServicesInitialized = useServicesInitialized();

  if (!isServicesInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Initializing services...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Explorer Panel (280px) */}
      <div className="w-[280px] bg-white border-r flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="text-lg font-medium">🏠 Explorer</div>
          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            + New Chat
          </button>
        </div>
        <div className="flex-grow overflow-auto">
          <WorkspaceTreeViewer />
        </div>
        <div className="p-3 border-t">
          <button className="px-3 py-1 w-full text-sm text-left text-gray-700 hover:bg-gray-100 rounded">
            ⚙️ SETTINGS
          </button>
        </div>
      </div>

      {/* Chat Panel (Flexible) */}
      <div className="flex-grow border-r flex flex-col h-full overflow-hidden">
        <ChatPanel />
      </div>

      {/* Preview Panel (360px) */}
      <div className="w-[360px] bg-white flex flex-col h-full overflow-hidden">
        <FilePreviewPanel />
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
};

const IntegratedWorkspacePageWithProvider: React.FC = () => {
  return (
    <DIProvider>
      <IntegratedWorkspacePage />
    </DIProvider>
  );
};

export default IntegratedWorkspacePageWithProvider;
