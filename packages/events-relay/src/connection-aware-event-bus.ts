import { ILogObj, Logger } from "tslog";
import {
  IEventBus,
  EventHandler,
  EventBusEnvironment,
} from "@repo/events-core/event-bus";
import {
  BaseEvent,
  EventKind,
  isClientEvent,
} from "@repo/events-core/event-types";
import { IWebSocketEventClient } from "./websocket-event-client.js";

/**
 * Event bus implementation that is aware of the WebSocket connection state
 * Will prevent emitting client events when the connection is down
 */
export class ConnectionAwareEventBus implements IEventBus {
  private logger: Logger<ILogObj>;

  constructor(
    private eventBus: IEventBus,
    private wsClient: IWebSocketEventClient,
    logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger({ name: "ConnectionAwareEventBus" });
  }

  /**
   * Emits an event, but throws an error if trying to emit a client event
   * when the WebSocket is disconnected
   */
  public async emit<T extends BaseEvent>(event: T): Promise<void> {
    // Check connection status for client events
    if (isClientEvent(event) && !this.wsClient.isConnected()) {
      const error = new Error(
        `Cannot emit event ${event.kind}: WebSocket disconnected`
      );
      this.logger.error(error);
      throw error;
    }

    return this.eventBus.emit(event);
  }

  /**
   * Subscribe to events of a specific type
   */
  public subscribe<T extends BaseEvent>(
    eventKind: EventKind,
    handler: EventHandler<T>
  ): () => void {
    return this.eventBus.subscribe(eventKind, handler);
  }

  /**
   * Subscribe to all client events
   */
  public subscribeToAllClientEvents<T extends BaseEvent>(
    handler: EventHandler<T>
  ): () => void {
    return this.eventBus.subscribeToAllClientEvents(handler);
  }

  /**
   * Subscribe to all server events
   */
  public subscribeToAllServerEvents<T extends BaseEvent>(
    handler: EventHandler<T>
  ): () => void {
    return this.eventBus.subscribeToAllServerEvents(handler);
  }

  /**
   * Unsubscribe a specific handler from an event type
   */
  public unsubscribe<T extends BaseEvent>(
    eventKind: EventKind,
    handler: EventHandler<T>
  ): void {
    this.eventBus.unsubscribe(eventKind, handler);
  }

  /**
   * Unsubscribe all handlers for a specific event type
   */
  public unsubscribeAll(eventKind: EventKind): void {
    this.eventBus.unsubscribeAll(eventKind);
  }

  /**
   * Check if handlers exist for an event kind
   */
  public hasHandlers(eventKind: EventKind): boolean {
    return this.eventBus.hasHandlers(eventKind);
  }

  /**
   * Get the number of handlers for an event kind
   */
  public getHandlerCount(eventKind: EventKind): number {
    return this.eventBus.getHandlerCount(eventKind);
  }

  /**
   * Clear all event handlers
   */
  public clear(): void {
    this.eventBus.clear();
  }
}
