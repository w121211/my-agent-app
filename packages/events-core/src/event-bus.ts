import { Logger, ILogObj } from "tslog";
import { AsyncEventHandler, EventUnion, EventType } from "./types.js";

/**
 * Interface defining core event bus functionality
 */
export interface IEventBus {
  /**
   * Publishes an event to all registered handlers
   */
  publish<T extends EventUnion>(event: T): Promise<void>;

  /**
   * Subscribes an async handler to an event type
   * Returns a function to unsubscribe the handler
   */
  subscribe<T extends EventUnion>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): () => void;

  /**
   * Unsubscribes a handler from an event type
   */
  unsubscribe<T extends EventUnion>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): void;

  /**
   * Unsubscribes all handlers for an event type
   */
  unsubscribeAll(eventType: EventType): void;

  /**
   * Checks if there are any handlers registered for an event type
   */
  hasHandlers(eventType: EventType): boolean;

  /**
   * Gets the number of handlers registered for an event type
   */
  getHandlerCount(eventType: EventType): number;

  /**
   * Clears all registered handlers
   */
  clear(): void;
}

/**
 * Configuration options for the event bus
 */
export interface EventBusOptions {
  logger?: Logger<ILogObj>;
  throwErrors?: boolean;
}

/**
 * Implementation of an event bus that handles async event handlers
 */
export class EventBus implements IEventBus {
  private handlers: Map<EventType, Set<AsyncEventHandler<any>>> = new Map();
  private logger: Logger<ILogObj>;
  private throwErrors: boolean;

  constructor(options: EventBusOptions = {}) {
    this.logger = options.logger || new Logger({ name: "EventBus" });
    this.throwErrors = options.throwErrors || false;
  }

  public subscribe<T extends EventUnion>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler);

    this.logger.debug(`Subscribed handler to ${eventType}`);

    // Return unsubscribe function for easier cleanup
    return () => this.unsubscribe(eventType, handler);
  }

  public unsubscribe<T extends EventUnion>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      return;
    }

    const handlers = this.handlers.get(eventType)!;
    const deleted = handlers.delete(handler);

    if (deleted) {
      this.logger.debug(`Unsubscribed handler from ${eventType}`);
    }
  }

  public unsubscribeAll(eventType: EventType): void {
    if (this.handlers.has(eventType)) {
      const count = this.handlers.get(eventType)!.size;
      this.handlers.delete(eventType);
      this.logger.debug(`Unsubscribed all ${count} handlers from ${eventType}`);
    }
  }

  public async publish<T extends EventUnion>(event: T): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.handlers.get(eventType);

    if (!handlers || handlers.size === 0) {
      return;
    }

    const promises = Array.from(handlers).map((handler) =>
      this.executeHandler(handler, event)
    );
    await Promise.all(promises).catch((error) => {
      this.logger.error(`Error publishing event ${eventType}: ${error}`);
      if (this.throwErrors) {
        throw error;
      }
    });
    this.logger.debug(
      `Published event ${eventType} to ${handlers.size} handlers`
    );
  }

  public hasHandlers(eventType: EventType): boolean {
    const handlers = this.handlers.get(eventType);
    return !!handlers && handlers.size > 0;
  }

  public getHandlerCount(eventType: EventType): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  public clear(): void {
    this.handlers.clear();
    this.logger.debug("Cleared all event handlers");
  }

  private async executeHandler<T extends EventUnion>(
    handler: AsyncEventHandler<T>,
    event: T
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      this.logger.error(`Error in event handler: ${error}`);
      if (this.throwErrors) {
        throw error;
      }
    }
  }
}
