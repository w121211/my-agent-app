// packages/events-core/src/server/trpc-server.ts
// For testing, run this file with `pnpm tsx --watch src/server/trpc-server.ts`
import {
  CreateHTTPContextOptions,
  createHTTPServer,
} from "@trpc/server/adapters/standalone";
import {
  applyWSSHandler,
  CreateWSSContextFnOptions,
} from "@trpc/server/adapters/ws";
import { initTRPC } from "@trpc/server";
import { Logger } from "tslog";
import { WebSocketServer } from "ws";
import { createAppRouter } from "./root-router.js";

const logger = new Logger({ name: "Server" });
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Create context type
function createContext(
  opts: CreateHTTPContextOptions | CreateWSSContextFnOptions
) {
  return { logger };
}
type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

// Export base tRPC elements
export const baseProcedure = t.procedure;
export const router = t.router;
export const middleware = t.middleware;

// Create an error handling middleware
export const loggerMiddleware = middleware(
  async ({ path, type, next, ctx }) => {
    const start = Date.now();

    const result = await next();

    const durationMs = Date.now() - start;
    if (result.ok) {
      ctx.logger.info(`${type} ${path} completed in ${durationMs}ms`);
    } else {
      ctx.logger.error(
        `${type} ${path} failed in ${durationMs}ms: ${result.error.message}`
      );
      // You can also log the error stack if needed
      ctx.logger.error(result.error.stack);
    }

    return result;
  }
);

// Base procedure with logger
export const publicProcedure = baseProcedure.use(loggerMiddleware);

async function startServer() {
  logger.info("Starting server...");

  try {
    const appRouter = await createAppRouter();

    // Create HTTP server with tRPC handler
    const server = createHTTPServer({
      router: appRouter,
      createContext,
    });

    // Create WebSocket server for subscriptions
    const wss = new WebSocketServer({ server });

    // Apply tRPC WebSocket handler
    const wssHandler = applyWSSHandler({
      // @ts-expect-error WebSocketServer types mismatch between ws and @trpc/server
      wss,
      router: appRouter,
      createContext,
    });

    // Start the server
    server.listen(PORT, () => {
      logger.info(`Server listening on http://localhost:${PORT}`);
      logger.info(`WebSocket server listening on ws://localhost:${PORT}`);
      logger.info(`Connected clients: ${wss.clients.size}`);
    });

    // Optional: Log connected clients periodically
    // const clientIntervalId = setInterval(() => {
    //   logger.debug(`Connected clients: ${wss.clients.size}`);
    // }, 10000);

    // Handle shutdown
    const shutdown = () => {
      logger.info("Shutting down server...");
      // clearInterval(clientIntervalId);
      wssHandler.broadcastReconnectNotification();
      server.close();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.fatal("Fatal server error:", error);
  process.exit(1);
});
