// packages/events-core/src/server/routers/notification-router.ts
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { IEventBus, BaseEvent } from "../../event-bus.js";
import { router, loggedProcedure } from "../trpc-server.js";
import { FileWatcherEvent } from "../../services/file-watcher-service.js";
import { ChatUpdatedEvent } from "../../services/chat-service.js";
import { TaskUpdatedEvent } from "../../services/task-service.js";

export function createNotificationRouter(eventBus: IEventBus) {
  return router({
    // Subscribe to file change events
    fileChanges: loggedProcedure
      .input(
        z
          .object({
            workspacePath: z.string().optional(),
          })
          .optional()
      )
      .subscription(({ input }) => {
        return observable<{ event: string; path: string; timestamp: Date }>(
          (emit) => {
            const handleFileEvent = (event: BaseEvent) => {
              if (event.kind === "FileWatcherEvent") {
                const fileEvent = event as FileWatcherEvent;

                // If a workspace path filter is provided, only emit events for that path
                if (
                  input?.workspacePath &&
                  !fileEvent.absoluteFilePath.startsWith(input.workspacePath)
                ) {
                  return;
                }

                emit.next({
                  event: fileEvent.eventType,
                  path: fileEvent.absoluteFilePath,
                  timestamp: event.timestamp,
                });
              }
            };

            // Subscribe to file watcher events
            const unsubscribe = eventBus.subscribe(
              "FileWatcherEvent",
              handleFileEvent
            );

            // Return a cleanup function
            return () => {
              unsubscribe();
            };
          }
        );
      }),

    // Subscribe to chat updates
    chatUpdates: loggedProcedure
      .input(
        z
          .object({
            chatId: z.string().optional(),
          })
          .optional()
      )
      .subscription(({ input }) => {
        return observable<{
          chatId: string;
          updateType: string;
          timestamp: Date;
          chat: unknown;
        }>((emit) => {
          const handleChatEvent = (event: BaseEvent) => {
            if (event.kind === "ChatUpdatedEvent") {
              const chatEvent = event as ChatUpdatedEvent;

              // If a chat ID filter is provided, only emit events for that chat
              if (input?.chatId && chatEvent.chatId !== input.chatId) {
                return;
              }

              emit.next({
                chatId: chatEvent.chatId,
                updateType: chatEvent.updateType,
                timestamp: event.timestamp,
                chat: chatEvent.chat,
              });
            }
          };

          // Subscribe to chat updated events
          const unsubscribe = eventBus.subscribe(
            "ChatUpdatedEvent",
            handleChatEvent
          );

          return () => {
            unsubscribe();
          };
        });
      }),

    // Subscribe to task updates
    taskUpdates: loggedProcedure
      .input(
        z
          .object({
            taskId: z.string().optional(),
          })
          .optional()
      )
      .subscription(({ input }) => {
        return observable<{
          taskId: string;
          updateType: string;
          timestamp: Date;
          task: unknown;
        }>((emit) => {
          const handleTaskEvent = (event: BaseEvent) => {
            if (event.kind === "TaskUpdatedEvent") {
              const taskEvent = event as TaskUpdatedEvent;

              // If a task ID filter is provided, only emit events for that task
              if (input?.taskId && taskEvent.taskId !== input.taskId) {
                return;
              }

              emit.next({
                taskId: taskEvent.taskId,
                updateType: taskEvent.updateType,
                timestamp: event.timestamp,
                task: taskEvent.task,
              });
            }
          };

          // Subscribe to task updated events
          const unsubscribe = eventBus.subscribe(
            "TaskUpdatedEvent",
            handleTaskEvent
          );

          return () => {
            unsubscribe();
          };
        });
      }),

    // Send a test notification
    sendTestNotification: loggedProcedure
      .input(
        z.object({
          message: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const timestamp = new Date();

        // Using a basic event since we removed the test events
        await eventBus.emit<BaseEvent>({
          kind: "TestNotification",
          message: input.message,
          timestamp,
        });

        return {
          success: true,
          timestamp,
        };
      }),
  });
}
