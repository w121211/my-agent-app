import { Logger, ILogObj } from "tslog";
import {
  EventType,
  EventUnion,
  ClientEventUnion,
  ServerEventUnion,
  ClientEventType,
  ServerEventType,
} from "./event-types.js";

// Handler type for both sync and async event handlers
export type EventHandler<T extends EventUnion> = (
  event: T
) => void | Promise<void>;

/**
 * Core event bus interface
 */
export interface IEventBus {
  emit<T extends EventUnion>(event: T): Promise<void>;
  subscribe<T extends EventUnion>(
    eventType: EventType,
    handler: EventHandler<T>
  ): () => void;
  subscribeToAllClientEvents(
    handler: EventHandler<ClientEventUnion>
  ): () => void;
  subscribeToAllServerEvents(
    handler: EventHandler<ServerEventUnion>
  ): () => void;
  unsubscribe<T extends EventUnion>(
    eventType: EventType,
    handler: EventHandler<T>
  ): void;
  unsubscribeAll(eventType: EventType): void;
  hasHandlers(eventType: EventType): boolean;
  getHandlerCount(eventType: EventType): number;
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
  private handlers: Map<EventType, Set<EventHandler<any>>> = new Map();
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
  public subscribe<T extends EventUnion>(
    eventType: EventType,
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler);

    this.logger.debug(`Subscribed handler to ${eventType}`);

    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Subscribe to all client events
   * Returns an unsubscribe function for easy cleanup
   */
  public subscribeToAllClientEvents(
    handler: EventHandler<ClientEventUnion>
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    // Add to client events
    Object.values(ClientEventType).forEach((type) => {
      unsubscribers.push(this.subscribe(type, handler));
    });

    this.logger.debug(
      `Subscribed handler to all client events (${Object.values(ClientEventType).length} events)`
    );

    // Return a function that unsubscribes from all
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Subscribe to all server events
   * Returns an unsubscribe function for easy cleanup
   */
  public subscribeToAllServerEvents(
    handler: EventHandler<ServerEventUnion>
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    // Add to server events
    Object.values(ServerEventType).forEach((type) => {
      unsubscribers.push(this.subscribe(type, handler));
    });

    this.logger.debug(
      `Subscribed handler to all server events (${Object.values(ServerEventType).length} events)`
    );

    // Return a function that unsubscribes from all
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  /**
   * Unsubscribe a specific handler from an event type
   */
  public unsubscribe<T extends EventUnion>(
    eventType: EventType,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      return;
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.delete(handler);

    if (handlers.size === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Unsubscribe all handlers for a specific event type
   */
  public unsubscribeAll(eventType: EventType): void {
    this.handlers.delete(eventType);
  }

  /**
   * Emit an event to all subscribed handlers
   */
  public async emit<T extends EventUnion>(event: T): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.handlers.get(eventType);

    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises = Array.from(handlers).map((handler) =>
      this.executeHandler(handler, event)
    );

    await Promise.all(promises);

    this.logger.debug(`Emitted ${eventType} to ${handlers.size} handlers`);
  }

  /**
   * Check if handlers exist for an event type
   */
  public hasHandlers(eventType: EventType): boolean {
    return !!this.handlers.get(eventType)?.size;
  }

  /**
   * Get the number of handlers for an event type
   */
  public getHandlerCount(eventType: EventType): number {
    return this.handlers.get(eventType)?.size || 0;
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
