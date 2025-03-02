import { Event, EventType } from "./types";

/**
 * Client-side event bus with transport capabilities
 * Serves as the primary event interface for frontend components
 */
export interface ClientEventBus {
  /**
   * Publish an event (sends to server and notifies local subscribers)
   */
  publish<T extends Event>(event: T): Promise<void>;

  /**
   * Subscribe to events of a specific type (from both local and server sources)
   */
  subscribe<T extends Event>(
    eventType: EventType,
    handler: (event: T) => void
  ): void;

  /**
   * Unsubscribe from events of a specific type
   */
  unsubscribe(eventType: EventType, handler: Function): void;

  /**
   * Get connection status with server
   */
  isConnected(): boolean;
}

/**
 * Server-side event transport interface
 */
export interface EventTransportServer {
  /**
   * Start the event transport server
   */
  start(): Promise<void>;

  /**
   * Stop the event transport server
   */
  stop(): Promise<void>;

  /**
   * Check if server is running
   */
  isRunning(): boolean;

  /**
   * Publish event to specific client
   */
  publishToClient<T extends Event>(clientId: string, event: T): Promise<void>;

  /**
   * Publish event to all connected clients
   */
  broadcast<T extends Event>(event: T): Promise<void>;

  /**
   * Subscribe to events from clients
   */
  subscribe<T extends Event>(
    eventType: EventType,
    handler: (event: T, clientId: string) => void
  ): void;

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: EventType, handler: Function): void;
}

/**
 * Options for WebSocket transport
 */
export interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * WebSocket implementation of client event bus
 */
export interface WebSocketClientEventBus extends ClientEventBus {
  /**
   * Configure the WebSocket connection
   */
  configure(url: string, options?: WebSocketOptions): void;
}

/**
 * WebSocket implementation of server event transport
 */
export interface WebSocketEventTransportServer extends EventTransportServer {
  /**
   * Configure server with port and optional path
   */
  configure(port: number, path?: string): void;
}
