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

interface ProjectState {
  projectFolders: ProjectFolder[];
  folderTrees: Record<string, FolderTreeNode>;
}

// Unified state object
export const projectState = $state<ProjectState>({
  projectFolders: [],
  folderTrees: {},
});

// Project-related derived stores
export const hasAnyProjectFolders = $derived(
  projectState.projectFolders.length > 0,
);

export const projectFolderCount = $derived(
  projectState.projectFolders.length,
);

// Helper function for getting folder tree for a specific project
export function getFolderTreeForProject(projectId: string) {
  return $derived(projectState.folderTrees[projectId] || null);
}

// Mutation functions
export function setProjectFolders(folders: ProjectFolder[]) {
  projectState.projectFolders = folders;
}

export function addProjectFolder(folder: ProjectFolder) {
  projectState.projectFolders = [...projectState.projectFolders, folder];
}

export function removeProjectFolder(projectFolderId: string) {
  projectState.projectFolders = projectState.projectFolders.filter(
    (f) => f.id !== projectFolderId,
  );
}

export function setFolderTree(projectId: string, tree: FolderTreeNode) {
  projectState.folderTrees = {
    ...projectState.folderTrees,
    [projectId]: tree,
  };
}

export function removeFolderTree(projectId: string) {
  const { [projectId]: removed, ...rest } = projectState.folderTrees;
  projectState.folderTrees = rest;
}

export function updateFolderTrees(updater: (trees: Record<string, FolderTreeNode>) => Record<string, FolderTreeNode>) {
  projectState.folderTrees = updater(projectState.folderTrees);
}