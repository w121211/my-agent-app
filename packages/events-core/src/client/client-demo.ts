// packages/events-core/src/client/client-demo.ts
// Run this code with `pnpm tsx src/client/client-demo.ts`
import path from "node:path";
import process from "node:process";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
  splitLink,
  httpSubscriptionLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import { Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { AppRouter } from "../server/root-router.js";

// Create a logger
const logger = new Logger({ name: "TRPCClient" });

// Server configuration
const getUrl = () => {
  const base = (() => {
    if (typeof window !== "undefined") return window.location.origin;
    if (process.env.APP_URL) return process.env.APP_URL;
    return `http://localhost:${process.env.PORT ?? 3000}`;
  })();

  return `${base}/api/trpc`;
};

// Create tRPC client
const trpc = createTRPCClient<AppRouter>({
  links: [
    // Add pretty logs to your console in development and logs errors in production
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
      console: {
        log: (...args) => logger.info(...args),
        error: (...args) => logger.error(...args),
      },
    }),
    // Support for SSE subscriptions
    splitLink({
      condition: (op) => op.type === "subscription",
      true: httpSubscriptionLink({
        url: getUrl(),
        transformer: SuperJSON,
      }),
      false: httpBatchStreamLink({
        url: getUrl(),
        transformer: SuperJSON,
      }),
    }),
  ],
});

// Helper function to wait a specified number of milliseconds
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  logger.info("Starting Events Core client demo...");

  // Set up a test folder path (current working directory)
  const testFolderPath = process.cwd();
  let projectFolderId: string | undefined;
  let chatId: string | undefined;
  let taskId: string | undefined;
  let chatFilePath: string | undefined;

  // 1. Subscribe to all events
  logger.info("\n--- Setting up Event Subscription ---");
  const eventSubscription = trpc.event.allEvents.subscribe(undefined, {
    onData(event) {
      logger.info(
        `Event: ${event.data.kind} - ${new Date(event.data.timestamp).toISOString()}`
      );
      if (event.data.kind === "ChatUpdatedEvent") {
        logger.info(`  Chat update type: ${(event.data as any).updateType}`);
      }
    },
    onError(err) {
      logger.error("Event subscription error:", err);
    },
  });

  logger.info("Event subscription active, events will be logged as they occur");

  // 2. Initial app loading - Simulating app initialization
  logger.info("\n--- App Initialization ---");

  // Get user settings
  const settings = await trpc.userSettings.getSettings.query();
  logger.info("Current user settings:", settings);

  // List all project folders - part of app initialization
  const initialProjectFolders =
    await trpc.projectFolder.getAllProjectFolders.query();
  logger.info(
    `Found ${initialProjectFolders.length} project folders during initialization`
  );

  // Get folder tree for each project folder - part of app initialization
  for (const folder of initialProjectFolders) {
    logger.info(`Getting folder tree for: ${folder.path}`);
    const folderTree = await trpc.projectFolder.getFolderTree.query({
      projectFolderPath: folder.path,
    });
    logger.info(`Folder tree for ${folder.name} retrieved`);
  }

  // Start watching all project folders - only needs to be called once during app init
  const watchResult =
    await trpc.projectFolder.startWatchingAllProjectFolders.mutate({
      correlationId: uuidv4(),
    });
  logger.info(`Started watching ${watchResult.count} project folders`);

  // 3. Project Folder API examples
  logger.info("\n--- Project Folder API ---");

  // Add a new project folder
  logger.info(`Adding test project folder at: ${testFolderPath}`);
  const addFolderResult = await trpc.projectFolder.addProjectFolder.mutate({
    projectFolderPath: testFolderPath,
    correlationId: uuidv4(),
  });

  if (addFolderResult.success && addFolderResult.projectFolder) {
    projectFolderId = addFolderResult.projectFolder.id;
    logger.info(`Added project folder with ID: ${projectFolderId}`);
  } else {
    logger.warn(`Note: ${addFolderResult.message}`);

    // If the folder already exists, find its ID
    const allFolders = await trpc.projectFolder.getAllProjectFolders.query();
    const existingFolder = allFolders.find((f) => f.path === testFolderPath);

    if (existingFolder) {
      projectFolderId = existingFolder.id;
      logger.info(`Using existing project folder with ID: ${projectFolderId}`);
    }
  }

  // Get folder tree for the new/existing folder
  const folderTree = await trpc.projectFolder.getFolderTree.query({
    projectFolderPath: testFolderPath,
  });
  logger.info("Folder tree retrieved");

  // 4. Task API examples
  logger.info("\n--- Task API ---");

  // Create a new task in the project folder
  const newTask = await trpc.task.create.mutate({
    taskName: "Demo Task",
    taskConfig: { description: "This is a task created by the client demo" },
    parentAbsoluteDirectoryPath: testFolderPath,
    correlationId: uuidv4(),
  });

  taskId = newTask.taskId;
  logger.info(`Created task with ID: ${taskId}`);

  // Start the task
  const startedTask = await trpc.task.start.mutate({
    taskId,
    correlationId: uuidv4(),
  });
  logger.info(`Started task, current status: ${startedTask.status}`);

  // Get task by ID
  const taskById = await trpc.task.getById.query({
    taskId,
  });
  logger.info(`Task details:`, taskById);

  // Get all tasks
  const allTasks = await trpc.task.getAll.query();
  logger.info(`Found ${allTasks.length} tasks`);

  // 5. Chat API examples
  logger.info("\n--- Chat API ---");

  // Create a new chat in the project folder
  const newChat = await trpc.chat.createChat.mutate({
    targetDirectoryAbsolutePath: testFolderPath,
    newTask: false,
    mode: "chat",
    knowledge: [],
    prompt: "Initial message for the demo chat",
    model: "default",
    correlationId: uuidv4(),
  });

  chatId = newChat.id;
  chatFilePath = newChat.absoluteFilePath;
  logger.info(`Created chat with ID: ${chatId}`);
  logger.info(`Chat file path: ${chatFilePath}`);

  // Wait for AI response events (3 seconds)
  logger.info("Waiting for AI response events (3 seconds)...");
  await wait(3000);

  // Submit a message to the chat
  await trpc.chat.submitMessage.mutate({
    chatId,
    message: "Hello, this is a test message from the client demo!",
    correlationId: uuidv4(),
  });
  logger.info("Message submitted to chat");

  // Wait for AI response events (3 seconds)
  logger.info("Waiting for AI response events (3 seconds)...");
  await wait(3000);

  // Get chat by ID
  const chatById = await trpc.chat.getById.query({
    chatId,
  });
  logger.info(`Chat has ${chatById.messages.length} messages`);

  // Get all chats
  const allChats = await trpc.chat.getAll.query();
  logger.info(`Found ${allChats.length} chats`);

  // Open chat file
  const openedChat = await trpc.chat.openChatFile.query({
    filePath: chatFilePath,
    correlationId: uuidv4(),
  });
  logger.info(`Opened chat file with ${openedChat.messages.length} messages`);

  // Submit another message to the opened chat
  await trpc.chat.submitMessage.mutate({
    chatId: openedChat.id,
    message: "This message was sent after opening the chat file",
    correlationId: uuidv4(),
  });
  logger.info("Submitted another message to the opened chat");

  // Wait for AI response events (3 seconds)
  logger.info("Waiting for AI response events (3 seconds)...");
  await wait(3000);

  // 6. File API examples
  logger.info("\n--- File API ---");

  // Open a source code file from the current project
  const currentFilePath = path.resolve(__dirname, "client-demo.ts");
  const fileType = await trpc.file.getFileType.query({
    filePath: currentFilePath,
  });
  logger.info(`File type of current file: ${fileType}`);

  const fileContent = await trpc.file.openFile.query({
    filePath: currentFilePath,
    correlationId: uuidv4(),
  });
  logger.info(`Opened file with type: ${fileContent.fileType}`);
  logger.info(`File content length: ${fileContent.content.length} characters`);

  // 7. Clean up - Remove the project folder if we added it
  logger.info("\n--- Cleanup ---");

  // Only remove the project folder if we added it during this run
  if (projectFolderId && addFolderResult.success) {
    const removeResult = await trpc.projectFolder.removeProjectFolder.mutate({
      projectFolderId,
      correlationId: uuidv4(),
    });

    if (removeResult.success) {
      logger.info(
        `Successfully removed project folder with ID: ${projectFolderId}`
      );
    } else {
      logger.warn(`Failed to remove project folder: ${removeResult.message}`);
    }
  } else {
    logger.info(
      "Skipping project folder removal as it existed before the demo"
    );
  }

  // Wait for 2 seconds to observe any final events
  logger.info("\n--- Waiting for 2 seconds to observe final events ---");
  await wait(2000);

  // Unsubscribe from events
  logger.info("Unsubscribing from events");
  eventSubscription.unsubscribe();

  logger.info("\n--- Demo completed successfully ---");
}

// Run the client demo
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
