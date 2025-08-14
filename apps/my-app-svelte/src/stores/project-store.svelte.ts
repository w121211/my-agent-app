// apps/my-app-svelte/src/stores/project-store.svelte.ts

export interface ProjectFolder {
  id: string;
  name: string;
  path: string;
}

export interface FolderTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
}

// Core project state - only project data, no UI state
export const projectFolders = $state<ProjectFolder[]>([]);
export const folderTrees = $state<Record<string, FolderTreeNode>>({});

// Project-related derived stores
export const hasAnyProjectFolders = $derived(
  projectFolders.length > 0,
);

export const projectFolderCount = $derived(
  projectFolders.length,
);

// Helper function for getting folder tree for a specific project
export function getFolderTreeForProject(projectId: string) {
  return $derived(folderTrees[projectId] || null);
}