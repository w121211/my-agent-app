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

// Core state stores
export const contextMenu = $state<ContextMenuState>({
  isVisible: false,
  targetPath: "",
  x: 0,
  y: 0,
});

export const renameDialog = $state<RenameDialogState>({
  isVisible: false,
  targetPath: "",
  currentName: "",
});

// Derived stores
export const isContextMenuVisible = $derived(contextMenu.isVisible);

export const isRenameDialogVisible = $derived(renameDialog.isVisible);

// Context Menu Actions
export function showContextMenu(path: string, x: number, y: number) {
  console.log("🎯 FileExplorerStore: Showing context menu for:", path);
  
  // Adjust position if menu would go off screen
  const menuWidth = 192; // w-48 = 12rem = 192px
  const menuHeight = 200; // approximate height
  
  const finalX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const finalY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
  
  contextMenu.isVisible = true;
  contextMenu.targetPath = path;
  contextMenu.x = finalX;
  contextMenu.y = finalY;
}

export function closeContextMenu() {
  contextMenu.isVisible = false;
}

// Dialog Actions
export function showRenameDialog(path: string) {
  const fileName = path.split('/').pop() || '';
  console.log("🎯 FileExplorerStore: Showing rename dialog for:", fileName);
  
  renameDialog.isVisible = true;
  renameDialog.targetPath = path;
  renameDialog.currentName = fileName;
}

export function closeRenameDialog() {
  renameDialog.isVisible = false;
}