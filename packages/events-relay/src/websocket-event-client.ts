import { IEventBus } from "@repo/events-core/event-bus";
import {
  EventUnion,
  isClientEvent,
  isServerEvent,
  ClientEventUnion,
} from "@repo/events-core/types";
import {
  RelayMessageType,
  ClientEventMessage,
  ServerEventMessage,
  RelayMessage,
} from "./types.js";

/**
 * Configuration options for the WebSocket client
 */
export interface WebSocketClientOptions {
  port?: number;
  hostname?: string;
  protocol?: string;
  eventBus: IEventBus;
}

/**
 * WebSocket client that provides bidirectional event communication
 * between client and server event buses
 */
export class WebSocketEventClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private eventBusUnsubscriber: (() => void) | null = null;
  private isConnected = false;

  constructor(
    private readonly url: string,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Connects to the WebSocket server and sets up bidirectional event relay
   */
  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.handleReconnect();
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.unsubscribeFromEventBus();
    this.isConnected = false;
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      this.isConnected = true;

      // Subscribe to client events to forward to server
      this.subscribeToEventBus();
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      this.unsubscribeFromEventBus();
      this.isConnected = false;
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onmessage = this.handleServerMessage;
  }

  /**
   * Subscribes to client events on the event bus to forward them to the server
   */
  private subscribeToEventBus(): void {
    // Unsubscribe first to prevent duplicate handlers
    this.unsubscribeFromEventBus();

    // Subscribe to all client events to forward to the server
    this.eventBusUnsubscriber = this.eventBus.subscribeToAllClientEvents(
      async (event) => {
        // Only forward client events to the server
        if (isClientEvent(event)) {
          await this.sendClientEvent(event);
        }
      }
    );
  }

  /**
   * Unsubscribes from the event bus
   */
  private unsubscribeFromEventBus(): void {
    if (this.eventBusUnsubscriber) {
      this.eventBusUnsubscriber();
      this.eventBusUnsubscriber = null;
    }
  }

  /**
   * Handles reconnection logic with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      this.connect();
    }, delay);
  }

  /**
   * Sends a client event to the server
   */
  private async sendClientEvent(event: EventUnion): Promise<void> {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.isConnected
    ) {
      console.warn(
        "WebSocket is not connected, cannot send event:",
        event.eventType
      );
      return;
    }

    const message: ClientEventMessage = {
      type: RelayMessageType.CLIENT_EVENT,
      event: event,
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending event ${event.eventType} to server:`, error);
    }
  }

  /**
   * Handles incoming messages from the server
   */
  private handleServerMessage = (message: MessageEvent): void => {
    try {
      const data = JSON.parse(message.data) as RelayMessage;

      switch (data.type) {
        case RelayMessageType.SERVER_EVENT:
          // Forward server events to client event bus
          const serverEvent = (data as ServerEventMessage).event;

          if (isServerEvent(serverEvent)) {
            this.eventBus.emit(serverEvent);
          } else {
            throw new Error(
              `Invalid server event received: ${JSON.stringify(serverEvent)}`
            );
          }
          break;

        case RelayMessageType.ERROR:
          console.error("Received error from server:", data);
          break;

        default:
          console.warn("Received unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error handling server message:", error);
    }
  };
}

// Singleton instance
let webSocketEventClientInstance: WebSocketEventClient | null = null;

/**
 * Gets or creates a WebSocket client instance
 */
export function getWebSocketEventClient(
  options: WebSocketClientOptions
): WebSocketEventClient {
  // Only create in browser environment
  if (typeof window === "undefined") {
    throw new Error(
      "getWebSocketEventClient can only be called in browser environment"
    );
  }

  // Return existing instance if available
  if (webSocketEventClientInstance) {
    return webSocketEventClientInstance;
  }

  // Create new instance with provided options
  const port = options.port || 8000;
  const hostname = options.hostname || window.location.hostname;
  const protocol =
    options.protocol ||
    (window.location.protocol === "https:" ? "wss:" : "ws:");
  const url = `${protocol}//${hostname}:${port}/ws`;

  webSocketEventClientInstance = new WebSocketEventClient(
    url,
    options.eventBus
  );
  return webSocketEventClientInstance;
}

/**
 * Resets the WebSocket client instance (mainly for testing)
 */
export function resetWebSocketClient(): void {
  if (webSocketEventClientInstance) {
    webSocketEventClientInstance.disconnect();
    webSocketEventClientInstance = null;
  }
}
