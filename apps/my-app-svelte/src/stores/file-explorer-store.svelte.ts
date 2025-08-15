// apps/my-app-svelte/src/stores/file-explorer-store.svelte.ts

export interface ContextMenuState {
  isVisible: boolean;
  targetPath: string;
  x: number;
  y: number;
}

export interface RenameDialogState {
  isVisible: boolean;
  targetPath: string;
  currentName: string;
}

interface FileExplorerState {
  contextMenu: ContextMenuState;
  renameDialog: RenameDialogState;
}

// Unified state object
export const fileExplorerState = $state<FileExplorerState>({
  contextMenu: {
    isVisible: false,
    targetPath: "",
    x: 0,
    y: 0,
  },
  renameDialog: {
    isVisible: false,
    targetPath: "",
    currentName: "",
  },
});

// Derived stores
export const isContextMenuVisible = $derived(fileExplorerState.contextMenu.isVisible);

export const isRenameDialogVisible = $derived(fileExplorerState.renameDialog.isVisible);

// Context Menu Actions
export function showContextMenu(path: string, x: number, y: number) {
  console.log("🎯 FileExplorerStore: Showing context menu for:", path);
  
  // Adjust position if menu would go off screen
  const menuWidth = 192; // w-48 = 12rem = 192px
  const menuHeight = 200; // approximate height
  
  const finalX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const finalY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
  
  fileExplorerState.contextMenu.isVisible = true;
  fileExplorerState.contextMenu.targetPath = path;
  fileExplorerState.contextMenu.x = finalX;
  fileExplorerState.contextMenu.y = finalY;
}

export function closeContextMenu() {
  fileExplorerState.contextMenu.isVisible = false;
}

// Dialog Actions
export function showRenameDialog(path: string) {
  const fileName = path.split('/').pop() || '';
  console.log("🎯 FileExplorerStore: Showing rename dialog for:", fileName);
  
  fileExplorerState.renameDialog.isVisible = true;
  fileExplorerState.renameDialog.targetPath = path;
  fileExplorerState.renameDialog.currentName = fileName;
}

export function closeRenameDialog() {
  fileExplorerState.renameDialog.isVisible = false;
}