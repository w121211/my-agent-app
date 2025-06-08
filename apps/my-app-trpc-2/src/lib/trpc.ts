// apps/my-app-trpc-2/src/lib/trpc.ts
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@repo/events-core/server/root-router";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
