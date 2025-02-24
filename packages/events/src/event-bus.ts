/**
 * event-bus.ts
 * Implementation of an event bus for an event-driven architecture
 */

import { Logger } from "tslog";
import { AsyncEventHandler, BaseEvent, EventType } from "./types.js";

export interface IEventBus {
  publish(event: BaseEvent): Promise<void>;
  subscribe(eventType: EventType, handler: AsyncEventHandler<BaseEvent>): void;
  unsubscribe(
    eventType: EventType,
    handler: AsyncEventHandler<BaseEvent>
  ): void;
}

export class EventBus implements IEventBus {
  private handlers: Map<EventType, Set<AsyncEventHandler<BaseEvent>>> =
    new Map();
  private logger: Logger<object>;

  constructor(logger?: Logger<object>) {
    this.logger = logger || new Logger({ name: "EventBus" });
  }

  public subscribe(
    eventType: EventType,
    handler: AsyncEventHandler<BaseEvent>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);
    this.logger.debug(`Subscribed handler to ${eventType}`);
  }

  public unsubscribe(
    eventType: EventType,
    handler: AsyncEventHandler<BaseEvent>
  ): void {
    const eventHandlers = this.handlers.get(eventType);

    if (eventHandlers && eventHandlers.has(handler)) {
      eventHandlers.delete(handler);
      this.logger.debug(`Unsubscribed handler from ${eventType}`);
    }
  }

  public async publish(event: BaseEvent): Promise<void> {
    const eventType = event.type;
    const eventHandlers = this.handlers.get(eventType);

    if (!eventHandlers || eventHandlers.size === 0) {
      this.logger.debug(`No handlers registered for event type: ${eventType}`);
      return;
    }

    const promises: Promise<void>[] = [];

    for (const handler of eventHandlers) {
      promises.push(this.executeHandler(handler, event));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      this.logger.debug(
        `Published event ${eventType} to ${promises.length} handlers`
      );
    }
  }

  private async executeHandler(
    handler: AsyncEventHandler<BaseEvent>,
    event: BaseEvent
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      this.logger.error(`Error in event handler: ${(error as Error).message}`, {
        eventType: event.type,
        errorStack: (error as Error).stack,
      });
    }
  }
}

/**
 * Create and export a default instance of the event bus
 */
export const eventBus = new EventBus();
