import { create } from "zustand";
import { Logger } from "tslog";

const logger = new Logger({ name: "editor-store" });

// Types
type MessageRole = "User" | "AI";
type Message = {
  role: MessageRole;
  content: string;
  timestamp: Date;
};

type FileType = "chat" | "file";
type ItemStatus = "🏃" | "✓" | "⚠️" | "📝" | undefined;
type ItemControls = "▶️" | "⏸️" | "🔍" | "🔴" | undefined;

interface BaseItem {
  id: string;
  name: string;
  type: FileType | "folder";
  status?: ItemStatus;
  controls?: ItemControls[];
}

export interface FileItem extends BaseItem {
  type: "file";
  content?: string;
}

export interface ChatItem extends BaseItem {
  type: "chat";
  content?: string;
  messages?: Message[];
}

export interface FolderItem extends BaseItem {
  type: "folder";
  children?: (FileItem | ChatItem | FolderItem)[];
}

export type ItemType = FileItem | ChatItem | FolderItem;

// Mock data
export const mockData: FolderItem = {
  id: "root",
  name: "editor",
  type: "folder",
  children: [
    {
      id: "t21",
      name: "t21-hello_world",
      type: "folder",
      status: "🏃",
      controls: ["⏸️"],
      children: [
        {
          id: "s1",
          name: "s1-planning",
          type: "folder",
          status: "✓",
          controls: ["▶️"],
          children: [
            {
              id: "c01-s1",
              name: "c01-20240121_153000.chat.json",
              type: "chat",
              messages: [
                {
                  role: "User",
                  content: "請按照需求編寫...",
                  timestamp: new Date("2024-01-21T15:30:00"),
                },
                {
                  role: "AI",
                  content: "我已分析完需求...",
                  timestamp: new Date("2024-01-21T15:31:00"),
                },
                {
                  role: "User",
                  content: "這部分需要調整...",
                  timestamp: new Date("2024-01-21T15:32:00"),
                },
                {
                  role: "AI",
                  content: "根據反饋，我建議...",
                  timestamp: new Date("2024-01-21T15:33:00"),
                },
              ],
            },
            {
              id: "c02-s1",
              name: "c02-20240121_154500.chat.json",
              type: "chat",
              messages: [],
            },
          ],
        },
        {
          id: "s2",
          name: "s2-development",
          type: "folder",
          status: undefined,
          controls: ["🔴", "🔍"],
          children: [
            {
              id: "c01-s2",
              name: "c01-20240121_153000.chat.json",
              type: "chat",
              messages: [],
            },
            {
              id: "nav1",
              name: "navbar.v1.py",
              type: "file",
              content:
                "def create_navbar():\n    # Navbar implementation\n    pass",
            },
            {
              id: "nav2",
              name: "navbar.v2.py",
              type: "file",
              content:
                "def create_navbar():\n    # Updated navbar implementation\n    return {'status': 'updated'}",
            },
            {
              id: "api",
              name: "api-spec.md",
              type: "file",
              content:
                "# API Specification\n\n## Endpoints\n\n- GET /api/tasks\n- POST /api/tasks",
            },
          ],
        },
        {
          id: "s3",
          name: "s3-testing",
          type: "folder",
          status: "⚠️",
          children: [],
        },
        {
          id: "s4",
          name: "s4-deployment",
          type: "folder",
          status: "📝",
          controls: ["▶️"],
          children: [],
        },
        {
          id: "task",
          name: "task.json",
          type: "file",
          content:
            '{\n  "id": "t21",\n  "name": "hello_world",\n  "status": "in_progress"\n}',
        },
      ],
    },
    {
      id: "t20",
      name: "t20-feature_xyz",
      type: "folder",
      status: "✓",
      controls: ["▶️"],
    },
    {
      id: "t19",
      name: "t19-bug_fix",
      type: "folder",
      status: "✓",
      controls: ["▶️"],
    },
  ],
};

// Helper function to find an item by ID in the tree
function findItemById(root: ItemType, id: string): ItemType | null {
  if (root.id === id) return root;

  if ((root as FolderItem).children) {
    for (const child of (root as FolderItem).children!) {
      const found = findItemById(child, id);
      if (found) return found;
    }
  }

  return null;
}

// Helper function to get file path
function getItemPath(root: ItemType, id: string): string[] {
  const findPath = (
    item: ItemType,
    targetId: string,
    currentPath: string[]
  ): string[] | null => {
    if (item.id === targetId) {
      return [...currentPath, item.name];
    }

    if ((item as FolderItem).children) {
      for (const child of (item as FolderItem).children!) {
        const path = findPath(child, targetId, [...currentPath, item.name]);
        if (path) return path;
      }
    }

    return null;
  };

  return findPath(root, id, []) || [];
}

// Zustand store
interface EditorStore {
  data: FolderItem;
  selectedItem: ItemType | null;
  expandedFolders: Set<string>;
  setSelectedItem: (item: ItemType | null) => void;
  toggleFolder: (folderId: string) => void;
  isExpanded: (folderId: string) => boolean;
  sendMessage: (itemId: string, content: string) => void;
  createNewChat: (folderId: string) => void;
  createNewTask: () => void;
  getItemPath: (itemId: string) => string[];
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  data: mockData,
  selectedItem: null,
  expandedFolders: new Set(["root", "t21", "t21-s2"]), // Initially expand root and specific folders

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
      const newData = JSON.parse(JSON.stringify(state.data)) as FolderItem;

      // Find the chat item
      const chatItem = findItemById(newData, itemId);

      if (!chatItem || chatItem.type !== "chat") {
        logger.error(
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

      // Also add a mock AI response after a delay
      setTimeout(() => {
        set((innerState) => {
          const updatedData = JSON.parse(
            JSON.stringify(innerState.data)
          ) as FolderItem;
          const updatedChatItem = findItemById(updatedData, itemId) as ChatItem;

          if (updatedChatItem && updatedChatItem.messages) {
            updatedChatItem.messages.push({
              role: "AI",
              content: "This is a mock AI response.",
              timestamp: new Date(),
            });

            const updatedSelectedItem =
              innerState.selectedItem?.id === itemId
                ? updatedChatItem
                : innerState.selectedItem;

            return {
              data: updatedData,
              selectedItem: updatedSelectedItem,
            };
          }
          return innerState;
        });
      }, 1000);

      // Update the selected item if it's the chat we're modifying
      const newSelectedItem =
        state.selectedItem?.id === itemId ? chatItem : state.selectedItem;

      logger.info(`Message sent to chat ${itemId}`);

      return {
        data: newData,
        selectedItem: newSelectedItem,
      };
    }),

  createNewChat: (folderId) =>
    set((state) => {
      const newData = JSON.parse(JSON.stringify(state.data)) as FolderItem;
      const folderItem = findItemById(newData, folderId) as FolderItem;

      if (!folderItem || folderItem.type !== "folder") {
        logger.error(`Cannot create chat: Folder ${folderId} not found`);
        throw new Error(`Cannot create chat: Folder ${folderId} not found`);
      }

      if (!folderItem.children) {
        folderItem.children = [];
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .slice(0, 15);
      const newChatId = `chat-${timestamp}`;
      const newChat: ChatItem = {
        id: newChatId,
        name: `chat-${timestamp}.chat.json`,
        type: "chat",
        messages: [],
      };

      folderItem.children.push(newChat);

      logger.info(`Created new chat in folder ${folderId}`);

      return {
        data: newData,
        selectedItem: newChat,
      };
    }),

  createNewTask: () =>
    set((state) => {
      // Create deep copy of the data
      const newData = JSON.parse(JSON.stringify(state.data)) as FolderItem;

      if (!newData.children) {
        newData.children = [];
      }

      // Calculate the next task number based on existing tasks
      const existingTaskNumbers = newData.children
        .filter((item) => item.name.startsWith("t"))
        .map((item) => {
          const match = item.name.match(/^t(\d+)/);
          return match && match[1] ? parseInt(match[1], 10) : 0;
        });

      const nextTaskNumber =
        existingTaskNumbers.length > 0
          ? Math.max(...existingTaskNumbers) + 1
          : 22; // Start from t22 if no existing tasks

      const newTaskId = `t${nextTaskNumber}`;
      const newTask: FolderItem = {
        id: newTaskId,
        name: `t${nextTaskNumber}-new_task`,
        type: "folder",
        status: "🏃",
        controls: ["⏸️"],
        children: [
          {
            id: `${newTaskId}-s1`,
            name: "s1-planning",
            type: "folder",
            children: [],
          },
        ],
      };

      // Add the new task at the beginning
      newData.children.unshift(newTask);

      logger.info(`Created new task ${newTaskId}`);

      // Automatically expand the new task
      const newExpandedFolders = new Set([...state.expandedFolders, newTaskId]);

      return {
        data: newData,
        expandedFolders: newExpandedFolders,
        selectedItem: newTask, // Automatically select the new task
      };
    }),

  getItemPath: (itemId) => getItemPath(get().data, itemId),
}));
