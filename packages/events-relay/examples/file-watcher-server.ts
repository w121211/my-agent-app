// $ pnpm tsx examples/file-watcher-server.ts
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import { createServerEventBus, IEventBus } from "@repo/events-core/event-bus";
import {
  ClientRunTestEvent,
  isEventKind,
  ServerFileWatcherEvent,
  ServerSystemTestExecutedEvent,
} from "@repo/events-core/event-types";
import { createFileWatcher, FileWatcher } from "@repo/events-core/file-watcher";
import { createWebSocketEventServer } from "../src/websocket-event-server.js";

interface FileWatcherConfig {
  port: number;
  watchPath: string;
  logger?: Logger<ILogObj>;
}

class FileWatcherServer {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly fileWatcher: FileWatcher;
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
    this.fileWatcher = createFileWatcher(this.eventBus, this.watchPath);

    this.setupEventHandlers();

    this.logger.info(`File watcher initialized for: ${this.watchPath}`);
  }

  private setupEventHandlers(): void {
    // Handle client test events
    this.eventBus.subscribe<ClientRunTestEvent>("ClientRunTest", (event) => {
      if (isEventKind<ClientRunTestEvent>(event, "ClientRunTest")) {
        this.logger.info(`Received ClientRunTestEvent: ${event.message}`);

        const serverTestEvent: ServerSystemTestExecutedEvent = {
          kind: "ServerSystemTestExecuted",
          timestamp: new Date(),
          message: `Server received: ${event.message}`,
          correlationId: event.correlationId,
        };

        this.eventBus.emit(serverTestEvent);
      }
    });

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
