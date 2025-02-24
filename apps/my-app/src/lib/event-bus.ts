import { BaseEvent } from "@/lib/event-types";

export interface EventBus {
  emit<E extends BaseEvent>(event: E): void;
  subscribe<E extends BaseEvent>(
    eventType: E["event_type"],
    callback: (event: E) => void
  ): () => void;
}

class EventBusImpl implements EventBus {
  private events: Map<string, Set<(event: BaseEvent) => void>>;

  constructor() {
    this.events = new Map();
  }

  emit<E extends BaseEvent>(event: E) {
    const callbacks = this.events.get(event.event_type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(
            `Error in event callback for ${event.event_type}:`,
            error
          );
        }
      });
    }
  }

  subscribe<E extends BaseEvent>(
    eventType: E["event_type"],
    callback: (event: E) => void
  ) {
    console.log(`Subscribing to event: ${eventType}`);

    if (!this.events.has(eventType)) {
      this.events.set(eventType, new Set());
    }

    const callbacks = this.events.get(eventType)!;
    callbacks.add(callback as (event: BaseEvent) => void);

    return () => {
      callbacks.delete(callback as (event: BaseEvent) => void);
      if (callbacks.size === 0) {
        this.events.delete(eventType);
      }
    };
  }
}

export const eventBus = new EventBusImpl();
