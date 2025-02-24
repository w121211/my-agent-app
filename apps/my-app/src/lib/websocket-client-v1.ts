"use client";

import { BaseEvent } from "@/lib/event-types";
import { eventBus } from "@/lib/event-bus";
import { v4 as uuidv4 } from "uuid";

// Match the server-side EventType
// This should be defined according to the server's EventType enum
type EventType = string;

// Subscribe message
interface SubscribeMessage {
  message_type: "subscribe";
  event_type: EventType;
}

// Unsubscribe message
interface UnsubscribeMessage {
  message_type: "unsubscribe";
  event_type: EventType;
}

// Subscription confirmation message
interface SubscribedMessage {
  message_type: "subscribed";
  event_type: EventType;
  message?: string;
}

// Unsubscription confirmation message
interface UnsubscribedMessage {
  message_type: "unsubscribed";
  event_type: EventType;
  message?: string;
}

// Error message
interface ErrorMessage {
  message_type: "error";
  error: string;
}

// Event message sent from server
interface ServerEventMessage {
  message_type: "server_event";
  event_type: EventType;
  payload: any;
}

// Event message sent from client
interface ClientEventMessage {
  message_type: "client_event";
  event_type: EventType;
  client_id?: string;
  task_id?: string;
  subtask_id?: string;
  chat_id?: string;
  content?: string;
  timestamp?: string;
  correlation_id?: string;
  additional_data?: Record<string, any>;
}

// Union of all message types
type WebSocketMessageData =
  | SubscribeMessage
  | UnsubscribeMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | ErrorMessage
  | ServerEventMessage
  | ClientEventMessage;

// WebSocket message interface
interface WebSocketMessage {
  data: WebSocketMessageData;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000; // 1 second
  private subscriptions = new Set<string>();
  private eventUnsubscriber: (() => void) | null = null;
  private clientId: string | null = null;

  constructor(private readonly url: string) {}

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.handleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;

      // Resubscribe to all previous subscriptions
      this.subscriptions.forEach((eventType) => {
        this.subscribe(eventType);
      });

      // Subscribe to all frontend events to forward them to backend
      this.eventUnsubscriber = eventBus.subscribe<BaseEvent>(
        "*",
        this.handleFrontendEvent
      );
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

  subscribe(eventType: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket is not connected, cannot subscribe to:",
        eventType
      );
      return;
    }

    const message: WebSocketMessage = {
      data: {
        message_type: "subscribe",
        event_type: eventType,
      },
    };

    try {
      this.ws.send(JSON.stringify(message));
      this.subscriptions.add(eventType);
    } catch (error) {
      console.error("Error subscribing to event:", error);
    }
  }

  unsubscribe(eventType: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "WebSocket is not connected, cannot unsubscribe from:",
        eventType
      );
      return;
    }

    const message: WebSocketMessage = {
      data: {
        message_type: "unsubscribe",
        event_type: eventType,
      },
    };

    try {
      this.ws.send(JSON.stringify(message));
      this.subscriptions.delete(eventType);
    } catch (error) {
      console.error("Error unsubscribing from event:", error);
    }
  }

  private handleFrontendEvent = (event: BaseEvent) => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected, cannot send event:", event);
      return;
    }

    const now = new Date().toISOString();

    const message: WebSocketMessage = {
      data: {
        message_type: "client_event",
        event_type: event.type,
        client_id: this.clientId || undefined,
        content: typeof event.payload === "string" ? event.payload : undefined,
        timestamp: now,
        correlation_id: uuidv4(),
        additional_data:
          typeof event.payload !== "string" ? event.payload : undefined,
      },
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending event to backend:", error);
    }
  };

  private handleBackendMessage = (message: MessageEvent) => {
    try {
      const wsMessage = JSON.parse(message.data) as WebSocketMessage;
      const data = wsMessage.data;

      switch (data.message_type) {
        case "server_event":
          // Forward server events to frontend event bus
          eventBus.emit({
            type: data.event_type,
            payload: data.payload,
          });
          break;

        case "error":
          console.error("Received error from server:", data.error);
          break;

        case "subscribed":
          console.log("Successfully subscribed to:", data.event_type);
          break;

        case "unsubscribed":
          console.log("Successfully unsubscribed from:", data.event_type);
          break;

        default:
          console.warn("Received unknown message type:", data.message_type);
      }
    } catch (error) {
      console.error("Error handling backend message:", error);
    }
  };

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.eventUnsubscriber) {
      this.eventUnsubscriber();
      this.eventUnsubscriber = null;
    }
  }

  setClientId(clientId: string) {
    this.clientId = clientId;
  }
}

// Create singleton instance
const WEBSOCKET_PORT = process.env.REACT_APP_WEBSOCKET_PORT || 8000;

const webSocketClient = new WebSocketClient(
  `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
    window.location.hostname
  }:${WEBSOCKET_PORT}/ws`
);

// let webSocketClient: WebSocketClient;

// // Check if we're in a browser environment before accessing window
// if (typeof window !== "undefined") {
//   const WEBSOCKET_PORT = process.env.REACT_APP_WEBSOCKET_PORT || 8000;

//   webSocketClient = new WebSocketClient(
//     `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
//       window.location.hostname
//     }:${WEBSOCKET_PORT}/ws`
//   );
// }

export default webSocketClient;
