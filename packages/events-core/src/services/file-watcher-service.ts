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

  private handleFsEvent(
    eventType: FileEventType,
    filePath: string,
    basePath: string,
    isDirectory: boolean,
    error?: Error
  ): void {
    // Always use absolute paths in the event data
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(basePath, filePath);

    this.logger.debug(
      `Chokidar fs event: ${eventType} - ${absolutePath} (${isDirectory ? "directory" : "file"})`
    );

    this.eventBus
      .emit<FileWatcherEvent>({
        kind: "FileWatcherEvent",
        timestamp: new Date(),
        eventType,
        absoluteFilePath: absolutePath,
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

  public isWatchingFolder(folderPath: string): boolean {
    return this.watchers.has(folderPath);
  }

  public getWatchedFolderCount(): number {
    return this.watchers.size;
  }

  public getWatchedFolders(): string[] {
    return Array.from(this.watchers.keys());
  }
}
