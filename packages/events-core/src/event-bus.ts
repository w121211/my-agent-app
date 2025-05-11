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
