// ```
// $ pnpm tsx file-watcher-demo.ts
// ```

import fs from "node:fs/promises";
import path from "node:path";
import { Logger } from "tslog";
import { createServerEventBus } from "../src/event-bus.js";
import { createFileWatcher } from "../src/file-watcher-service.js";
import { ServerFileWatcherEvent } from "../src/event-types.js";

// Create a logger for the demo
const logger = new Logger({ name: "FileWatcherDemo" });

// Define the workspace path for demo files
const demoWorkspacePath = path.join(process.cwd(), "workspace");

// Create initial folder structure for the demo
async function setupWorkspace(): Promise<void> {
  await fs.mkdir(demoWorkspacePath, { recursive: true });

  // Create a task folder structure
  const taskFolder = path.join(demoWorkspacePath, "t01-demo-task");
  await fs.mkdir(taskFolder, { recursive: true });

  // Create a history folder
  await fs.mkdir(path.join(taskFolder, "history"), { recursive: true });

  logger.info(`Demo workspace created at ${demoWorkspacePath}`);
}

// Simulate file operations in a task workflow
async function demonstrateFileOperations(): Promise<void> {
  const taskFolder = path.join(demoWorkspacePath, "t01-demo-task");

  // 1. Create a task file
  logger.info("Creating a task file...");
  const taskData = {
    id: "task-123",
    title: "Demo Task",
    status: "CREATED",
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(taskFolder, "task.json"),
    JSON.stringify(taskData, null, 2)
  );

  // Wait between operations
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  // 2. Create a subtask folder
  logger.info("Creating a subtask folder...");
  const subtaskFolder = path.join(taskFolder, "s01-planning");
  await fs.mkdir(subtaskFolder, { recursive: true });

  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  // 3. Create a chat file
  logger.info("Creating a chat file...");
  const chatData = {
    id: "chat-456",
    taskId: "task-123",
    messages: [] as Array<{ id: string; content: string; timestamp: string }>,
  };

  await fs.writeFile(
    path.join(subtaskFolder, "c01-20230101_120000.chat.json"),
    JSON.stringify(chatData, null, 2)
  );

  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  // 4. Update the chat file with a message
  logger.info("Adding a message to the chat...");
  chatData.messages.push({
    id: "msg-789",
    content: "Hello, this is a test message",
    timestamp: new Date().toISOString(),
  });

  await fs.writeFile(
    path.join(subtaskFolder, "c01-20230101_120000.chat.json"),
    JSON.stringify(chatData, null, 2)
  );

  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  // 5. Create a backup of the task in history
  logger.info("Creating a task backup...");
  await fs.writeFile(
    path.join(taskFolder, "history", "task_20230101_120000.json"),
    JSON.stringify(taskData, null, 2)
  );
}

// Clean up demo files
async function cleanupWorkspace(): Promise<void> {
  await fs.rm(demoWorkspacePath, { recursive: true, force: true });
  logger.info("Demo workspace cleaned up");
}

// Run the demo
async function runDemo(): Promise<void> {
  logger.info("Starting File Watcher Demo");

  // Create the event bus
  const eventBus = createServerEventBus();

  // Subscribe to file system events
  const unsubscribe = eventBus.subscribe<ServerFileWatcherEvent>(
    "ServerFileWatcherEvent",
    (event) => {
      logger.info(
        `File event: ${event.data.chokidarEvent} | ${event.data.isDirectory ? "Directory" : "File"} | ${event.data.srcPath}`
      );
    }
  );

  // Set up the workspace
  await setupWorkspace();

  // Create and start the file watcher
  const fileWatcher = createFileWatcher(eventBus, demoWorkspacePath);
  logger.info("File watcher started");

  // Run demo file operations
  await demonstrateFileOperations();

  // Allow time for all events to be processed
  await new Promise<void>((resolve) => setTimeout(resolve, 2000));

  // Clean up
  await fileWatcher.stopWatching();
  unsubscribe();
  await cleanupWorkspace();

  logger.info("Demo completed");
}

// Execute the demo
(async () => {
  await runDemo();
})();
