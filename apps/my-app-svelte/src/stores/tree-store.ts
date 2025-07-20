// apps/my-app-svelte/src/stores/tree-store.ts
import { writable, derived } from "svelte/store";
import { projectFolders } from "./project-store";

// Tree view UI state - only selection and expansion state
export const selectedTreeNode = writable<string | null>(null);
export const selectedChatFile = writable<string | null>(null);
export const selectedPreviewFile = writable<string | null>(null);
export const expandedNodes = writable<Set<string>>(new Set());

// Tree view derived stores
export const selectedProjectFolder = derived(
  [projectFolders, selectedTreeNode],
  ([$projectFolders, $selectedTreeNode]) => {
    if (!$selectedTreeNode) return null;

    return (
      $projectFolders.find(
        (folder) =>
          $selectedTreeNode === folder.path ||
          $selectedTreeNode.startsWith(folder.path + "/"),
      ) || null
    );
  },
);

// Internal store functions - used by service layer
// These handle only the state updates, not business logic

/**
 * Internal function to update tree selection state
 * Should be called by service layer, not directly by components
 */
export function setTreeSelectionState(
  treePath: string | null,
  chatPath: string | null,
  previewPath: string | null,
) {
  selectedTreeNode.set(treePath);
  selectedChatFile.set(chatPath);
  selectedPreviewFile.set(previewPath);
}

/**
 * Toggle node expansion state
 */
export function toggleNodeExpansion(nodePath: string) {
  expandedNodes.update((nodes) => {
    const newNodes = new Set(nodes);
    if (newNodes.has(nodePath)) {
      newNodes.delete(nodePath);
    } else {
      newNodes.add(nodePath);
    }
    return newNodes;
  });
}

/**
 * Expand a specific node
 */
export function expandNode(nodePath: string) {
  expandedNodes.update((nodes) => new Set(nodes).add(nodePath));
}

/**
 * Expand all parent directories of a given file path
 */
export function expandParentDirectories(filePath: string) {
  const pathParts = filePath.split('/');
  const parentPaths: string[] = [];
  
  // Build all parent directory paths
  for (let i = 1; i < pathParts.length; i++) {
    const parentPath = pathParts.slice(0, i + 1).join('/');
    parentPaths.push(parentPath);
  }
  
  // Expand all parent directories
  expandedNodes.update((nodes) => {
    const newNodes = new Set(nodes);
    parentPaths.forEach(path => newNodes.add(path));
    return newNodes;
  });
}

/**
 * Collapse a specific node
 */
export function collapseNode(nodePath: string) {
  expandedNodes.update((nodes) => {
    const newNodes = new Set(nodes);
    newNodes.delete(nodePath);
    return newNodes;
  });
}

/**
 * Clear all selections
 */
export function clearSelection() {
  selectedTreeNode.set(null);
  selectedChatFile.set(null);
  selectedPreviewFile.set(null);
}

// Legacy function - kept for backward compatibility
// New code should use projectService.selectFile() instead
export function selectFile(filePath: string) {
  console.warn(
    "selectFile() is deprecated. Use projectService.selectFile() instead.",
  );

  selectedTreeNode.set(filePath);

  if (filePath.endsWith(".chat.json")) {
    selectedChatFile.set(filePath);
    selectedPreviewFile.set(null);
  } else {
    selectedChatFile.set(null);
    selectedPreviewFile.set(filePath);
  }
}
