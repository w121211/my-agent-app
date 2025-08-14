// apps/my-app-svelte/src/stores/tree-store.svelte.ts
import { projectFolders } from "./project-store.svelte";

// Tree view UI state - only selection and expansion state
export const selectedTreeNode = $state<string | null>(null);
export const selectedChatFile = $state<string | null>(null);
export const selectedPreviewFile = $state<string | null>(null);
export const expandedNodes = $state<Set<string>>(new Set());

// Tree view derived stores
export const selectedProjectFolder = $derived(() => {
  if (!selectedTreeNode) return null;

  return (
    projectFolders.find(
      (folder) =>
        selectedTreeNode === folder.path ||
        selectedTreeNode.startsWith(folder.path + "/"),
    ) || null
  );
});

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
  selectedTreeNode = treePath;
  selectedChatFile = chatPath;
  selectedPreviewFile = previewPath;
}

/**
 * Toggle node expansion state
 */
export function toggleNodeExpansion(nodePath: string) {
  if (expandedNodes.has(nodePath)) {
    expandedNodes.delete(nodePath);
  } else {
    expandedNodes.add(nodePath);
  }
}

/**
 * Expand a specific node
 */
export function expandNode(nodePath: string) {
  expandedNodes.add(nodePath);
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
  parentPaths.forEach(path => expandedNodes.add(path));
}

/**
 * Collapse a specific node
 */
export function collapseNode(nodePath: string) {
  expandedNodes.delete(nodePath);
}

/**
 * Clear all selections
 */
export function clearSelection() {
  selectedTreeNode = null;
  selectedChatFile = null;
  selectedPreviewFile = null;
}

// Legacy function - kept for backward compatibility
// New code should use projectService.selectFile() instead
export function selectFile(filePath: string) {
  console.warn(
    "selectFile() is deprecated. Use projectService.selectFile() instead.",
  );

  selectedTreeNode = filePath;

  if (filePath.endsWith(".chat.json")) {
    selectedChatFile = filePath;
    selectedPreviewFile = null;
  } else {
    selectedChatFile = null;
    selectedPreviewFile = filePath;
  }
}