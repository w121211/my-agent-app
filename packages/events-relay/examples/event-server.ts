// Run with: pnpm tsx examples/event-server.ts
import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import { createServerEventBus, IEventBus } from "@repo/events-core/event-bus";
import {
  ClientTestPingEvent,
  isEventKind,
  ServerTestPingEvent,
} from "@repo/events-core/event-types";
import { TaskRepository, ChatRepository } from "@repo/events-core/repositories";
import { TaskService } from "@repo/events-core/task-service";
import { ChatService } from "@repo/events-core/chat-service";
import { FileService } from "@repo/events-core/file-service";
import { FileWatcherService } from "@repo/events-core/file-watcher-service";
import { createWebSocketEventServer } from "../src/websocket-event-server.js";

interface EventServerConfig {
  port: number;
  workspacePath: string;
  logger?: Logger<ILogObj>;
}

class EventServer {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly wsEventServer: ReturnType<typeof createWebSocketEventServer>;
  private readonly workspacePath: string;
  private readonly port: number;

  // Repositories
  private readonly taskRepo: TaskRepository;
  private readonly chatRepo: ChatRepository;

  // Services
  private readonly taskService: TaskService;
  private readonly chatService: ChatService;
  private readonly fileService: FileService;
  private readonly fileWatcherService: FileWatcherService;

  constructor(config: EventServerConfig) {
    this.logger = config.logger || new Logger({ name: "EventServer" });
    this.workspacePath = path.resolve(config.workspacePath);
    this.port = config.port;

    // Initialize event bus
    this.eventBus = createServerEventBus({ logger: this.logger });

    // Initialize WebSocket server
    this.wsEventServer = createWebSocketEventServer({
      port: this.port,
      eventBus: this.eventBus,
      logger: this.logger,
    });

    // Initialize repositories
    this.taskRepo = new TaskRepository(this.workspacePath);
    this.chatRepo = new ChatRepository(this.workspacePath);

    // Initialize services
    this.taskService = new TaskService(this.eventBus, this.taskRepo);
    this.chatService = new ChatService(
      this.eventBus,
      this.chatRepo,
      this.workspacePath,
      this.taskService
    );
    this.fileService = new FileService(this.eventBus, this.workspacePath);
    this.fileWatcherService = new FileWatcherService(
      this.eventBus,
      this.workspacePath
    );

    this.setupEventHandlers();

    this.logger.info(
      `Event server initialized for workspace: ${this.workspacePath}`
    );
  }

  private setupEventHandlers(): void {
    // Handle test ping events
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

    // Log all server events for monitoring
    this.eventBus.subscribeToAllServerEvents((event) => {
      //   this.logger.debug(`Server event: ${event.kind}`, {
      //     timestamp: event.timestamp,
      //     correlationId: event.correlationId,
      //   });
      this.logger.debug(`Server event: ${event.kind}`);
    });
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting event server on port ${this.port}`);

    // Ensure workspace exists
    await fs.mkdir(this.workspacePath, { recursive: true });

    // Load existing data
    await this.taskRepo.loadWorkspace();

    // Start services
    this.wsEventServer.start();
    this.fileWatcherService.startWatching();

    this.logger.info("Event server is running");
  }

  public async stop(): Promise<void> {
    this.logger.info("Shutting down event server");

    await this.fileWatcherService.stopWatching();
    this.wsEventServer.stop();

    this.logger.info("Event server stopped");
  }
}

function runEventServer(): void {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
  const WORKSPACE_PATH = process.env.WORKSPACE_PATH || "./workspace";

  const logger: Logger<ILogObj> = new Logger({ name: "EventServer" });

  logger.info(`Starting event server for workspace: ${WORKSPACE_PATH}`);

  const server = new EventServer({
    port: PORT,
    workspacePath: WORKSPACE_PATH,
    logger,
  });

  server.start();

  // Handle process termination
  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down...");
    server.stop().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down...");
    server.stop().then(() => process.exit(0));
  });

  logger.info("Event server is running. Press Ctrl+C to stop.");
}

// Run the server
runEventServer();
