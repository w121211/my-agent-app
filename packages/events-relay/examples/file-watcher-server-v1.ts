// File watcher server example
// Run with: pnpm tsx examples/file-watcher-server.ts
import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import { createServerEventBus, IEventBus } from "@repo/events-core/event-bus";
import {
  ClientTestPingEvent,
  ClientRequestWorkspaceFolderTreeEvent,
  isEventKind,
  ServerFileWatcherEvent,
  ServerTestPingEvent,
  ServerWorkspaceFolderTreeResponsedEvent,
  FolderTreeNode,
} from "@repo/events-core/event-types";
import {
  createFileWatcherService,
  type FileWatcherService,
} from "@repo/events-core/file-watcher-service";
import { createWebSocketEventServer } from "../src/websocket-event-server.js";

interface FileWatcherConfig {
  port: number;
  watchPath: string;
  logger?: Logger<ILogObj>;
}

class FileWatcherServer {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly fileWatcher: FileWatcherService;
  private readonly wsEventServer: ReturnType<typeof createWebSocketEventServer>;
  private readonly watchPath: string;
  private readonly port: number;

  constructor(config: FileWatcherConfig) {
    this.logger = config.logger || new Logger({ name: "FileWatcherServer" });
    this.watchPath = path.resolve(config.watchPath);
    this.port = config.port;

    this.eventBus = createServerEventBus({ logger: this.logger });
    this.wsEventServer = createWebSocketEventServer({
      port: this.port,
      eventBus: this.eventBus,
      logger: this.logger,
    });
    this.fileWatcher = createFileWatcherService(this.eventBus, this.watchPath);

    this.setupEventHandlers();

    this.logger.info(`File watcher initialized for: ${this.watchPath}`);
  }

  private setupEventHandlers(): void {
    // Handle client test events
    this.eventBus.subscribe<ClientTestPingEvent>("ClientTestPing", (event) => {
      if (isEventKind<ClientTestPingEvent>(event, "ClientTestPing")) {
        this.logger.info(`Received ClientTestPing: ${event.message}`);

        const serverTestEvent: ServerTestPingEvent = {
          kind: "ServerTestPing",
          timestamp: new Date(),
          message: `Server received: ${event.message}`,
          correlationId: event.correlationId,
        };

        this.eventBus.emit(serverTestEvent);
      }
    });

    // Handle workspace folder tree requests
    this.eventBus.subscribe<ClientRequestWorkspaceFolderTreeEvent>(
      "ClientRequestWorkspaceFolderTree",
      async (event) => {
        if (
          isEventKind<ClientRequestWorkspaceFolderTreeEvent>(
            event,
            "ClientRequestWorkspaceFolderTree"
          )
        ) {
          this.logger.info(
            `Received workspace tree request for path: ${
              event.workspacePath || this.watchPath
            }`
          );

          try {
            const requestedPath = event.workspacePath
              ? path.resolve(this.watchPath, event.workspacePath)
              : this.watchPath;

            // Validate the requested path is within the watchPath for security
            if (!requestedPath.startsWith(this.watchPath)) {
              throw new Error(
                `Requested path ${requestedPath} is outside allowed watch path ${this.watchPath}`
              );
            }

            const folderTree = await this.buildFolderTree(requestedPath);

            const response: ServerWorkspaceFolderTreeResponsedEvent = {
              kind: "ServerWorkspaceFolderTreeResponsed",
              timestamp: new Date(),
              workspacePath: event.workspacePath || "/",
              folderTree,
              correlationId: event.correlationId,
            };

            this.logger.debug(
              `Sending workspace tree response for: ${response.workspacePath}`
            );
            await this.eventBus.emit(response);
          } catch (error) {
            // Send error response
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(`Error building folder tree: ${errorMessage}`);

            const errorResponse: ServerWorkspaceFolderTreeResponsedEvent = {
              kind: "ServerWorkspaceFolderTreeResponsed",
              timestamp: new Date(),
              workspacePath: event.workspacePath || "/",
              folderTree: null,
              error: errorMessage,
              correlationId: event.correlationId,
            };

            await this.eventBus.emit(errorResponse);
          }
        }
      }
    );

    // Log file system events
    this.eventBus.subscribe<ServerFileWatcherEvent>(
      "ServerFileWatcherEvent",
      (event) => {
        if (
          isEventKind<ServerFileWatcherEvent>(event, "ServerFileWatcherEvent")
        ) {
          const fsEvent = event.data;
          this.logger.debug(
            `File system event: ${fsEvent.fsEventKind} - ${fsEvent.srcPath}`
          );
        }
      }
    );
  }

  // Build a folder tree structure for the requested path
  private async buildFolderTree(dirPath: string): Promise<FolderTreeNode> {
    const relativePath = path.relative(this.watchPath, dirPath);
    const nodePath = relativePath ? `/${relativePath}` : "/";
    const name = path.basename(dirPath);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const children: FolderTreeNode[] = [];

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        // Skip hidden files/folders (starting with .)
        if (entry.name.startsWith(".")) {
          continue;
        }

        if (entry.isDirectory()) {
          // For directories, recursively build the tree
          const subTree = await this.buildFolderTree(entryPath);
          children.push(subTree);
        } else if (entry.isFile()) {
          // For files, add a file node
          const relativeFilePath = path.relative(this.watchPath, entryPath);
          children.push({
            name: entry.name,
            path: `/${relativeFilePath}`,
            isDirectory: false,
          });
        }
      }

      return {
        name: name || "workspace",
        path: nodePath,
        isDirectory: true,
        children,
      };
    } catch (error) {
      this.logger.error(`Failed to read directory ${dirPath}: ${error}`);
      throw error;
    }
  }

  public start(): void {
    this.logger.info(`Starting file watcher server on port ${this.port}`);
    this.wsEventServer.start();
    this.fileWatcher.startWatching();
    this.logger.info("File watcher server is running");
  }

  public stop(): void {
    this.logger.info("Shutting down file watcher server");
    this.fileWatcher.stopWatching();
    this.wsEventServer.stop();
    this.logger.info("File watcher server stopped");
  }
}

function runFileWatcherServer(): void {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
  // const WATCH_PATH = process.env.WATCH_PATH || process.cwd();
  const WATCH_PATH = "../events-core/workspace"; // Use a relative path for testing

  const logger: Logger<ILogObj> = new Logger({ name: "FileWatcherServer" });

  logger.info(`Starting file watcher for: ${WATCH_PATH}`);

  const server = new FileWatcherServer({
    port: PORT,
    watchPath: WATCH_PATH,
    logger,
  });

  server.start();

  // Handle process termination
  process.on("SIGINT", () => {
    logger.info("Shutting down file watcher...");
    server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Shutting down file watcher...");
    server.stop();
    process.exit(0);
  });

  logger.info("File watcher is running. Press Ctrl+C to stop.");
}

// Run the server
runFileWatcherServer();
