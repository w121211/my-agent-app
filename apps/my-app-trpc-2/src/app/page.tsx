// apps/my-app-trpc-2/src/app/page.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import { useState, useEffect } from "react"; // Import useEffect
import SuperJSON from "superjson";
import type { AppRouter } from "@repo/events-core/server/root-router";
import { TRPCProvider, useTRPC } from "../lib/trpc"; // Import useTRPC
import { MainLayout } from "../components/main-layout";
import { useMutation } from "@tanstack/react-query"; // Import useMutation

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

const getUrl = () => "http://localhost:3333/api/trpc";

export default function App() {
  const queryClient = getQueryClient();
  // TRPC client setup needs to be inside a component that is a child of TRPCProvider to use useTRPC hook.
  // So, we'll create a sub-component for the main app logic including the startup mutation.
  // Or, we can pass the trpcClient instance created here to a sub-component.
  // For simplicity, let's create the trpcClient here and then use it in a sub-component
  // that actually calls the mutation.

  // Simpler: The TRPCProvider itself doesn't make useTRPC available directly in App.
  // We need a child component that uses useTRPC, or we pass the trpcClient to MainLayout
  // and MainLayout does the useEffect.
  // Let's make a small wrapper component that will use useTRPC.

  const [trpcClient] = useState(() => // Back to trpcClient for prop name consistency
    createTRPCClient<AppRouter>({
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
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <MainLayout />
      </TRPCProvider>
    </QueryClientProvider>
  );
}
