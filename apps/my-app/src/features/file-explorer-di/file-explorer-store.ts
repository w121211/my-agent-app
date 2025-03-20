import { create } from "zustand";
import { ILogObj, Logger } from "tslog";
import { FileExplorerState, FileSystemNode } from "./file-explorer-types";

const logger = new Logger<ILogObj>({ name: "FileExplorerStore" });

// Helper functions
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const normalizePath = (path: string): string => {
  return path.startsWith("/") ? path : `/${path}`;
};

interface FileExplorerStore extends FileExplorerState {
  // Node operations
  createFile: (parentPath: string | null, name: string) => string;
  createDirectory: (parentPath: string | null, name: string) => string;
  deleteNode: (nodeId: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  moveNode: (nodeId: string, newParentPath: string | null) => void;

  // UI operations
  selectNode: (nodeId: string | null) => void;
  toggleDirectory: (directoryId: string) => void;
  expandDirectory: (directoryId: string) => void;
  collapseDirectory: (directoryId: string) => void;

  // Get node information
  getNodeByPath: (path: string) => FileSystemNode | null;
  getNodeById: (id: string) => FileSystemNode | null;
  getChildNodes: (nodeId: string) => FileSystemNode[];

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Bulk operations
  loadFileTree: (rootNodes: FileSystemNode[]) => void;
}

const initialState: FileExplorerState = {
  nodes: {},
  rootNodeIds: [],
  selectedNodeId: null,
  expandedDirectories: new Set(),
  loading: false,
  error: null,
};

export const useFileExplorerStore = create<FileExplorerStore>((set, get) => ({
  // Initial state
  ...initialState,

  createFile: (parentPath, name) => {
    const id = generateId();
    const normalizedParentPath = parentPath ? normalizePath(parentPath) : null;
    const path = normalizedParentPath
      ? `${normalizedParentPath}/${name}`
      : `/${name}`;

    const newFile: FileSystemNode = {
      id,
      name,
      type: "file",
      path,
      parentPath: normalizedParentPath,
      metadata: {
        created: new Date(),
        modified: new Date(),
      },
    };

    set((state) => {
      const newNodes = { ...state.nodes, [id]: newFile };

      // If it's a root node
      if (!parentPath) {
        return {
          nodes: newNodes,
          rootNodeIds: [...state.rootNodeIds, id],
        };
      }

      // Find parent and update its children
      const parentNode = Object.values(state.nodes).find(
        (node) => node.path === normalizedParentPath
      );
      if (parentNode) {
        const updatedParent = {
          ...parentNode,
          children: [...(parentNode.children || []), id],
        };
        newNodes[parentNode.id] = updatedParent;
      } else {
        logger.warn(
          `Parent path ${normalizedParentPath} not found when creating file ${name}`
        );
      }

      return { nodes: newNodes };
    });

    logger.debug(`Created file: ${name} at ${path} with ID: ${id}`);
    return id;
  },

  createDirectory: (parentPath, name) => {
    const id = generateId();
    const normalizedParentPath = parentPath ? normalizePath(parentPath) : null;
    const path = normalizedParentPath
      ? `${normalizedParentPath}/${name}`
      : `/${name}`;

    const newDirectory: FileSystemNode = {
      id,
      name,
      type: "directory",
      path,
      parentPath: normalizedParentPath,
      children: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
      },
    };

    set((state) => {
      const newNodes = { ...state.nodes, [id]: newDirectory };

      // If it's a root node
      if (!parentPath) {
        return {
          nodes: newNodes,
          rootNodeIds: [...state.rootNodeIds, id],
        };
      }

      // Find parent and update its children
      const parentNode = Object.values(state.nodes).find(
        (node) => node.path === normalizedParentPath
      );
      if (parentNode) {
        const updatedParent = {
          ...parentNode,
          children: [...(parentNode.children || []), id],
        };
        newNodes[parentNode.id] = updatedParent;
      } else {
        logger.warn(
          `Parent path ${normalizedParentPath} not found when creating directory ${name}`
        );
      }

      return { nodes: newNodes };
    });

    logger.debug(`Created directory: ${name} at ${path} with ID: ${id}`);
    return id;
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const nodeToDelete = state.nodes[nodeId];
      if (!nodeToDelete) {
        logger.warn(
          `Node with ID ${nodeId} not found when attempting to delete`
        );
        return state;
      }

      // Create a new nodes object excluding the deleted node
      const { [nodeId]: _, ...remainingNodes } = state.nodes;

      // If it's a directory, recursively delete all children
      if (
        nodeToDelete.type === "directory" &&
        nodeToDelete.children &&
        nodeToDelete.children.length > 0
      ) {
        nodeToDelete.children.forEach((childId) => {
          const childNode = state.nodes[childId];
          if (childNode) {
            get().deleteNode(childId);
          }
        });
      }

      // Update parent to remove reference to this node
      if (nodeToDelete.parentPath) {
        const parentNode = Object.values(remainingNodes).find(
          (node) => node.path === nodeToDelete.parentPath
        );
        if (parentNode && parentNode.children) {
          const updatedParent = {
            ...parentNode,
            children: parentNode.children.filter((id) => id !== nodeId),
          };
          remainingNodes[parentNode.id] = updatedParent;
        }
      }

      // Update rootNodeIds if it was a root node
      const newRootNodeIds = state.rootNodeIds.filter((id) => id !== nodeId);

      logger.debug(`Deleted node: ${nodeToDelete.name} with ID: ${nodeId}`);
      return {
        nodes: remainingNodes,
        rootNodeIds: newRootNodeIds,
        selectedNodeId:
          state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    });
  },

  renameNode: (nodeId, newName) => {
    set((state) => {
      const nodeToRename = state.nodes[nodeId];
      if (!nodeToRename) {
        logger.warn(
          `Node with ID ${nodeId} not found when attempting to rename`
        );
        return state;
      }

      const oldPath = nodeToRename.path;
      const parentPath = nodeToRename.parentPath;
      const newPath = parentPath ? `${parentPath}/${newName}` : `/${newName}`;

      // Update the node with new name and path
      const updatedNode = {
        ...nodeToRename,
        name: newName,
        path: newPath,
        metadata: {
          ...nodeToRename.metadata,
          modified: new Date(),
        },
      };

      // Update all child paths if it's a directory
      const updatedNodes = { ...state.nodes, [nodeId]: updatedNode };

      if (nodeToRename.type === "directory") {
        // Update paths of all descendants
        Object.values(state.nodes).forEach((node) => {
          if (node.path.startsWith(`${oldPath}/`)) {
            const relativePath = node.path.substring(oldPath.length);
            const newNodePath = `${newPath}${relativePath}`;
            updatedNodes[node.id] = {
              ...node,
              path: newNodePath,
              parentPath:
                node.parentPath === oldPath
                  ? newPath
                  : node.parentPath
                    ? node.parentPath.replace(oldPath, newPath)
                    : null,
            };
          }
        });
      }

      logger.debug(
        `Renamed node: ${nodeToRename.name} to ${newName} with ID: ${nodeId}`
      );
      return { nodes: updatedNodes };
    });
  },

  moveNode: (nodeId, newParentPath) => {
    set((state) => {
      const nodeToMove = state.nodes[nodeId];
      if (!nodeToMove) {
        logger.warn(`Node with ID ${nodeId} not found when attempting to move`);
        return state;
      }

      const normalizedNewParentPath = newParentPath
        ? normalizePath(newParentPath)
        : null;
      const oldPath = nodeToMove.path;
      const oldParentPath = nodeToMove.parentPath;
      const newPath = normalizedNewParentPath
        ? `${normalizedNewParentPath}/${nodeToMove.name}`
        : `/${nodeToMove.name}`;

      // Update node with new parent path
      const updatedNode = {
        ...nodeToMove,
        path: newPath,
        parentPath: normalizedNewParentPath,
        metadata: {
          ...nodeToMove.metadata,
          modified: new Date(),
        },
      };

      const updatedNodes = { ...state.nodes, [nodeId]: updatedNode };

      // Update paths of all descendants if it's a directory
      if (nodeToMove.type === "directory") {
        Object.values(state.nodes).forEach((node) => {
          if (node.path.startsWith(`${oldPath}/`)) {
            const relativePath = node.path.substring(oldPath.length);
            const newNodePath = `${newPath}${relativePath}`;
            updatedNodes[node.id] = {
              ...node,
              path: newNodePath,
              parentPath:
                node.parentPath === oldPath
                  ? newPath
                  : node.parentPath
                    ? node.parentPath.replace(oldPath, newPath)
                    : null,
            };
          }
        });
      }

      // Update old parent to remove reference
      if (oldParentPath) {
        const oldParent = Object.values(updatedNodes).find(
          (node) => node.path === oldParentPath
        );
        if (oldParent && oldParent.children) {
          updatedNodes[oldParent.id] = {
            ...oldParent,
            children: oldParent.children.filter((id) => id !== nodeId),
          };
        }
      }

      // Update new parent to add reference
      if (normalizedNewParentPath) {
        const newParent = Object.values(updatedNodes).find(
          (node) => node.path === normalizedNewParentPath
        );
        if (newParent) {
          updatedNodes[newParent.id] = {
            ...newParent,
            children: [...(newParent.children || []), nodeId],
          };
        }
      }

      // Update rootNodeIds if necessary
      let newRootNodeIds = [...state.rootNodeIds];
      if (!oldParentPath && normalizedNewParentPath) {
        // Node was a root but now has a parent, remove from rootNodeIds
        newRootNodeIds = newRootNodeIds.filter((id) => id !== nodeId);
      } else if (oldParentPath && !normalizedNewParentPath) {
        // Node now becomes a root, add to rootNodeIds
        newRootNodeIds.push(nodeId);
      }

      logger.debug(
        `Moved node: ${nodeToMove.name} from ${oldParentPath || "root"} to ${normalizedNewParentPath || "root"}`
      );
      return {
        nodes: updatedNodes,
        rootNodeIds: newRootNodeIds,
      };
    });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
    if (nodeId) {
      const node = get().nodes[nodeId];
      if (node) {
        logger.debug(`Selected node: ${node.name} with ID: ${nodeId}`);
      }
    } else {
      logger.debug("Deselected current node");
    }
  },

  toggleDirectory: (directoryId) => {
    set((state) => {
      const newExpandedDirectories = new Set(state.expandedDirectories);
      if (newExpandedDirectories.has(directoryId)) {
        newExpandedDirectories.delete(directoryId);
        logger.debug(`Collapsed directory with ID: ${directoryId}`);
      } else {
        newExpandedDirectories.add(directoryId);
        logger.debug(`Expanded directory with ID: ${directoryId}`);
      }
      return { expandedDirectories: newExpandedDirectories };
    });
  },

  expandDirectory: (directoryId) => {
    set((state) => {
      const newExpandedDirectories = new Set(state.expandedDirectories);
      newExpandedDirectories.add(directoryId);
      logger.debug(`Expanded directory with ID: ${directoryId}`);
      return { expandedDirectories: newExpandedDirectories };
    });
  },

  collapseDirectory: (directoryId) => {
    set((state) => {
      const newExpandedDirectories = new Set(state.expandedDirectories);
      newExpandedDirectories.delete(directoryId);
      logger.debug(`Collapsed directory with ID: ${directoryId}`);
      return { expandedDirectories: newExpandedDirectories };
    });
  },

  getNodeByPath: (path) => {
    const normalizedPath = normalizePath(path);
    const node = Object.values(get().nodes).find(
      (node) => node.path === normalizedPath
    );
    return node || null;
  },

  getNodeById: (id) => {
    return get().nodes[id] || null;
  },

  getChildNodes: (nodeId) => {
    const node = get().nodes[nodeId];
    if (!node || !node.children) {
      return [];
    }

    return node.children
      .map((childId) => get().nodes[childId])
      .filter((node): node is FileSystemNode => node !== undefined);
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  loadFileTree: (rootNodes) => {
    set((state) => {
      const newNodes: Record<string, FileSystemNode> = {};
      const rootNodeIds: string[] = [];

      // Process all nodes and keep track of root nodes
      const processNode = (node: FileSystemNode) => {
        newNodes[node.id] = node;

        if (!node.parentPath) {
          rootNodeIds.push(node.id);
        }

        // Process children if any
        if (node.children) {
          node.children.forEach((childId) => {
            const childNode = rootNodes.find((n) => n.id === childId);
            if (childNode) {
              processNode(childNode);
            }
          });
        }
      };

      // Start processing from root nodes
      rootNodes.forEach((node) => processNode(node));

      logger.debug(
        `Loaded file tree with ${Object.keys(newNodes).length} nodes and ${rootNodeIds.length} root nodes`
      );

      return {
        nodes: newNodes,
        rootNodeIds,
        selectedNodeId: null,
        expandedDirectories: new Set(),
        loading: false,
        error: null,
      };
    });
  },
}));
