import { BaseEvent } from "@/lib/event-types";
import { FileTreeNode } from "@/lib/file-explorer-store";

// File System Events (系統狀態改變的事件)
// export interface FileSystemChangeEvent extends BaseEvent {
//   type: "FILE_SYSTEM_CHANGED";
//   payload: {
//     changeType: "created" | "modified" | "deleted" | "renamed";
//     path: string;
//     metadata?: {
//       oldPath?: string;
//       newPath?: string;
//       size?: number;
//       modifiedAt?: Date;
//     };
//   };
// }
export interface FileSystemChangeEvent extends BaseEvent {
  type: "FILE_SYSTEM_CHANGED";
  payload: {
    changeType: "created" | "modified" | "deleted" | "renamed";
    path: string;
    tree: FileTreeNode[]; // 完整的最新檔案樹
    metadata?: {
      oldPath?: string;
      newPath?: string;
      size?: number;
      modifiedAt?: Date;
    };
  };
}

// User Commands (使用者操作的命令)
export interface CreateFileCommand extends BaseEvent {
  type: "CREATE_FILE_COMMAND";
  payload: {
    parentPath: string;
    name: string;
    metadata?: {
      content?: string;
      type?: string;
    };
  };
}

export interface CreateDirectoryCommand extends BaseEvent {
  type: "CREATE_DIRECTORY_COMMAND";
  payload: {
    parentPath: string;
    name: string;
  };
}

export interface DeleteItemCommand extends BaseEvent {
  type: "DELETE_ITEM_COMMAND";
  payload: {
    path: string;
    type: "file" | "directory";
  };
}

export interface RenameItemCommand extends BaseEvent {
  type: "RENAME_ITEM_COMMAND";
  payload: {
    oldPath: string;
    newName: string;
    type: "file" | "directory";
  };
}

// UI State Commands
export interface ToggleDirectoryCommand extends BaseEvent {
  type: "TOGGLE_DIRECTORY_COMMAND";
  payload: {
    path: string;
  };
}

export interface SelectItemCommand extends BaseEvent {
  type: "SELECT_ITEM_COMMAND";
  payload: {
    path: string | null;
  };
}

// Error Events
export interface FileOperationErrorEvent extends BaseEvent {
  type: "FILE_OPERATION_ERROR";
  payload: {
    operation: string;
    path: string;
    error: string;
  };
}

// Event Handler Registration
import { eventBus } from "@/lib/event-bus";
import { useFileExplorerStore } from "@/lib/file-explorer-store";

export const setupExplorerEventHandlers = () => {
  const unsubscribers = [
    // File System Change Handler
    eventBus.subscribe<FileSystemChangeEvent>(
      "FILE_SYSTEM_CHANGED",
      (event) => {
        const store = useFileExplorerStore.getState();

        if (event.payload.tree) {
          // 更新整個檔案樹
          store.setFileTree(event.payload.tree);

          // 根據不同的變更類型處理 UI 狀態
          switch (event.payload.changeType) {
            case "deleted": {
              // 如果刪除的項目正在被選中，清除選擇
              if (store.selectedPath === event.payload.path) {
                store.selectItem(null);
              }

              // 如果刪除的是目錄，從展開清單中移除
              if (store.expandedPaths.has(event.payload.path)) {
                store.toggleDirectory(event.payload.path);
              }
              break;
            }

            case "renamed": {
              // 更新選中的路徑
              if (
                store.selectedPath === event.payload.path &&
                event.payload.metadata?.newPath
              ) {
                store.selectItem(event.payload.metadata.newPath);
              }

              // 更新展開的路徑
              if (
                store.expandedPaths.has(event.payload.path) &&
                event.payload.metadata?.newPath
              ) {
                store.toggleDirectory(event.payload.path); // 移除舊路徑
                store.toggleDirectory(event.payload.metadata.newPath); // 新增新路徑
              }
              break;
            }
          }
        }
      }
    ),

    // Command Handlers
    eventBus.subscribe<CreateFileCommand>("CREATE_FILE_COMMAND", (command) => {
      const store = useFileExplorerStore.getState();
      store.createFile(command.payload.parentPath, command.payload.name);
    }),

    eventBus.subscribe<CreateDirectoryCommand>(
      "CREATE_DIRECTORY_COMMAND",
      (command) => {
        const store = useFileExplorerStore.getState();
        store.createDirectory(command.payload.parentPath, command.payload.name);
      }
    ),

    eventBus.subscribe<DeleteItemCommand>("DELETE_ITEM_COMMAND", (command) => {
      const store = useFileExplorerStore.getState();
      store.deleteItem(command.payload.path);
    }),

    eventBus.subscribe<RenameItemCommand>("RENAME_ITEM_COMMAND", (command) => {
      const store = useFileExplorerStore.getState();
      store.renameItem(command.payload.oldPath, command.payload.newName);
    }),

    // UI State Command Handlers
    eventBus.subscribe<ToggleDirectoryCommand>(
      "TOGGLE_DIRECTORY_COMMAND",
      (command) => {
        const store = useFileExplorerStore.getState();
        store.toggleDirectory(command.payload.path);
      }
    ),

    eventBus.subscribe<SelectItemCommand>("SELECT_ITEM_COMMAND", (command) => {
      const store = useFileExplorerStore.getState();
      store.selectItem(command.payload.path);
    }),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};
