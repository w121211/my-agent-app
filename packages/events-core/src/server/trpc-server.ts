// packages/events-core/src/server/trpc-server.ts
// For testing, run this file with `pnpm tsx --watch src/server/trpc-server.ts`
import {
  CreateHTTPContextOptions,
  createHTTPServer,
} from "@trpc/server/adapters/standalone";
import { initTRPC } from "@trpc/server";
import cors from "cors";
import { Logger } from "tslog";
import superjson from "superjson";
import { createAppRouter } from "./root-router.js";

const logger = new Logger({ name: "Server" });
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;

// Create context type
function createContext(opts: CreateHTTPContextOptions) {
  return {};
}
type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
  sse: {
    maxDurationMs: 5 * 60 * 1_000, // 5 minutes
    ping: {
      enabled: true,
      intervalMs: 3_000,
    },
    client: {
      reconnectAfterInactivityMs: 5_000,
    },
  },
});

// Export base tRPC elements
export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;

/**
 * Create an unprotected procedure
 * @see https://trpc.io/docs/v11/procedures
 **/
export const publicProcedure = t.procedure.use(
  async function artificialDelayInDevelopment(opts) {
    const res = opts.next(opts);

    if (process.env.NODE_ENV === "development") {
      const randomNumber = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      const delay = randomNumber(300, 1_000);
      logger.debug(
        `ℹ️ doing artificial delay of ${delay} ms before returning ${opts.path}`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return res;
  }
);

async function startServer() {
  logger.info("Starting server...");

  try {
    // Get user data directory from environment or use default
    const userDataDir = process.cwd() + "/my-demo/user-data";
    const appRouter = await createAppRouter(userDataDir);

    // Create HTTP server with tRPC handler
    const server = createHTTPServer({
      middleware: cors(),
      router: appRouter,
      createContext,
      basePath: "/api/trpc/",
    });

    // Start the server
    server.listen(PORT, () => {
      logger.info(`Server listening on http://localhost:${PORT}`);
      logger.info(
        `tRPC endpoint available at http://localhost:${PORT}/api/trpc`
      );
    });

    // Handle shutdown
    const shutdown = () => {
      logger.info("Shutting down server...");
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
