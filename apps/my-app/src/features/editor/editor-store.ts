import { create } from "zustand";
import { Logger } from "tslog";
import {
  TaskStatus,
  SubtaskStatus,
  Task,
  Subtask,
  Chat,
  ChatMessage,
} from "@repo/events-core/event-types";
const logger = new Logger({ name: "editor-store" });

interface BaseTreeNodeItem {
  id: string;
  name: string;
  type: string;
}

interface ContainerTreeNodeItem extends BaseTreeNodeItem {
  children?: TreeNodeItemType[];
}

interface TaskTreeNodeItem extends ContainerTreeNodeItem {
  type: "task";
  data: Task;
}

interface SubtaskTreeNodeItem extends ContainerTreeNodeItem {
  type: "subtask";
  data: Subtask;
}

interface FolderTreeNodeItem extends ContainerTreeNodeItem {
  type: "folder";
}

interface FileTreeNodeItem extends BaseTreeNodeItem {
  type: "file";
  content?: string;
}

interface ChatTreeNodeItem extends BaseTreeNodeItem {
  type: "chat";
  data: Chat;
}

// Union type for all tree node items
type TreeNodeItemType =
  | TaskTreeNodeItem
  | SubtaskTreeNodeItem
  | FileTreeNodeItem
  | ChatTreeNodeItem
  | FolderTreeNodeItem;

/**
 * Type guard functions for tree node items
 */

export function hasChildrenNodeItems(
  item: TreeNodeItemType
): item is TreeNodeItemType & { children: TreeNodeItemType[] } {
  return "children" in item && Array.isArray(item.children);
}

export function isTaskTreeNodeItem(
  item: TreeNodeItemType
): item is TaskTreeNodeItem {
  return item.type === "task";
}

export function isSubtaskTreeNodeItem(
  item: TreeNodeItemType
): item is SubtaskTreeNodeItem {
  return item.type === "subtask";
}

export function isFolderTreeNodeItem(
  item: TreeNodeItemType
): item is FolderTreeNodeItem {
  return item.type === "folder";
}

export function isFileTreeNodeItem(
  item: TreeNodeItemType
): item is FileTreeNodeItem {
  return item.type === "file";
}

export function isChatTreeNodeItem(
  item: TreeNodeItemType
): item is ChatTreeNodeItem {
  return item.type === "chat";
}

// Helper functions to map status to UI display
export function getTaskStatusBadge(status: TaskStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "🏃";
    case "COMPLETED":
      return "✓";
    case "CREATED":
      return "📝";
    case "INITIALIZED":
      return "🔄";
    default:
      return "";
  }
}

export function getSubtaskStatusBadge(status: SubtaskStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "🏃";
    case "COMPLETED":
      return "✓";
    case "PENDING":
      return "📝";
    default:
      return "";
  }
}

export function getTaskActionButton(status: TaskStatus): string | undefined {
  switch (status) {
    case "IN_PROGRESS":
      return "⏸️";
    case "CREATED":
    case "INITIALIZED":
    case "COMPLETED":
      return "▶️";
    default:
      return undefined;
  }
}

export function getSubtaskActionButton(
  status: SubtaskStatus
): string | undefined {
  switch (status) {
    case "PENDING":
      return "▶️";
    case "IN_PROGRESS":
      return "🔍";
    default:
      return undefined;
  }
}

// Mock data using updated types with data property
export const mockData: FolderTreeNodeItem = {
  id: "root",
  name: "workspace",
  type: "folder",
  children: [
    {
      id: "t21",
      name: "t21-hello_world",
      type: "task",
      data: {
        id: "t21",
        seqNumber: 21,
        title: "hello_world",
        status: "IN_PROGRESS",
        subtasks: [], // This will be populated separately by reference
        folderPath: "/workspace/t21-hello_world",
        config: {}, // 添加必要的 config 屬性
        createdAt: new Date("2024-01-21T15:00:00"),
        updatedAt: new Date("2024-01-21T15:00:00"),
      },
      children: [
        {
          id: "s1",
          name: "s1-planning",
          type: "subtask",
          data: {
            id: "s1",
            taskId: "t21",
            seqNumber: 1,
            title: "planning",
            status: "COMPLETED",
            description: "Planning phase for the hello world task",
            team: { agent: "ASSISTANT" },
            inputType: "text",
            outputType: "text",
          },
          children: [
            {
              id: "c01-s1",
              name: "c01-20240121_153000.chat.json",
              type: "chat",
              data: {
                id: "c01-s1",
                taskId: "t21",
                subtaskId: "s1",
                messages: [
                  {
                    id: "m1",
                    role: "USER",
                    content: "請按照需求編寫...",
                    timestamp: new Date("2024-01-21T15:30:00"),
                  },
                  {
                    id: "m2",
                    role: "ASSISTANT",
                    content: "我已分析完需求...",
                    timestamp: new Date("2024-01-21T15:31:00"),
                  },
                  {
                    id: "m3",
                    role: "USER",
                    content: "這部分需要調整...",
                    timestamp: new Date("2024-01-21T15:32:00"),
                  },
                  {
                    id: "m4",
                    role: "ASSISTANT",
                    content: "根據反饋，我建議...",
                    timestamp: new Date("2024-01-21T15:33:00"),
                  },
                ],
                status: "ACTIVE",
                createdAt: new Date("2024-01-21T15:30:00"),
                updatedAt: new Date("2024-01-21T15:33:00"),
              },
            },
            {
              id: "c02-s1",
              name: "c02-20240121_154500.chat.json",
              type: "chat",
              data: {
                id: "c02-s1",
                taskId: "t21",
                subtaskId: "s1",
                messages: [],
                status: "ACTIVE",
                createdAt: new Date("2024-01-21T15:45:00"),
                updatedAt: new Date("2024-01-21T15:45:00"),
              },
            },
          ],
        },
        {
          id: "s2",
          name: "s2-development",
          type: "subtask",
          data: {
            id: "s2",
            taskId: "t21",
            seqNumber: 2,
            title: "development",
            status: "IN_PROGRESS",
            description: "Development phase for the hello world task",
            team: { agent: "ASSISTANT" },
            inputType: "text",
            outputType: "text",
          },
          children: [
            {
              id: "c01-s2",
              name: "c01-20240121_153000.chat.json",
              type: "chat",
              data: {
                id: "c01-s2",
                taskId: "t21",
                subtaskId: "s2",
                messages: [],
                status: "ACTIVE",
                createdAt: new Date("2024-01-21T15:30:00"),
                updatedAt: new Date("2024-01-21T15:30:00"),
              },
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
          type: "subtask",
          data: {
            id: "s3",
            taskId: "t21",
            seqNumber: 3,
            title: "testing",
            status: "PENDING",
            description: "Testing phase for the hello world task",
            team: { agent: "ASSISTANT" },
            inputType: "text",
            outputType: "text",
          },
          children: [],
        },
        {
          id: "s4",
          name: "s4-deployment",
          type: "subtask",
          data: {
            id: "s4",
            taskId: "t21",
            seqNumber: 4,
            title: "deployment",
            status: "PENDING",
            description: "Deployment phase for the hello world task",
            team: { agent: "ASSISTANT" },
            inputType: "text",
            outputType: "text",
          },
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
      type: "task",
      data: {
        id: "t20",
        seqNumber: 20,
        title: "feature_xyz",
        status: "COMPLETED",
        subtasks: [],
        config: {}, // 添加必要的 config 屬性
        createdAt: new Date("2024-01-15T10:00:00"),
        updatedAt: new Date("2024-01-20T16:30:00"),
      },
      children: [],
    },
    {
      id: "t19",
      name: "t19-bug_fix",
      type: "task",
      data: {
        id: "t19",
        seqNumber: 19,
        title: "bug_fix",
        status: "COMPLETED",
        subtasks: [],
        config: {}, // 添加必要的 config 屬性
        createdAt: new Date("2024-01-10T09:00:00"),
        updatedAt: new Date("2024-01-12T14:20:00"),
      },
      children: [],
    },
  ],
};

// Helper function to find an item by ID in the tree
function findItemById(
  root: TreeNodeItemType,
  id: string
): TreeNodeItemType | null {
  if (root.id === id) return root;

  // Only check for children on container types
  if ("children" in root && root.children) {
    for (const child of root.children) {
      const found = findItemById(child, id);
      if (found) return found;
    }
  }

  return null;
}

// Helper function to get file path
function getItemPath(root: TreeNodeItemType, id: string): string[] {
  const findPath = (
    item: TreeNodeItemType,
    targetId: string,
    currentPath: string[]
  ): string[] | null => {
    if (item.id === targetId) {
      return [...currentPath, item.name];
    }

    // Only check for children on container types
    if ("children" in item && item.children) {
      for (const child of item.children) {
        const path = findPath(child, targetId, [...currentPath, item.name]);
        if (path) return path;
      }
    }

    return null;
  };

  return findPath(root, id, []) || [];
}

// Store interface with updated types
interface EditorStore {
  data: FolderTreeNodeItem;
  selectedItem: TreeNodeItemType | null;
  expandedFolders: Set<string>;
  setSelectedItem: (item: TreeNodeItemType | null) => void;
  toggleFolder: (folderId: string) => void;
  isExpanded: (folderId: string) => boolean;
  sendMessage: (itemId: string, content: string) => void;
  createNewChat: (folderId: string) => void;
  createNewTask: () => void;
  getItemPath: (itemId: string) => string[];
  // User presence
  activeUsers: Array<{ name: string; status: "editing" | "viewing" }>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  data: mockData,
  selectedItem: null,
  expandedFolders: new Set(["root", "t21", "s2"]), // Initially expand root and specific folders
  activeUsers: [
    { name: "Alice", status: "editing" },
    { name: "Bob", status: "viewing" },
  ],

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
      const newData = JSON.parse(
        JSON.stringify(state.data)
      ) as FolderTreeNodeItem;

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

      // Add the new user message
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "USER",
        content,
        timestamp: new Date(),
      };

      (chatItem as ChatTreeNodeItem).data.messages.push(newMessage);
      (chatItem as ChatTreeNodeItem).data.updatedAt = new Date();

      // Also add a mock AI response after a delay
      setTimeout(() => {
        set((innerState) => {
          const updatedData = JSON.parse(
            JSON.stringify(innerState.data)
          ) as FolderTreeNodeItem;
          const updatedChatItem = findItemById(
            updatedData,
            itemId
          ) as ChatTreeNodeItem;

          if (updatedChatItem) {
            updatedChatItem.data.messages.push({
              id: `msg-${Date.now()}`,
              role: "ASSISTANT",
              content: "This is a mock AI response.",
              timestamp: new Date(),
            });
            updatedChatItem.data.updatedAt = new Date();

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
      const newData = JSON.parse(
        JSON.stringify(state.data)
      ) as FolderTreeNodeItem;
      const folderItem = findItemById(
        newData,
        folderId
      ) as ContainerTreeNodeItem;

      if (!folderItem || !("children" in folderItem)) {
        logger.error(`Cannot create chat: Container ${folderId} not found`);
        throw new Error(`Cannot create chat: Container ${folderId} not found`);
      }

      if (!folderItem.children) {
        folderItem.children = [];
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .slice(0, 15);
      const newChatId = `chat-${timestamp}`;

      // Determine taskId and subtaskId
      let taskId = "";
      let subtaskId = "";

      if (folderItem.type === "subtask") {
        subtaskId = folderItem.id;
        taskId = (folderItem as SubtaskTreeNodeItem).data.taskId;
      } else if (folderItem.type === "task") {
        taskId = folderItem.id;
      }

      const newChat: ChatTreeNodeItem = {
        id: newChatId,
        name: `chat-${timestamp}.chat.json`,
        type: "chat",
        data: {
          id: newChatId,
          taskId,
          subtaskId,
          messages: [],
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
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
      const newData = JSON.parse(
        JSON.stringify(state.data)
      ) as FolderTreeNodeItem;

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
      const now = new Date();

      // Create first subtask
      const subtaskId = `${newTaskId}-s1`;
      const newSubtask: SubtaskTreeNodeItem = {
        id: subtaskId,
        name: "s1-planning",
        type: "subtask",
        data: {
          id: subtaskId,
          taskId: newTaskId,
          seqNumber: 1,
          title: "planning",
          status: "PENDING",
          description: "Planning phase for the new task",
          team: { agent: "ASSISTANT" },
          inputType: "text",
          outputType: "text",
        },
        children: [],
      };

      // Create the task with its first subtask
      const newTask: TaskTreeNodeItem = {
        id: newTaskId,
        name: `t${nextTaskNumber}-new_task`,
        type: "task",
        data: {
          id: newTaskId,
          seqNumber: nextTaskNumber,
          title: "new_task",
          status: "CREATED",
          subtasks: [newSubtask.data], // Add subtask to task's subtasks array
          config: {}, // 添加必要的 config 屬性
          createdAt: now,
          updatedAt: now,
        },
        children: [newSubtask],
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

// Export the types for usage in other components
export type {
  BaseTreeNodeItem,
  ContainerTreeNodeItem,
  TaskTreeNodeItem,
  SubtaskTreeNodeItem,
  FileTreeNodeItem,
  ChatTreeNodeItem,
  FolderTreeNodeItem,
  TreeNodeItemType,
};
