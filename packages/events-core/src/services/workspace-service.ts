// File path: packages/events-core/src/services/workspace-service.ts

import path from "node:path";
import fs from "node:fs/promises";
import { Logger, ILogObj } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type { FolderTreeNode, BaseEvent } from "../event-types.js";
import type { UserSettingsRepository } from "./user-settings-repository.js";
import type { ServerUserSettingsUpdatedEvent } from "./user-settings-service.js";

// Event for workspace validation results
export interface ServerWorkspaceValidatedEvent extends BaseEvent {
  kind: "ServerWorkspaceValidated";
  workspacePath: string;
  isValid: boolean;
  validationMessage?: string;
}

// Event to request file watcher update
export interface ServerRequestUpdateWatchingFolderEvent extends BaseEvent {
  kind: "ServerRequestUpdateWatchingFolder";
  workspacePath: string;
  action: "add" | "remove";
}

// Event to request watching all workspaces
export interface ClientRequestStartWatchingAllWorkspacesEvent
  extends BaseEvent {
  kind: "ClientRequestStartWatchingAllWorkspaces";
}

export class WorkspaceService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly userSettingsRepository: UserSettingsRepository;

  constructor(
    eventBus: IEventBus,
    userSettingsRepository: UserSettingsRepository
  ) {
    this.logger = new Logger({ name: "WorkspaceService" });
    this.eventBus = eventBus;
    this.userSettingsRepository = userSettingsRepository;
  }

  /**
   * Get folder tree for a workspace path
   */
  public async getFolderTree(
    workspacePath?: string,
    correlationId?: string
  ): Promise<{ folderTree: FolderTreeNode | null; error?: string }> {
    this.logger.info(
      `Processing workspace tree request for: ${workspacePath || ""}`
    );

    try {
      // Get settings to verify workspaces
      const settings = await this.userSettingsRepository.getSettings();

      if (settings.workspaces.length === 0) {
        throw new Error("No workspaces configured");
      }

      // Determine which workspace to use and the relative path
      let fullPath: string;
      let selectedWorkspacePath: string;

      if (!workspacePath) {
        // If no path specified, use the first workspace
        if (settings.workspaces.length === 0) {
          throw new Error("No workspaces configured");
        }
        selectedWorkspacePath = settings.workspaces[0]!;
        fullPath = selectedWorkspacePath;
      } else {
        // Find matching workspace
        const matchingWorkspace = settings.workspaces.find(
          (workspace) =>
            workspacePath === workspace ||
            workspacePath.startsWith(workspace + path.sep)
        );

        if (!matchingWorkspace) {
          throw new Error(
            `Path ${workspacePath} is not within any registered workspace`
          );
        }

        selectedWorkspacePath = matchingWorkspace;
        fullPath = workspacePath;
      }

      // Build the folder tree
      const folderTree = await this.buildFolderTree(
        selectedWorkspacePath,
        fullPath
      );
      return { folderTree };
    } catch (error) {
      this.logger.error(`Error building workspace tree: ${error}`);
      return {
        folderTree: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a workspace
   */
  public async addWorkspace(
    workspacePath: string,
    correlationId?: string
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.info(`Adding workspace: ${workspacePath}`);

    // Validate if workspace path exists and is a directory
    const isValid = await this.validateWorkspacePath(workspacePath);

    if (!isValid) {
      return {
        success: false,
        message: `Invalid workspace path: ${workspacePath}`,
      };
    }

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if workspace already exists
    if (settings.workspaces.includes(workspacePath)) {
      this.logger.warn(`Workspace already exists: ${workspacePath}`);
      return {
        success: true,
        message: `Workspace already exists: ${workspacePath}`,
      };
    }

    // Add workspace path to settings
    settings.workspaces.push(workspacePath);

    // Save updated settings
    await this.userSettingsRepository.saveSettings(settings);

    // Request file watcher to start watching the workspace
    await this.eventBus.emit<ServerRequestUpdateWatchingFolderEvent>({
      kind: "ServerRequestUpdateWatchingFolder",
      timestamp: new Date(),
      correlationId,
      workspacePath,
      action: "add",
    });

    // Emit settings updated event
    await this.eventBus.emit<ServerUserSettingsUpdatedEvent>({
      kind: "ServerUserSettingsUpdated",
      timestamp: new Date(),
      correlationId,
      settings,
      changeType: "WORKSPACE_ADDED",
    });

    this.logger.info(`Workspace added successfully: ${workspacePath}`);
    this.logger.debug(
      `Workspace added: ${workspacePath}, current workspaces: ${settings.workspaces.join(", ")}`
    );
    return { success: true };
  }

  /**
   * Remove a workspace
   */
  public async removeWorkspace(
    workspacePath: string,
    correlationId?: string
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.info(`Removing workspace: ${workspacePath}`);

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if workspace exists
    if (!settings.workspaces.includes(workspacePath)) {
      this.logger.warn(`Workspace does not exist: ${workspacePath}`);
      return {
        success: false,
        message: `Workspace does not exist: ${workspacePath}`,
      };
    }

    // Remove workspace path from settings
    settings.workspaces = settings.workspaces.filter(
      (path) => path !== workspacePath
    );

    // Save updated settings
    await this.userSettingsRepository.saveSettings(settings);

    // Request file watcher to stop watching the workspace
    await this.eventBus.emit<ServerRequestUpdateWatchingFolderEvent>({
      kind: "ServerRequestUpdateWatchingFolder",
      timestamp: new Date(),
      correlationId,
      workspacePath,
      action: "remove",
    });

    // Emit settings updated event
    await this.eventBus.emit<ServerUserSettingsUpdatedEvent>({
      kind: "ServerUserSettingsUpdated",
      timestamp: new Date(),
      correlationId,
      settings,
      changeType: "WORKSPACE_REMOVED",
    });

    this.logger.info(`Workspace removed successfully: ${workspacePath}`);
    return { success: true };
  }

  /**
   * Start watching all workspaces
   */
  public async startWatchingAllWorkspaces(
    correlationId?: string
  ): Promise<{ success: boolean; count: number }> {
    this.logger.info("Starting to watch all workspaces");

    // Get all workspace paths from settings
    const settings = await this.userSettingsRepository.getSettings();
    const workspacePaths = settings.workspaces;

    if (workspacePaths.length === 0) {
      this.logger.info("No workspaces found to watch");
      return { success: true, count: 0 };
    }

    // Request watching for each workspace
    for (const workspacePath of workspacePaths) {
      await this.eventBus.emit<ServerRequestUpdateWatchingFolderEvent>({
        kind: "ServerRequestUpdateWatchingFolder",
        timestamp: new Date(),
        correlationId,
        workspacePath,
        action: "add",
      });
    }

    this.logger.info(`Started watching ${workspacePaths.length} workspaces`);
    return { success: true, count: workspacePaths.length };
  }

  /**
   * Validate workspace path
   */
  private async validateWorkspacePath(workspacePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(workspacePath);
      return stats.isDirectory();
    } catch (error) {
      this.logger.error(`Error validating workspace path: ${error}`);
      return false;
    }
  }

  /**
   * Recursively build a folder tree structure
   */
  private async buildFolderTree(
    workspacePath: string,
    targetPath: string
  ): Promise<FolderTreeNode> {
    const baseName = path.basename(targetPath);
    const relativePath = path.relative(workspacePath, targetPath);

    const stats = await fs.stat(targetPath);

    if (!stats.isDirectory()) {
      // It's a file, return file node
      return {
        name: baseName,
        path: relativePath || baseName,
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
        const childNode = await this.buildFolderTree(workspacePath, fullPath);
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
      path: relativePath || "/",
      isDirectory: true,
      children,
    };
  }
}
