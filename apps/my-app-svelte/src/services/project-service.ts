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
  selectedTreeNode,
  selectedChatFile,
  selectedPreviewFile,
  expandedNodes,
} from "../stores/tree-store";
import { setLoading, showToast } from "../stores/ui-store";

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

  selectTreeNode(path: string) {
    selectedTreeNode.set(path);

    // Determine if it's a chat file or regular file
    if (path.endsWith(".chat.json")) {
      selectedChatFile.set(path);
      // selectedPreviewFile.set(null);
    } else {
      // selectedChatFile.set(null);
      selectedPreviewFile.set(path);
    }
  }

  toggleNodeExpansion(nodePath: string) {
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

  // Event handlers
  handleFileEvent(event: FileWatcherEvent) {
    this.logger.debug(
      "Handling file event:",
      event.eventType,
      event.absoluteFilePath,
    );

    // Find which project folder this file belongs to
    const folders = get(projectFolders);
    const affectedFolder = folders.find((folder) =>
      event.absoluteFilePath.startsWith(folder.path),
    );

    if (!affectedFolder) {
      this.logger.debug("File event not for any tracked project folder");
      return;
    }

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

    // Clone the tree to avoid mutating original
    const newTree = { ...tree };

    // Helper function to find parent directory and update
    const updateNode = (
      node: FolderTreeNode,
      pathSegments: string[],
    ): FolderTreeNode => {
      if (pathSegments.length === 0) return node;

      const [currentSegment, ...remainingSegments] = pathSegments;

      // If this is the target file/folder
      if (remainingSegments.length === 0) {
        if (!node.children) node.children = [];

        const existingIndex = node.children.findIndex(
          (child) => child.name === currentSegment,
        );

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
          }
        } else if (
          fileEvent.eventType === "unlink" ||
          fileEvent.eventType === "unlinkDir"
        ) {
          // Remove file/folder
          if (existingIndex !== -1) {
            node.children.splice(existingIndex, 1);
          }
        }

        return { ...node, children: [...(node.children || [])] };
      }

      // Navigate deeper into the tree
      if (node.children) {
        const targetChildIndex = node.children.findIndex(
          (child) => child.name === currentSegment && child.isDirectory,
        );

        if (targetChildIndex !== -1) {
          const updatedChildren = [...node.children];
          updatedChildren[targetChildIndex] = updateNode(
            updatedChildren[targetChildIndex],
            remainingSegments,
          );
          return { ...node, children: updatedChildren };
        }
      }

      return node;
    };

    // Get relative path from tree root
    const treePath = tree.path;
    if (!filePath.startsWith(treePath)) return newTree;

    const relativePath = filePath.substring(treePath.length + 1);
    const pathSegments = relativePath.split("/");

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
