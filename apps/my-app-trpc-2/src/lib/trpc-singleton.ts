// my-app-trpc-2/src/lib/trpc.ts
import { QueryClient } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import SuperJSON from "superjson";
import { AppRouter } from "@repo/events-core/server/root-router";

// Type definitions that match the backend
interface ProjectFolder {
  id: string;
  name: string;
  path: string;
}

interface FolderTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "FUNCTION_EXECUTOR";
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface Chat {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    title?: string;
    mode?: "chat" | "agent";
    model?: string;
  };
}

interface FileContent {
  content: string;
  fileType: string;
  absoluteFilePath: string;
  isBase64?: boolean;
}

// Type definition matching the backend AppRouter
// type AppRouter = any; // In real app, this would be imported from backend

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const getUrl = () => "http://localhost:3333/api/trpc";

const trpcClient = createTRPCClient<AppRouter>({
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

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
