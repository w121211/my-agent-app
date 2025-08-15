// apps/my-app-svelte/src/stores/tree-store.svelte.ts

interface TreeState {
  selectedNode: string | null;
  selectedChatFile: string | null;
  selectedPreviewFile: string | null;
  expandedNodes: Set<string>;
}

// Tree view UI state - only selection and expansion state
export const treeState = $state<TreeState>({
  selectedNode: null,
  selectedChatFile: null,
  selectedPreviewFile: null,
  expandedNodes: new Set()
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
  treeState.selectedNode = treePath;
  treeState.selectedChatFile = chatPath;
  treeState.selectedPreviewFile = previewPath;
}

/**
 * Toggle node expansion state
 */
export function toggleNodeExpansion(nodePath: string) {
  if (treeState.expandedNodes.has(nodePath)) {
    treeState.expandedNodes.delete(nodePath);
  } else {
    treeState.expandedNodes.add(nodePath);
  }
}

/**
 * Expand a specific node
 */
export function expandNode(nodePath: string) {
  treeState.expandedNodes.add(nodePath);
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
  parentPaths.forEach(path => treeState.expandedNodes.add(path));
}

/**
 * Collapse a specific node
 */
export function collapseNode(nodePath: string) {
  treeState.expandedNodes.delete(nodePath);
}

/**
 * Clear all selections
 */
export function clearSelection() {
  treeState.selectedNode = null;
  treeState.selectedChatFile = null;
  treeState.selectedPreviewFile = null;
}

/**
 * Reset all tree state
 */
export function resetTreeState() {
  treeState.selectedNode = null;
  treeState.selectedChatFile = null;
  treeState.selectedPreviewFile = null;
  treeState.expandedNodes.clear();
}

// Legacy function - kept for backward compatibility
// New code should use projectService.selectFile() instead
export function selectFile(filePath: string) {
  console.warn(
    "selectFile() is deprecated. Use projectService.selectFile() instead.",
  );

  treeState.selectedNode = filePath;

  if (filePath.endsWith(".chat.json")) {
    treeState.selectedChatFile = filePath;
    treeState.selectedPreviewFile = null;
  } else {
    treeState.selectedChatFile = null;
    treeState.selectedPreviewFile = filePath;
  }
}