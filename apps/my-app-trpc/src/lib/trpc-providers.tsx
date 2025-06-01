// apps/my-app-trpc/src/app/lib/events-providers.tsx
"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import { createQueryClient } from "./query-client";
import { trpc } from "./trpc-client";
import { useState } from "react";
import SuperJSON from "superjson";

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  } else {
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

const getUrl = () => {
  if (process.env.NEXT_PUBLIC_TRPC_URL) {
    return process.env.NEXT_PUBLIC_TRPC_URL;
  }
  return `http://localhost:3333/api/trpc`;
};

console.log("getUrl", getUrl());

export function TRPCProviders(props: Readonly<{ children: React.ReactNode }>) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink(),
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
    })
  );

  return (
    <QueryClientProvider client={getQueryClient()}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </trpc.Provider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
