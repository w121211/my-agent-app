// packages/events-core/src/event-bus.ts
import { Logger, ILogObj } from "tslog";

// Base event interface
export interface BaseEvent {
  kind: string;
  timestamp: Date;
  correlationId?: string;
}

// Handler type for both sync and async event handlers
export type EventHandler<T extends BaseEvent> = (
  event: T
) => void | Promise<void>;

// Core event bus interface
export interface IEventBus {
  emit<T extends BaseEvent>(event: T): Promise<void>;
  subscribe<T extends BaseEvent>(
    eventKind: string,
    handler: EventHandler<T>
  ): () => void;
  unsubscribe<T extends BaseEvent>(
    eventKind: string,
    handler: EventHandler<T>
  ): void;
  toIterable<T extends BaseEvent>(
    eventKind: string,
    opts?: { signal?: AbortSignal }
  ): AsyncIterable<[T]>;
}

export type EventBusEnvironment = "client" | "server";

export interface EventBusOptions {
  logger?: Logger<ILogObj>;
  environment: EventBusEnvironment;
}

// Event bus implementation
export class EventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();
  private logger: Logger<ILogObj>;
  private environment: EventBusEnvironment;

  constructor(options: EventBusOptions) {
    this.environment = options.environment;
    this.logger =
      options.logger || new Logger({ name: `EventBus-${this.environment}` });
  }

  public subscribe<T extends BaseEvent>(
    eventKind: string,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventKind)) {
      this.handlers.set(eventKind, new Set());
    }

    const handlers = this.handlers.get(eventKind)!;
    handlers.add(handler);

    return () => this.unsubscribe(eventKind, handler);
  }

  public unsubscribe<T extends BaseEvent>(
    eventKind: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventKind)) {
      return;
    }

    const handlers = this.handlers.get(eventKind)!;
    handlers.delete(handler);

    if (handlers.size === 0) {
      this.handlers.delete(eventKind);
    }
  }

  public async emit<T extends BaseEvent>(event: T): Promise<void> {
    const eventKind = event.kind;
    const handlers = this.handlers.get(eventKind);

    if (!handlers || handlers.size === 0) {
      this.logger.warn(
        `No handlers found for ${eventKind} - event will not be processed`
      );
      return;
    }

    const promises = Array.from(handlers).map((handler) =>
      this.executeHandler(handler, event)
    );

    await Promise.all(promises);
  }

  public toIterable<T extends BaseEvent>(
    eventKind: string,
    opts?: { signal?: AbortSignal }
  ): AsyncIterable<[T]> {
    interface QueueItem {
      resolve: (value: IteratorResult<[T], any>) => void;
      reject: (reason?: any) => void;
    }

    return {
      [Symbol.asyncIterator]: () => {
        const queue: T[] = [];
        const waiters: QueueItem[] = [];
        let isDone = false;

        const onEvent = (event: T) => {
          if (waiters.length > 0) {
            const waiter = waiters.shift()!;
            waiter.resolve({ done: false, value: [event] });
          } else {
            queue.push(event);
          }
        };

        const unsubscribe = this.subscribe<T>(eventKind, onEvent);

        const cleanup = () => {
          unsubscribe();
          isDone = true;

          // Resolve any pending waiters
          for (const waiter of waiters) {
            waiter.resolve({ done: true, value: undefined });
          }
          waiters.length = 0;
        };

        // Setup AbortSignal handler
        if (opts?.signal) {
          // If already aborted, clean up immediately
          if (opts.signal.aborted) {
            cleanup();
          } else {
            // Otherwise listen for abort event
            opts.signal.addEventListener("abort", cleanup, { once: true });
          }
        }

        return {
          next: async (): Promise<IteratorResult<[T], any>> => {
            if (isDone) {
              return { done: true, value: undefined };
            }

            // If we have items in the queue, return one
            if (queue.length > 0) {
              const event = queue.shift()!;
              return { done: false, value: [event] };
            }

            // Otherwise wait for an event
            return new Promise<IteratorResult<[T], any>>((resolve, reject) => {
              waiters.push({ resolve, reject });
            });
          },
          return: async (): Promise<IteratorResult<[T], any>> => {
            cleanup();
            return { done: true, value: undefined };
          },
          throw: async (err: Error): Promise<IteratorResult<[T], any>> => {
            cleanup();
            throw err;
          },
        };
      },
    };
  }

  private async executeHandler<T extends BaseEvent>(
    handler: EventHandler<T>,
    event: T
  ): Promise<void> {
    const result = handler(event);
    if (result instanceof Promise) {
      await result;
    }
  }
}

// Factory functions for creating environment-specific event buses
export const createClientEventBus = (
  options: Omit<EventBusOptions, "environment"> = {}
) => {
  const logger = options.logger || new Logger({ name: "EventBus-client" });
  return new EventBus({ ...options, logger, environment: "client" });
};

export const createServerEventBus = (
  options: Omit<EventBusOptions, "environment"> = {}
) => {
  const logger = options.logger || new Logger({ name: "EventBus-server" });
  return new EventBus({ ...options, logger, environment: "server" });
};
