"use client";

import React, { useState, useCallback, KeyboardEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Paperclip,
  Send,
  Plus,
  Home,
  Settings,
} from "lucide-react";
import { DIProvider, useEditorService } from "../../lib/di/di-provider";
import {
  ChatItem,
  FileItem,
  ItemType,
  useEditorStore,
} from "../../features/editor/editor-store";
import { ILogObj, Logger } from "tslog";

// Setup logger
const logger = new Logger<ILogObj>({ name: "editor-ui" });

// Explorer Item Component
const ExplorerItem = ({
  item,
  level = 0,
}: {
  item: ItemType;
  level?: number;
}) => {
  const { setSelectedItem, toggleFolder, isExpanded, selectedItem } =
    useEditorStore();
  const editorService = useEditorService();
  const isOpen = isExpanded(item.id);
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    if (item.type === "folder") {
      toggleFolder(item.id);
    } else {
      setSelectedItem(item);
    }
  };

  const handleNewChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("handleNewChat", item);
    if (item.type === "folder") {
      console.log("Creating new chat in folder", item.id);
      // Use the editor service to create a new chat
      editorService.clientStartNewChat(item.id, item.id);
    }
  };

  // Determine icon
  let icon;
  if (item.type === "folder") {
    icon = isOpen ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronRight className="w-4 h-4" />
    );
  } else if (item.type === "chat") {
    icon = <MessageSquare className="w-4 h-4" />;
  } else {
    icon = <FileText className="w-4 h-4" />;
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 ${
          selectedItem?.id === item.id ? "bg-blue-100" : ""
        }`}
        style={{ paddingLeft }}
      >
        <span className="mr-1">{icon}</span>
        <span className="flex-grow truncate">{item.name}</span>
        {item.status && <span className="ml-1">{item.status}</span>}
        {item.controls && (
          <span className="ml-1 text-gray-500">{item.controls.join(" ")}</span>
        )}
      </div>

      {isOpen && item.type === "folder" && (
        <div>
          {item.type === "folder" && (
            <div
              className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 text-green-600"
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
              onClick={handleNewChat}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>[+ New Chat]</span>
            </div>
          )}

          {item.type === "folder" &&
          item.children &&
          item.children.length > 0 ? (
            item.children.map((child) => (
              <ExplorerItem key={child.id} item={child} level={level + 1} />
            ))
          ) : item.type === "folder" ? (
            <div
              className="text-gray-400 px-2 py-1"
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
            >
              (No files)
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Chat Component
const ChatView = ({ item }: { item: ChatItem }) => {
  const [inputValue, setInputValue] = useState("");
  const editorService = useEditorService();

  const handleSendMessage = useCallback(() => {
    if (inputValue.trim()) {
      // Use the editor service to submit a message
      editorService.clientSubmitMessage(item.id, inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, editorService, item.id]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format messages for display
  const messages = item.messages || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 overflow-auto">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 p-3 rounded-md ${
                msg.role === "User" ? "bg-gray-50" : "bg-blue-50"
              }`}
            >
              <div className="font-bold">[{msg.role}]</div>
              <div>{msg.content}</div>
            </div>
          ))
        ) : (
          <div className="text-gray-400">
            No messages yet. Start a conversation!
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Write a message..."
            className="flex-grow px-3 py-2 border rounded-md"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// File View Component
const FileView = ({ item }: { item: FileItem }) => {
  return (
    <div className="p-4 h-full">
      <div className="flex items-center mb-4 text-sm text-gray-600">
        <button className="mr-2 p-1 border rounded hover:bg-gray-100">
          ✏️ Edit
        </button>
        <button className="mr-2 p-1 border rounded hover:bg-gray-100">
          ⬇️ Download
        </button>
        <button className="p-1 border rounded hover:bg-gray-100">
          📤 Share
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-md border overflow-auto max-h-[calc(100vh-200px)]">
        {item.content || "Empty file"}
      </pre>
    </div>
  );
};

// Content View Component
const ContentView = () => {
  const { selectedItem, getItemPath } = useEditorStore();

  if (!selectedItem) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-400">
        Select an item from the explorer to view its content
      </div>
    );
  }

  const path = getItemPath(selectedItem.id);

  return (
    <div className="flex flex-col h-full">
      {/* Path */}
      <div className="px-4 py-2 border-b text-sm text-gray-600">
        <Home className="inline-block w-4 h-4 mr-1" />
        Home{" "}
        {path.map((segment, index) => (
          <span key={index}> &gt; {segment}</span>
        ))}
      </div>

      {/* Content */}
      {selectedItem.type === "chat" ? (
        <ChatView item={selectedItem as ChatItem} />
      ) : selectedItem.type === "file" ? (
        <FileView item={selectedItem as FileItem} />
      ) : (
        <div className="p-4 text-gray-600">
          Folder view: {selectedItem.name}
        </div>
      )}
    </div>
  );
};

// Explorer Component
const Explorer = () => {
  const { data } = useEditorStore();
  const editorService = useEditorService();

  const handleCreateNewTask = () => {
    // Use the editor service to create a new task
    editorService.clientCreateTask("New Task", {});
  };

  return (
    <div className="w-72 bg-white border-r overflow-y-auto">
      <div className="p-2 flex items-center justify-between border-b">
        <div className="text-xl">🏠</div>
        <button
          onClick={handleCreateNewTask}
          className="text-green-600 hover:text-green-700 px-2 py-1 rounded cursor-pointer"
        >
          [+ New Task]
        </button>
      </div>
      <div className="flex flex-col h-[calc(100vh-88px)]">
        <div className="flex-grow overflow-y-auto">
          <ExplorerItem item={data} />
        </div>
        <div className="p-2 border-t">
          <button className="flex items-center text-gray-600 hover:text-gray-800">
            <Settings className="w-4 h-4 mr-1" /> SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Editor UI Component
const EditorUI = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Explorer */}
      <Explorer />

      {/* Content Area */}
      <div className="flex-grow flex flex-col bg-white">
        <ContentView />
      </div>
    </div>
  );
};

// Main Editor Page Component with DI Provider
const EditorPage = () => {
  logger.debug("EditorPage rendered");

  return (
    <DIProvider
      // Optional WebSocket config
      // websocketConfig={{
      //   hostname: "localhost",
      //   port: 8000,
      //   protocol: "ws:",
      // }}
      logger={logger}
    >
      <EditorUI />
    </DIProvider>
  );
};

export default EditorPage;
