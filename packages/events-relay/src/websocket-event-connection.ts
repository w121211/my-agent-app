import WebSocket from "ws";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import { EventUnion } from "@repo/events-core/types";
import {
  RelayMessageType,
  RelayMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  ClientEventMessage,
  ServerEventMessage,
  ErrorMessage,
} from "./types.js";

/**
 * Manages a single WebSocket connection with a client
 */
export class WebSocketEventConnection {
  private subscriptions: Set<string> = new Set();
  private closeListeners: (() => void)[] = [];

  constructor(
    private socket: WebSocket,
    private clientId: string,
    private eventBus: IEventBus,
    private logger: Logger<ILogObj>
  ) {
    this.setupEventListeners();
  }

  /**
   * Check if this connection is subscribed to a specific event type
   */
  public isSubscribedTo(eventType: string): boolean {
    return this.subscriptions.has(eventType);
  }

  /**
   * Send an event to the client
   */
  public sendEvent(event: EventUnion): void {
    const message: ServerEventMessage = {
      type: RelayMessageType.SERVER_EVENT,
      event: event,
    };
    this.sendMessage(message);
  }

  /**
   * Close the connection
   */
  public close(): void {
    this.logger.debug(`Closing connection for client: ${this.clientId}`);
    this.socket.close();
  }

  /**
   * Add a listener that will be called when the connection is closed
   */
  public onClose(listener: () => void): void {
    this.closeListeners.push(listener);
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    this.socket.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as RelayMessage;
        this.handleMessage(message);
      } catch (error) {
        this.logger.error(
          `Error parsing message from client ${this.clientId}:`,
          error
        );
        this.sendError("INVALID_FORMAT", "Invalid message format");
      }
    });

    this.socket.on("close", () => {
      this.logger.debug(`Connection closed for client: ${this.clientId}`);
      this.closeListeners.forEach((listener) => listener());
    });

    this.socket.on("error", (error) => {
      this.logger.error(`WebSocket error for client ${this.clientId}:`, error);
    });
  }

  /**
   * Handle an incoming message from the client
   */
  private handleMessage(message: RelayMessage): void {
    switch (message.type) {
      case RelayMessageType.SUBSCRIBE:
        this.handleSubscribe(message as SubscribeMessage);
        break;
      case RelayMessageType.UNSUBSCRIBE:
        this.handleUnsubscribe(message as UnsubscribeMessage);
        break;
      case RelayMessageType.CLIENT_EVENT:
        this.handleClientEvent(message as ClientEventMessage);
        break;
      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
        this.sendError(
          "UNKNOWN_MESSAGE_TYPE",
          `Unknown message type: ${message.type}`
        );
    }
  }

  /**
   * Handle a subscription request from the client
   */
  private handleSubscribe(message: SubscribeMessage): void {
    const { eventType } = message;
    this.logger.debug(`Client ${this.clientId} subscribing to: ${eventType}`);

    this.subscriptions.add(eventType);

    this.sendMessage({
      type: RelayMessageType.SUBSCRIBED,
      eventType,
    });
  }

  /**
   * Handle an unsubscribe request from the client
   */
  private handleUnsubscribe(message: UnsubscribeMessage): void {
    const { eventType } = message;
    this.logger.debug(
      `Client ${this.clientId} unsubscribing from: ${eventType}`
    );

    this.subscriptions.delete(eventType);

    this.sendMessage({
      type: RelayMessageType.UNSUBSCRIBED,
      eventType,
    });
  }

  /**
   * Handle an event from the client and forward it to the event bus
   */
  private handleClientEvent(message: ClientEventMessage): void {
    const { event } = message;
    this.logger.debug(`Received event from client ${this.clientId}:`, event);

    try {
      this.eventBus.publish(event);
    } catch (error) {
      this.logger.error(
        `Error publishing event from client ${this.clientId}:`,
        error
      );
      this.sendError(
        "EVENT_PUBLISHING_ERROR",
        `Failed to process event: ${error}`
      );
    }
  }

  /**
   * Send a message to the client
   */
  private sendMessage(message: RelayMessage): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      this.logger.warn(
        `Cannot send message to client ${this.clientId}: connection not open`
      );
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      this.logger.error(
        `Error sending message to client ${this.clientId}:`,
        error
      );
    }
  }

  /**
   * Send an error message to the client
   */
  private sendError(code: string, message: string): void {
    const errorMessage: ErrorMessage = {
      type: RelayMessageType.ERROR,
      code,
      message,
    };
    this.sendMessage(errorMessage);
  }
}
