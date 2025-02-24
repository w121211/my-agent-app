import { create } from "zustand";

// 基礎介面
export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileTreeNode[];
}

// Mock 資料
const mockFileTree: FileTreeNode[] = [
  {
    id: "1",
    name: "src",
    type: "directory",
    path: "/src",
    children: [
      {
        id: "2",
        name: "components",
        type: "directory",
        path: "/src/components",
        children: [
          {
            id: "3",
            name: "Button.tsx",
            type: "file",
            path: "/src/components/Button.tsx",
          },
          {
            id: "4",
            name: "Input.tsx",
            type: "file",
            path: "/src/components/Input.tsx",
          },
        ],
      },
      {
        id: "5",
        name: "pages",
        type: "directory",
        path: "/src/pages",
        children: [
          {
            id: "6",
            name: "index.tsx",
            type: "file",
            path: "/src/pages/index.tsx",
          },
          {
            id: "7",
            name: "about.tsx",
            type: "file",
            path: "/src/pages/about.tsx",
          },
        ],
      },
      {
        id: "8",
        name: "styles",
        type: "directory",
        path: "/src/styles",
        children: [
          {
            id: "9",
            name: "globals.css",
            type: "file",
            path: "/src/styles/globals.css",
          },
        ],
      },
    ],
  },
  {
    id: "10",
    name: "public",
    type: "directory",
    path: "/public",
    children: [
      {
        id: "11",
        name: "images",
        type: "directory",
        path: "/public/images",
        children: [
          {
            id: "12",
            name: "logo.png",
            type: "file",
            path: "/public/images/logo.png",
          },
        ],
      },
    ],
  },
  {
    id: "13",
    name: "welcome.chat.json",
    type: "file",
    path: "/welcome.chat.json",
  },
];

export interface FileExplorerStore {
  // 核心狀態
  fileTree: FileTreeNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;

  // 基礎操作
  setFileTree: (tree: FileTreeNode[]) => void;
  toggleDirectory: (path: string) => void;
  selectItem: (path: string | null) => void;

  // MVP 階段的基本檔案操作
  createFile: (parentPath: string, name: string) => void;
  createDirectory: (parentPath: string, name: string) => void;
  deleteItem: (path: string) => void;
  renameItem: (oldPath: string, newName: string) => void;
}

export const useFileExplorerStore = create<FileExplorerStore>((set, get) => ({
  fileTree: mockFileTree, // 使用 mock 資料初始化
  expandedPaths: new Set(),
  selectedPath: null,

  setFileTree: (tree) => set({ fileTree: tree }),

  toggleDirectory: (path) =>
    set((state) => {
      const newExpandedPaths = new Set(state.expandedPaths);
      if (newExpandedPaths.has(path)) {
        newExpandedPaths.delete(path);
      } else {
        newExpandedPaths.add(path);
      }
      return { expandedPaths: newExpandedPaths };
    }),

  selectItem: (path) => set({ selectedPath: path }),

  createFile: (parentPath, name) => {
    set((state) => {
      const newTree = [...state.fileTree];
      // TODO:實作檔案建立邏輯，更新樹狀結構
      return { fileTree: newTree };
    });
  },

  createDirectory: (parentPath, name) => {
    set((state) => {
      const newTree = [...state.fileTree];
      // TODO:實作資料夾建立邏輯，更新樹狀結構
      return { fileTree: newTree };
    });
  },

  deleteItem: (path) => {
    set((state) => {
      const newTree = [...state.fileTree];
      // TODO:實作刪除邏輯，更新樹狀結構
      return { fileTree: newTree };
    });
  },

  renameItem: (oldPath, newName) => {
    set((state) => {
      const newTree = [...state.fileTree];
      // TODO:實作重新命名邏輯，更新樹狀結構
      return { fileTree: newTree };
    });
  },
}));
