/**
 * pnpm tsx ./examples/chat-events-demo.ts
 */
import { Logger, ILogObj } from "tslog";
import path from "node:path";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createServerEventBus, IEventBus } from "../src/event-bus.js";
import { TaskRepository, ChatRepository } from "../src/repositories.js";
import { TaskService } from "../src/task-service.js";
import { ChatService } from "../src/chat-service.js";
import { FileService } from "../src/file-service.js";
import { FileWatcherService } from "../src/file-watcher-service.js";
import {
  ClientCreateNewChatEvent,
  ClientSubmitUserChatMessageEvent,
  ClientOpenFileEvent,
  ServerNewChatCreatedEvent,
} from "../src/event-types.js";

// Setup workspace and initialize services
async function setupDemo() {
  const logger: Logger<ILogObj> = new Logger({ name: "ChatEventsDemo" });

  // Create temp workspace
  const workspacePath = path.join(process.cwd(), "temp-workspace");
  await fs.mkdir(workspacePath, { recursive: true });

  logger.info(`Created workspace at: ${workspacePath}`);

  // Initialize event bus
  const eventBus = createServerEventBus();

  // Initialize repositories
  const taskRepo = new TaskRepository(workspacePath);
  const chatRepo = new ChatRepository(workspacePath);

  // Load any existing data
  await taskRepo.loadWorkspace();

  // Initialize services
  const taskService = new TaskService(eventBus, taskRepo);
  const chatService = new ChatService(eventBus, chatRepo, workspacePath);
  const fileService = new FileService(eventBus, workspacePath);
  const fileWatcherService = new FileWatcherService(eventBus, workspacePath);

  // Start watching workspace
  fileWatcherService.startWatching();

  // Log all events for demonstration
  eventBus.subscribeToAllServerEvents((event) => {
    logger.info(`Server Event: ${event.kind}`, {
      timestamp: event.timestamp,
      correlationId: event.correlationId,
    });
  });

  return {
    logger,
    eventBus,
    workspacePath,
    taskRepo,
    chatRepo,
    taskService,
    chatService,
    fileService,
    fileWatcherService,
  };
}

// Demo Create New Chat Flow
async function demoCreateNewChat(
  eventBus: IEventBus,
  logger: Logger<ILogObj>
): Promise<string> {
  logger.info("=== Starting Create New Chat Flow ===");

  const correlationId = uuidv4();

  // Mock user creating a new chat
  const createChatEvent: ClientCreateNewChatEvent = {
    kind: "ClientCreateNewChat",
    newTask: true,
    mode: "chat",
    knowledge: [],
    prompt: "Hello, I need help with TypeScript best practices.",
    model: "gpt-4",
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Emitting event: ClientCreateNewChat");
  await eventBus.emit(createChatEvent);

  // In a real app, we would wait for the event response
  // Here we'll just wait a bit to simulate the process
  await new Promise((resolve) => setTimeout(resolve, 1000));

  logger.info("=== Create New Chat Flow Completed ===");

  return correlationId;
}

// Demo Submit Chat Message Flow
async function demoSubmitChatMessage(
  eventBus: IEventBus,
  logger: Logger<ILogObj>,
  chatId: string
): Promise<void> {
  logger.info("=== Starting Submit Chat Message Flow ===");

  const correlationId = uuidv4();

  // Mock user submitting a chat message
  const submitMessageEvent: ClientSubmitUserChatMessageEvent = {
    kind: "ClientSubmitUserChatMessage",
    chatId,
    message:
      "Can you explain how to properly use TypeScript interfaces vs types?",
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Emitting event: ClientSubmitUserChatMessage");
  await eventBus.emit(submitMessageEvent);

  // Wait for response processing
  await new Promise((resolve) => setTimeout(resolve, 1500));

  logger.info("=== Submit Chat Message Flow Completed ===");
}

// Demo Open File Flow
async function demoOpenFile(
  eventBus: IEventBus,
  logger: Logger<ILogObj>,
  filePath: string
): Promise<void> {
  logger.info("=== Starting Open File Flow ===");

  const correlationId = uuidv4();

  // Mock user opening a file
  const openFileEvent: ClientOpenFileEvent = {
    kind: "ClientOpenFile",
    filePath,
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Emitting event: ClientOpenFile");
  await eventBus.emit(openFileEvent);

  // Wait for file loading
  await new Promise((resolve) => setTimeout(resolve, 500));

  logger.info("=== Open File Flow Completed ===");
}

// Main demo function
async function main() {
  const { logger, eventBus, workspacePath, fileWatcherService } =
    await setupDemo();

  try {
    // Track chatId from first flow
    let chatId = "";
    let chatFilePath = "";

    // Subscribe to ServerNewChatCreated to get the chat ID
    const unsubscribe = eventBus.subscribe<ServerNewChatCreatedEvent>(
      "ServerNewChatCreated",
      (event) => {
        chatId = event.chatId;
        chatFilePath = event.filePath;
        logger.info(
          `New chat created with ID: ${chatId}, filePath: ${chatFilePath}`
        );
      }
    );

    // Demo Create New Chat
    await demoCreateNewChat(eventBus, logger);

    // Unsubscribe after we got the chat ID
    unsubscribe();

    if (!chatId) {
      throw new Error("No chat ID was received, cannot continue demo");
    }

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo Submit Chat Message
    await demoSubmitChatMessage(eventBus, logger, chatId);

    // Wait a bit before next flow
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo Open Chat File
    await demoOpenFile(eventBus, logger, chatFilePath);

    logger.info("All demo flows completed successfully!");
  } catch (error) {
    logger.error("Error during demo:", error);
  } finally {
    // Cleanup
    await fileWatcherService.stopWatching();

    // Keep workspace for inspection
    logger.info(`Demo completed. Workspace available at: ${workspacePath}`);
  }
}

// Run the demo
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
