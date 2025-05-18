// packages/events-core/src/demo/events-core-demo.ts
import {
  createTRPCClient,
  createWSClient,
  httpLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import { WebSocket } from "ws";
import path from "node:path";
import fs from "node:fs/promises";
import type { AppRouter } from "../src/server/root-router.js";

// Make WebSocket available globally (Node.js environment)
globalThis.WebSocket = WebSocket as any;

// Server configuration
const SERVER_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

// Test workspace path
const TEST_WORKSPACE_PATH = path.join(process.cwd(), "test-workspace");

// Create WebSocket client
const wsClient = createWSClient({
  url: WS_URL,
});

// Create tRPC client with split link for HTTP and WebSocket
const trpc = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        return op.type === "subscription";
      },
      true: wsLink({
        client: wsClient,
      }),
      false: httpLink({
        url: SERVER_URL,
      }),
    }),
  ],
});

// Ensure test workspace exists
async function ensureTestWorkspaceExists() {
  await fs.mkdir(TEST_WORKSPACE_PATH, { recursive: true });
  console.log(`Test workspace created at: ${TEST_WORKSPACE_PATH}`);

  // Create a test file for file operations
  const testFilePath = path.join(TEST_WORKSPACE_PATH, "test.txt");
  await fs.writeFile(testFilePath, "This is a test file for events-core demo");
}

async function testTaskRouter() {
  console.log("\n--- Testing Task Router ---");

  // Create a new task
  const newTask = await trpc.task.create.mutate({
    taskName: "Demo Task",
    taskConfig: { description: "This is a demo task" },
  });
  console.log("Created task:", newTask);

  // Start the task
  const startedTask = await trpc.task.start.mutate({
    taskId: newTask.taskId,
  });
  console.log("Started task:", startedTask);

  // Get all tasks
  const allTasks = await trpc.task.getAll.query();
  console.log(`Found ${allTasks.length} tasks`);
}

async function testChatRouter() {
  console.log("\n--- Testing Chat Router ---");

  // Create a new chat
  const newChat = await trpc.chat.createChat.mutate({
    targetDirectoryAbsolutePath: TEST_WORKSPACE_PATH,
    newTask: false,
    mode: "chat",
    knowledge: [],
    prompt: "Hello, this is an initial message.",
    model: "default",
  });
  console.log("Created chat:", newChat.id);

  // Submit a message to the chat
  const updatedChat = await trpc.chat.submitMessage.mutate({
    chatId: newChat.id,
    message: "This is a follow-up message",
  });
  console.log("Submitted message to chat:", updatedChat.id);

  // Get all chats
  const allChats = await trpc.chat.getAll.query();
  console.log(`Found ${allChats.length} chats`);
}

async function testProjectFolderRouter() {
  console.log("\n--- Testing Project Folder Router ---");

  // Add a project folder
  const addResult = await trpc.projectFolder.addProjectFolder.mutate({
    projectFolderPath: TEST_WORKSPACE_PATH,
  });
  console.log("Add project folder result:", addResult);

  // Get all project folders
  const allFolders = await trpc.projectFolder.getAllProjectFolders.query();
  console.log(`Found ${allFolders.length} project folders`);

  // Get folder tree
  const folderTree = await trpc.projectFolder.getFolderTree.query({});
  console.log("Folder tree:", folderTree);

  // Start watching all project folders
  const watchResult =
    await trpc.projectFolder.startWatchingAllProjectFolders.mutate({});
  console.log("Started watching folders:", watchResult);
}

async function testFileRouter() {
  console.log("\n--- Testing File Router ---");

  const testFilePath = path.join(TEST_WORKSPACE_PATH, "test.txt");

  // Get file type
  const fileType = await trpc.file.getFileType.query({
    filePath: testFilePath,
  });
  console.log("File type:", fileType);

  // Open file
  const fileContent = await trpc.file.openFile.query({
    filePath: testFilePath,
  });
  console.log("File content:", fileContent);
}

async function testNotificationRouter() {
  console.log("\n--- Testing Notification Router ---");

  // Send a test notification
  await trpc.notification.sendTestNotification.mutate({
    message: "Hello from demo!",
  });

  // Subscribe to file changes
  console.log("Subscribing to file changes for 5 seconds...");
  const fileChangeSubscription = trpc.notification.fileChanges.subscribe(
    undefined,
    {
      onData(data) {
        console.log("File change:", data);
      },
      onError(err) {
        console.error("File change subscription error:", err);
      },
    }
  );

  // Subscribe to all events
  console.log("Subscribing to all events for 5 seconds...");
  const allEventsSubscription = trpc.notification.allEvents.subscribe(
    undefined,
    {
      onData(data) {
        console.log("Event received:", data.kind);
      },
      onError(err) {
        console.error("All events subscription error:", err);
      },
    }
  );

  // Create a file change to trigger the subscription
  const changeFilePath = path.join(TEST_WORKSPACE_PATH, "change-test.txt");
  await fs.writeFile(
    changeFilePath,
    "This file should trigger the file watcher"
  );
  console.log(`Created file to trigger watcher: ${changeFilePath}`);

  // Keep subscriptions active for 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Cleanup subscriptions
  fileChangeSubscription.unsubscribe();
  allEventsSubscription.unsubscribe();
  console.log("Unsubscribed from events");
}

async function testUserSettingsRouter() {
  console.log("\n--- Testing User Settings Router ---");

  // Get settings
  const settings = await trpc.userSettings.getSettings.query();
  console.log("Current user settings:", settings);

  // Update settings
  const updateResult = await trpc.userSettings.updateSettings.mutate({
    settings: {
      theme: "dark",
      fontSize: 14,
    },
  });
  console.log("Updated settings:", updateResult);

  // Get updated settings to verify
  const updatedSettings = await trpc.userSettings.getSettings.query();
  console.log("Updated user settings:", updatedSettings);
}

async function main() {
  console.log("Starting Events Core Demo...");

  try {
    // Ensure test workspace exists
    await ensureTestWorkspaceExists();

    // Run tests for each router
    await testTaskRouter();
    await testChatRouter();
    await testProjectFolderRouter();
    await testFileRouter();
    await testNotificationRouter();
    await testUserSettingsRouter();

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Error in demo:", error);
  } finally {
    // Cleanup WebSocket connection
    await wsClient.close();
    console.log("Demo completed, WebSocket connection closed");
  }
}

// Run the demo
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
