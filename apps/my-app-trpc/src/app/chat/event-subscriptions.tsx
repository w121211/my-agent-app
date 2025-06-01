// apps/my-app-trpc/src/app/chat/event-subscriptions.tsx
"use client";

import { trpc } from "@/lib/trpc-client";

/**
 * Component that handles real-time event subscriptions for the entire app
 * Should be included once in the layout to maintain connections
 */
export function EventSubscriptions() {
  const utils = trpc.useUtils();

  // Subscribe to chat events
  trpc.event.chatEvents.useSubscription(
    { lastEventId: null },
    {
      onData(event) {
        console.log("Chat event received:", event.data);

        // Invalidate relevant queries when chat events occur
        switch (event.data.updateType) {
          case "created":
          case "updated":
          case "deleted":
            utils.chat.getAll.invalidate();
            if (event.data.chatId) {
              utils.chat.getById.invalidate({ chatId: event.data.chatId });
            }
            break;
        }
      },
      onError(err) {
        console.error("Chat event subscription error:", err);
      },
    }
  );

  // Subscribe to task events
  trpc.event.taskEvents.useSubscription(
    { lastEventId: null },
    {
      onData(event) {
        console.log("Task event received:", event.data);

        // Invalidate relevant queries when task events occur
        switch (event.data.updateType) {
          case "created":
          case "updated":
          case "deleted":
          case "started":
          case "completed":
            utils.task.getAll.invalidate();
            if (event.data.taskId) {
              utils.task.getById.invalidate({ taskId: event.data.taskId });
            }
            break;
        }
      },
      onError(err) {
        console.error("Task event subscription error:", err);
      },
    }
  );

  // Subscribe to project folder events
  trpc.event.projectFolderEvents.useSubscription(
    { lastEventId: null },
    {
      onData(event) {
        console.log("Project folder event received:", event.data);

        // Invalidate relevant queries when project folder events occur
        switch (event.data.updateType) {
          case "added":
          case "removed":
          case "updated":
            utils.projectFolder.getAllProjectFolders.invalidate();
            break;
        }
      },
      onError(err) {
        console.error("Project folder event subscription error:", err);
      },
    }
  );

  // Subscribe to file watcher events
  trpc.event.fileWatcherEvents.useSubscription(
    { lastEventId: null },
    {
      onData(event) {
        console.log("File watcher event received:", event.data);

        // Invalidate file-related queries when files change
        // This could be optimized to only invalidate specific files
        utils.file.openFile.invalidate();
        utils.projectFolder.getFolderTree.invalidate();
      },
      onError(err) {
        console.error("File watcher event subscription error:", err);
      },
    }
  );

  return null; // This component doesn't render anything visible
}
