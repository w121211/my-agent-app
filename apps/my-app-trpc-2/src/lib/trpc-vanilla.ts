// my-app-trpc-2/src/lib/trpc-vanilla.ts
import {
  createTRPCClient,
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import type { AppRouter } from "@repo/events-core/server/root-router";

const getUrl = () => "http://localhost:3333/api/trpc";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
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
