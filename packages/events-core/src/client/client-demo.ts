// packages/events-core/src/client/client-demo.ts
// Run this code with `pnpm tsx src/client/client-demo.ts`
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { Logger } from "tslog";
import SuperJSON from "superjson";
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
    // Use HTTP batch streaming with SSE support
    httpBatchStreamLink({
      url: getUrl(),
      // Use SuperJSON for data transformation
      transformer: SuperJSON,
    }),
  ],
});

async function main() {
  logger.info("Starting Events Core client demo...");

  try {
    // 1. Tasks API examples
    logger.info("\n--- Tasks API ---");

    // Create a new task
    const newTask = await trpc.task.create.mutate({
      taskName: "Example Task",
      taskConfig: { description: "This is an example task" },
    });
    logger.info("Created task:", newTask);

    // Start the task
    const startedTask = await trpc.task.start.mutate({
      taskId: newTask.taskId,
    });
    logger.info("Started task:", startedTask);

    // Get all tasks
    const allTasks = await trpc.task.getAll.query();
    logger.info(`Found ${allTasks.length} tasks`);

    // 2. Chat API examples
    logger.info("\n--- Chat API ---");

    // Create a new chat
    const newChat = await trpc.chat.createChat.mutate({
      targetDirectoryAbsolutePath: "./workspace",
      newTask: false,
      mode: "chat",
      knowledge: [],
      prompt: "Hello, this is an initial message.",
    });
    logger.info("Created chat:", newChat.id);

    // Submit a message to the chat
    const updatedChat = await trpc.chat.submitMessage.mutate({
      chatId: newChat.id,
      message: "This is a follow-up message",
    });
    logger.info("Submitted message to chat:", updatedChat.id);

    // 3. Subscribe to events (SSE subscriptions)
    logger.info("\n--- Events API (SSE) ---");

    // Subscribe to all events
    const allEventsSubscription = trpc.event.allEvents.subscribe(undefined, {
      onData(data) {
        logger.info("Event received:", data.data.kind);
      },
      onError(err) {
        logger.error("Events subscription error:", err);
      },
    });

    // Keep the subscription active for 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Unsubscribe
    allEventsSubscription.unsubscribe();
    logger.info("Unsubscribed from events");
  } catch (error) {
    logger.error("Error in client:", error);
  }
}

// Run the client
main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
