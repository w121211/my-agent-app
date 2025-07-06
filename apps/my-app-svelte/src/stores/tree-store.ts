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

// Helper functions for working with tree UI state
export function selectFile(filePath: string) {
  selectedTreeNode.set(filePath);

  if (filePath.endsWith(".chat.json")) {
    selectedChatFile.set(filePath);
    selectedPreviewFile.set(null);
  } else {
    selectedChatFile.set(null);
    selectedPreviewFile.set(filePath);
  }
}

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

export function expandNode(nodePath: string) {
  expandedNodes.update((nodes) => new Set(nodes).add(nodePath));
}

export function collapseNode(nodePath: string) {
  expandedNodes.update((nodes) => {
    const newNodes = new Set(nodes);
    newNodes.delete(nodePath);
    return newNodes;
  });
}

export function clearSelection() {
  selectedTreeNode.set(null);
  selectedChatFile.set(null);
  selectedPreviewFile.set(null);
}