"use client";

import React, { useEffect, useState } from "react";
import { ILogObj, Logger } from "tslog";
import {
  DIProvider,
  useChatService,
  useWorkspaceTreeService,
  useServicesInitialized,
} from "../../lib/di/di-provider";
import { useChatStore } from "../../features/chat/ui-chat-store";
import { useWorkspaceTreeStore } from "../../features/workspace-tree/workspace-tree-store";
import ExplorerHeader from "../explorer/explorer-header";
import { TreeNodeComponent } from "../explorer/tree-components";
import NewChatModal from "./new-chat-modal";
import ChatPanel from "./chat-panel";
import FilePreviewPanel from "./file-preview-panel";

// Setup logger
const logger = new Logger<ILogObj>({ name: "chat-page" });

// Explorer Panel - Reused from workspace-explorer
const WorkspaceTreeViewer = () => {
  const { root } = useWorkspaceTreeStore();
  const [isLoading, setIsLoading] = useState(true);
  const workspaceTreeService = useWorkspaceTreeService();
  const servicesInitialized = useServicesInitialized();

  useEffect(() => {
    if (root) {
      setIsLoading(false);
    }
  }, [root]);

  // Request workspace tree data after services are initialized
  useEffect(() => {
    if (servicesInitialized && workspaceTreeService) {
      logger.info("Requesting initial workspace tree");
      workspaceTreeService.requestWorkspaceTree();
    }
  }, [servicesInitialized, workspaceTreeService]);

  if (isLoading) {
    return (
      <div className="p-4 text-gray-400 flex items-center justify-center h-full">
        Loading workspace files...
      </div>
    );
  }

  if (!root) {
    return (
      <div className="p-4 text-gray-400 flex items-center justify-center h-full">
        No workspace files found.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <TreeNodeComponent node={root} />
    </div>
  );
};

// Main Page Component
const ChatPage = () => {
  const {
    currentChat,
    isPanelVisible,
    isLoading,
    isNewChatModalOpen,
    hideNewChatModal,
  } = useChatStore();

  return (
    <DIProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Explorer Panel (280px) */}
        <div className="w-72 bg-white border-r flex flex-col h-full">
          <ExplorerHeader />
          <div className="flex-grow overflow-hidden">
            <WorkspaceTreeViewer />
          </div>
        </div>

        {/* Chat Panel (flexible) */}
        <div className="flex-grow flex flex-col bg-white border-r">
          {isPanelVisible ? (
            <ChatPanel chat={currentChat} isLoading={isLoading} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a chat file or create a new chat
            </div>
          )}
        </div>

        {/* Preview Panel (360px) */}
        <div className="w-96 bg-white flex flex-col h-full">
          <FilePreviewPanel />
        </div>

        {/* New Chat Modal */}
        {isNewChatModalOpen && <NewChatModal onClose={hideNewChatModal} />}
      </div>
    </DIProvider>
  );
};

export default ChatPage;
