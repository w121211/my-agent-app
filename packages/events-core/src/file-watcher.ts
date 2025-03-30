import path from "node:path";
import chokidar, { FSWatcher, ChokidarOptions } from "chokidar";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "./event-bus.js";
import {
  ServerEventType,
  ServerFileSystem,
  FileSystemEventData,
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
   * These defaults will be used unless overridden by user-provided options
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

    // Use the already merged options
    this.watcher = chokidar.watch(this.workspacePath, this.chokidarOptions);

    // Set up event handlers
    this.watcher
      .on("add", (filePath) => this.handleFileEvent("add", filePath, false))
      .on("change", (filePath) =>
        this.handleFileEvent("change", filePath, false)
      )
      .on("unlink", (filePath) =>
        this.handleFileEvent("unlink", filePath, false)
      )
      .on("addDir", (dirPath) => this.handleFileEvent("addDir", dirPath, true))
      .on("unlinkDir", (dirPath) =>
        this.handleFileEvent("unlinkDir", dirPath, true)
      )
      .on("error", (error) => this.logger.error(`File watcher error: ${error}`))
      .on("ready", () => this.logger.info("Initial file scan complete"));

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
  private handleFileEvent(
    eventType: string,
    filePath: string,
    isDirectory: boolean
  ): void {
    // Make the path relative to workspace for consistency
    const relativePath = path.relative(this.workspacePath, filePath);

    // Create file system event data
    const fileSystemEventData: FileSystemEventData = {
      eventType,
      srcPath: relativePath,
      isDirectory,
    };

    this.logger.debug(
      `File event: ${eventType} - ${relativePath} (${isDirectory ? "directory" : "file"})`
    );

    // Emit event through the event bus
    this.eventBus
      .emit<ServerFileSystem>({
        eventType: "SERVER_FILE_SYSTEM",
        timestamp: new Date(),
        data: fileSystemEventData,
      })
      .catch((error) => {
        this.logger.error(`Error emitting file system event: ${error}`);
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

  // Create watcher with default options (already defined in FileWatcher)
  const watcher = new FileWatcher(eventBus, workspacePath, options);

  // Start watching immediately
  watcher.startWatching();

  return watcher;
}
