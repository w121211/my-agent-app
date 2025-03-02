import { IEventBus } from "../../events-core/src/event-bus.js";
import {
  EventType,
  TestEvent,
  EventUnion,
} from "../../events-core/src/types.js";
import {
  TransportMessageType,
  SubscribeMessage,
  UnsubscribeMessage,
  ClientEventMessage,
  ServerEventMessage,
  TransportMessage,
} from "./types.js";

/**
 * WebSocket client that connects to the event server
 * and handles communication between frontend and backend
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000; // 1 second
  private subscriptions = new Set<string>();
  private eventUnsubscriber: (() => void) | null = null;
  private clientId: string | null = null;

  /**
   * Creates a new WebSocket client
   * @param url The WebSocket URL to connect to
   * @param eventBus The event bus to use for events
   */
  constructor(
    private readonly url: string,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Connects to the WebSocket server
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

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;

      // Resubscribe to all previous subscriptions
      this.subscriptions.forEach((eventType) => {
        console.log("Resubscribing to:", eventType);
        this.subscribe(eventType);
      });

      // Subscribe to TEST_EVENT to forward them to backend
      this.eventUnsubscriber = this.eventBus.subscribe<TestEvent>(
        EventType.TEST_EVENT,
        this.handleFrontendEvent
      );
      console.log("Subscribed to test events");
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      if (this.eventUnsubscriber) {
        this.eventUnsubscriber();
        this.eventUnsubscriber = null;
      }
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onmessage = this.handleBackendMessage;
  }

  /**
   * Subscribes to events of a specific type
   * @param eventType The event type to subscribe to
   */
  subscribe(eventType: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket is not connected, cannot subscribe to:",
        eventType
      );
      return;
    }

    const message: SubscribeMessage = {
      type: TransportMessageType.SUBSCRIBE,
      eventType: eventType as EventType,
    };

    try {
      console.log("Subscribing to:", eventType);
      this.ws.send(JSON.stringify({ data: message }));
      this.subscriptions.add(eventType);
    } catch (error) {
      console.error("Error subscribing to event:", error);
    }
  }

  /**
   * Unsubscribes from events of a specific type
   * @param eventType The event type to unsubscribe from
   */
  unsubscribe(eventType: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket is not connected, cannot unsubscribe from:",
        eventType
      );
      return;
    }

    const message: UnsubscribeMessage = {
      type: TransportMessageType.UNSUBSCRIBE,
      eventType: eventType as EventType,
    };

    try {
      this.ws.send(JSON.stringify({ data: message }));
      this.subscriptions.delete(eventType);
    } catch (error) {
      console.error("Error unsubscribing from event:", error);
    }
  }

  private handleFrontendEvent = async (event: EventUnion): Promise<void> => {
    console.log("Received frontend event:", event);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected, cannot send event:", event);
      return;
    }

    const message: ClientEventMessage = {
      type: TransportMessageType.CLIENT_EVENT,
      event: event,
    };

    try {
      this.ws.send(JSON.stringify({ data: message }));
      console.log("Sent event to server:", message);
    } catch (error) {
      console.error("Error sending event to backend:", error);
    }
  };

  private handleBackendMessage = (message: MessageEvent): void => {
    try {
      const data = JSON.parse(message.data).data as TransportMessage;

      switch (data.type) {
        case TransportMessageType.SERVER_EVENT:
          // Forward server events to frontend event bus
          const serverEvent = data as ServerEventMessage;
          this.eventBus.publish(serverEvent.event);
          break;

        case TransportMessageType.ERROR:
          console.error("Received error from server:", data);
          break;

        case TransportMessageType.SUBSCRIBED:
          console.log("Successfully subscribed to:", data.eventType);
          break;

        case TransportMessageType.UNSUBSCRIBED:
          console.log("Successfully unsubscribed from:", data.eventType);
          break;

        default:
          console.warn("Received unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error handling backend message:", error);
    }
  };

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    setTimeout(
      () => {
        this.reconnectAttempts++;
        console.log(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connect();
      },
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    );
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.eventUnsubscriber) {
      this.eventUnsubscriber();
      this.eventUnsubscriber = null;
    }
  }

  /**
   * Sets the client ID
   * @param clientId The client ID to set
   */
  setClientId(clientId: string): void {
    this.clientId = clientId;
  }
}

// Singleton WebSocket client instance
let webSocketClientInstance: WebSocketClient | null = null;

/**
 * Configuration options for the WebSocket client
 */
export interface WebSocketClientOptions {
  port?: number;
  hostname?: string;
  protocol?: string;
  eventBus: IEventBus; // Required parameter
}

/**
 * Gets or creates a WebSocket client instance
 */
export function getWebSocketClient(
  options: WebSocketClientOptions
): WebSocketClient {
  // If not in browser environment, throw an error
  if (typeof window === "undefined") {
    throw new Error(
      "getWebSocketClient can only be called in browser environment"
    );
  }

  // If instance already exists, return it
  if (webSocketClientInstance) {
    return webSocketClientInstance;
  }

  // Otherwise, create a new instance
  const port = options.port || process.env.REACT_APP_WEBSOCKET_PORT || 8000;
  const hostname = options.hostname || window.location.hostname;
  const protocol =
    options.protocol ||
    (window.location.protocol === "https:" ? "wss:" : "ws:");

  const url = `${protocol}//${hostname}:${port}/ws`;
  webSocketClientInstance = new WebSocketClient(url, options.eventBus);

  return webSocketClientInstance;
}

/**
 * Resets the WebSocket client instance
 * Useful for testing
 */
export function resetWebSocketClient(): void {
  if (webSocketClientInstance) {
    webSocketClientInstance.disconnect();
    webSocketClientInstance = null;
  }
}
