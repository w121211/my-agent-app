"use client";

import React from "react";
import FileExplorer from "@/app/explorer/file-explorer";
import ChatPanel from "@/app/chat/chat-panel";
import FileExplorerEventHandlersProvider from "@/app/explorer/file-explorer-event-handlers-provider";
import { useFileExplorerStore } from "@/lib/file-explorer-store";

// 簡單的檔案預覽組件
const FilePreview = ({ path }: { path: string }) => {
  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="px-4 py-2 border-b bg-gray-50">
        <div className="text-sm text-gray-600">{path}</div>
      </div>
      <pre className="p-4 whitespace-pre-wrap">
        {/* 這裡可以根據檔案類型顯示不同的預覽 */}
        File content preview for: {path}
      </pre>
    </div>
  );
};

const Editor = () => {
  const { selectedPath } = useFileExplorerStore();

  // 判斷是否為聊天檔案
  const isChatFile = selectedPath?.endsWith(".chat.json");

  return (
    <div className="h-screen flex">
      {/* Left Panel - File Explorer */}
      <div className="w-72 border-r bg-white overflow-hidden">
        <FileExplorerEventHandlersProvider>
          <FileExplorer />
        </FileExplorerEventHandlersProvider>
      </div>

      {/* Right Panel - Chat/Preview */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedPath ? (
          isChatFile ? (
            <ChatPanel />
          ) : (
            <FilePreview path={selectedPath} />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a file from the explorer
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
