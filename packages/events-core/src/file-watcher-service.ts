import path from "node:path";
import fs from "node:fs/promises";
import chokidar, { FSWatcher, ChokidarOptions } from "chokidar";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "./event-bus.js";
import {
  ChokidarFsEventData,
  ChokidarFsEventKind,
  ClientRequestWorkspaceFolderTreeEvent,
  FolderTreeNode,
  ServerFileWatcherEvent,
  ServerWorkspaceFolderTreeResponsedEvent,
} from "./event-types.js";

/**
 * Watches for file system changes in the workspace and emits events
 */
export class FileWatcherService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly workspacePath: string;
  private readonly chokidarOptions: ChokidarOptions;
  private watcher: FSWatcher | null = null;
  private isWatching = false;

  /**
   * Default chokidar options for file watching
   * NOTE: Ignoring logic here is still active via chokidar options,
   * but the separate isPathIgnored function used during tree
   * building has been removed.
   */
  private static readonly DEFAULT_OPTIONS: ChokidarOptions = {
    persistent: true,
    ignored: [
      /(^|[\/\\])\../, // Ignore dot files/folders
      "**/*.tmp", // Ignore temp files
      "**/*.log", // Ignore log files
      "**/node_modules/**", // Ignore node_modules
    ],
    ignoreInitial: false, // Report existing files on startup
    awaitWriteFinish: true, // Wait for writes to complete
  };

  constructor(
    eventBus: IEventBus,
    workspacePath: string,
    chokidarOptions: ChokidarOptions = {}
  ) {
    this.logger = new Logger({ name: "FileWatcherService" });
    this.eventBus = eventBus;
    this.workspacePath = workspacePath;

    // Merge the provided options with defaults
    this.chokidarOptions = {
      ...FileWatcherService.DEFAULT_OPTIONS,
      ...chokidarOptions,
    };

    // Subscribe to workspace folder tree requests
    this.eventBus.subscribe<ClientRequestWorkspaceFolderTreeEvent>(
      "ClientRequestWorkspaceFolderTree",
      this.handleWorkspaceTreeRequest.bind(this)
    );
  }

  /**
   * Start watching the workspace for file changes
   */
  public startWatching(): void {
    if (this.isWatching) {
      this.logger.warn("File watcher is already running");
      return;
    }

    this.logger.info(`Starting file watcher on ${this.workspacePath}`);

    this.watcher = chokidar.watch(this.workspacePath, this.chokidarOptions);

    // Set up event handlers
    this.watcher
      .on("add", (filePath) => this.handleFsEvent("add", filePath, false))
      .on("change", (filePath) => this.handleFsEvent("change", filePath, false))
      .on("unlink", (filePath) => this.handleFsEvent("unlink", filePath, false))
      .on("addDir", (dirPath) => this.handleFsEvent("addDir", dirPath, true))
      .on("unlinkDir", (dirPath) =>
        this.handleFsEvent("unlinkDir", dirPath, true)
      )
      .on("error", (error) => {
        this.logger.error(`File watcher error: ${error}`);
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        this.handleFsEvent("error", "", false, errorObj);
      })
      .on("ready", () => {
        this.logger.info("Initial file scan complete");
        this.handleFsEvent("ready", "", false);
      });

    this.isWatching = true;
  }

  /**
   * Stop watching for file changes
   */
  public async stopWatching(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    this.logger.info("Stopping file watcher");
    await this.watcher.close();
    this.watcher = null;
    this.isWatching = false;
  }

  /**
   * Handle file system events and emit to the event bus
   */
  private handleFsEvent(
    fsEventKind: ChokidarFsEventKind,
    filePath: string,
    isDirectory: boolean,
    error?: Error
  ): void {
    const relativePath = filePath
      ? path.relative(this.workspacePath, filePath)
      : "";

    const fsEventData: ChokidarFsEventData = {
      fsEventKind,
      srcPath: relativePath,
      isDirectory,
      error,
    };

    this.logger.debug(
      `Chokidar fs event: ${fsEventKind} - ${relativePath} (${isDirectory ? "directory" : "file"})`
    );

    this.eventBus
      .emit<ServerFileWatcherEvent>({
        kind: "ServerFileWatcherEvent",
        timestamp: new Date(),
        data: fsEventData,
      })
      .catch((emitError) => {
        this.logger.error(`Error emitting file system event: ${emitError}`);
      });
  }

  /**
   * Handle requests for workspace folder tree
   */
  private async handleWorkspaceTreeRequest(
    event: ClientRequestWorkspaceFolderTreeEvent
  ): Promise<void> {
    const targetPath = event.workspacePath
      ? path.join(this.workspacePath, event.workspacePath)
      : this.workspacePath;

    this.logger.info(`Processing workspace tree request for: ${targetPath}`);

    try {
      // *** No ignore logic is applied during tree building anymore ***
      const folderTree = await this.buildFolderTree(targetPath);

      await this.eventBus.emit<ServerWorkspaceFolderTreeResponsedEvent>({
        kind: "ServerWorkspaceFolderTreeResponsed",
        timestamp: new Date(),
        correlationId: event.correlationId,
        workspacePath: event.workspacePath || "",
        folderTree,
      });
    } catch (error) {
      this.logger.error(`Error building workspace tree: ${error}`);
      await this.eventBus.emit<ServerWorkspaceFolderTreeResponsedEvent>({
        kind: "ServerWorkspaceFolderTreeResponsed",
        timestamp: new Date(),
        correlationId: event.correlationId,
        workspacePath: event.workspacePath || "",
        folderTree: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Recursively build a folder tree structure starting at rootPath.
   * Uses fs.promises.readdir with withFileTypes for potential optimization.
   * Does NOT apply any ignore logic.
   */
  private async buildFolderTree(rootPath: string): Promise<FolderTreeNode> {
    const baseName = path.basename(rootPath);
    const relativePath = path.relative(this.workspacePath, rootPath);

    const stats = await fs.stat(rootPath); // Check current path type

    if (!stats.isDirectory()) {
      // It's a file, return file node
      return {
        name: baseName,
        path: relativePath,
        isDirectory: false,
      };
    }

    // It's a directory, process its children
    // Use withFileTypes: true to get fs.Dirent objects
    const dirEntries = await fs.readdir(rootPath, { withFileTypes: true });
    const children: FolderTreeNode[] = [];

    for (const dirent of dirEntries) {
      // Iterate over fs.Dirent objects
      const fullPath = path.join(rootPath, dirent.name);
      try {
        // Recursively build the tree for the child path
        // The recursive call will handle its own stat check
        const childNode = await this.buildFolderTree(fullPath);
        children.push(childNode);
      } catch (error) {
        // Log and skip entries that can't be accessed (e.g., permission errors)
        // Check if error is an instance of Error for better logging
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.debug(
          `Skipping inaccessible path: ${fullPath}. Error: ${errorMessage}`
        );

        // Option to still add the file to the tree with error info, or simply throw the error
        // In this case, we're re-throwing to skip this file completely
        throw error;
      }
    }

    // Return directory node
    return {
      name: baseName,
      path: relativePath || "/", // Use "/" for root directory's relative path
      isDirectory: true,
      children,
    };
  }

  /**
   * Check if the watcher is currently active
   */
  public isActive(): boolean {
    return this.isWatching;
  }
}

/**
 * Factory function to create a file watcher with sensible defaults
 */
export function createFileWatcherService(
  eventBus: IEventBus,
  workspacePath: string,
  options: ChokidarOptions = {}
): FileWatcherService {
  const logger = new Logger({ name: "FileWatcherServiceFactory" });
  logger.info(`Creating file watcher for workspace: ${workspacePath}`);

  // Create watcher with specified or default options
  const watcher = new FileWatcherService(eventBus, workspacePath, options);

  // Start watching immediately
  watcher.startWatching();

  return watcher;
}
