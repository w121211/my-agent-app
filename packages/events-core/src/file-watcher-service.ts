import path from "node:path";
import chokidar, { FSWatcher, ChokidarOptions } from "chokidar";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "./event-bus.js";
import {
  ChokidarFsEventData,
  ChokidarFsEventKind,
  ServerFileWatcherEvent,
  BaseServerEvent,
  BaseEvent,
} from "./event-types.js";
import { ServerRequestUpdateWatchingFolderEvent } from "./workspace-service.js";

/**
 * Watches for file system changes and emits events
 */
export class FileWatcherService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chokidarOptions: ChokidarOptions;
  private watchers: Map<string, FSWatcher> = new Map();

  /**
   * Default chokidar options for file watching
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

  constructor(eventBus: IEventBus, chokidarOptions: ChokidarOptions = {}) {
    this.logger = new Logger({ name: "FileWatcherService" });
    this.eventBus = eventBus;

    // Merge the provided options with defaults
    this.chokidarOptions = {
      ...FileWatcherService.DEFAULT_OPTIONS,
      ...chokidarOptions,
    };

    // Subscribe to watch folder update requests
    this.eventBus.subscribe<ServerRequestUpdateWatchingFolderEvent>(
      "ServerRequestUpdateWatchingFolder",
      this.handleUpdateWatchingFolder.bind(this)
    );
  }

  /**
   * Handle requests to update watched folders
   */
  private async handleUpdateWatchingFolder(
    event: ServerRequestUpdateWatchingFolderEvent
  ): Promise<void> {
    const { workspacePath, action } = event;

    if (action === "add") {
      await this.startWatchingFolder(workspacePath);
    } else if (action === "remove") {
      await this.stopWatchingFolder(workspacePath);
    }
  }

  /**
   * Start watching a specific folder for file changes
   */
  public async startWatchingFolder(folderPath: string): Promise<void> {
    if (this.watchers.has(folderPath)) {
      this.logger.warn(`Already watching folder: ${folderPath}`);
      return;
    }

    this.logger.info(`Starting file watcher on ${folderPath}`);

    const watcher = chokidar.watch(folderPath, this.chokidarOptions);

    // Set up event handlers
    watcher
      .on("add", (filePath) =>
        this.handleFsEvent("add", filePath, folderPath, false)
      )
      .on("change", (filePath) =>
        this.handleFsEvent("change", filePath, folderPath, false)
      )
      .on("unlink", (filePath) =>
        this.handleFsEvent("unlink", filePath, folderPath, false)
      )
      .on("addDir", (dirPath) =>
        this.handleFsEvent("addDir", dirPath, folderPath, true)
      )
      .on("unlinkDir", (dirPath) =>
        this.handleFsEvent("unlinkDir", dirPath, folderPath, true)
      )
      .on("error", (error) => {
        this.logger.error(`File watcher error in ${folderPath}: ${error}`);
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        this.handleFsEvent("error", "", folderPath, false, errorObj);
      })
      .on("ready", () => {
        this.logger.info(`Initial file scan complete for ${folderPath}`);
        this.handleFsEvent("ready", "", folderPath, false);
      });

    this.watchers.set(folderPath, watcher);
  }

  /**
   * Stop watching a specific folder
   */
  public async stopWatchingFolder(folderPath: string): Promise<void> {
    const watcher = this.watchers.get(folderPath);

    if (!watcher) {
      this.logger.warn(`Not currently watching folder: ${folderPath}`);
      return;
    }

    this.logger.info(`Stopping file watcher on ${folderPath}`);

    await watcher.close();
    this.watchers.delete(folderPath);
  }

  /**
   * Handle file system events and emit to the event bus
   */
  private handleFsEvent(
    fsEventKind: ChokidarFsEventKind,
    filePath: string,
    basePath: string,
    isDirectory: boolean,
    error?: Error
  ): void {
    const relativePath = filePath ? path.relative(basePath, filePath) : "";

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
   * Stop all file watchers
   */
  public async stopAllWatchers(): Promise<void> {
    this.logger.info("Stopping all file watchers");

    const closePromises = Array.from(this.watchers.entries()).map(
      async ([path, watcher]) => {
        try {
          await watcher.close();
          this.logger.debug(`Stopped watching: ${path}`);
        } catch (error) {
          this.logger.error(`Error stopping watcher for ${path}: ${error}`);
        }
      }
    );

    await Promise.all(closePromises);
    this.watchers.clear();
  }

  /**
   * Check if a folder is being watched
   */
  public isWatchingFolder(folderPath: string): boolean {
    return this.watchers.has(folderPath);
  }

  /**
   * Get the number of watched folders
   */
  public getWatchedFolderCount(): number {
    return this.watchers.size;
  }

  /**
   * Get a list of all watched folders
   */
  public getWatchedFolders(): string[] {
    return Array.from(this.watchers.keys());
  }
}

/**
 * Factory function to create a file watcher service
 */
export function createFileWatcherService(
  eventBus: IEventBus,
  options: ChokidarOptions = {}
): FileWatcherService {
  const logger = new Logger({ name: "FileWatcherServiceFactory" });
  logger.info("Creating file watcher service");

  return new FileWatcherService(eventBus, options);
}
