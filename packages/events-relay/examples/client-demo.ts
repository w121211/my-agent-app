// packages/events-core-client-demo/src/demo.ts
import {
  createTRPCClient,
  createWSClient,
  httpLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import { WebSocket } from "ws";
import type { AppRouter } from "../../events-core/src/server/root-router.js";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

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

/**
 * Function to print section headers in console
 */
function printSection(title: string) {
  console.log("\n" + "=".repeat(50));
  console.log(` 🚀 ${title}`);
  console.log("=".repeat(50) + "\n");
}

/**
 * Main demo function
 */
async function runDemo() {
  try {
    printSection("Starting Events Core Demo");
    console.log("Connecting to server at", SERVER_URL);

    // 1. User Settings API
    printSection("User Settings API");
    
    const settings = await trpc.userSettings.getSettings.query();
    console.log("Initial user settings:", settings);
    
    await trpc.userSettings.updateSettings.mutate({
      settings: {
        theme: "dark",
        notifications: true
      }
    });
    console.log("Updated user settings");
    
    const updatedSettings = await trpc.userSettings.getSettings.query();
    console.log("Settings after update:", updatedSettings);

    // 2. Project Folder API
    printSection("Project Folder API");
    
    // Create a temp directory for the demo
    const tempDir = path.join(os.tmpdir(), `events-core-demo-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Created temp directory: ${tempDir}`);

    // Add the temp directory as a project folder
    const addFolderResult = await trpc.projectFolder.addProjectFolder.mutate({
      projectFolderPath: tempDir
    });
    console.log("Add project folder result:", addFolderResult);
    
    // List all project folders
    const allFolders = await trpc.projectFolder.getAllProjectFolders.query();
    console.log("All project folders:", allFolders);
    
    // Get folder tree
    const folderTree = await trpc.projectFolder.getFolderTree.query({
      projectFolderPath: tempDir
    });
    console.log("Folder tree:", folderTree);
    
    // Start watching all project folders
    const watchResult = await trpc.projectFolder.startWatchingAllProjectFolders.mutate({});
    console.log("Started watching folders:", watchResult);

    // 3. Task API
    printSection("Task API");
    
    // Create a task
    const newTask = await trpc.task.create.mutate({
      taskName: "Demo Task",
      taskConfig: { description: "This is a demo task" }
    });
    console.log("Created task:", newTask);
    
    // Start the task
    const startedTask = await trpc.task.start.mutate({
      taskId: newTask.taskId
    });
    console.log("Started task:", startedTask);
    
    // Get all tasks
    const allTasks = await trpc.task.getAll.query();
    console.log("All tasks:", allTasks);

    // 4. Chat API
    printSection("Chat API");
    
    // Create a chat
    const newChat = await trpc.chat.createChat.mutate({
      targetDirectoryAbsolutePath: tempDir,
      newTask: false,
      mode: "chat",
      knowledge: [],
      prompt: "Hello, this is a test message",
      model: "default"
    });
    console.log("Created chat:", newChat);
    
    // Submit a message to the chat
    const messageResult = await trpc.chat.submitMessage.mutate({
      chatId: newChat.id,
      message: "This is a follow-up message"
    });
    console.log("Submitted message:", messageResult);
    
    // Get all chats
    const allChats = await trpc.chat.getAll.query();
    console.log("All chats:", allChats);

    // 5. File API
    printSection("File API");
    
    // Create a test file
    const testFilePath = path.join(tempDir, "test.txt");
    await fs.writeFile(testFilePath, "This is a test file for events-core demo");
    console.log(`Created test file: ${testFilePath}`);
    
    // Get file type
    const fileType = await trpc.file.getFileType.query({
      filePath: testFilePath
    });
    console.log("File type:", fileType);

    // 6. Notifications (Subscriptions)
    printSection("Notifications API");
    
    // Setup event subscriptions
    console.log("Setting up event subscriptions for 5 seconds...");
    
    const allEventsSubscription = trpc.notification.allEvents.subscribe(undefined, {
      onData(data) {
        console.log("Event received:", data.kind);
      },
      onError(err) {
        console.error("Event subscription error:", err);
      }
    });

    // Make a change that should trigger events
    await fs.writeFile(testFilePath, "Updated content to trigger file change event");
    console.log("Updated file content to trigger events");
    
    // Keep subscriptions active for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    allEventsSubscription.unsubscribe();
    console.log("Unsubscribed from events");

    // 7. Cleanup
    printSection("Cleanup");
    
    // Remove project folder
    if (allFolders.length > 0) {
      const folderToRemove = allFolders.find(f => f.path === tempDir);
      if (folderToRemove) {
        await trpc.projectFolder.removeProjectFolder.mutate({
          projectFolderId: folderToRemove.id
        });
        console.log(`Removed project folder: ${folderToRemove.path}`);
      }
    }
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`Removed temp directory: ${tempDir}`);
    } catch (error) {
      console.warn(`Failed to remove temp directory: ${error}`);
    }

    printSection("Demo Completed Successfully");
  } catch (error) {
    console.error("Demo failed with error:", error);
  } finally {
    // Clean up WebSocket connection
    await wsClient.close();
    console.log("WebSocket connection closed");
  }
}

// Run the demo
runDemo().catch(error => {
  console.error("Fatal error in demo:", error);
  process.exit(1);
});
