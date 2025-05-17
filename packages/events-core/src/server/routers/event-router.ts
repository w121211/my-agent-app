// packages/events-core/src/server/routers/event-router.ts
import { tracked } from "@trpc/server";
import { z } from "zod";
import { IEventBus, BaseEvent } from "../../event-bus.js";
import { router, loggedProcedure } from "../trpc-server.js";
import { FileWatcherEvent } from "../../services/file-watcher-service.js";
import { ChatUpdatedEvent } from "../../services/chat-service.js";
import { TaskUpdatedEvent } from "../../services/task-service.js";

export function createEventRouter(eventBus: IEventBus) {
  return router({
    // Subscribe to file change events
    fileChanges: loggedProcedure
      .input(
        z
          .object({
            workspacePath: z.string().optional(),
            lastEventId: z.string().optional(), // Added for tracked events
          })
          .optional()
      )
      .subscription(async function* ({ input, ctx, signal }) {
        // Create an iterable from the FileWatcherEvent events
        for await (const [event] of eventBus.toIterable<FileWatcherEvent>(
          "FileWatcherEvent",
          { signal }
        )) {
          // If a workspace path filter is provided, only emit events for that path
          if (
            input?.workspacePath &&
            !event.absoluteFilePath.startsWith(input.workspacePath)
          ) {
            continue;
          }

          // Yield the tracked event directly
          yield tracked(event.timestamp.toISOString(), event);
        }
      }),

    // Subscribe to chat updates
    chatUpdates: loggedProcedure
      .input(
        z
          .object({
            chatId: z.string().optional(),
            lastEventId: z.string().optional(), // Added for tracked events
          })
          .optional()
      )
      .subscription(async function* ({ input, ctx, signal }) {
        // Create an iterable from the ChatUpdatedEvent events
        for await (const [event] of eventBus.toIterable<ChatUpdatedEvent>(
          "ChatUpdatedEvent",
          { signal }
        )) {
          // If a chat ID filter is provided, only emit events for that chat
          if (input?.chatId && event.chatId !== input.chatId) {
            continue;
          }

          // Yield the tracked event directly
          yield tracked(event.timestamp.toISOString(), event);
        }
      }),

    // Subscribe to task updates
    taskUpdates: loggedProcedure
      .input(
        z
          .object({
            taskId: z.string().optional(),
            lastEventId: z.string().optional(), // Added for tracked events
          })
          .optional()
      )
      .subscription(async function* ({ input, ctx, signal }) {
        // Create an iterable from the TaskUpdatedEvent events
        for await (const [event] of eventBus.toIterable<TaskUpdatedEvent>(
          "TaskUpdatedEvent",
          { signal }
        )) {
          // If a task ID filter is provided, only emit events for that task
          if (input?.taskId && event.taskId !== input.taskId) {
            continue;
          }

          // Yield the tracked event directly
          yield tracked(event.timestamp.toISOString(), event);
        }
      }),

    // Subscribe to all events (generic subscription)
    allEvents: loggedProcedure
      .input(
        z
          .object({
            lastEventId: z.string().optional(), // For tracked events
          })
          .optional()
      )
      .subscription(async function* ({ input, ctx, signal }) {
        const kinds = [
          "FileWatcherEvent",
          "ChatUpdatedEvent",
          "TaskUpdatedEvent",
        ];

        // This function will yield events from a specific kind
        async function* streamEvents<T extends BaseEvent>(kind: string) {
          for await (const [event] of eventBus.toIterable<T>(kind, {
            signal,
          })) {
            yield event;
          }
        }

        // Create combined streams
        const streams = kinds.map((kind) => streamEvents(kind));

        // Race condition handling - process events as they come in from any stream
        while (true) {
          const results = await Promise.race(
            streams.map(async (stream) => {
              const { value, done } = await stream.next();
              return { value, done, stream };
            })
          );

          if (results.done) {
            break;
          }

          if (results.value) {
            yield tracked(results.value.timestamp.toISOString(), results.value);
          }
        }
      }),

    // Send a ping and receive a pong
    ping: loggedProcedure
      .input(
        z.object({
          message: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const timestamp = new Date();

        // Optional: emit a ping event that could be subscribed to
        await eventBus.emit<BaseEvent & { message: string }>({
          kind: "PingEvent",
          message: input.message || "ping",
          timestamp,
        });

        return {
          status: "pong",
          message: input.message ? `Pong: ${input.message}` : "Pong",
          timestamp,
        };
      }),
  });
}
