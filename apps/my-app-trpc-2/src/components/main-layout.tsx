// apps/my-app-trpc-2/src/components/main-layout.tsx
import { ExplorerPanel } from "./explorer-panel";
import { ChatPanel } from "./chat-panel";
import { RightPanel } from "./right-panel";
import { ToastProvider } from "./toast-provider";
import React, { useEffect } from "react"; // Import useEffect
import { useTRPC } from "../lib/trpc"; // Import useTRPC
import { useMutation } from "@tanstack/react-query"; // Import useMutation

export const MainLayout = () => {
  const trpc = useTRPC();

  const cleanupEmptyDraftsMutation = useMutation(
    trpc.chat.cleanupEmptyDrafts.mutationOptions({
      onSuccess: () => {
        console.log("Startup: Empty draft cleanup successfully requested.");
      },
      onError: (error) => {
        console.error("Startup: Failed to request empty draft cleanup:", error.message);
        // Potentially show a toast here if it's critical, but might be silent for startup
      },
    }),
  );

  useEffect(() => {
    cleanupEmptyDraftsMutation.mutate({});
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <ToastProvider>
      <div className="h-screen flex bg-background text-foreground font-sans">
        <ExplorerPanel />
        <ChatPanel />
        <RightPanel />
      </div>
    </ToastProvider>
  );
};
