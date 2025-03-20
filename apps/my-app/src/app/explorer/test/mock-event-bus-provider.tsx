import { JSX, ReactNode, createContext, useContext, useState } from "react";
import { Logger, ILogObj } from "tslog";
import {
  EventType,
  EventUnion,
  ClientEventUnion,
  ServerEventUnion,
} from "@repo/events-core/event-types";
import { IEventBus, EventHandler } from "@repo/events-core/event-bus";

// Create context for the mock event bus
const MockEventBusContext = createContext<IEventBus | null>(null);

// Logger instance
const logger: Logger<ILogObj> = new Logger({ name: "MockEventBus" });

/**
 * Simple mock event bus for testing
 */
class MockEventBus implements IEventBus {
  private handlers: Map<EventType, Set<EventHandler<any>>> = new Map();
  private logger: Logger<ILogObj>;

  constructor(customLogger?: Logger<ILogObj>) {
    this.logger = customLogger || logger;
    this.logger.info("Mock event bus created");
  }

  async emit<T extends EventUnion>(event: T): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.handlers.get(eventType);

    if (!handlers || handlers.size === 0) {
      this.logger.debug(`No handlers for event type: ${eventType}`);
      return;
    }

    this.logger.info(`Emitting ${eventType} to ${handlers.size} handlers`);

    const promises = Array.from(handlers).map((handler) =>
      Promise.resolve(handler(event))
    );

    await Promise.all(promises);
  }

  subscribe<T extends EventUnion>(
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

  subscribeToAllClientEvents(
    handler: EventHandler<ClientEventUnion>
  ): () => void {
    this.logger.debug("Subscribed handler to all client events");
    // For testing, we just return a no-op unsubscribe function
    return () => {};
  }

  subscribeToAllServerEvents(
    handler: EventHandler<ServerEventUnion>
  ): () => void {
    this.logger.debug("Subscribed handler to all server events");
    // For testing, we just return a no-op unsubscribe function
    return () => {};
  }

  unsubscribe<T extends EventUnion>(
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

  unsubscribeAll(eventType: EventType): void {
    this.handlers.delete(eventType);
  }

  hasHandlers(eventType: EventType): boolean {
    return !!this.handlers.get(eventType)?.size;
  }

  getHandlerCount(eventType: EventType): number {
    return this.handlers.get(eventType)?.size || 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}

// Props for the provider
interface MockEventBusProviderProps {
  children: ReactNode;
  logger?: Logger<ILogObj>;
}

/**
 * Hook to access the mock event bus
 */
export const useMockEventBus = (): IEventBus => {
  const context = useContext(MockEventBusContext);
  if (!context) {
    throw new Error(
      "useMockEventBus must be used within a MockEventBusProvider"
    );
  }
  return context;
};

/**
 * Provider component for mock event bus
 */
export const MockEventBusProvider = ({
  children,
  logger,
}: MockEventBusProviderProps): JSX.Element => {
  const [eventBus] = useState<IEventBus>(() => new MockEventBus(logger));

  return (
    <MockEventBusContext.Provider value={eventBus}>
      {children}
    </MockEventBusContext.Provider>
  );
};

/**
 * Create a standalone mock event bus instance
 */
export const createMockEventBus = (logger?: Logger<ILogObj>): IEventBus => {
  return new MockEventBus(logger);
};
