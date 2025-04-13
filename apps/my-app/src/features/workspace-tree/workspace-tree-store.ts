import { create } from "zustand";
import { Logger } from "tslog";

const logger = new Logger({ name: "workspace-tree-store" });

// TreeNode interfaces
export interface BaseTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
}

export interface FileTreeNode extends BaseTreeNode {
  type: "file";
  lastModified?: Date;
}

export interface FolderTreeNode extends BaseTreeNode {
  type: "folder";
  children: TreeNode[];
}

export type TreeNode = FileTreeNode | FolderTreeNode;

// Type guard for FolderTreeNode
export function isFolderNode(node: TreeNode): node is FolderTreeNode {
  return node.type === "folder";
}

// Store interface
interface WorkspaceTreeStore {
  root: FolderTreeNode | null;
  expandedFolders: Set<string>;
  selectedNode: TreeNode | null;

  // Actions
  setRoot: (root: FolderTreeNode) => void;
  addNode: (parentPath: string, node: TreeNode) => void;
  removeNode: (path: string) => void;
  updateFile: (path: string) => void;
  setSelectedNode: (node: TreeNode | null) => void;
  toggleFolderExpansion: (path: string) => void;
  isExpanded: (path: string) => boolean;

  // Helper for finding nodes
  findNodeByPath: (path: string) => TreeNode | null;
}

export const useWorkspaceTreeStore = create<WorkspaceTreeStore>((set, get) => ({
  root: null,
  expandedFolders: new Set(["/"]), // Root is expanded by default
  selectedNode: null,

  setRoot: (root) => set({ root }),

  addNode: (parentPath, node) =>
    set((state) => {
      if (!state.root) {
        logger.warn("Cannot add node: root is null");
        return state;
      }

      // Normalize paths
      const normalizedParentPath = normalizePath(parentPath);
      const normalizedNodePath = normalizePath(node.path);

      // Find the parent node
      let parentNode = findNodeByPath(state.root, normalizedParentPath);

      // If parent node doesn't exist, create the directory structure
      if (!parentNode) {
        // Create parent directories recursively
        let currentPath = "/";
        const pathParts = normalizedParentPath.split("/").filter(Boolean);
        let currentNode = state.root;

        for (const part of pathParts) {
          currentPath =
            currentPath === "/" ? `/${part}` : `${currentPath}/${part}`;

          let childNode = currentNode.children.find(
            (child) => child.type === "folder" && child.path === currentPath
          ) as FolderTreeNode | undefined;

          if (!childNode) {
            childNode = {
              id: `folder-${Date.now()}-${currentPath}`,
              name: part,
              type: "folder",
              path: currentPath,
              children: [],
            };
            currentNode.children.push(childNode);
          }

          currentNode = childNode;
        }

        parentNode = currentNode;
      }

      // Make sure parent is a folder
      if (!isFolderNode(parentNode)) {
        logger.error(
          `Cannot add node: parent at ${normalizedParentPath} is not a folder`
        );
        return state;
      }

      // Check if node already exists
      const existingNodeIndex = parentNode.children.findIndex(
        (child) => child.path === normalizedNodePath
      );

      if (existingNodeIndex >= 0) {
        // Update existing node
        parentNode.children[existingNodeIndex] = {
          ...node,
          path: normalizedNodePath,
        };
      } else {
        // Add new node
        parentNode.children.push({
          ...node,
          path: normalizedNodePath,
        });
      }

      // Return a new root to trigger a state update
      return { root: { ...state.root } };
    }),

  removeNode: (path) =>
    set((state) => {
      if (!state.root) return state;

      const normalizedPath = normalizePath(path);

      // If removing root, clear the store
      if (normalizedPath === state.root.path) {
        return { root: null, selectedNode: null };
      }

      // Find the parent path
      const parentPath = getParentPath(normalizedPath);

      const parentNode = findNodeByPath(state.root, parentPath);

      if (!parentNode || !isFolderNode(parentNode)) {
        logger.warn(
          `Cannot remove node: parent not found for ${normalizedPath}`
        );
        return state;
      }

      // Remove the node from its parent
      parentNode.children = parentNode.children.filter(
        (child) => child.path !== normalizedPath
      );

      // Update selected node if it was removed
      let newSelectedNode = state.selectedNode;
      if (
        state.selectedNode &&
        (state.selectedNode.path === normalizedPath ||
          state.selectedNode.path.startsWith(`${normalizedPath}/`))
      ) {
        newSelectedNode = null;
      }

      return {
        root: { ...state.root },
        selectedNode: newSelectedNode,
      };
    }),

  updateFile: (path) =>
    set((state) => {
      if (!state.root) return state;

      const normalizedPath = normalizePath(path);
      const node = findNodeByPath(state.root, normalizedPath);

      if (!node) {
        logger.warn(`Cannot update file: node not found at ${normalizedPath}`);
        return state;
      }

      if (node.type !== "file") {
        logger.warn(
          `Cannot update file: node at ${normalizedPath} is not a file`
        );
        return state;
      }

      // Update the file node with new lastModified timestamp
      (node as FileTreeNode).lastModified = new Date();

      // Return a new root to trigger a state update
      return { root: { ...state.root } };
    }),

  setSelectedNode: (node) => set({ selectedNode: node }),

  toggleFolderExpansion: (path) =>
    set((state) => {
      const normalizedPath = normalizePath(path);
      const newExpandedFolders = new Set(state.expandedFolders);

      if (newExpandedFolders.has(normalizedPath)) {
        newExpandedFolders.delete(normalizedPath);
      } else {
        newExpandedFolders.add(normalizedPath);
      }

      return { expandedFolders: newExpandedFolders };
    }),

  isExpanded: (path) => {
    const normalizedPath = normalizePath(path);
    return get().expandedFolders.has(normalizedPath);
  },

  findNodeByPath: (path) => {
    const normalizedPath = normalizePath(path);
    const root = get().root;

    if (!root) return null;
    return findNodeByPath(root, normalizedPath);
  },
}));

// Helper function to find node by path
function findNodeByPath(root: TreeNode, searchPath: string): TreeNode | null {
  if (root.path === searchPath) return root;

  if (isFolderNode(root)) {
    for (const child of root.children) {
      const found = findNodeByPath(child, searchPath);
      if (found) return found;
    }
  }

  return null;
}

// Helper function to normalize paths
export function normalizePath(inputPath: string): string {
  if (!inputPath) return "/";

  // Convert backslashes to forward slashes and remove trailing slash
  let normalized = inputPath.replace(/\\/g, "/");

  // Ensure the path starts with a slash
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }

  // Remove trailing slash if not root
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

// Helper function to get parent path
export function getParentPath(path: string): string {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/") return "/";

  const lastSlashIndex = normalizedPath.lastIndexOf("/");
  if (lastSlashIndex <= 0) return "/";

  return normalizedPath.substring(0, lastSlashIndex) || "/";
}

// Helper function to get basename
export function getBasename(path: string): string {
  const normalizedPath = normalizePath(path);

  if (normalizedPath === "/") return "";

  const lastSlashIndex = normalizedPath.lastIndexOf("/");
  if (lastSlashIndex < 0) return normalizedPath;

  return normalizedPath.substring(lastSlashIndex + 1);
}
