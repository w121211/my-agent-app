// src/eventBus.ts

import { Logger } from "tslog";
import { EventType, BaseEvent } from "./types.js";

// 事件處理器類型定義
// type EventHandler<T extends BaseEvent> = (event: T) => void;
type AsyncEventHandler<T extends BaseEvent> = (event: T) => Promise<void>;

export interface IEventBus {
  publish<T extends BaseEvent>(event: T): Promise<void>;
  // subscribe<T extends BaseEvent>(
  //   eventType: EventType,
  //   handler: EventHandler<T>
  // ): void;
  subscribeAsync<T extends BaseEvent>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): void;
  unsubscribe<T extends BaseEvent>(
    eventType: EventType,
    // handler: EventHandler<T> | AsyncEventHandler<T>
    handler: AsyncEventHandler<T>
  ): void;
}

export class EventBus implements IEventBus {
  private asyncHandlers: Map<EventType, AsyncEventHandler<BaseEvent>[]>;
  private logger: Logger<object>;

  constructor() {
    this.asyncHandlers = new Map<EventType, AsyncEventHandler<BaseEvent>[]>();
    this.logger = new Logger({ name: "EventBus" });
  }

  async publish<T extends BaseEvent>(event: T): Promise<void> {
    const eventType = event.eventType;
    const tasks: Promise<void>[] = [];

    const asyncHandlers = this.asyncHandlers.get(eventType) || [];
    for (const handler of asyncHandlers) {
      tasks.push(
        handler(event).catch((error) => {
          this.logger.error(`Error in async event handler: ${error}`, error);
        })
      );
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
      this.logger.debug(
        `Published event ${eventType} to ${tasks.length} handlers`
      );
    }
  }

  subscribeAsync<T extends BaseEvent>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): void {
    if (!this.asyncHandlers.has(eventType)) {
      this.asyncHandlers.set(eventType, []);
    }
    this.asyncHandlers
      .get(eventType)!
      .push(handler as AsyncEventHandler<BaseEvent>);
    this.logger.debug(`Subscribed async handler to ${eventType}`);
  }

  unsubscribe<T extends BaseEvent>(
    eventType: EventType,
    handler: AsyncEventHandler<T>
  ): void {
    const handlers = this.asyncHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler as AsyncEventHandler<BaseEvent>);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.logger.debug(`Unsubscribed async handler from ${eventType}`);
    }
  }
}

// 單例模式（可選）
export const eventBus = new EventBus();
