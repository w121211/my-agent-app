// packages/events-core/src/server/routers/event-router.ts
import { z } from "zod";
import { tracked } from "@trpc/server";
import { IEventBus, BaseEvent } from "../../event-bus.js";
import { router, publicProcedure } from "../trpc-server.js";

// Define the known event kinds
const eventKindEnum = z.enum([
  "FileWatcherEvent",
  "ChatUpdatedEvent",
  "TaskUpdatedEvent",
  "ProjectFolderUpdatedEvent",
  "PingEvent",
]);

export function createEventRouter(eventBus: IEventBus) {
  return router({
    // Subscribe to all events (generic subscription)
    allEvents: publicProcedure
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

    // Subscribe to a specific event kind
    subscribeToEvent: publicProcedure
      .input(
        z.object({
          eventKind: eventKindEnum,
          lastEventId: z.string().optional(), // For tracked events
        })
      )
      .subscription(async function* ({ input, ctx, signal }) {
        const { eventKind, lastEventId } = input;

        // Subscribe to the specific event kind
        for await (const [event] of eventBus.toIterable<BaseEvent>(eventKind, {
          signal,
        })) {
          yield tracked(event.timestamp.toISOString(), event);
        }
      }),

    // Send a ping and receive a pong
    ping: publicProcedure
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
