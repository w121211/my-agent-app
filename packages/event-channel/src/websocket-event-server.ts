/**
 * Server-side WebSocket implementation for event communication
 */

import WebSocket, { WebSocketServer } from "ws";
import { Logger, ILogObj } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { 
  BaseEvent, 
  isClientEvent, 
  isServerEvent 
} from "@repo/events-core/event-types";
import { IEventBus } from "@repo/events-core/event-bus";

export interface WebSocketEventServerOptions {
  port: number;
  eventBus: IEventBus;
  logger?: Logger<ILogObj>;
}

/**
 * Server-side WebSocket event handler that integrates with the event bus
 */
export class WebSocketEventServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocket>();
  private logger: Logger<ILogObj>;
  private eventBus: IEventBus;
  private isStarted = false;
  private eventUnsubscriber: (() => void) | null = null;

  constructor(private options: WebSocketEventServerOptions) {
    this.eventBus = options.eventBus;
    this.logger = options.logger || new Logger({ name: "WebSocketEventServer" });
  }

  /**
   * Start the WebSocket server
   */
  public start(): void {
    if (this.isStarted) {
      return;
    }

    this.wss = new WebSocketServer({ port: this.options.port });
    this.setupWebSocketServer();
    this.setupEventForwarding();
    
    this.isStarted = true;
    this.logger.info(`WebSocket server started on port ${this.options.port}`);
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    if (!this.isStarted || !this.wss) {
      return;
    }

    // Unsubscribe from the event bus
    if (this.eventUnsubscriber) {
      this.eventUnsubscriber();
      this.eventUnsubscriber = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.close();
      } catch (error) {
        this.logger.error("Error closing client connection:", error);
      }
    }
    this.clients.clear();

    // Close the server
    this.wss.close();
    this.wss = null;
    this.isStarted = false;
    this.logger.info("WebSocket server stopped");
  }

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      
      this.logger.info(`Client connected: ${clientId}, total clients: ${this.clients.size}`);

      ws.on("message", (data: WebSocket.Data) => {
        this.handleClientMessage(clientId, ws, data);
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        this.logger.info(`Client disconnected: ${clientId}, remaining clients: ${this.clients.size}`);
      });

      ws.on("error", (error) => {
        this.logger.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    this.wss.on("error", (error) => {
      this.logger.error("WebSocket server error:", error);
    });
  }

  private setupEventForwarding(): void {
    // Subscribe to all server events to forward to clients
    this.eventUnsubscriber = this.eventBus.subscribeToAllServerEvents(async (event) => {
      if (isServerEvent(event)) {
        await this.broadcastServerEvent(event);
      }
    });
  }

  private async handleClientMessage(clientId: string, ws: WebSocket, data: WebSocket.Data): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      if (message.kind === "CLIENT_EVENT" && message.event) {
        const clientEvent = message.event as BaseEvent;

        if (isClientEvent(clientEvent)) {
          // Emit the event on the event bus
          await this.eventBus.emit(clientEvent);
        } else {
          this.sendError(ws, "INVALID_EVENT", "Invalid client event format", message.event?.correlationId);
        }
      } else {
        this.sendError(ws, "UNKNOWN_MESSAGE_TYPE", `Unknown message kind: ${message.kind}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message from client ${clientId}:`, error);
      this.sendError(
        ws,
        "PARSE_ERROR",
        `Invalid message format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async broadcastServerEvent(event: BaseEvent): Promise<void> {
    if (this.clients.size === 0) {
      return;
    }

    const message = {
      kind: "SERVER_EVENT",
      event
    };

    const messageString = JSON.stringify(message);

    for (const [clientId, client] of this.clients.entries()) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
        } catch (error) {
          this.logger.error(`Error sending event to client ${clientId}:`, error);
          
          // Remove the client if sending fails
          this.clients.delete(clientId);
        }
      }
    }

    this.logger.debug(`Broadcasted ${event.kind} to ${this.clients.size} clients`);
  }

  private sendError(ws: WebSocket, code: string, message: string, correlationId?: string): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const errorMessage = {
      kind: "ERROR",
      code,
      message,
      correlationId
    };

    try {
      ws.send(JSON.stringify(errorMessage));
      this.logger.warn(`Sent error to client: [${code}] ${message}`);
    } catch (error) {
      this.logger.error("Error sending error message to client:", error);
    }
  }
}

// Factory function for easier creation
export function createWebSocketEventServer(
  options: WebSocketEventServerOptions
): WebSocketEventServer {
  return new WebSocketEventServer(options);
}