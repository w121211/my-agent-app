import WebSocket, { WebSocketServer } from "ws";
import { ILogObj, Logger } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  EventUnion,
  isClientEvent,
  isServerEvent,
  ServerEventUnion,
} from "@repo/events-core/event-types";
import {
  ClientEventRelayMessage,
  ServerEventRelayMessage,
  ErrorRelayMessage,
  isMessageType,
  RelayMessage,
} from "./relay-types.js";

/**
 * Configuration options for the WebSocket server
 */
export interface WebSocketServerOptions {
  port?: number;
  eventBus: IEventBus;
  logger?: Logger<ILogObj>;
}

/**
 * WebSocket server that provides bidirectional event communication
 * between client and server event buses
 */
export class WebSocketEventServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private eventBusUnsubscriber: (() => void) | null = null;
  private isStarted = false;
  private logger: Logger<ILogObj>;

  constructor(
    private readonly port: number,
    private readonly eventBus: IEventBus,
    logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger({ name: "WebSocketEventServer" });
    this.logger.debug("WebSocketEventServer created");
  }

  /**
   * Starts the WebSocket server and sets up bidirectional event relay
   */
  start(): void {
    if (this.isStarted) {
      return;
    }

    this.wss = new WebSocketServer({ port: this.port });
    this.setupEventListeners();
    this.subscribeToServerEventsForForwarding();
    this.isStarted = true;
    this.logger.info(`WebSocket server started on port ${this.port}`);
  }

  /**
   * Stops the WebSocket server
   */
  stop(): void {
    if (!this.isStarted || !this.wss) {
      return;
    }

    this.unsubscribeFromServerEventsForwarding();

    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    this.wss.close();
    this.wss = null;
    this.isStarted = false;
    this.logger.info("WebSocket server stopped");
  }

  private setupEventListeners(): void {
    if (!this.wss) return;

    this.wss.on("connection", (ws: WebSocket) => {
      this.handleNewConnection(ws);
    });

    this.wss.on("error", (error) => {
      this.logger.error("WebSocket server error:", error);
    });
  }

  private handleNewConnection(ws: WebSocket): void {
    this.clients.add(ws);
    this.logger.info(
      `New client connected, total clients: ${this.clients.size}`
    );

    ws.on("message", (message: WebSocket.Data) => {
      // this.logger.debug("Received message from client:", message);
      this.handleClientMessage(ws, message);
    });

    ws.on("close", () => {
      this.clients.delete(ws);
      this.logger.info(
        `Client disconnected, remaining clients: ${this.clients.size}`
      );
    });

    ws.on("error", (error) => {
      this.logger.error("WebSocket connection error:", error);
      this.clients.delete(ws);
    });
  }

  /**
   * Subscribes to server events on the event bus to forward them to clients
   */
  private subscribeToServerEventsForForwarding(): void {
    this.unsubscribeFromServerEventsForwarding();

    this.eventBusUnsubscriber = this.eventBus.subscribeToAllServerEvents(
      async (event) => {
        if (isServerEvent(event)) {
          await this.broadcastServerEvent(event);
        }
      }
    );
  }

  /**
   * Unsubscribes from the event bus
   */
  private unsubscribeFromServerEventsForwarding(): void {
    if (this.eventBusUnsubscriber) {
      this.eventBusUnsubscriber();
      this.eventBusUnsubscriber = null;
    }
  }

  /**
   * Broadcasts a server event to all connected clients
   */
  private async broadcastServerEvent(event: ServerEventUnion): Promise<void> {
    if (this.clients.size === 0) {
      return;
    }

    const message: ServerEventRelayMessage = {
      kind: "SERVER_EVENT",
      event,
    };

    const messageString = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });

    this.logger.debug(`Relayed server event to clients: ${event.kind}`, event);
  }

  /**
   * Handles incoming messages from clients
   */
  private handleClientMessage(ws: WebSocket, data: WebSocket.Data): void {
    let message: RelayMessage;

    try {
      const messageString = data.toString();
      message = JSON.parse(messageString) as RelayMessage;
    } catch (error) {
      this.sendError(ws, "PARSE_ERROR", "Invalid message format");
      return;
    }

    if (isMessageType<ClientEventRelayMessage>(message, "CLIENT_EVENT")) {
      const clientEvent = message.event;

      if (isClientEvent(clientEvent)) {
        this.eventBus.emit(clientEvent).catch((error) => {
          this.logger.error(`Error emitting event ${clientEvent.kind}:`, error);
          this.sendError(
            ws,
            "EVENT_ERROR",
            `Error processing event: ${error.message}`
          );
        });

        this.logger.debug(
          `Relayed client event to server: ${clientEvent.kind}`,
          clientEvent
        );
      } else {
        this.sendError(ws, "INVALID_EVENT", "Invalid client event format");
      }
    } else {
      this.sendError(
        ws,
        "UNKNOWN_MESSAGE_TYPE",
        `Unknown message kind: ${message.kind}`
      );
    }
  }

  /**
   * Sends an error message to a client
   */
  private sendError(ws: WebSocket, code: string, message: string): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const errorMessage: ErrorRelayMessage = {
      kind: "ERROR",
      code,
      message,
    };

    ws.send(JSON.stringify(errorMessage));
    this.logger.warn(`Sent error to client: [${code}] ${message}`);
  }
}

/**
 * Factory function to create a WebSocket server
 */
export function createWebSocketEventServer(
  options: WebSocketServerOptions
): WebSocketEventServer {
  const port = options.port || 8000;
  return new WebSocketEventServer(port, options.eventBus, options.logger);
}
