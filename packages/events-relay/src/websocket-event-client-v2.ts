import { ILogObj, Logger } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  ClientEventUnion,
  isClientEvent,
  isServerEvent,
} from "@repo/events-core/event-types";
import {
  ClientEventRelayMessage,
  ServerEventRelayMessage,
  RelayMessage,
} from "./relay-types.js";

/**
 * Interface defining the WebSocket event client contract
 */
export interface IWebSocketEventClient {
  connect(): void;
  disconnect(): void;
}

/**
 * Configuration options for the WebSocket client
 */
export type WebSocketClientOptions = {
  port?: number;
  hostname?: string;
  protocol?: string;
  eventBus: IEventBus;
  logger?: Logger<ILogObj>;
};

/**
 * WebSocket client that provides bidirectional event communication
 * between client and server event buses
 */
export class WebSocketEventClient implements IWebSocketEventClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private eventBusUnsubscriber: (() => void) | null = null;
  private isConnected = false;
  private reconnectTimer: number | null = null;
  private logger: Logger<ILogObj>;

  constructor(
    private readonly url: string,
    private readonly eventBus: IEventBus,
    logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger({ name: "WebSocketEventClient" });
  }

  /**
   * Connects to the WebSocket server and sets up bidirectional event relay
   */
  connect(): void {
    // Don't attempt to connect if already connected
    if (
      this.isConnected ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      this.logger.debug(
        "WebSocket already connected, skipping connection attempt"
      );
      return;
    }

    this.logger.info("Connecting to WebSocket server:", this.url);
    this.ws = new WebSocket(this.url);
    this.setupEventListeners();
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(): void {
    this.cancelPendingReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.unsubscribeFromClientEventsForwarding();
    this.isConnected = false;
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.logger.info("WebSocket connected", this.url);
      this.reconnectAttempts = 0;
      this.isConnected = true;

      // Cancel any pending reconnection attempts
      this.cancelPendingReconnect();

      // Subscribe to client events to forward to server
      this.subscribeToClientEventsForForwarding();
    };

    this.ws.onclose = () => {
      this.logger.info("WebSocket connection closed", this.url);
      this.unsubscribeFromClientEventsForwarding();
      this.isConnected = false;
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      this.logger.error("WebSocket error:", error);
    };

    this.ws.onmessage = this.handleServerMessage;
  }

  private cancelPendingReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.logger.debug("Cancelled pending reconnection attempt");
    }
  }

  /**
   * Subscribes to client events on the event bus to forward them to the server
   */
  private subscribeToClientEventsForForwarding(): void {
    // Unsubscribe first to prevent duplicate handlers
    this.unsubscribeFromClientEventsForwarding();

    // Subscribe to all client events to forward to the server
    this.eventBusUnsubscriber = this.eventBus.subscribeToAllClientEvents(
      async (event) => {
        this.logger.debug("Received client event:", event.kind);

        // Only forward client events to the server
        if (isClientEvent(event)) {
          await this.sendClientEvent(event);
        }
      }
    );

    this.logger.debug("Subscribed to all client events for forwarding");
  }

  /**
   * Unsubscribes from the event bus
   */
  private unsubscribeFromClientEventsForwarding(): void {
    this.logger.debug("Unsubscribing from client events for forwarding");

    if (this.eventBusUnsubscriber) {
      this.eventBusUnsubscriber();
      this.eventBusUnsubscriber = null;
    }
  }

  /**
   * Handles reconnection logic with exponential backoff
   */
  private handleReconnect(): void {
    // Cancel any existing reconnection attempt
    this.cancelPendingReconnect();

    // Don't reconnect if already connected
    if (
      this.isConnected ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      this.logger.debug("WebSocket already connected, skipping reconnection");
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    const reconnectId = Math.random().toString(36).substring(2, 10);

    this.logger.info(
      `Scheduling reconnection attempt in ${delay}ms [id: ${reconnectId}]`
    );

    this.reconnectTimer = window.setTimeout(() => {
      // Double-check we're not already connected before attempting reconnection
      if (
        this.isConnected ||
        (this.ws && this.ws.readyState === WebSocket.OPEN)
      ) {
        this.logger.debug(
          `Skipping scheduled reconnect [id: ${reconnectId}] - already connected`
        );
        return;
      }

      this.reconnectAttempts++;
      this.logger.info(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) [id: ${reconnectId}]`
      );
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Sends a client event to the server
   */
  private async sendClientEvent(event: ClientEventUnion): Promise<void> {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.isConnected
    ) {
      this.logger.warn(
        "WebSocket is not connected, cannot send event:",
        event.kind
      );
      return;
    }

    const message: ClientEventRelayMessage = {
      kind: "CLIENT_EVENT",
      event: event,
    };

    try {
      this.logger.debug("Sending event to server:", event.kind);
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Error sending event ${event.kind} to server:`, error);
    }
  }

  /**
   * Handles incoming messages from the server
   */
  private handleServerMessage = (message: MessageEvent): void => {
    try {
      const data = JSON.parse(message.data) as RelayMessage;

      switch (data.kind) {
        case "SERVER_EVENT":
          const serverEventMessage = data as ServerEventRelayMessage;

          if (isServerEvent(serverEventMessage.event)) {
            this.eventBus.emit(serverEventMessage.event);
          } else {
            throw new Error(
              `Invalid server event received: ${JSON.stringify(serverEventMessage.event)}`
            );
          }
          break;

        case "ERROR":
          this.logger.error("Received error from server:", data);
          break;

        default:
          this.logger.warn("Received unknown message type:", data.kind);
      }
    } catch (error) {
      this.logger.error("Error handling server message:", error);
    }
  };
}

// Singleton instance
let webSocketEventClientInstance: IWebSocketEventClient | null = null;

/**
 * Gets or creates a WebSocket client instance
 */
export function getWebSocketEventClient(
  options: WebSocketClientOptions
): IWebSocketEventClient {
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

  if (protocol !== "ws:" && protocol !== "wss:") {
    throw new Error("Protocol must be either 'ws:' or 'wss:'");
  }

  const url = `${protocol}//${hostname}:${port}/ws`;

  webSocketEventClientInstance = new WebSocketEventClient(
    url,
    options.eventBus,
    options.logger
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
