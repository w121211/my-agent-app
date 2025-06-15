// packages/events-core/src/services/project-folder-service.ts
import path from "node:path";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Logger, ILogObj } from "tslog";
import type { IEventBus, BaseEvent } from "../event-bus.js";
import type { UserSettingsRepository } from "./user-settings-repository.js";
import { FileWatcherService } from "./file-watcher-service.js";

// Define types for ProjectFolderService
export interface ProjectFolder {
  id: string;
  name: string;
  path: string;
}

export interface FolderTreeNode {
  name: string;
  path: string; // Absolute path
  isDirectory: boolean;
  children?: FolderTreeNode[];
}

export type ProjectFolderUpdateType =
  | "PROJECT_FOLDER_ADDED"
  | "PROJECT_FOLDER_REMOVED";

export interface ProjectFolderUpdatedEvent extends BaseEvent {
  kind: "ProjectFolderUpdatedEvent";
  projectFolders: ProjectFolder[];
  updateType: ProjectFolderUpdateType;
}

export class ProjectFolderService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly userSettingsRepository: UserSettingsRepository;
  private readonly fileWatcherService: FileWatcherService;

  constructor(
    eventBus: IEventBus,
    userSettingsRepository: UserSettingsRepository,
    fileWatcherService: FileWatcherService
  ) {
    this.logger = new Logger({ name: "ProjectFolderService" });
    this.eventBus = eventBus;
    this.userSettingsRepository = userSettingsRepository;
    this.fileWatcherService = fileWatcherService;
  }

  public async getFolderTree(
    absoluteProjectFolderPath?: string
  ): Promise<FolderTreeNode> {
    this.logger.info(
      `Processing folder tree request for: ${absoluteProjectFolderPath || ""}`
    );

    // Get settings to verify project folders
    const settings = await this.userSettingsRepository.getSettings();

    if (settings.projectFolders.length === 0) {
      throw new Error("No project folders configured");
    }

    // Determine which project folder to use
    let fullPath: string;
    let selectedProjectFolder: ProjectFolder;

    if (!absoluteProjectFolderPath) {
      // If no path specified, use the first project folder
      selectedProjectFolder = settings.projectFolders[0]!;
      fullPath = selectedProjectFolder.path;
    } else {
      // Validate that the path is absolute
      if (!path.isAbsolute(absoluteProjectFolderPath)) {
        throw new Error(
          `Path must be absolute, received: ${absoluteProjectFolderPath}`
        );
      }

      // Find matching project folder
      const matchingProjectFolder = settings.projectFolders.find(
        (folder) =>
          absoluteProjectFolderPath === folder.path ||
          absoluteProjectFolderPath.startsWith(folder.path + path.sep)
      );

      if (!matchingProjectFolder) {
        throw new Error(
          `Path ${absoluteProjectFolderPath} is not within any registered project folder`
        );
      }

      selectedProjectFolder = matchingProjectFolder;
      fullPath = absoluteProjectFolderPath;
    }

    // Build and return the folder tree
    return this.buildFolderTree(selectedProjectFolder.path, fullPath);
  }

  public async addProjectFolder(
    absoluteProjectFolderPath: string,
    correlationId?: string
  ): Promise<ProjectFolder> {
    this.logger.info(`Adding project folder: ${absoluteProjectFolderPath}`);

    // Validate that the path is absolute
    if (!path.isAbsolute(absoluteProjectFolderPath)) {
      throw new Error(
        `Path must be absolute, received: ${absoluteProjectFolderPath}`
      );
    }

    // Validate if project folder path exists and is a directory
    const isValid = await this.validateProjectFolderPath(
      absoluteProjectFolderPath
    );

    if (!isValid) {
      throw new Error(
        `Invalid project folder path: ${absoluteProjectFolderPath}`
      );
    }

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if project folder already exists (idempotent operation)
    const existingFolder = settings.projectFolders.find(
      (folder) => folder.path === absoluteProjectFolderPath
    );

    if (existingFolder) {
      this.logger.info(
        `Project folder already exists: ${absoluteProjectFolderPath}`
      );
      return existingFolder;
    }

    // Check if the new folder is a subfolder of an existing project folder
    for (const existingFolder of settings.projectFolders) {
      if (
        absoluteProjectFolderPath.startsWith(existingFolder.path + path.sep)
      ) {
        throw new Error(
          `Cannot add a subfolder of an existing project folder: ${existingFolder.path}`
        );
      }
    }

    // Check if any existing folder is a subfolder of the new folder
    for (const existingFolder of settings.projectFolders) {
      if (
        existingFolder.path.startsWith(absoluteProjectFolderPath + path.sep)
      ) {
        throw new Error(
          `Cannot add a project folder that contains an existing project folder: ${existingFolder.path}`
        );
      }
    }

    // Create the new project folder
    const folderName = path.basename(absoluteProjectFolderPath);
    const projectFolder: ProjectFolder = {
      id: uuidv4(),
      name: folderName,
      path: absoluteProjectFolderPath,
    };

    // Add project folder to settings
    settings.projectFolders.push(projectFolder);

    // Save updated settings
    await this.userSettingsRepository.saveSettings(settings);

    // Start watching the project folder
    await this.fileWatcherService.startWatchingFolder(
      absoluteProjectFolderPath
    );

    // Emit settings updated event
    await this.eventBus.emit<ProjectFolderUpdatedEvent>({
      kind: "ProjectFolderUpdatedEvent",
      timestamp: new Date(),
      correlationId,
      projectFolders: settings.projectFolders,
      updateType: "PROJECT_FOLDER_ADDED",
    });

    this.logger.info(
      `Project folder added successfully: ${absoluteProjectFolderPath}`
    );
    return projectFolder;
  }

  public async removeProjectFolder(
    projectFolderId: string,
    correlationId?: string
  ): Promise<void> {
    this.logger.info(`Removing project folder with ID: ${projectFolderId}`);

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Find the project folder by ID
    const projectFolder = settings.projectFolders.find(
      (folder) => folder.id === projectFolderId
    );

    if (!projectFolder) {
      throw new Error(`Project folder with ID ${projectFolderId} not found`);
    }

    // Remove project folder from settings
    settings.projectFolders = settings.projectFolders.filter(
      (folder) => folder.id !== projectFolderId
    );

    // Save updated settings
    await this.userSettingsRepository.saveSettings(settings);

    // Stop watching the project folder
    await this.fileWatcherService.stopWatchingFolder(projectFolder.path);

    // Emit settings updated event
    await this.eventBus.emit<ProjectFolderUpdatedEvent>({
      kind: "ProjectFolderUpdatedEvent",
      timestamp: new Date(),
      correlationId,
      projectFolders: settings.projectFolders,
      updateType: "PROJECT_FOLDER_REMOVED",
    });

    this.logger.info(
      `Project folder removed successfully: ${projectFolder.path}`
    );
  }

  public async getAllProjectFolders(): Promise<ProjectFolder[]> {
    const settings = await this.userSettingsRepository.getSettings();
    return settings.projectFolders;
  }

  public async startWatchingAllProjectFolders(
    correlationId?: string
  ): Promise<number> {
    this.logger.info("Starting to watch all project folders");

    // Get all project folder paths from settings
    const settings = await this.userSettingsRepository.getSettings();
    const projectFolders = settings.projectFolders;

    if (projectFolders.length === 0) {
      this.logger.info("No project folders found to watch");
      return 0;
    }

    // Start watching each project folder
    for (const projectFolder of projectFolders) {
      await this.fileWatcherService.startWatchingFolder(projectFolder.path);
    }

    this.logger.info(
      `Started watching ${projectFolders.length} project folders`
    );
    return projectFolders.length;
  }

  /**
   * Check if the given absolute path is within any registered project folder
   */
  public async isPathInProjectFolder(absolutePath: string): Promise<boolean> {
    if (!path.isAbsolute(absolutePath)) {
      throw new Error(`Path must be absolute, received: ${absolutePath}`);
    }

    const settings = await this.userSettingsRepository.getSettings();
    const projectFolders = settings.projectFolders;

    for (const folder of projectFolders) {
      if (
        absolutePath === folder.path ||
        absolutePath.startsWith(folder.path + path.sep)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the project folder that contains the given absolute path
   */
  public async getProjectFolderForPath(
    absolutePath: string
  ): Promise<ProjectFolder | null> {
    if (!path.isAbsolute(absolutePath)) {
      throw new Error(`Path must be absolute, received: ${absolutePath}`);
    }

    const settings = await this.userSettingsRepository.getSettings();
    const projectFolders = settings.projectFolders;

    for (const folder of projectFolders) {
      if (
        absolutePath === folder.path ||
        absolutePath.startsWith(folder.path + path.sep)
      ) {
        return folder;
      }
    }

    return null;
  }

  private async validateProjectFolderPath(
    absoluteProjectFolderPath: string
  ): Promise<boolean> {
    try {
      const stats = await fs.stat(absoluteProjectFolderPath);
      return stats.isDirectory();
    } catch (error) {
      this.logger.error(`Error validating project folder path: ${error}`);
      return false;
    }
  }

  private async buildFolderTree(
    projectFolderPath: string,
    targetPath: string
  ): Promise<FolderTreeNode> {
    const baseName = path.basename(targetPath);

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

export function createProjectFolderService(
  eventBus: IEventBus,
  userSettingsRepository: UserSettingsRepository,
  fileWatcherService: FileWatcherService
): ProjectFolderService {
  return new ProjectFolderService(
    eventBus,
    userSettingsRepository,
    fileWatcherService
  );
}
