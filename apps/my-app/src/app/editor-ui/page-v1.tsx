"use client";

import React, { useState, useCallback, KeyboardEvent } from "react";
import { create } from "zustand";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";
import { Logger } from "tslog";

// Setup logger
const log = new Logger({ name: "workspace-ui" });

// Types
type MessageRole = "User" | "AI";

interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

type FileType = "chat" | "file";

interface ItemType {
  id: string;
  name: string;
  type: FileType | "folder";
  children?: ItemType[];
  status?: "🏃" | undefined;
  content?: string;
  messages?: Message[];
}

// Mock data
const mockData: ItemType = {
  id: "root",
  name: "workspace",
  type: "folder",
  children: [
    {
      id: "project1",
      name: "project1-dashboard",
      type: "folder",
      status: "🏃",
      children: [
        {
          id: "planning",
          name: "planning",
          type: "folder",
          children: [
            {
              id: "chat1",
              name: "chat-20240322_103000.chat.json",
              type: "chat",
              messages: [
                {
                  role: "User",
                  content: "I need a dashboard with user analytics features",
                  timestamp: new Date("2024-03-22T10:30:00"),
                },
                {
                  role: "AI",
                  content:
                    "I'll design a dashboard with user analytics. What specific metrics would you like to track?",
                  timestamp: new Date("2024-03-22T10:31:00"),
                },
                {
                  role: "User",
                  content:
                    "We need daily active users, session duration and conversion rates",
                  timestamp: new Date("2024-03-22T10:32:00"),
                },
                {
                  role: "AI",
                  content:
                    "I've drafted a dashboard design with three main sections: DAU trends, average session time, and conversion funnels. Would you like to see a mockup?",
                  timestamp: new Date("2024-03-22T10:33:00"),
                },
              ],
            },
            {
              id: "chat2",
              name: "chat-20240322_114500.chat.json",
              type: "chat",
              messages: [],
            },
          ],
        },
        {
          id: "implementation",
          name: "implementation",
          type: "folder",
          children: [
            {
              id: "dashboard1",
              name: "dashboard.v1.tsx",
              type: "file",
              content:
                "import React from 'react';\n\nexport default function Dashboard() {\n  // Dashboard implementation v1\n  return (\n    <div>\n      <h1>User Analytics Dashboard</h1>\n      {/* Components will be added here */}\n    </div>\n  );\n}",
            },
            {
              id: "dashboard2",
              name: "dashboard.v2.tsx",
              type: "file",
              content:
                'import React from \'react\';\nimport { UserMetrics } from \'./types\';\n\nexport default function Dashboard() {\n  // Dashboard implementation v2 with metrics\n  return (\n    <div className="dashboard-container">\n      <h1>User Analytics Dashboard</h1>\n      <div className="metrics-grid">\n        <MetricsCard title="Daily Active Users" />\n        <MetricsCard title="Avg Session Time" />\n        <MetricsCard title="Conversion Rate" />\n      </div>\n    </div>\n  );\n}',
            },
            {
              id: "api",
              name: "api-spec.md",
              type: "file",
              content:
                "# Dashboard API Specifications\n\n## Endpoints\n\n- GET /api/metrics/daily - Returns daily active users\n- GET /api/metrics/session - Returns session duration data\n- GET /api/metrics/conversion - Returns conversion funnel data",
            },
          ],
        },
        {
          id: "requirements",
          name: "requirements.md",
          type: "file",
          content:
            "# Dashboard Requirements\n\n1. Display daily active users (DAU) for last 30 days\n2. Show average session duration by user segment\n3. Visualize conversion funnel from visitor to customer\n4. Allow date range filtering\n5. Support data export to CSV",
        },
      ],
    },
    {
      id: "project2",
      name: "project2-user_auth",
      type: "folder",
    },
    {
      id: "project3",
      name: "project3-performance_optimization",
      type: "folder",
    },
  ],
};

// Helper function to find an item by ID in the tree
function findItemById(root: ItemType, id: string): ItemType | null {
  if (root.id === id) return root;

  if (root.children) {
    for (const child of root.children) {
      const found = findItemById(child, id);
      if (found) return found;
    }
  }

  return null;
}

// Zustand store
interface WorkspaceStore {
  data: ItemType;
  selectedItem: ItemType | null;
  expandedFolders: Set<string>;
  setSelectedItem: (item: ItemType | null) => void;
  toggleFolder: (folderId: string) => void;
  isExpanded: (folderId: string) => boolean;
  sendMessage: (itemId: string, content: string) => void;
}

const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  data: mockData,
  selectedItem: null,
  expandedFolders: new Set(["root", "project1"]), // Initially expand root and first folder

  setSelectedItem: (item) => set({ selectedItem: item }),

  toggleFolder: (folderId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return { expandedFolders: newExpanded };
    }),

  isExpanded: (folderId) => get().expandedFolders.has(folderId),

  sendMessage: (itemId, content) =>
    set((state) => {
      // Create a deep copy of the data
      const newData = JSON.parse(JSON.stringify(state.data)) as ItemType;

      // Find the chat item
      const chatItem = findItemById(newData, itemId);

      if (!chatItem || chatItem.type !== "chat") {
        log.error(
          `Cannot send message: Item ${itemId} not found or not a chat`
        );
        throw new Error(
          `Cannot send message: Item ${itemId} not found or not a chat`
        );
      }

      // Ensure the messages array exists
      if (!chatItem.messages) {
        chatItem.messages = [];
      }

      // Add the new user message
      const newMessage: Message = {
        role: "User",
        content,
        timestamp: new Date(),
      };

      chatItem.messages.push(newMessage);

      // Simulate AI response (in a real app, this would come from an API)
      setTimeout(() => {
        set((state) => {
          const newData = JSON.parse(JSON.stringify(state.data)) as ItemType;
          const chatItem = findItemById(newData, itemId);

          if (!chatItem || chatItem.type !== "chat" || !chatItem.messages) {
            return state;
          }

          const aiMessage: Message = {
            role: "AI",
            content: "I've received your message and will process it shortly.",
            timestamp: new Date(),
          };

          chatItem.messages.push(aiMessage);

          const newSelectedItem =
            state.selectedItem?.id === itemId ? chatItem : state.selectedItem;

          return {
            data: newData,
            selectedItem: newSelectedItem,
          };
        });
      }, 1000);

      // Update the selected item if it's the chat we're modifying
      const newSelectedItem =
        state.selectedItem?.id === itemId ? chatItem : state.selectedItem;

      log.info(`Message sent to chat ${itemId}`);

      return {
        data: newData,
        selectedItem: newSelectedItem,
      };
    }),
}));

// Explorer Item Component
const ExplorerItem = ({
  item,
  level = 0,
}: {
  item: ItemType;
  level?: number;
}) => {
  const { setSelectedItem, toggleFolder, isExpanded, selectedItem } =
    useWorkspaceStore();
  const isOpen = isExpanded(item.id);
  const paddingLeft = `${level * 16}px`;

  const handleClick = () => {
    if (item.type === "folder") {
      toggleFolder(item.id);
    } else {
      setSelectedItem(item);
    }
  };

  const icon =
    item.type === "folder" ? (
      isOpen ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )
    ) : item.type === "chat" ? (
      <MessageSquare className="w-4 h-4" />
    ) : (
      <FileText className="w-4 h-4" />
    );

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
        <span>{item.name}</span>
        {item.status && <span className="ml-1">{item.status}</span>}
      </div>
      {isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <ExplorerItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// Chat Component
const ChatView = ({ item }: { item: ItemType }) => {
  const [inputValue, setInputValue] = useState("");
  const { sendMessage } = useWorkspaceStore();

  const handleSendMessage = useCallback(() => {
    if (inputValue.trim()) {
      sendMessage(item.id, inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, sendMessage, item.id]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format messages for display
  const messages = item.messages || [];
  const formattedContent = messages.map((msg, index) => (
    <div
      key={index}
      className={`mb-4 ${msg.role === "User" ? "text-blue-600" : "text-green-600"}`}
    >
      <div className="font-bold">[{msg.role}]</div>
      <div>{msg.content}</div>
      <div className="text-xs text-gray-500 mt-1">
        {msg.timestamp.toLocaleString()}
      </div>
    </div>
  ));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 overflow-auto">
        {formattedContent.length > 0 ? (
          formattedContent
        ) : (
          <div className="text-gray-400">
            No messages yet. Start a conversation!
          </div>
        )}
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Write a message..."
              className="w-full px-3 py-2 border rounded-md"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-md">
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-md"
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
const FileView = ({ content }: { content: string }) => {
  return (
    <div className="p-4 h-full overflow-auto">
      <pre className="whitespace-pre-wrap font-mono">{content}</pre>
    </div>
  );
};

// Content View Component
const ContentView = () => {
  const selectedItem = useWorkspaceStore((state) => state.selectedItem);

  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a file or chat from the explorer
      </div>
    );
  }

  return (
    <>
      {/* Path */}
      <div className="px-4 py-2 border-b text-sm text-gray-600">
        workspace {">"} {selectedItem.name}
      </div>

      {/* Content */}
      {selectedItem.type === "chat" ? (
        <ChatView item={selectedItem} />
      ) : (
        <FileView content={selectedItem.content || "No content available"} />
      )}
    </>
  );
};

// Main Workspace Component
export default function WorkspaceUI() {
  return (
    <div className="flex h-screen bg-white">
      {/* Explorer */}
      <div className="w-72 border-r overflow-y-auto">
        <div className="p-2 font-bold border-b">EXPLORER</div>
        <ExplorerItem item={mockData} />
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col">
        <ContentView />
      </div>
    </div>
  );
}
