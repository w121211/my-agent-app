// File path: packages/events-core/src/client/client-code.ts
// Run this code with `pnpm tsx src/client/client-code.ts`
import {
  createTRPCClient,
  createWSClient,
  httpLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import { WebSocket } from "ws";
import type { AppRouter } from "../server/root-router.js";

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

async function main() {
  console.log("Starting Events Core client...");

  try {
    // 1. Tasks API examples
    console.log("\n--- Tasks API ---");

    // Create a new task
    const newTask = await trpc.task.create.mutate({
      taskName: "Example Task",
      taskConfig: { description: "This is an example task" },
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

    // 2. Chat API examples
    console.log("\n--- Chat API ---");

    // Create a new chat
    const newChat = await trpc.chat.createChat.mutate({
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

    // 3. Workspace API examples
    console.log("\n--- Workspace API ---");

    // Get settings
    const settings = await trpc.workspace.getSettings.query();
    console.log("Current settings:", settings);

    // Add a workspace (adjust path as needed)
    const workspacePath = "/path/to/workspace";
    try {
      const addResult = await trpc.workspace.addWorkspace.mutate({
        command: "addWorkspace",
        workspacePath,
      });
      console.log("Add workspace result:", addResult);
    } catch (error) {
      console.error("Failed to add workspace:", error);
    }

    // 4. File operations
    console.log("\n--- File API ---");

    // Get file type
    try {
      const fileType = await trpc.file.getFileType.query({
        filePath: "example.txt",
      });
      console.log("File type:", fileType);
    } catch (error) {
      console.error("Failed to get file type:", error);
    }

    // 5. Notifications (Subscriptions)
    console.log("\n--- Notifications API ---");

    // Send a test notification
    await trpc.notification.sendTestNotification.mutate({
      message: "Hello from client!",
    });

    // Subscribe to file changes (for 5 seconds)
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

    // Subscribe to all events (for 5 seconds)
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

    // Keep subscriptions active for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Cleanup subscriptions
    fileChangeSubscription.unsubscribe();
    allEventsSubscription.unsubscribe();
    console.log("Unsubscribed from events");
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
