import { WebSocketServer, WebSocket } from "ws";
import { createServer, Server as HttpServer } from "http";
import { Logger, ILogObj } from "tslog";
import {
  EventUnion,
  isClientEvent,
  isServerEvent,
} from "@repo/events-core/types";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  RelayMessageType,
  ClientEventMessage,
  ServerEventMessage,
  ErrorMessage,
} from "./relay-types.js";

/**
 * Connection handler for a single WebSocket client
 */
class WebSocketConnection {
  private closeHandlers: Array<() => void> = [];

  constructor(
    private socket: WebSocket,
    private id: string,
    private eventBus: IEventBus,
    private logger: Logger<ILogObj>
  ) {
    this.setupEventHandlers();
  }

  /**
   * Send a server event to the client
   */
  sendServerEvent(event: EventUnion): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ServerEventMessage = {
      type: RelayMessageType.SERVER_EVENT,
      event,
    };

    this.socket.send(JSON.stringify(message));
  }

  /**
   * Send an error message to the client
   */
  sendError(code: string, message: string): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const errorMessage: ErrorMessage = {
      type: RelayMessageType.ERROR,
      code,
      message,
    };

    this.socket.send(JSON.stringify(errorMessage));
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    this.socket.close();
  }

  /**
   * Register a handler to be called when the connection closes
   */
  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  private setupEventHandlers(): void {
    this.socket.on("message", (data: WebSocket.Data) => {
      let parsedData: unknown;

      try {
        parsedData = JSON.parse(data.toString());
      } catch (err) {
        this.sendError("PARSE_ERROR", "Failed to parse message");
        return;
      }

      // Type guard for ClientEventMessage
      if (
        parsedData &&
        typeof parsedData === "object" &&
        "type" in parsedData &&
        parsedData.type === RelayMessageType.CLIENT_EVENT &&
        "event" in parsedData
      ) {
        const clientMessage = parsedData as ClientEventMessage;

        if (isClientEvent(clientMessage.event)) {
          // Forward client event to the event bus
          this.eventBus.emit(clientMessage.event);
        } else {
          this.sendError("INVALID_EVENT", "Invalid client event format");
        }
      } else {
        this.sendError("INVALID_MESSAGE", "Invalid message format");
      }
    });

    this.socket.on("close", () => {
      this.logger.debug(`Client disconnected: ${this.id}`);
      this.closeHandlers.forEach((handler) => handler());
    });

    this.socket.on("error", (error) => {
      this.logger.error(`WebSocket error for client ${this.id}:`, error);
    });
  }
}

/**
 * WebSocket server that handles bidirectional event communication
 */
export class WebSocketEventServer {
  private wsServer: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private serverEventUnsubscriber: (() => void) | null = null;
  private logger: Logger<ILogObj>;

  constructor(
    private readonly eventBus: IEventBus,
    options: {
      port?: number;
      logger?: Logger<ILogObj>;
    } = {}
  ) {
    this.logger =
      options.logger || new Logger({ name: "WebSocketEventServer" });
  }

  /**
   * Start the WebSocket server
   */
  start(port: number): void {
    if (this.wsServer) {
      this.logger.warn("WebSocket server is already running");
      return;
    }

    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });

    // Set up the connection handler
    this.wsServer.on("connection", (socket: WebSocket) => {
      const connectionId = this.generateConnectionId();
      this.logger.info(`New client connected: ${connectionId}`);

      const connection = new WebSocketConnection(
        socket,
        connectionId,
        this.eventBus,
        this.logger
      );

      this.connections.set(connectionId, connection);

      connection.onClose(() => {
        this.connections.delete(connectionId);
      });
    });

    // Subscribe to all server events to broadcast to clients
    this.serverEventUnsubscriber = this.eventBus.subscribeToAllServerEvents(
      (event) => {
        if (isServerEvent(event)) {
          this.broadcastServerEvent(event);
        }
      }
    );

    // Start the HTTP server
    this.httpServer.listen(port, () => {
      this.logger.info(`WebSocket server started on port ${port}`);
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.wsServer || !this.httpServer) {
      return;
    }

    // Unsubscribe from server events
    if (this.serverEventUnsubscriber) {
      this.serverEventUnsubscriber();
      this.serverEventUnsubscriber = null;
    }

    // Close all client connections
    for (const connection of this.connections.values()) {
      connection.close();
    }
    this.connections.clear();

    // Close the WebSocket server
    return new Promise<void>((resolve, reject) => {
      if (!this.wsServer || !this.httpServer) {
        resolve();
        return;
      }

      this.wsServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        this.httpServer!.close((httpErr) => {
          if (httpErr) {
            reject(httpErr);
            return;
          }

          this.wsServer = null;
          this.httpServer = null;
          this.logger.info("WebSocket server stopped");
          resolve();
        });
      });
    });
  }

  /**
   * Broadcast a server event to all connected clients
   */
  private broadcastServerEvent(event: EventUnion): void {
    for (const connection of this.connections.values()) {
      connection.sendServerEvent(event);
    }
  }

  /**
   * Generate a unique client connection ID
   */
  private generateConnectionId(): string {
    return `client-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

// Singleton factory
let wsServerInstance: WebSocketEventServer | null = null;

/**
 * Get or create a WebSocket event server instance
 */
export function getWebSocketEventServer(
  eventBus: IEventBus,
  options?: {
    port?: number;
    logger?: Logger<ILogObj>;
  }
): WebSocketEventServer {
  if (!wsServerInstance) {
    wsServerInstance = new WebSocketEventServer(eventBus, options);
  }
  return wsServerInstance;
}

/**
 * Reset the WebSocket server instance (mainly for testing)
 */
export function resetWebSocketEventServer(): void {
  wsServerInstance = null;
}
