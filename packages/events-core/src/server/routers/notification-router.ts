// File path: packages/events-core/src/server/routers/notification-router.ts

import { observable } from "@trpc/server/observable";
import { z } from "zod";
import { router, loggedProcedure } from "../trpc-server.js";
import { IEventBus } from "../../event-bus.js";
import { BaseServerEvent } from "../../event-types.js";

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
        // Create an observable that will emit file change events
        return observable<{ event: string; path: string; timestamp: Date }>(
          (emit) => {
            // Function to handle events from the event bus
            const handleFileEvent = (event: BaseServerEvent) => {
              if (event.kind === "ServerFileWatcherEvent") {
                const { data } = event;
                // If a workspace path filter is provided, only emit events for that path
                if (
                  input?.workspacePath &&
                  !data.srcPath.startsWith(input.workspacePath)
                ) {
                  return;
                }

                emit.next({
                  event: data.fsEventKind,
                  path: data.srcPath,
                  timestamp: event.timestamp,
                });
              }
            };

            // Subscribe to the event bus for file watcher events
            const unsubscribe = eventBus.subscribe(
              "ServerFileWatcherEvent",
              handleFileEvent
            );

            // Return a cleanup function that will be called when the client unsubscribes
            return () => {
              unsubscribe();
            };
          }
        );
      }),

    // Get all real-time notifications
    allEvents: loggedProcedure.subscription(() => {
      return observable<{ kind: string; data: any; timestamp: Date }>(
        (emit) => {
          // Function to handle all server events
          const handleEvent = (event: BaseServerEvent) => {
            emit.next({
              kind: event.kind,
              data: { ...event },
              timestamp: event.timestamp,
            });
          };

          // Subscribe to all server events
          const unsubscribe = eventBus.subscribeToAllServerEvents(handleEvent);

          // Return cleanup function
          return () => {
            unsubscribe();
          };
        }
      );
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

        await eventBus.emit({
          kind: "ServerTestPing",
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
