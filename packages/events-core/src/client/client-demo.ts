// packages/events-core/src/client/client-code.ts
// Run this code with `pnpm tsx src/client/client-demo.ts`
import {
  createTRPCClient,
  createWSClient,
  httpLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import { WebSocket } from "ws";
import type { AppRouter } from "../server/root-router.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

// Make WebSocket available globally (Node.js environment)
globalThis.WebSocket = WebSocket as any;

// Server configuration
const SERVER_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000";

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

// Helper to pause execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("Starting Events Core Client...");
  console.log(`Using server: ${SERVER_URL}`);

  try {
    // Create test directories
    const homeDir = os.homedir();
    const testDir = path.join(homeDir, "events-core-test");
    const projectDir1 = path.join(testDir, "project1");
    const projectDir2 = path.join(testDir, "project2");

    try {
      await fs.mkdir(testDir, { recursive: true });
      await fs.mkdir(projectDir1, { recursive: true });
      await fs.mkdir(projectDir2, { recursive: true });

      // Create a test file
      const testFilePath = path.join(projectDir1, "test.txt");
      await fs.writeFile(testFilePath, "This is a test file", "utf8");

      console.log(`Created test directories: ${testDir}`);
    } catch (err) {
      console.error("Error creating test directories:", err);
    }

    // ------------- User Settings -------------
    console.log("\n=== User Settings ===");

    // Get current settings
    const settings = await trpc.userSettings.getSettings.query();
    console.log("Current user settings:", settings);

    // Update settings
    const updatedSettings = await trpc.userSettings.updateSettings.mutate({
      settings: { theme: "dark" },
    });
    console.log("Updated settings:", updatedSettings);

    // ------------- Project Folders -------------
    console.log("\n=== Project Folders ===");

    // Get all project folders
    const existingFolders =
      await trpc.projectFolder.getAllProjectFolders.query();
    console.log(`Found ${existingFolders.length} existing project folders`);

    // Add project folders
    console.log(`Adding project folder: ${projectDir1}`);
    const addResult1 = await trpc.projectFolder.addProjectFolder.mutate({
      projectFolderPath: projectDir1,
    });
    console.log("Add result:", addResult1);

    // Add second project folder
    console.log(`Adding project folder: ${projectDir2}`);
    const addResult2 = await trpc.projectFolder.addProjectFolder.mutate({
      projectFolderPath: projectDir2,
    });
    console.log("Add result:", addResult2);

    // Get folder tree
    if (addResult1.success && addResult1.projectFolder) {
      const folderTree = await trpc.projectFolder.getFolderTree.query({
        projectFolderPath: addResult1.projectFolder.path,
      });
      console.log("Folder tree:", JSON.stringify(folderTree, null, 2));
    }

    // Start watching all project folders
    const watchResult =
      await trpc.projectFolder.startWatchingAllProjectFolders.mutate({});
    console.log(`Started watching ${watchResult.count} folders`);

    // ------------- Tasks -------------
    console.log("\n=== Tasks ===");

    // Create a new task
    const newTask = await trpc.task.create.mutate({
      taskName: "Test Task",
      taskConfig: { description: "Testing the task API" },
    });
    console.log("Created task:", newTask);

    // Start the task
    const startedTask = await trpc.task.start.mutate({
      taskId: newTask.taskId,
    });
    console.log("Started task:", startedTask);

    // Get task by ID
    const taskById = await trpc.task.getById.query({
      taskId: newTask.taskId,
    });
    console.log("Task by ID:", taskById);

    // Get all tasks
    const allTasks = await trpc.task.getAll.query();
    console.log(`Found ${allTasks.length} tasks`);

    // ------------- Chats -------------
    console.log("\n=== Chats ===");

    // Create a new chat
    const newChat = await trpc.chat.createChat.mutate({
      targetDirectoryAbsolutePath: projectDir1,
      newTask: false,
      mode: "chat",
      knowledge: [],
      prompt: "Hello, this is a test chat.",
      model: "default",
    });
    console.log("Created chat:", newChat.id);

    // Submit a message to the chat
    const messageResponse = await trpc.chat.submitMessage.mutate({
      chatId: newChat.id,
      message: "This is a follow-up message",
    });
    console.log("Submitted message to chat:", messageResponse.id);

    // Get chat by ID
    const chatById = await trpc.chat.getById.query({
      chatId: newChat.id,
    });
    console.log(
      "Chat by ID:",
      chatById.id,
      `(${chatById.messages.length} messages)`
    );

    // Get all chats
    const allChats = await trpc.chat.getAll.query();
    console.log(`Found ${allChats.length} chats`);

    // If the chat has a file path, try to open it
    try {
      const openedChat = await trpc.chat.openChatFile.query({
        filePath: newChat.absoluteFilePath,
      });
      console.log("Opened chat file:", openedChat.id);
    } catch (error) {
      console.error("Error opening chat file:", error);
    }

    // ------------- File Operations -------------
    console.log("\n=== File Operations ===");

    // Get file type
    const fileType = await trpc.file.getFileType.query({
      filePath: path.join(projectDir1, "test.txt"),
    });
    console.log("File type:", fileType);

    // Try to open a file
    try {
      const fileContent = await trpc.file.openFile.query({
        filePath: path.join(projectDir1, "test.txt"),
      });
      console.log("File content:", fileContent);
    } catch (error) {
      console.error("Error opening file:", error);
    }

    // ------------- Events -------------
    console.log("\n=== Events ===");

    // Send a ping
    const pingResponse = await trpc.event.ping.mutate({
      message: "Hello from client!",
    });
    console.log("Ping response:", pingResponse);

    // Subscribe to events (for 5 seconds)
    console.log("Subscribing to all events for 5 seconds...");
    const eventSubscription = trpc.event.allEvents.subscribe(undefined, {
      onData(data) {
        console.log("Event received:", data.data.kind);
      },
      onError(err) {
        console.error("Event subscription error:", err);
      },
    });

    // Subscribe to file changes (for 5 seconds)
    console.log("Subscribing to file watcher events for 5 seconds...");
    const fileChangesSubscription = trpc.event.subscribeToEvent.subscribe(
      {
        eventKind: "FileWatcherEvent",
        lastEventId: null,
      },
      {
        onData(data) {
          if (data.data.kind === "FileWatcherEvent") {
            console.log(
              "File event:",
              data.data.eventType,
              data.data.absoluteFilePath
            );
          } else {
            console.log("Unknown event type:", data.data.kind);
          }
        },
        onError(err) {
          console.error("File event subscription error:", err);
        },
      }
    );

    // Try to trigger a file change event
    try {
      await fs.writeFile(
        path.join(projectDir1, "test.txt"),
        "Updated content",
        "utf8"
      );
      console.log("Triggered file change event");
    } catch (error) {
      console.error("Error writing to file:", error);
    }

    // Keep the subscription active for 5 seconds
    await sleep(5000);

    // Unsubscribe from events
    eventSubscription.unsubscribe();
    fileChangesSubscription.unsubscribe();
    console.log("Unsubscribed from events");

    // ------------- Cleanup -------------
    console.log("\n=== Cleanup ===");

    // Remove project folders
    if (addResult1.success && addResult1.projectFolder) {
      const removeResult = await trpc.projectFolder.removeProjectFolder.mutate({
        projectFolderId: addResult1.projectFolder.id,
      });
      console.log("Remove project folder result:", removeResult);
    }

    if (addResult2.success && addResult2.projectFolder) {
      const removeResult = await trpc.projectFolder.removeProjectFolder.mutate({
        projectFolderId: addResult2.projectFolder.id,
      });
      console.log("Remove project folder result:", removeResult);
    }
  } catch (error) {
    console.error("Error in client:", error);
  } finally {
    // Cleanup WebSocket connection
    await wsClient.close();
    console.log("WebSocket connection closed");
  }
}

// Run the client
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
