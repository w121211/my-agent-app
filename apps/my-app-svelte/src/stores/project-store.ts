// apps/my-app-svelte/src/stores/project-store.ts
import { writable, derived } from "svelte/store";
import type {
  ProjectFolder,
  FolderTreeNode,
} from "../services/project-service";

// Core project state
export const projectFolders = writable<ProjectFolder[]>([]);
export const folderTrees = writable<Record<string, FolderTreeNode>>({});

// Selection state
export const selectedTreeNode = writable<string | null>(null);
export const selectedChatFile = writable<string | null>(null);
export const selectedPreviewFile = writable<string | null>(null);

// UI state
export const expandedNodes = writable<Set<string>>(new Set());

// Derived stores
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

export const hasAnyProjectFolders = derived(
  projectFolders,
  ($projectFolders) => $projectFolders.length > 0,
);

export const projectFolderCount = derived(
  projectFolders,
  ($projectFolders) => $projectFolders.length,
);

// Helper functions for working with project stores
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

// Get folder tree for a specific project
export function getFolderTreeForProject(projectId: string) {
  return derived(
    folderTrees,
    ($folderTrees) => $folderTrees[projectId] || null,
  );
}
