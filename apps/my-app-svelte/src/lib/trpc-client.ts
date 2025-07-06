// apps/my-app-svelte/src/lib/trpc-client.ts
import {
  createTRPCClient,
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import { Logger } from "tslog";
import type { AppRouter } from "@repo/events-core/server/root-router";

const logger = new Logger({ name: "TrpcClient" });

const getUrl = () => "http://localhost:3333/api/trpc";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        import.meta.env.DEV ||
        (opts.direction === "down" && opts.result instanceof Error),
      console: {
        log: (...args) => logger.info(...args),
        error: (...args) => logger.error(...args),
      },
    }),
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

export type TrpcClient = typeof trpcClient;
