// apps/my-app-svelte/src/services/project-service.ts
import { get } from "svelte/store";
import { Logger } from "tslog";
import { trpcClient } from "../lib/trpc-client";
import {
  projectFolders,
  folderTrees,
  type ProjectFolder,
  type FolderTreeNode,
} from "../stores/project-store";
import {
  setTreeSelectionState,
  toggleNodeExpansion as toggleNodeExpansionStore,
  expandedNodes,
  expandParentDirectories,
} from "../stores/tree-store";
import { setLoading, showToast } from "../stores/ui-store";
import { chatService } from "./chat-service";

interface FileWatcherEvent {
  eventType:
    | "add"
    | "addDir"
    | "change"
    | "unlink"
    | "unlinkDir"
    | "ready"
    | "error";
  absoluteFilePath: string;
  isDirectory: boolean;
  error?: Error;
}

interface ProjectFolderUpdatedEvent {
  projectFolders: ProjectFolder[];
  updateType: "PROJECT_FOLDER_ADDED" | "PROJECT_FOLDER_REMOVED";
}

class ProjectService {
  private logger = new Logger({ name: "ProjectService" });

  async loadProjectFolders() {
    setLoading("projectFolders", true);

    try {
      this.logger.info("Loading project folders...");
      const folders =
        await trpcClient.projectFolder.getAllProjectFolders.query();

      projectFolders.set(folders);
      this.logger.info(`Loaded ${folders.length} project folders`);

      // Load folder trees for each project
      await this.loadAllFolderTrees(folders);
    } catch (error) {
      this.logger.error("Failed to load project folders:", error);
      showToast(
        `Failed to load project folders: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("projectFolders", false);
    }
  }

  async addProjectFolder(absolutePath: string) {
    setLoading("addProjectFolder", true);

    try {
      this.logger.info("Adding project folder:", absolutePath);
      const newFolder = await trpcClient.projectFolder.addProjectFolder.mutate({
        absoluteProjectFolderPath: absolutePath,
      });

      // Update project folders list
      const currentFolders = get(projectFolders);
      projectFolders.set([...currentFolders, newFolder]);

      // Load folder tree for new project
      await this.loadFolderTree(newFolder.id, newFolder.path);

      showToast("Project folder added successfully", "success");
      this.logger.info("Project folder added:", newFolder.name);

      return newFolder;
    } catch (error) {
      this.logger.error("Failed to add project folder:", error);
      showToast(
        `Failed to add project folder: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("addProjectFolder", false);
    }
  }

  async removeProjectFolder(projectFolderId: string) {
    setLoading("removeProjectFolder", true);

    try {
      this.logger.info("Removing project folder:", projectFolderId);
      await trpcClient.projectFolder.removeProjectFolder.mutate({
        projectFolderId,
      });

      // Update project folders list
      const currentFolders = get(projectFolders);
      const updatedFolders = currentFolders.filter(
        (f) => f.id !== projectFolderId,
      );
      projectFolders.set(updatedFolders);

      // Remove folder tree
      folderTrees.update((trees) => {
        const { [projectFolderId]: removed, ...rest } = trees;
        return rest;
      });

      showToast("Project folder removed successfully", "success");
      this.logger.info("Project folder removed");
    } catch (error) {
      this.logger.error("Failed to remove project folder:", error);
      showToast(
        `Failed to remove project folder: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
      throw error;
    } finally {
      setLoading("removeProjectFolder", false);
    }
  }

  async refreshFolderTree(projectFolderId: string) {
    const folders = get(projectFolders);
    const folder = folders.find((f) => f.id === projectFolderId);

    if (!folder) {
      this.logger.warn(
        "Cannot refresh - project folder not found:",
        projectFolderId,
      );
      return;
    }

    await this.loadFolderTree(projectFolderId, folder.path);
  }

  /**
   * Enhanced file selection with business logic
   * Handles different file types appropriately
   */
  async selectFile(filePath: string) {
    this.logger.info("Selecting file:", filePath);

    // Expand parent directories to ensure file is visible
    expandParentDirectories(filePath);

    if (filePath.endsWith(".chat.json")) {
      // Chat file: Open the chat and set chat-specific state
      setTreeSelectionState(filePath, filePath, null);

      try {
        this.logger.info("Opening chat file:", filePath);
        await chatService.openChatFile(filePath);
        this.logger.info("Chat file opened successfully");
      } catch (error) {
        this.logger.error("Failed to open chat file:", error);
        // Fallback: Keep the selection state but show error
        showToast(
          `Failed to open chat file: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }
    } else {
      // Regular file: Set up for preview
      setTreeSelectionState(filePath, null, filePath);
      this.logger.debug("File set for preview:", filePath);
    }
  }

  /**
   * Handle directory/file clicks from tree components
   */
  async handleTreeNodeClick(node: FolderTreeNode) {
    if (node.isDirectory) {
      this.toggleNodeExpansion(node.path);
    } else {
      await this.selectFile(node.path);
    }
  }

  toggleNodeExpansion(nodePath: string) {
    toggleNodeExpansionStore(nodePath);
  }

  // Event handlers
  handleFileEvent(event: FileWatcherEvent) {
    this.logger.debug(
      "Handling file event:",
      event.eventType,
      event.absoluteFilePath,
      "isDirectory:",
      event.isDirectory,
    );

    // Find which project folder this file belongs to
    const folders = get(projectFolders);
    const affectedFolder = folders.find((folder) =>
      event.absoluteFilePath.startsWith(folder.path + "/") || 
      event.absoluteFilePath === folder.path,
    );

    if (!affectedFolder) {
      this.logger.debug("File event not for any tracked project folder");
      return;
    }

    this.logger.debug(
      "Found affected folder:",
      affectedFolder.name,
      "path:",
      affectedFolder.path,
    );

    // Update folder tree directly
    if (["add", "addDir", "unlink", "unlinkDir"].includes(event.eventType)) {
      const currentTrees = get(folderTrees);
      const currentTree = currentTrees[affectedFolder.id];

      if (currentTree) {
        const updatedTree = this.updateTreeNodeDirectly(currentTree, event);
        
        folderTrees.update((trees) => ({
          ...trees,
          [affectedFolder.id]: updatedTree,
        }));
        
        this.logger.debug("Tree updated in store for folder:", affectedFolder.name);
      } else {
        this.logger.warn("No current tree found for affected folder:", affectedFolder.id);
      }
    }
  }

  handleProjectFolderEvent(event: ProjectFolderUpdatedEvent) {
    this.logger.debug("Handling project folder event:", event.updateType);
    projectFolders.set(event.projectFolders);
  }

  private async loadAllFolderTrees(folders: ProjectFolder[]) {
    for (const folder of folders) {
      await this.loadFolderTree(folder.id, folder.path);
    }
  }

  private async loadFolderTree(projectFolderId: string, projectPath: string) {
    try {
      this.logger.debug("Loading folder tree for:", projectPath);
      const tree = await trpcClient.projectFolder.getFolderTree.query({
        absoluteProjectFolderPath: projectPath,
      });

      const sortedTree = this.sortTreeRecursively(tree);
      folderTrees.update((trees) => ({
        ...trees,
        [projectFolderId]: sortedTree,
      }));

      this.logger.debug("Folder tree loaded for:", projectPath);
    } catch (error) {
      this.logger.error(
        `Failed to load folder tree for ${projectPath}:`,
        error,
      );
      showToast(`Failed to load folder tree for project`, "error");
    }
  }

  private updateTreeNodeDirectly(
    tree: FolderTreeNode,
    fileEvent: FileWatcherEvent,
  ): FolderTreeNode {
    const filePath = fileEvent.absoluteFilePath;

    this.logger.debug("updateTreeNodeDirectly called with:", filePath, tree.path, fileEvent.eventType);

    // Clone the tree to avoid mutating original
    const newTree = { ...tree };

    // Helper function to find parent directory and update
    const updateNode = (
      node: FolderTreeNode,
      pathSegments: string[],
    ): FolderTreeNode => {
      this.logger.debug("updateNode called with pathSegments:", pathSegments);
      
      if (pathSegments.length === 0) return node;

      const [currentSegment, ...remainingSegments] = pathSegments;
      this.logger.debug("currentSegment:", currentSegment, "remaining:", remainingSegments);

      // If this is the target file/folder
      if (remainingSegments.length === 0) {
        this.logger.debug("Target reached, updating node:", node.name);
        
        if (!node.children) node.children = [];

        const existingIndex = node.children.findIndex(
          (child) => child.name === currentSegment,
        );

        this.logger.debug("existingIndex:", existingIndex);

        if (fileEvent.eventType === "add" || fileEvent.eventType === "addDir") {
          // Add new file/folder if it doesn't exist
          if (existingIndex === -1) {
            const newChild: FolderTreeNode = {
              name: currentSegment,
              path: filePath,
              isDirectory: fileEvent.isDirectory,
              children: fileEvent.isDirectory ? [] : undefined,
            };
            node.children.push(newChild);
            node.children = this.sortTreeNodes(node.children);
            this.logger.debug("Added new child:", newChild.name);
          } else {
            this.logger.debug("Child already exists, skipping add");
          }
        } else if (
          fileEvent.eventType === "unlink" ||
          fileEvent.eventType === "unlinkDir"
        ) {
          // Remove file/folder
          if (existingIndex !== -1) {
            node.children.splice(existingIndex, 1);
            this.logger.debug("Removed child:", currentSegment);
          } else {
            this.logger.debug("Child not found for removal:", currentSegment);
          }
        }

        return { ...node, children: [...(node.children || [])] };
      }

      // Navigate deeper into the tree
      if (node.children) {
        const targetChildIndex = node.children.findIndex(
          (child) => child.name === currentSegment && child.isDirectory,
        );

        this.logger.debug("targetChildIndex:", targetChildIndex);

        if (targetChildIndex !== -1) {
          const updatedChildren = [...node.children];
          updatedChildren[targetChildIndex] = updateNode(
            updatedChildren[targetChildIndex],
            remainingSegments,
          );
          return { ...node, children: updatedChildren };
        } else {
          this.logger.warn("Could not find child directory:", currentSegment);
        }
      }

      return node;
    };

    // Get relative path from tree root
    const treePath = tree.path;
    if (!filePath.startsWith(treePath + "/") && filePath !== treePath) {
      this.logger.warn("File path does not start with tree path");
      return newTree;
    }

    const relativePath = filePath === treePath ? "" : filePath.substring(treePath.length + 1);
    const pathSegments = relativePath.split("/").filter(Boolean);
    
    this.logger.debug("relativePath:", relativePath, "pathSegments:", pathSegments);

    return updateNode(newTree, pathSegments);
  }

  private sortTreeNodes(nodes: FolderTreeNode[]): FolderTreeNode[] {
    return nodes.sort((a, b) => {
      // Directories first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      // Same type sorted by name
      return a.name.localeCompare(b.name);
    });
  }

  private sortTreeRecursively(node: FolderTreeNode): FolderTreeNode {
    if (node.children) {
      const sortedChildren = this.sortTreeNodes(
        node.children.map((child) => this.sortTreeRecursively(child)),
      );
      return { ...node, children: sortedChildren };
    }
    return node;
  }
}

export const projectService = new ProjectService();
