// packages/events-core/src/services/project-folder-service.ts
import path from "node:path";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Logger, ILogObj } from "tslog";
import fuzzysort from "fuzzysort";
import walk from "ignore-walk";
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

export interface FileSearchResult {
  name: string; // "world.txt"
  relativePath: string; // "docs/world.txt"
  absolutePath: string; // "/project/docs/world.txt"
  score?: number; // fuzzy search relevance
  highlight?: string; // highlighted text for UI
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
    fileWatcherService: FileWatcherService,
  ) {
    this.logger = new Logger({ name: "ProjectFolderService" });
    this.eventBus = eventBus;
    this.userSettingsRepository = userSettingsRepository;
    this.fileWatcherService = fileWatcherService;
  }

  public async getFolderTree(
    absoluteProjectFolderPath?: string,
  ): Promise<FolderTreeNode> {
    this.logger.info(
      `Processing folder tree request for: ${absoluteProjectFolderPath || ""}`,
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
          `Path must be absolute, received: ${absoluteProjectFolderPath}`,
        );
      }

      // Find matching project folder
      const matchingProjectFolder = settings.projectFolders.find(
        (folder) =>
          absoluteProjectFolderPath === folder.path ||
          absoluteProjectFolderPath.startsWith(folder.path + path.sep),
      );

      if (!matchingProjectFolder) {
        throw new Error(
          `Path ${absoluteProjectFolderPath} is not within any registered project folder`,
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
    correlationId?: string,
  ): Promise<ProjectFolder> {
    this.logger.info(`Adding project folder: ${absoluteProjectFolderPath}`);

    // Validate that the path is absolute
    if (!path.isAbsolute(absoluteProjectFolderPath)) {
      throw new Error(
        `Path must be absolute, received: ${absoluteProjectFolderPath}`,
      );
    }

    // Validate if project folder path exists and is a directory
    const isValid = await this.validateProjectFolderPath(
      absoluteProjectFolderPath,
    );

    if (!isValid) {
      throw new Error(
        `Invalid project folder path: ${absoluteProjectFolderPath}`,
      );
    }

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if project folder already exists (idempotent operation)
    const existingFolder = settings.projectFolders.find(
      (folder) => folder.path === absoluteProjectFolderPath,
    );

    if (existingFolder) {
      this.logger.info(
        `Project folder already exists: ${absoluteProjectFolderPath}`,
      );
      return existingFolder;
    }

    // Check if the new folder is a subfolder of an existing project folder
    for (const existingFolder of settings.projectFolders) {
      if (
        absoluteProjectFolderPath.startsWith(existingFolder.path + path.sep)
      ) {
        throw new Error(
          `Cannot add a subfolder of an existing project folder: ${existingFolder.path}`,
        );
      }
    }

    // Check if any existing folder is a subfolder of the new folder
    for (const existingFolder of settings.projectFolders) {
      if (
        existingFolder.path.startsWith(absoluteProjectFolderPath + path.sep)
      ) {
        throw new Error(
          `Cannot add a project folder that contains an existing project folder: ${existingFolder.path}`,
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
      absoluteProjectFolderPath,
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
      `Project folder added successfully: ${absoluteProjectFolderPath}`,
    );
    return projectFolder;
  }

  public async removeProjectFolder(
    projectFolderId: string,
    correlationId?: string,
  ): Promise<void> {
    this.logger.info(`Removing project folder with ID: ${projectFolderId}`);

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Find the project folder by ID
    const projectFolder = settings.projectFolders.find(
      (folder) => folder.id === projectFolderId,
    );

    if (!projectFolder) {
      throw new Error(`Project folder with ID ${projectFolderId} not found`);
    }

    // Remove project folder from settings
    settings.projectFolders = settings.projectFolders.filter(
      (folder) => folder.id !== projectFolderId,
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
      `Project folder removed successfully: ${projectFolder.path}`,
    );
  }

  public async getAllProjectFolders(): Promise<ProjectFolder[]> {
    const settings = await this.userSettingsRepository.getSettings();
    return settings.projectFolders;
  }

  public async startWatchingAllProjectFolders(
    correlationId?: string,
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
      `Started watching ${projectFolders.length} project folders`,
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
    absolutePath: string,
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

  /**
   * Search for files in a specific project using fuzzy search
   */
  private async getSearchableFiles(
    projectPath: string,
  ): Promise<FileSearchResult[]> {
    // Use ignore-walk to get files that are not gitignored
    const allowedFiles = await walk({
      path: projectPath,
      ignoreFiles: [".gitignore"],
      includeEmpty: false,
      follow: false,
    });

    return allowedFiles.map((relativePath) => {
      const absolutePath = path.join(projectPath, relativePath);
      return {
        name: path.basename(relativePath),
        relativePath,
        absolutePath,
      };
    });
  }

  public async searchFilesInProject(
    query: string,
    projectId: string,
    limit: number = 20,
  ): Promise<FileSearchResult[]> {
    this.logger.info(
      `Searching files in project ${projectId} with query: ${query}`,
    );

    // Find the project folder by ID
    const settings = await this.userSettingsRepository.getSettings();
    const projectFolder = settings.projectFolders.find(
      (folder) => folder.id === projectId,
    );

    if (!projectFolder) {
      throw new Error(`Project folder with ID ${projectId} not found`);
    }

    // Get searchable files using .gitignore rules
    const filteredFiles = await this.getSearchableFiles(projectFolder.path);

    // If no query, return all filtered files (limited)
    if (!query.trim()) {
      return filteredFiles.slice(0, limit);
    }

    // Prepare files for fuzzy search
    const targets = filteredFiles.map((file) => ({
      file,
      prepared: fuzzysort.prepare(file.name),
    }));

    // Perform fuzzy search
    const results = fuzzysort.go(query, targets, {
      key: "prepared",
      limit,
      threshold: -10000, // Allow lower quality matches
    });

    // Convert results to FileSearchResult format
    return results.map((result) => ({
      name: result.obj.file.name,
      relativePath: result.obj.file.relativePath,
      absolutePath: result.obj.file.absolutePath,
      score: result.score,
      highlight: result.highlight("<mark>", "</mark>") || result.obj.file.name,
    }));
  }

  private async validateProjectFolderPath(
    absoluteProjectFolderPath: string,
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
    targetPath: string,
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
          fullPath,
        );
        children.push(childNode);
      } catch (error) {
        // Log and skip entries that can't be accessed
        this.logger.debug(
          `Skipping inaccessible path: ${fullPath}. Error: ${error}`,
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

  private flattenTreeToFiles(
    node: FolderTreeNode,
    projectPath: string,
  ): FileSearchResult[] {
    const files: FileSearchResult[] = [];

    if (!node.isDirectory) {
      // It's a file, add it to the results
      const relativePath = path.relative(projectPath, node.path);
      files.push({
        name: node.name,
        relativePath,
        absolutePath: node.path,
      });
    } else if (node.children) {
      // It's a directory, recursively process children
      for (const child of node.children) {
        files.push(...this.flattenTreeToFiles(child, projectPath));
      }
    }

    return files;
  }

  /**
   * Copy a file or directory within project folders
   */
  public async copyFile(
    sourceAbsolutePath: string,
    destinationAbsolutePath: string,
    correlationId?: string,
  ): Promise<void> {
    this.logger.info(
      `Copying from ${sourceAbsolutePath} to ${destinationAbsolutePath}`,
    );

    // Validate both paths are absolute
    if (!path.isAbsolute(sourceAbsolutePath)) {
      throw new Error(
        `Source path must be absolute, received: ${sourceAbsolutePath}`,
      );
    }
    if (!path.isAbsolute(destinationAbsolutePath)) {
      throw new Error(
        `Destination path must be absolute, received: ${destinationAbsolutePath}`,
      );
    }

    // Validate both paths are within project folders
    const isSourceInProject = await this.isPathInProjectFolder(
      sourceAbsolutePath,
    );
    const isDestinationInProject = await this.isPathInProjectFolder(
      path.dirname(destinationAbsolutePath),
    );

    if (!isSourceInProject) {
      throw new Error(
        `Source path is not within any project folder: ${sourceAbsolutePath}`,
      );
    }
    if (!isDestinationInProject) {
      throw new Error(
        `Destination path is not within any project folder: ${destinationAbsolutePath}`,
      );
    }

    // Check if source exists
    const sourceStats = await fs.stat(sourceAbsolutePath);

    // Check if destination already exists
    try {
      await fs.stat(destinationAbsolutePath);
      throw new Error(`Destination already exists: ${destinationAbsolutePath}`);
    } catch (error) {
      // Expected - destination should not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    // Ensure destination directory exists
    const destinationDir = path.dirname(destinationAbsolutePath);
    await fs.mkdir(destinationDir, { recursive: true });

    // Perform the copy
    if (sourceStats.isDirectory()) {
      await fs.cp(sourceAbsolutePath, destinationAbsolutePath, {
        recursive: true,
        preserveTimestamps: true,
      });
    } else {
      await fs.copyFile(sourceAbsolutePath, destinationAbsolutePath);
    }

    this.logger.info(
      `Successfully copied from ${sourceAbsolutePath} to ${destinationAbsolutePath}`,
    );
  }

  /**
   * Move a file or directory within project folders
   */
  public async moveFile(
    sourceAbsolutePath: string,
    destinationAbsolutePath: string,
    correlationId?: string,
  ): Promise<void> {
    this.logger.info(
      `Moving from ${sourceAbsolutePath} to ${destinationAbsolutePath}`,
    );

    // Validate both paths are absolute
    if (!path.isAbsolute(sourceAbsolutePath)) {
      throw new Error(
        `Source path must be absolute, received: ${sourceAbsolutePath}`,
      );
    }
    if (!path.isAbsolute(destinationAbsolutePath)) {
      throw new Error(
        `Destination path must be absolute, received: ${destinationAbsolutePath}`,
      );
    }

    // Validate both paths are within project folders
    const isSourceInProject = await this.isPathInProjectFolder(
      sourceAbsolutePath,
    );
    const isDestinationInProject = await this.isPathInProjectFolder(
      path.dirname(destinationAbsolutePath),
    );

    if (!isSourceInProject) {
      throw new Error(
        `Source path is not within any project folder: ${sourceAbsolutePath}`,
      );
    }
    if (!isDestinationInProject) {
      throw new Error(
        `Destination path is not within any project folder: ${destinationAbsolutePath}`,
      );
    }

    // Check if source exists
    await fs.stat(sourceAbsolutePath);

    // Check if destination already exists
    try {
      await fs.stat(destinationAbsolutePath);
      throw new Error(`Destination already exists: ${destinationAbsolutePath}`);
    } catch (error) {
      // Expected - destination should not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    // Ensure destination directory exists
    const destinationDir = path.dirname(destinationAbsolutePath);
    await fs.mkdir(destinationDir, { recursive: true });

    // Perform the move
    await fs.rename(sourceAbsolutePath, destinationAbsolutePath);

    this.logger.info(
      `Successfully moved from ${sourceAbsolutePath} to ${destinationAbsolutePath}`,
    );
  }

  /**
   * Rename a file or directory within project folders
   */
  public async renameFile(
    absolutePath: string,
    newName: string,
    correlationId?: string,
  ): Promise<void> {
    this.logger.info(`Renaming ${absolutePath} to ${newName}`);

    // Validate path is absolute
    if (!path.isAbsolute(absolutePath)) {
      throw new Error(`Path must be absolute, received: ${absolutePath}`);
    }

    // Check if the path being renamed is a project folder root
    const settings = await this.userSettingsRepository.getSettings();
    const isProjectFolderRoot = settings.projectFolders.some(
      (folder) => folder.path === absolutePath,
    );

    if (isProjectFolderRoot) {
      throw new Error("Cannot rename project folder. Project folders cannot be renamed.");
    }

    // Validate path is within project folders
    const isInProject = await this.isPathInProjectFolder(absolutePath);
    if (!isInProject) {
      throw new Error(
        `Path is not within any project folder: ${absolutePath}`,
      );
    }

    // Validate new name
    if (!newName.trim()) {
      throw new Error("New name cannot be empty");
    }

    // Check for invalid characters in filename
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
      throw new Error("New name contains invalid characters");
    }

    // Check if source exists
    await fs.stat(absolutePath);

    // Build destination path
    const parentDir = path.dirname(absolutePath);
    const destinationPath = path.join(parentDir, newName);

    // Check if destination already exists
    try {
      await fs.stat(destinationPath);
      throw new Error(`A file or directory named "${newName}" already exists`);
    } catch (error) {
      // Expected - destination should not exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    // Perform the rename
    await fs.rename(absolutePath, destinationPath);

    this.logger.info(`Successfully renamed ${absolutePath} to ${destinationPath}`);
  }

  /**
   * Delete a file or directory within project folders
   */
  public async deleteFile(
    absolutePath: string,
    correlationId?: string,
  ): Promise<void> {
    this.logger.info(`Deleting ${absolutePath}`);

    // Validate path is absolute
    if (!path.isAbsolute(absolutePath)) {
      throw new Error(`Path must be absolute, received: ${absolutePath}`);
    }

    // Validate path is within project folders
    const isInProject = await this.isPathInProjectFolder(absolutePath);
    if (!isInProject) {
      throw new Error(
        `Path is not within any project folder: ${absolutePath}`,
      );
    }

    // Check if source exists
    const stats = await fs.stat(absolutePath);

    // Perform the deletion
    if (stats.isDirectory()) {
      await fs.rm(absolutePath, { recursive: true, force: true });
    } else {
      await fs.unlink(absolutePath);
    }

    this.logger.info(`Successfully deleted ${absolutePath}`);
  }

  /**
   * Duplicate a file or directory within project folders
   */
  public async duplicateFile(
    sourceAbsolutePath: string,
    newName?: string,
    correlationId?: string,
  ): Promise<string> {
    this.logger.info(`Duplicating ${sourceAbsolutePath}`);

    // Validate path is absolute
    if (!path.isAbsolute(sourceAbsolutePath)) {
      throw new Error(
        `Source path must be absolute, received: ${sourceAbsolutePath}`,
      );
    }

    // Validate path is within project folders
    const isInProject = await this.isPathInProjectFolder(sourceAbsolutePath);
    if (!isInProject) {
      throw new Error(
        `Source path is not within any project folder: ${sourceAbsolutePath}`,
      );
    }

    // Check if source exists
    await fs.stat(sourceAbsolutePath);

    // Generate destination path
    const parentDir = path.dirname(sourceAbsolutePath);
    const originalName = path.basename(sourceAbsolutePath);
    const destinationPath = await this.generateUniqueFileName(parentDir, newName || originalName);

    // Use existing copyFile method to perform the duplication
    await this.copyFile(sourceAbsolutePath, destinationPath, correlationId);

    this.logger.info(`Successfully duplicated ${sourceAbsolutePath} to ${destinationPath}`);
    return destinationPath;
  }

  /**
   * Generate a unique filename in the given directory
   */
  private async generateUniqueFileName(
    parentDir: string,
    baseName: string,
  ): Promise<string> {
    const ext = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, ext);
    
    let counter = 1;
    let candidatePath = path.join(parentDir, baseName);

    // Check if the original name is available
    try {
      await fs.stat(candidatePath);
      // If we get here, file exists, so we need to generate a new name
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist, original name is available
        return candidatePath;
      }
      throw error;
    }

    // Generate numbered variants until we find an available name
    while (true) {
      const newName = ext 
        ? `${nameWithoutExt} (${counter})${ext}`
        : `${nameWithoutExt} (${counter})`;
      candidatePath = path.join(parentDir, newName);

      try {
        await fs.stat(candidatePath);
        counter++;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // Found an available name
          return candidatePath;
        }
        throw error;
      }
    }
  }
}

export function createProjectFolderService(
  eventBus: IEventBus,
  userSettingsRepository: UserSettingsRepository,
  fileWatcherService: FileWatcherService,
): ProjectFolderService {
  return new ProjectFolderService(
    eventBus,
    userSettingsRepository,
    fileWatcherService,
  );
}
