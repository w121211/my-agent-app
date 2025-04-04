import { Logger, ILogObj } from "tslog";
import {
  EventKind,
  EventUnion,
  ClientEventKind,
  ServerEventKind,
  BaseEvent,
} from "./event-types.js";

// Handler type for both sync and async event handlers
export type EventHandler<T extends BaseEvent> = (
  event: T
) => void | Promise<void>;

/**
 * Core event bus interface
 */
export interface IEventBus {
  emit<T extends BaseEvent>(event: T): Promise<void>;
  subscribe<T extends BaseEvent>(
    eventKind: EventKind,
    handler: EventHandler<T>
  ): () => void;
  subscribeToAllClientEvents<T extends BaseEvent>(
    handler: EventHandler<T>
  ): () => void;
  subscribeToAllServerEvents<T extends BaseEvent>(
    handler: EventHandler<T>
  ): () => void;
  unsubscribe<T extends BaseEvent>(
    eventKind: EventKind,
    handler: EventHandler<T>
  ): void;
  unsubscribeAll(eventKind: EventKind): void;
  hasHandlers(eventKind: EventKind): boolean;
  getHandlerCount(eventKind: EventKind): number;
  clear(): void;
}

export type EventBusEnvironment = "client" | "server";

export interface EventBusOptions {
  logger?: Logger<ILogObj>;
  environment: EventBusEnvironment;
}

/**
 * Enhanced event bus implementation that supports both client and server events
 */
export class EventBus implements IEventBus {
  private handlers: Map<EventKind, Set<EventHandler<any>>> = new Map();
  private logger: Logger<ILogObj>;
  private environment: EventBusEnvironment;

  constructor(options: EventBusOptions) {
    this.environment = options.environment;
    this.logger =
      options.logger || new Logger({ name: `EventBus-${this.environment}` });
  }

  /**
   * Subscribe to events of a specific type
   * Returns an unsubscribe function for easy cleanup
   */
  public subscribe<T extends BaseEvent>(
    eventKind: EventKind,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventKind)) {
      this.handlers.set(eventKind, new Set());
    }

    const handlers = this.handlers.get(eventKind)!;
    handlers.add(handler);

    this.logger.debug(`Subscribed handler to ${eventKind}`);

    return () => this.unsubscribe(eventKind, handler);
  }

  /**
   * Subscribe to all client events
   * Returns an unsubscribe function for easy cleanup
   */
  public subscribeToAllClientEvents<T extends BaseEvent>(
    handler: EventHandler<T>
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    // Add to client events
    Object.values(ClientEventKind).forEach((kind) => {
      unsubscribers.push(this.subscribe(kind, handler));
    });

    this.logger.debug(
      `Subscribed handler to all client events (${Object.values(ClientEventKind).length} events)`
    );

    // Return a function that unsubscribes from all
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Subscribe to all server events
   * Returns an unsubscribe function for easy cleanup
   */
  public subscribeToAllServerEvents<T extends BaseEvent>(
    handler: EventHandler<T>
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    // Add to server events
    Object.values(ServerEventKind).forEach((kind) => {
      unsubscribers.push(this.subscribe(kind, handler));
    });

    this.logger.debug(
      `Subscribed handler to all server events (${Object.values(ServerEventKind).length} events)`
    );

    // Return a function that unsubscribes from all
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Unsubscribe a specific handler from an event type
   */
  public unsubscribe<T extends BaseEvent>(
    eventKind: EventKind,
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

  /**
   * Unsubscribe all handlers for a specific event type
   */
  public unsubscribeAll(eventKind: EventKind): void {
    this.handlers.delete(eventKind);
  }

  /**
   * Emit an event to all subscribed handlers
   */
  public async emit<T extends BaseEvent>(event: T): Promise<void> {
    const eventKind = event.kind;
    const handlers = this.handlers.get(eventKind);

    this.logger.debug(
      `Emitting ${eventKind} to ${handlers?.size || 0} handlers`
    );

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

    this.logger.debug(`Emitted ${eventKind} to ${handlers.size} handlers`);
  }

  /**
   * Check if handlers exist for an event kind
   */
  public hasHandlers(eventKind: EventKind): boolean {
    return !!this.handlers.get(eventKind)?.size;
  }

  /**
   * Get the number of handlers for an event kind
   
   */
  public getHandlerCount(eventKind: EventKind): number {
    return this.handlers.get(eventKind)?.size || 0;
  }

  /**
   * Clear all event handlers
   */
  public clear(): void {
    this.handlers.clear();
  }

  /**
   * Get the environment this event bus is running in
   */
  public getEnvironment(): EventBusEnvironment {
    return this.environment;
  }

  /**
   * Execute a handler with error handling
   */
  private async executeHandler<T extends EventUnion>(
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

  // Check if we're in a browser environment
  if (typeof window === "undefined" || typeof window.document === "undefined") {
    logger.warn(
      "Creating a client event bus in a non-browser environment may lead to unexpected behavior"
    );
  }

  return new EventBus({ ...options, logger, environment: "client" });
};

export const createServerEventBus = (
  options: Omit<EventBusOptions, "environment"> = {}
) => {
  const logger = options.logger || new Logger({ name: "EventBus-server" });

  // Check if we're in a Node.js environment
  if (
    typeof process === "undefined" ||
    !process.versions ||
    !process.versions.node
  ) {
    logger.warn(
      "Creating a server event bus in a non-Node.js environment may lead to unexpected behavior"
    );
  }

  return new EventBus({ ...options, logger, environment: "server" });
};
