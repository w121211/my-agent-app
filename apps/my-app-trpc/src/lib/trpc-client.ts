// src/lib/trpc.ts
// apps/my-app-trpc/src/app/lib/events-trpc-client.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@repo/events-core/server/root-router";

// Import the AppRouter type from your events-core package
// This assumes you'll export the AppRouter type from events-core
// export type AppRouter = any; // Replace with: import type { AppRouter } from 'events-core';

export const trpc = createTRPCReact<AppRouter>();
