// apps/my-app-trpc-2/src/store/app-store.ts
import { create } from "zustand";

// Import types from utils (in a real app these would be shared)
interface ProjectFolder {
  id: string;
  name: string;
  path: string;
}

interface FolderTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
}

interface AppStore {
  // Current selections
  selectedChatFile: string | null;
  selectedPreviewFile: string | null;
  selectedTreeNode: string | null;

  // Project folders and tree data
  projectFolders: ProjectFolder[];
  folderTrees: Record<string, FolderTreeNode>;
  expandedNodes: Set<string>;

  // Actions
  setSelectedChatFile: (path: string | null) => void;
  setSelectedPreviewFile: (path: string | null) => void;
  setSelectedTreeNode: (path: string | null) => void;
  setProjectFolders: (folders: ProjectFolder[]) => void;
  updateFolderTree: (projectFolderId: string, tree: FolderTreeNode) => void;
  toggleNodeExpansion: (nodePath: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  selectedChatFile: null,
  selectedPreviewFile: null,
  selectedTreeNode: null,
  projectFolders: [],
  folderTrees: {},
  expandedNodes: new Set(),

  setSelectedChatFile: (path) => set({ selectedChatFile: path }),
  setSelectedPreviewFile: (path) => set({ selectedPreviewFile: path }),
  setSelectedTreeNode: (path) => set({ selectedTreeNode: path }),
  setProjectFolders: (folders) => set({ projectFolders: folders }),
  updateFolderTree: (projectFolderId, tree) =>
    set((state) => ({
      folderTrees: { ...state.folderTrees, [projectFolderId]: tree },
    })),
  toggleNodeExpansion: (nodePath) =>
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(nodePath)) {
        newExpanded.delete(nodePath);
      } else {
        newExpanded.add(nodePath);
      }
      return { expandedNodes: newExpanded };
    }),
}));
