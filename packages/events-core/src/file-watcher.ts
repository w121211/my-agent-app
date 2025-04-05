import path from "node:path";
import chokidar, { FSWatcher, ChokidarOptions } from "chokidar";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "./event-bus.js";
import {
  ServerFileWatcherEvent,
  ChokidarFsEventData,
  ChokidarFsEventKind,
} from "./event-types.js";

/**
 * Watches for file system changes in the workspace and emits events
 */
export class FileWatcher {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly workspacePath: string;
  private readonly chokidarOptions: ChokidarOptions;
  private watcher: FSWatcher | null = null;
  private isWatching = false;

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

  constructor(
    eventBus: IEventBus,
    workspacePath: string,
    chokidarOptions: ChokidarOptions = {}
  ) {
    this.logger = new Logger({ name: "FileWatcher" });
    this.eventBus = eventBus;
    this.workspacePath = workspacePath;

    // Merge the provided options with defaults
    this.chokidarOptions = {
      ...FileWatcher.DEFAULT_OPTIONS,
      ...chokidarOptions,
    };
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
        // Handle the unknown error by converting it to an Error object if needed
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
    // Make the path relative to workspace for consistency
    const relativePath = filePath
      ? path.relative(this.workspacePath, filePath)
      : "";

    // Create file system event data
    const fsEventData: ChokidarFsEventData = {
      fsEventKind,
      srcPath: relativePath,
      isDirectory,
      error,
    };

    this.logger.debug(
      `Chokidar fs event: ${fsEventKind} - ${relativePath} (${isDirectory ? "directory" : "file"})`
    );

    // Emit event through the event bus
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
   * Check if the watcher is currently active
   */
  public isActive(): boolean {
    return this.isWatching;
  }
}

/**
 * Factory function to create a file watcher with sensible defaults
 */
export function createFileWatcher(
  eventBus: IEventBus,
  workspacePath: string,
  options: ChokidarOptions = {}
): FileWatcher {
  const logger = new Logger({ name: "FileWatcherFactory" });
  logger.info(`Creating file watcher for workspace: ${workspacePath}`);

  // Create watcher with default options
  const watcher = new FileWatcher(eventBus, workspacePath, options);

  // Start watching immediately
  watcher.startWatching();

  return watcher;
}
