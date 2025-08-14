// packages/events-core/src/server/routers/event-router.ts
import { z } from "zod";
import { tracked } from "@trpc/server";
import { IEventBus, BaseEvent } from "../../event-bus.js";
import { FileWatcherEvent } from "../../services/file-watcher-service.js";
import { TaskUpdatedEvent } from "../../services/task-service.js";
import { ProjectFolderUpdatedEvent } from "../../services/project-folder-service.js";
import { ChatUpdatedEvent } from "../../services/chat-engine/events.js";
import { router, publicProcedure } from "../trpc-server.js";

// Define the known event kinds
const eventKindEnum = z.enum([
  "FileWatcherEvent",
  "TaskUpdatedEvent",
  "ProjectFolderUpdatedEvent",
  "ChatUpdatedEvent",
] as const);

// Map event kinds to their event types
interface EventTypeMap {
  FileWatcherEvent: FileWatcherEvent;
  TaskUpdatedEvent: TaskUpdatedEvent;
  ProjectFolderUpdatedEvent: ProjectFolderUpdatedEvent;
  ChatUpdatedEvent: ChatUpdatedEvent;
  PingEvent: BaseEvent & { message: string };
}

// Helper function to create type-safe event subscriptions
function createEventSubscription<K extends keyof EventTypeMap>(
  eventBus: IEventBus,
  eventKind: K
) {
  return publicProcedure
    .input(
      z.object({
        lastEventId: z.string().nullable().optional(),
      })
    )
    .subscription(async function* ({ input, signal }) {
      for await (const [event] of eventBus.toIterable<EventTypeMap[K]>(
        eventKind,
        { signal }
      )) {
        yield tracked(event.timestamp.toISOString(), event);
      }
    });
}

export function createEventRouter(eventBus: IEventBus) {
  return router({
    fileWatcherEvents: createEventSubscription(eventBus, "FileWatcherEvent"),
    taskEvents: createEventSubscription(eventBus, "TaskUpdatedEvent"),
    projectFolderEvents: createEventSubscription(
      eventBus,
      "ProjectFolderUpdatedEvent"
    ),
    chatEvents: createEventSubscription(eventBus, "ChatUpdatedEvent"),

    // Subscribe to a specific event kind
    // subscribeToEvent: publicProcedure
    //   .input(
    //     z.object({
    //       eventKind: eventKindEnum,
    //       lastEventId: z.string().nullable().optional(), // For tracked events
    //     })
    //   )
    //   .subscription(async function* ({ input, signal }) {
    //     const { eventKind } = input;

    //     // Subscribe to the specific event kind
    //     for await (const [event] of eventBus.toIterable<
    //       EventTypeMap[typeof eventKind]
    //     >(eventKind, {
    //       signal,
    //     })) {
    //       yield tracked(event.timestamp.toISOString(), event);
    //     }
    //   }),

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
