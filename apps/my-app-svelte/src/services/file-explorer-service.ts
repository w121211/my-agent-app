// apps/my-app-svelte/src/services/file-explorer-service.ts
import { Logger } from "tslog";
import { projectService } from "./project-service";
import { showToast } from "../stores/ui-store.svelte";
import { closeContextMenu, showRenameDialog, closeRenameDialog } from "../stores/file-explorer-store.svelte";

export class FileExplorerService {
  private logger = new Logger({ name: "FileExplorerService" });

  // File Action Handlers
  async handleFileAction(action: string, path: string) {
    console.log("🎯 FileExplorerService: Handling action:", action, "for:", path);
    
    try {
      switch (action) {
        case 'add-to-chat':
          showToast("Add to current chat: Not yet implemented", "info");
          break;
          
        case 'add-to-project':
          showToast("Add to project context: Not yet implemented", "info");
          break;
          
        case 'copy-reference':
          showToast("Copy reference: Not yet implemented", "info");
          break;
          
        case 'rename':
          // Close context menu first, then show rename dialog with delay
          closeContextMenu();
          setTimeout(() => {
            showRenameDialog(path);
          }, 50);
          break;
          
        case 'duplicate':
          closeContextMenu();
          await projectService.duplicateFile(path);
          break;
          
        case 'delete':
          closeContextMenu();
          if (confirm("Are you sure you want to delete this file?")) {
            await projectService.deleteFile(path);
          }
          break;
          
        default:
          this.logger.warn("Unknown file action:", action);
      }
    } catch (error) {
      this.logger.error("File action failed:", error);
      // Error handling is done in projectService
    }
  }

  async handleRename(path: string, newName: string) {
    try {
      await projectService.renameFile(path, newName);
      closeRenameDialog();
    } catch (error) {
      this.logger.error("Rename failed:", error);
      // Error handling is done in projectService
    }
  }
}

export const fileExplorerService = new FileExplorerService();