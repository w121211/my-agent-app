/**
 * Adapter that bridges between the existing EventBus and the new EventChannel
 */

import { Logger, ILogObj } from "tslog";
import { IEventBus, EventHandler } from "@repo/events-core/event-bus";
import { BaseEvent, EventKind, isClientEvent } from "@repo/events-core/event-types";
import { EventChannel } from "./event-channel";

/**
 * Enhances EventBus with request-response capabilities and connection awareness
 */
export class EventBusAdapter implements IEventBus {
  private logger: Logger<ILogObj>;
  private connectionStatusHandlers = new Set<(isConnected: boolean) => void>();
  private statusUnsubscriber: (() => void) | null = null;

  constructor(
    private eventBus: IEventBus,
    private eventChannel: EventChannel,
    logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger({ name: "EventBusAdapter" });
    
    // Subscribe to connection status changes
    this.setupConnectionMonitoring();
  }

  /**
   * Emit an event, routing client events through the EventChannel
   */
  public async emit<T extends BaseEvent>(event: T): Promise<void> {
    // For client events, send through the channel if connected
    if (isClientEvent(event)) {
      if (this.eventChannel.isConnected()) {
        return this.eventChannel.sendEvent(event);
      } else {
        const error = new Error(`Cannot emit event ${event.kind}: disconnected from server`);
        this.logger.error(error);
        throw error;
      }
    }
    
    // For other events, use the local event bus
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

  /**
   * Connect to the server
   */
  public async connect(): Promise<void> {
    return this.eventChannel.connect();
  }

  /**
   * Disconnect from the server
   */
  public async disconnect(): Promise<void> {
    return this.eventChannel.disconnect();
  }

  /**
   * Check if connected to the server
   */
  public isConnected(): boolean {
    return this.eventChannel.isConnected();
  }

  /**
   * Register a handler for connection status changes
   */
  public onConnectionStatusChange(
    handler: (isConnected: boolean) => void
  ): () => void {
    this.connectionStatusHandlers.add(handler);
    
    // Immediately call with current status
    handler(this.isConnected());
    
    return () => {
      this.connectionStatusHandlers.delete(handler);
    };
  }

  /**
   * Send a request that expects a response
   */
  public async sendRequest<TReq extends BaseEvent, TRes extends BaseEvent>(
    requestEvent: TReq,
    responseEventKind: EventKind,
    timeoutMs?: number
  ): Promise<TRes> {
    return this.eventChannel.sendRequest(requestEvent, responseEventKind, timeoutMs);
  }

  private setupConnectionMonitoring(): void {
    // Subscribe to connection status changes on the channel
    this.statusUnsubscriber = this.eventChannel.onConnectionStatusChange((isConnected) => {
      // Notify all connection status handlers
      this.connectionStatusHandlers.forEach(handler => {
        try {
          handler(isConnected);
        } catch (error) {
          this.logger.error("Error in connection status change handler:", error);
        }
      });
      
      // Log the connection status change
      this.logger.info(`Connection status changed: ${isConnected ? "connected" : "disconnected"}`);
    });
  }
}

// Factory function for easier creation
export function createEventBusAdapter(
  eventBus: IEventBus,
  eventChannel: EventChannel,
  logger?: Logger<ILogObj>
): EventBusAdapter {
  return new EventBusAdapter(eventBus, eventChannel, logger);
}