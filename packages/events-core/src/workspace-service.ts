import path from "node:path";
import fs from "node:fs/promises";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "./event-bus.js";
import { UserSettingsRepository } from "./user-settings-repository.js";
import {
  ClientRequestWorkspaceFolderTreeEvent,
  ServerWorkspaceFolderTreeResponsedEvent,
  FolderTreeNode,
  BaseClientEvent,
  BaseServerEvent,
  BaseEvent,
} from "./event-types.js";

// Define workspace update command type
export type WorkspaceUpdateCommand = {
  command: "addWorkspace" | "removeWorkspace";
  workspacePath: string;
};

// Event for client workspace updates
export interface ClientUpdateWorkspaceEvent extends BaseEvent {
  kind: "ClientUpdateWorkspace";
  update: WorkspaceUpdateCommand;
}

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

/**
 * Service for managing workspaces
 */
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

    // Subscribe to workspace-related events
    this.eventBus.subscribe<ClientRequestWorkspaceFolderTreeEvent>(
      "ClientRequestWorkspaceFolderTree",
      this.handleWorkspaceTreeRequest.bind(this)
    );

    this.eventBus.subscribe<ClientUpdateWorkspaceEvent>(
      "ClientUpdateWorkspace",
      this.handleWorkspaceUpdate.bind(this)
    );

    this.eventBus.subscribe<ClientRequestStartWatchingAllWorkspacesEvent>(
      "ClientRequestStartWatchingAllWorkspaces",
      this.handleStartWatchingAllWorkspaces.bind(this)
    );
  }

  /**
   * Handle client workspace update requests
   */
  private async handleWorkspaceUpdate(
    event: ClientUpdateWorkspaceEvent
  ): Promise<void> {
    const { command, workspacePath } = event.update;

    if (command === "addWorkspace") {
      await this.addWorkspace(workspacePath, event.correlationId);
    } else if (command === "removeWorkspace") {
      await this.removeWorkspace(workspacePath, event.correlationId);
    }
  }

  /**
   * Add a workspace
   */
  public async addWorkspace(
    workspacePath: string,
    correlationId?: string
  ): Promise<void> {
    this.logger.info(`Adding workspace: ${workspacePath}`);

    // Validate if workspace path exists and is a directory
    const isValid = await this.validateWorkspacePath(workspacePath);

    // Emit validation event
    await this.eventBus.emit<ServerWorkspaceValidatedEvent>({
      kind: "ServerWorkspaceValidated",
      timestamp: new Date(),
      correlationId,
      workspacePath,
      isValid,
      validationMessage: isValid
        ? undefined
        : `Invalid workspace path: ${workspacePath}`,
    });

    if (!isValid) {
      return;
    }

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if workspace already exists
    if (settings.workspaces.includes(workspacePath)) {
      this.logger.warn(`Workspace already exists: ${workspacePath}`);
      return;
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

    this.logger.info(`Workspace added successfully: ${workspacePath}`);
  }

  /**
   * Remove a workspace
   */
  public async removeWorkspace(
    workspacePath: string,
    correlationId?: string
  ): Promise<void> {
    this.logger.info(`Removing workspace: ${workspacePath}`);

    // Get current settings
    const settings = await this.userSettingsRepository.getSettings();

    // Check if workspace exists
    if (!settings.workspaces.includes(workspacePath)) {
      this.logger.warn(`Workspace does not exist: ${workspacePath}`);
      return;
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

    this.logger.info(`Workspace removed successfully: ${workspacePath}`);
  }

  /**
   * Start watching all workspaces
   */
  public async startWatchingAllWorkspaces(
    correlationId?: string
  ): Promise<void> {
    this.logger.info("Starting to watch all workspaces");

    // Get all workspace paths from settings
    const settings = await this.userSettingsRepository.getSettings();
    const workspacePaths = settings.workspaces;

    if (workspacePaths.length === 0) {
      this.logger.info("No workspaces found to watch");
      return;
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
  }

  /**
   * Handle client request to start watching all workspaces
   */
  private async handleStartWatchingAllWorkspaces(
    event: ClientRequestStartWatchingAllWorkspacesEvent
  ): Promise<void> {
    await this.startWatchingAllWorkspaces(event.correlationId);
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
   * Handle requests for workspace folder tree
   */
  private async handleWorkspaceTreeRequest(
    event: ClientRequestWorkspaceFolderTreeEvent
  ): Promise<void> {
    const requestedPath = event.workspacePath || "";

    this.logger.info(`Processing workspace tree request for: ${requestedPath}`);

    try {
      // Get settings to verify workspaces
      const settings = await this.userSettingsRepository.getSettings();

      if (settings.workspaces.length === 0) {
        throw new Error("No workspaces configured");
      }

      // Determine which workspace to use and the relative path
      let fullPath: string;
      let workspacePath: string;

      if (!requestedPath) {
        // If no path specified, use the first workspace
        if (settings.workspaces.length === 0) {
          throw new Error("No workspaces configured");
        }
        workspacePath = settings.workspaces[0]!;
        fullPath = workspacePath;
      } else {
        // Find matching workspace
        const matchingWorkspace = settings.workspaces.find(
          (workspace) =>
            requestedPath === workspace ||
            requestedPath.startsWith(workspace + path.sep)
        );

        if (!matchingWorkspace) {
          throw new Error(
            `Path ${requestedPath} is not within any registered workspace`
          );
        }

        workspacePath = matchingWorkspace;
        fullPath = requestedPath;
      }

      // Build the folder tree
      const folderTree = await this.buildFolderTree(workspacePath, fullPath);

      await this.eventBus.emit<ServerWorkspaceFolderTreeResponsedEvent>({
        kind: "ServerWorkspaceFolderTreeResponsed",
        timestamp: new Date(),
        correlationId: event.correlationId,
        workspacePath: requestedPath,
        folderTree,
      });
    } catch (error) {
      this.logger.error(`Error building workspace tree: ${error}`);
      await this.eventBus.emit<ServerWorkspaceFolderTreeResponsedEvent>({
        kind: "ServerWorkspaceFolderTreeResponsed",
        timestamp: new Date(),
        correlationId: event.correlationId,
        workspacePath: requestedPath,
        folderTree: null,
        error: error instanceof Error ? error.message : String(error),
      });
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
        path: relativePath,
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

/**
 * Factory function to create a workspace service
 */
export function createWorkspaceService(
  eventBus: IEventBus,
  userSettingsRepository: UserSettingsRepository
): WorkspaceService {
  return new WorkspaceService(eventBus, userSettingsRepository);
}
