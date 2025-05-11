// packages/events-core/src/services/project-folder-service.ts
import path from "node:path";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Logger, ILogObj } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type { FolderTreeNode, BaseEvent } from "../event-types.js";
import type {
  UserSettingsRepository,
  ProjectFolder,
  UserSettings,
} from "./user-settings-repository.js";

// Event interfaces
export interface ServerProjectFolderValidatedEvent extends BaseEvent {
  kind: "ServerProjectFolderValidated";
  projectFolderPath: string;
  isValid: boolean;
  validationMessage?: string;
}

export interface ServerRequestUpdateWatchingFolderEvent extends BaseEvent {
  kind: "ServerRequestUpdateWatchingFolder";
  folderPath: string;
  action: "add" | "remove";
}

export interface ClientRequestStartWatchingAllProjectFoldersEvent
  extends BaseEvent {
  kind: "ClientRequestStartWatchingAllProjectFolders";
}

export interface ServerProjectFolderUpdatedEvent extends BaseEvent {
  kind: "ServerProjectFolderUpdated";
  projectFolders: ProjectFolder[];
  changeType: "PROJECT_FOLDER_ADDED" | "PROJECT_FOLDER_REMOVED";
}

export class ProjectFolderService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly userSettingsRepository: UserSettingsRepository;

  constructor(
    eventBus: IEventBus,
    userSettingsRepository: UserSettingsRepository
  ) {
    this.logger = new Logger({ name: "ProjectFolderService" });
    this.eventBus = eventBus;
    this.userSettingsRepository = userSettingsRepository;
  }

  /**
   * Get folder tree for a project folder path
   */
  public async getFolderTree(
    projectFolderPath?: string,
    correlationId?: string
  ): Promise<{ folderTree: FolderTreeNode | null; error?: string }> {
    this.logger.info(
      `Processing folder tree request for: ${projectFolderPath || ""}`
    );

    try {
      // Get settings to verify project folders
      const settings = await this.userSettingsRepository.getSettings();

      if (settings.projectFolders.length === 0) {
        throw new Error("No project folders configured");
      }

      // Determine which project folder to use and the relative path
      let fullPath: string;
      let selectedProjectFolder: ProjectFolder;

      if (!projectFolderPath) {
        // If no path specified, use the first project folder
        if (settings.projectFolders.length === 0) {
          throw new Error("No project folders configured");
        }
        selectedProjectFolder = settings.projectFolders[0]!;
        fullPath = selectedProjectFolder.path;
      } else {
        // Find matching project folder
        const matchingProjectFolder = settings.projectFolders.find(
          (folder) =>
            projectFolderPath === folder.path ||
            projectFolderPath.startsWith(folder.path + path.sep)
        );

        if (!matchingProjectFolder) {
          throw new Error(
            `Path ${projectFolderPath} is not within any registered project folder`
          );
        }

        selectedProjectFolder = matchingProjectFolder;
        fullPath = projectFolderPath;
      }

      // Build the folder tree
      const folderTree = await this.buildFolderTree(
        selectedProjectFolder.path,
        fullPath
      );
      return { folderTree };
    } catch (error) {
      this.logger.error(`Error building folder tree: ${error}`);
      return {
        folderTree: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a project folder
   */
  public async addProjectFolder(
    projectFolderPath: string,
    correlationId?: string
  ): Promise<{
    success: boolean;
    message?: string;
    projectFolder?: ProjectFolder;
  }> {
    this.logger.info(`Adding project folder: ${projectFolderPath}`);

    // Validate if project folder path exists and is a directory
    const isValid = await this.validateProjectFolderPath(projectFolderPath);

    if (!isValid) {
      return {
        success: false,
        message: `Invalid project folder path: ${projectFolderPath}`,
      };
    }

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if project folder already exists
    if (
      settings.projectFolders.some(
        (folder) => folder.path === projectFolderPath
      )
    ) {
      this.logger.warn(`Project folder already exists: ${projectFolderPath}`);
      return {
        success: true,
        message: `Project folder already exists: ${projectFolderPath}`,
      };
    }

    // Check if the new folder is a subfolder of an existing project folder
    for (const existingFolder of settings.projectFolders) {
      if (projectFolderPath.startsWith(existingFolder.path + path.sep)) {
        return {
          success: false,
          message: `Cannot add a subfolder of an existing project folder: ${existingFolder.path}`,
        };
      }
    }

    // Check if any existing folder is a subfolder of the new folder
    for (const existingFolder of settings.projectFolders) {
      if (existingFolder.path.startsWith(projectFolderPath + path.sep)) {
        return {
          success: false,
          message: `Cannot add a project folder that contains an existing project folder: ${existingFolder.path}`,
        };
      }
    }

    // Create the new project folder
    const folderName = path.basename(projectFolderPath);
    const projectFolder: ProjectFolder = {
      id: uuidv4(),
      name: folderName,
      path: projectFolderPath,
    };

    // Add project folder to settings
    settings.projectFolders.push(projectFolder);

    // Save updated settings
    await this.userSettingsRepository.saveSettings(settings);

    // Request file watcher to start watching the project folder
    await this.eventBus.emit<ServerRequestUpdateWatchingFolderEvent>({
      kind: "ServerRequestUpdateWatchingFolder",
      timestamp: new Date(),
      correlationId,
      folderPath: projectFolderPath,
      action: "add",
    });

    // Emit settings updated event
    await this.eventBus.emit<ServerProjectFolderUpdatedEvent>({
      kind: "ServerProjectFolderUpdated",
      timestamp: new Date(),
      correlationId,
      projectFolders: settings.projectFolders,
      changeType: "PROJECT_FOLDER_ADDED",
    });

    this.logger.info(`Project folder added successfully: ${projectFolderPath}`);
    return { success: true, projectFolder };
  }

  /**
   * Remove a project folder
   */
  public async removeProjectFolder(
    projectFolderId: string,
    correlationId?: string
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.info(`Removing project folder with ID: ${projectFolderId}`);

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Find the project folder by ID
    const projectFolder = settings.projectFolders.find(
      (folder) => folder.id === projectFolderId
    );

    if (!projectFolder) {
      this.logger.warn(`Project folder with ID ${projectFolderId} not found`);
      return {
        success: false,
        message: `Project folder with ID ${projectFolderId} not found`,
      };
    }

    // Remove project folder from settings
    settings.projectFolders = settings.projectFolders.filter(
      (folder) => folder.id !== projectFolderId
    );

    // Save updated settings
    await this.userSettingsRepository.saveSettings(settings);

    // Request file watcher to stop watching the project folder
    await this.eventBus.emit<ServerRequestUpdateWatchingFolderEvent>({
      kind: "ServerRequestUpdateWatchingFolder",
      timestamp: new Date(),
      correlationId,
      folderPath: projectFolder.path,
      action: "remove",
    });

    // Emit settings updated event
    await this.eventBus.emit<ServerProjectFolderUpdatedEvent>({
      kind: "ServerProjectFolderUpdated",
      timestamp: new Date(),
      correlationId,
      projectFolders: settings.projectFolders,
      changeType: "PROJECT_FOLDER_REMOVED",
    });

    this.logger.info(
      `Project folder removed successfully: ${projectFolder.path}`
    );
    return { success: true };
  }

  /**
   * Get all project folders
   */
  public async getAllProjectFolders(): Promise<ProjectFolder[]> {
    const settings = await this.userSettingsRepository.getSettings();
    return settings.projectFolders;
  }

  /**
   * Start watching all project folders
   */
  public async startWatchingAllProjectFolders(
    correlationId?: string
  ): Promise<{ success: boolean; count: number }> {
    this.logger.info("Starting to watch all project folders");

    // Get all project folder paths from settings
    const settings = await this.userSettingsRepository.getSettings();
    const projectFolders = settings.projectFolders;

    if (projectFolders.length === 0) {
      this.logger.info("No project folders found to watch");
      return { success: true, count: 0 };
    }

    // Request watching for each project folder
    for (const projectFolder of projectFolders) {
      await this.eventBus.emit<ServerRequestUpdateWatchingFolderEvent>({
        kind: "ServerRequestUpdateWatchingFolder",
        timestamp: new Date(),
        correlationId,
        folderPath: projectFolder.path,
        action: "add",
      });
    }

    this.logger.info(
      `Started watching ${projectFolders.length} project folders`
    );
    return { success: true, count: projectFolders.length };
  }

  /**
   * Validate project folder path
   */
  private async validateProjectFolderPath(
    projectFolderPath: string
  ): Promise<boolean> {
    try {
      const stats = await fs.stat(projectFolderPath);
      return stats.isDirectory();
    } catch (error) {
      this.logger.error(`Error validating project folder path: ${error}`);
      return false;
    }
  }

  /**
   * Recursively build a folder tree structure
   */
  private async buildFolderTree(
    projectFolderPath: string,
    targetPath: string
  ): Promise<FolderTreeNode> {
    const baseName = path.basename(targetPath);
    const relativePath = path.relative(projectFolderPath, targetPath);

    const stats = await fs.stat(targetPath);

    if (!stats.isDirectory()) {
      // It's a file, return file node
      return {
        name: baseName,
        path: targetPath, // Use absolute path
        isDirectory: false,
      };
    }

    // It's a directory, process its children
    const dirEntries = await fs.readdir(targetPath, { withFileTypes: true });
    const children: FolderTreeNode[] = [];

    for (const dirent of dirEntries) {
      const fullPath = path.join(targetPath, dirent.name);
      try {
        // Recursively build the tree for the child path
        const childNode = await this.buildFolderTree(
          projectFolderPath,
          fullPath
        );
        children.push(childNode);
      } catch (error) {
        // Log and skip entries that can't be accessed
        this.logger.debug(
          `Skipping inaccessible path: ${fullPath}. Error: ${error}`
        );
      }
    }

    // Return directory node
    return {
      name: baseName,
      path: targetPath, // Use absolute path
      isDirectory: true,
      children,
    };
  }
}

/**
 * Factory function to create a project folder service
 */
export function createProjectFolderService(
  eventBus: IEventBus,
  userSettingsRepository: UserSettingsRepository
): ProjectFolderService {
  return new ProjectFolderService(eventBus, userSettingsRepository);
}
