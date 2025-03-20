import path from "node:path";
import { ILogObj, Logger } from "tslog";
import { createServerEventBus, IEventBus } from "@repo/events-core/event-bus";
import {
  ServerEventType,
  ClientEventType,
  isEventType,
  ServerTestEvent,
  ClientTestEvent,
  ServerFileSystem,
} from "@repo/events-core/event-types";
import { createFileWatcher, FileWatcher } from "@repo/events-core/file-watcher";
import { createWebSocketEventServer } from "../src/websocket-event-server.js";

interface WorkspaceWatcherConfig {
  port: number;
  workspacePath: string;
  logger?: Logger<ILogObj>;
}

class WorkspaceWatcherServer {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly fileWatcher: FileWatcher;
  private readonly wsEventServer: ReturnType<typeof createWebSocketEventServer>;
  private readonly workspacePath: string;
  private readonly port: number;

  constructor(config: WorkspaceWatcherConfig) {
    this.logger =
      config.logger || new Logger({ name: "WorkspaceWatcherServer" });
    this.workspacePath = path.resolve(config.workspacePath);
    this.port = config.port;

    this.eventBus = createServerEventBus({ logger: this.logger });

    this.wsEventServer = createWebSocketEventServer({
      port: this.port,
      eventBus: this.eventBus,
      logger: this.logger,
    });

    this.fileWatcher = createFileWatcher(this.eventBus, this.workspacePath);

    this.setupEventHandlers();

    this.logger.info(
      `Workspace watcher initialized for: ${this.workspacePath}`
    );
  }

  private setupEventHandlers(): void {
    // Handle client test events
    this.eventBus.subscribe<ClientTestEvent>(
      ClientEventType.CLIENT_TEST_EVENT,
      (event) => {
        if (
          isEventType<ClientTestEvent>(event, ClientEventType.CLIENT_TEST_EVENT)
        ) {
          this.logger.info(`Received CLIENT_TEST_EVENT: ${event.message}`);

          const serverTestEvent: ServerTestEvent = {
            eventType: ServerEventType.SERVER_TEST_EVENT,
            timestamp: new Date(),
            message: `Server received: ${event.message}`,
            correlationId: event.correlationId,
          };

          this.eventBus.emit(serverTestEvent);
        }
      }
    );

    // Log file system events
    this.eventBus.subscribe<ServerFileSystem>(
      ServerEventType.SERVER_FILE_SYSTEM,
      (event) => {
        if (
          isEventType<ServerFileSystem>(
            event,
            ServerEventType.SERVER_FILE_SYSTEM
          )
        ) {
          const fsEvent = event.data;
          this.logger.debug(
            `File system event: ${fsEvent.eventType} - ${fsEvent.srcPath}`
          );
        }
      }
    );
  }

  public start(): void {
    this.logger.info(`Starting workspace watcher server on port ${this.port}`);
    this.wsEventServer.start();
    this.fileWatcher.startWatching();
    this.logger.info("Workspace watcher server is running");
  }

  public stop(): void {
    this.logger.info("Shutting down workspace watcher server");
    this.fileWatcher.stopWatching();
    this.wsEventServer.stop();
    this.logger.info("Workspace watcher server stopped");
  }
}

function runWorkspaceWatcherServer(): void {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
  const WORKSPACE_PATH = process.env.WORKSPACE_PATH || process.cwd();

  const logger: Logger<ILogObj> = new Logger({ name: "WorkspaceWatcher" });

  logger.info(`Starting workspace watcher for: ${WORKSPACE_PATH}`);

  const server = new WorkspaceWatcherServer({
    port: PORT,
    workspacePath: WORKSPACE_PATH,
    logger,
  });

  server.start();

  // Handle process termination
  process.on("SIGINT", () => {
    logger.info("Shutting down workspace watcher...");
    server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Shutting down workspace watcher...");
    server.stop();
    process.exit(0);
  });

  logger.info("Workspace watcher is running. Press Ctrl+C to stop.");
}

// Run the server
runWorkspaceWatcherServer();
