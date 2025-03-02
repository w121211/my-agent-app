import { WebSocketServer } from "ws";
import { createServer, Server as HttpServer } from "http";
import { Logger, ILogObj } from "tslog";
import { EventUnion, EventType } from "../../events-core/src/types.js";
import { IEventBus } from "../../events-core/src/event-bus.js";
import { WebSocketEventConnection } from "./websocket-event-connection.js";

/**
 * WebSocket server that handles real-time event communication
 * between frontend and backend
 */
export class WebSocketEventServer {
  private wsServer: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private connections: Map<string, WebSocketEventConnection> = new Map();
  private logger: Logger<ILogObj>;
  private port: number;
  private eventUnsubscriber: (() => void) | null = null;
  private eventBus: IEventBus;

  constructor(
    eventBus: IEventBus,
    options: { port?: number; logger?: Logger<ILogObj> } = {}
  ) {
    this.eventBus = eventBus;
    this.port = options.port || 8000;
    this.logger =
      options.logger || new Logger({ name: "WebSocketEventServer" });
  }

  /**
   * Start the WebSocket server
   */
  public start(): void {
    if (this.wsServer) {
      this.logger.warn("WebSocket server is already running");
      return;
    }

    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });

    this.wsServer.on("connection", (socket, request) => {
      const clientId = this.generateClientId();
      this.logger.info(`New client connected: ${clientId}`);

      const connection = new WebSocketEventConnection(
        socket,
        clientId,
        this.eventBus,
        this.logger
      );
      this.connections.set(clientId, connection);

      connection.onClose(() => {
        this.logger.info(`Client disconnected: ${clientId}`);
        this.connections.delete(clientId);
      });
    });

    // Subscribe to all events to forward them to clients
    this.subscribeToEvents();

    this.httpServer.listen(this.port, () => {
      this.logger.info(`WebSocket server started on port ${this.port}`);
    });
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wsServer) {
        this.logger.warn("WebSocket server is not running");
        resolve();
        return;
      }

      // Unsubscribe from events
      if (this.eventUnsubscriber) {
        this.eventUnsubscriber();
        this.eventUnsubscriber = null;
      }

      // Close all connections
      for (const connection of this.connections.values()) {
        connection.close();
      }
      this.connections.clear();

      // Close WebSocket server
      this.wsServer.close((err) => {
        if (err) {
          this.logger.error("Error closing WebSocket server:", err);
          reject(err);
          return;
        }

        // Close HTTP server
        if (this.httpServer) {
          this.httpServer.close((err) => {
            if (err) {
              this.logger.error("Error closing HTTP server:", err);
              reject(err);
              return;
            }

            this.wsServer = null;
            this.httpServer = null;
            this.logger.info("WebSocket server stopped");
            resolve();
          });
        } else {
          this.wsServer = null;
          this.logger.info("WebSocket server stopped");
          resolve();
        }
      });
    });
  }

  /**
   * Broadcast an event to all connected clients
   */
  public broadcastEvent(event: EventUnion): void {
    for (const connection of this.connections.values()) {
      connection.sendEvent(event);
    }
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Subscribe to all events to forward them to clients
   */
  private subscribeToEvents(): void {
    // Subscribe to each event type individually
    const eventTypes = Object.values(EventType);

    // Create an array of unsubscribe functions
    const unsubscribers: Array<() => void> = [];

    for (const eventType of eventTypes) {
      const unsubscribe = this.eventBus.subscribe(
        eventType,
        async (event: EventUnion) => {
          this.broadcastToSubscribers(event);
        }
      );
      unsubscribers.push(unsubscribe);
    }

    // Store a function that will unsubscribe from all events
    this.eventUnsubscriber = () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }

  /**
   * Broadcast an event to clients that are subscribed to its type
   */
  private broadcastToSubscribers(event: EventUnion): void {
    for (const connection of this.connections.values()) {
      if (connection.isSubscribedTo(event.eventType)) {
        connection.sendEvent(event);
      }
    }
  }
}

// Singleton instance
let wsServerInstance: WebSocketEventServer | null = null;

/**
 * Get or create the WebSocket server instance
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
