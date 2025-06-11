// packages/events-core/src/services/file-watcher-service.ts
import path from "node:path";
import chokidar, { FSWatcher, ChokidarOptions } from "chokidar";
import { Logger, ILogObj } from "tslog";
import type { IEventBus, BaseEvent } from "../event-bus.js";

// Define the FileWatcherEvent
export type FileEventType =
  | "add"
  | "addDir"
  | "change"
  | "unlink"
  | "unlinkDir"
  | "ready"
  | "error";

export interface FileWatcherEvent extends BaseEvent {
  kind: "FileWatcherEvent";
  eventType: FileEventType;
  absoluteFilePath: string;
  isDirectory: boolean;
  error?: Error;
}

export class FileWatcherService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chokidarOptions: ChokidarOptions;
  private watchers: Map<string, FSWatcher> = new Map();

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
  }

  public async startWatchingFolder(absoluteFolderPath: string): Promise<void> {
    if (!path.isAbsolute(absoluteFolderPath)) {
      throw new Error(
        `Folder path must be absolute, got: ${absoluteFolderPath}`
      );
    }

    if (this.watchers.has(absoluteFolderPath)) {
      this.logger.warn(`Already watching folder: ${absoluteFolderPath}`);
      return;
    }

    this.logger.info(`Starting file watcher on ${absoluteFolderPath}`);

    const watcher = chokidar.watch(absoluteFolderPath, this.chokidarOptions);

    // Set up event handlers
    watcher
      .on("add", (filePath) =>
        this.handleFsEvent("add", filePath, absoluteFolderPath, false)
      )
      .on("change", (filePath) =>
        this.handleFsEvent("change", filePath, absoluteFolderPath, false)
      )
      .on("unlink", (filePath) =>
        this.handleFsEvent("unlink", filePath, absoluteFolderPath, false)
      )
      .on("addDir", (dirPath) =>
        this.handleFsEvent("addDir", dirPath, absoluteFolderPath, true)
      )
      .on("unlinkDir", (dirPath) =>
        this.handleFsEvent("unlinkDir", dirPath, absoluteFolderPath, true)
      )
      .on("error", (error) => {
        this.logger.error(
          `File watcher error in ${absoluteFolderPath}: ${error}`
        );
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        // For error events, use the folder path as the absoluteFilePath
        this.handleFsEvent(
          "error",
          absoluteFolderPath,
          absoluteFolderPath,
          true,
          errorObj
        );
      })
      .on("ready", () => {
        this.logger.info(
          `Initial file scan complete for ${absoluteFolderPath}`
        );
        // For ready events, use the folder path as the absoluteFilePath
        this.handleFsEvent(
          "ready",
          absoluteFolderPath,
          absoluteFolderPath,
          true
        );
      });

    this.watchers.set(absoluteFolderPath, watcher);
  }

  public async stopWatchingFolder(absoluteFolderPath: string): Promise<void> {
    const watcher = this.watchers.get(absoluteFolderPath);

    if (!watcher) {
      this.logger.warn(`Not currently watching folder: ${absoluteFolderPath}`);
      return;
    }

    this.logger.info(`Stopping file watcher on ${absoluteFolderPath}`);

    await watcher.close();
    this.watchers.delete(absoluteFolderPath);
  }

  private handleFsEvent(
    eventType: FileEventType,
    filePath: string, // Should be absolute since we pass absolute path to chokidar
    absoluteBasePath: string,
    isDirectory: boolean,
    error?: Error
  ): void {
    // chokidar should return absolute paths when watching absolute paths
    if (!path.isAbsolute(filePath)) {
      throw new Error(
        `Expected absolute path from chokidar, got relative path: ${filePath}. ` +
          `This indicates a problem with file watcher configuration or chokidar behavior.`
      );
    }

    this.logger.debug(
      `Chokidar fs event: ${eventType} - ${filePath} (${isDirectory ? "directory" : "file"})`
    );

    this.eventBus
      .emit<FileWatcherEvent>({
        kind: "FileWatcherEvent",
        timestamp: new Date(),
        eventType,
        absoluteFilePath: filePath, // Now we know it's absolute
        isDirectory,
        error,
      })
      .catch((emitError) => {
        this.logger.error(`Error emitting file system event: ${emitError}`);
      });
  }

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

  public isWatchingFolder(absoluteFolderPath: string): boolean {
    return this.watchers.has(absoluteFolderPath);
  }

  public getWatchedFolderCount(): number {
    return this.watchers.size;
  }

  public getWatchedFolders(): string[] {
    return Array.from(this.watchers.keys());
  }
}
