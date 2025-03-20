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

  constructor(
    eventBus: IEventBus,
    workspacePath: string,
    chokidarOptions: ChokidarOptions = {}
  ) {
    this.logger = new Logger({ name: "FileWatcher" });
    this.eventBus = eventBus;
    this.workspacePath = workspacePath;
    this.chokidarOptions = chokidarOptions;
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

    // Set default options if not provided
    const options: ChokidarOptions = {
      persistent: true,
      ignored: [
        /(^|[\/\\])\../, // Ignore dot files
        "**/*.tmp", // Ignore temp files
        "node_modules/**", // Ignore node_modules
      ],
      ...this.chokidarOptions,
    };

    this.watcher = chokidar.watch(this.workspacePath, options);

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
   * Reconfigure the file watcher with new options
   */
  public async reconfigureWatcher(
    newPath?: string,
    newOptions?: ChokidarOptions
  ): Promise<void> {
    this.logger.info("Reconfiguring file watcher");

    // Stop current watcher
    await this.stopWatching();

    // Update the workspacePath if provided
    if (newPath) {
      (this as any).workspacePath = newPath;
    }

    // Update watch options if provided
    if (newOptions) {
      Object.assign(this.chokidarOptions, newOptions);
    }

    // Restart with new configuration
    this.startWatching();
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
        eventType: ServerEventType.SERVER_FILE_SYSTEM,
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

  // Set up default watch options
  const chokidarOptions: ChokidarOptions = {
    // Default ignored patterns
    ignored: [
      /(^|[\/\\])\../, // Ignore dot files/folders
      "**/*.tmp", // Ignore temp files
      "**/*.log", // Ignore log files
      "**/node_modules/**", // Ignore node_modules
    ],
    // Default behavior settings
    ignoreInitial: false, // Report existing files on startup
    awaitWriteFinish: true, // Wait for writes to complete
    persistent: true, // Keep watching until explicitly stopped

    // Override with user-provided options
    ...options,
  };

  const watcher = new FileWatcher(eventBus, workspacePath, chokidarOptions);

  return watcher;
}
