/**
 * WebSocket implementation of the EventChannel interface
 */

import { Logger, ILogObj } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { 
  EventChannel, 
  ConnectionManager, 
  RequestCorrelator,
  EventChannelError,
  EventChannelErrorCode
} from "./event-channel";
import { 
  BaseEvent, 
  EventKind,
  isServerEvent
} from "@repo/events-core/event-types";
import { IEventBus } from "@repo/events-core/event-bus";
import { WebSocketConnectionManager } from "./connection-manager";
import { EventRequestCorrelator } from "./request-correlator";

export interface WebSocketEventChannelOptions {
  url: string;
  eventBus: IEventBus;
  defaultRequestTimeoutMs?: number;
  logger?: Logger<ILogObj>;
}

/**
 * WebSocket-based implementation of the EventChannel interface
 */
export class WebSocketEventChannel implements EventChannel {
  private logger: Logger<ILogObj>;
  private connectionManager: ConnectionManager;
  private requestCorrelator: RequestCorrelator;
  private eventBus: IEventBus;

  constructor(private options: WebSocketEventChannelOptions) {
    this.logger = options.logger || new Logger({ name: "WebSocketEventChannel" });
    this.eventBus = options.eventBus;
    
    // Initialize connection manager
    this.connectionManager = new WebSocketConnectionManager({
      url: options.url,
      logger: this.logger
    });
    
    // Initialize request correlator
    this.requestCorrelator = new EventRequestCorrelator({
      defaultTimeoutMs: options.defaultRequestTimeoutMs || 30000,
      logger: this.logger
    });
    
    // Set up connection status change handler
    this.connectionManager.onStatusChange((isConnected) => {
      if (!isConnected) {
        // Cancel all pending requests when disconnected
        this.requestCorrelator.cancelAllRequests("Connection closed");
      }
    });
  }

  /**
   * Connect to the server
   */
  public async connect(): Promise<void> {
    await this.connectionManager.connect();
    
    // Get the WebSocket instance from the connection manager
    const ws = (this.connectionManager as WebSocketConnectionManager).getWebSocket();
    
    if (!ws) {
      throw new EventChannelError(
        EventChannelErrorCode.CONNECTION_ERROR,
        "Failed to initialize WebSocket"
      );
    }
    
    // Set up message handler
    ws.onmessage = this.handleServerMessage;
  }

  /**
   * Disconnect from the server
   */
  public async disconnect(): Promise<void> {
    this.requestCorrelator.cancelAllRequests("Disconnecting");
    await this.connectionManager.disconnect();
  }

  /**
   * Check if connected to the server
   */
  public isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Register a handler for connection status changes
   */
  public onConnectionStatusChange(
    handler: (isConnected: boolean) => void
  ): () => void {
    return this.connectionManager.onStatusChange(handler);
  }

  /**
   * Send an event to the server without expecting a response
   */
  public async sendEvent<T extends BaseEvent>(event: T): Promise<void> {
    if (!this.isConnected()) {
      throw new EventChannelError(
        EventChannelErrorCode.CONNECTION_ERROR,
        "Cannot send event: not connected to server"
      );
    }
    
    // Get the WebSocket instance from the connection manager
    const ws = (this.connectionManager as WebSocketConnectionManager).getWebSocket();
    
    if (!ws) {
      throw new EventChannelError(
        EventChannelErrorCode.CONNECTION_ERROR,
        "WebSocket instance not available"
      );
    }
    
    // Create the message
    const message = {
      kind: "CLIENT_EVENT",
      event
    };
    
    // Send the message
    try {
      ws.send(JSON.stringify(message));
      this.logger.debug(`Sent event ${event.kind} to server`);
    } catch (error) {
      this.logger.error(`Error sending event ${event.kind} to server:`, error);
      throw new EventChannelError(
        EventChannelErrorCode.REQUEST_FAILED,
        `Failed to send event: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send a request to the server and wait for a response
   */
  public async sendRequest<TReq extends BaseEvent, TRes extends BaseEvent>(
    requestEvent: TReq,
    responseEventKind: EventKind,
    timeoutMs?: number
  ): Promise<TRes> {
    if (!this.isConnected()) {
      throw new EventChannelError(
        EventChannelErrorCode.CONNECTION_ERROR,
        "Cannot send request: not connected to server"
      );
    }
    
    // Generate a correlation ID if not present
    const correlationId = requestEvent.correlationId || uuidv4();
    
    // Add or ensure correlation ID in the event
    const eventWithCorrelation = {
      ...requestEvent,
      correlationId
    };
    
    // Register the request with the correlator
    const responsePromise = this.requestCorrelator.registerRequest<TRes>(
      correlationId,
      responseEventKind,
      timeoutMs
    );
    
    // Send the event
    await this.sendEvent(eventWithCorrelation);
    
    // Wait for and return the response
    return responsePromise;
  }

  private handleServerMessage = (event: MessageEvent): void => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.kind === "SERVER_EVENT" && message.event) {
        const serverEvent = message.event as BaseEvent;
        
        // If the event has a correlation ID, check if it's a response to a request
        if (serverEvent.correlationId) {
          const wasResolved = this.requestCorrelator.resolveRequest(
            serverEvent.correlationId,
            serverEvent
          );
          
          // If it wasn't a response to a pending request, still emit it on the event bus
          if (!wasResolved && isServerEvent(serverEvent)) {
            this.eventBus.emit(serverEvent);
          }
        } else if (isServerEvent(serverEvent)) {
          // Regular server event, emit it on the event bus
          this.eventBus.emit(serverEvent);
        }
      } else if (message.kind === "ERROR") {
        this.logger.error("Received error from server:", message);
        
        // If the error has a correlation ID, reject the corresponding request
        if (message.correlationId) {
          this.requestCorrelator.cancelRequest(message.correlationId);
        }
      }
    } catch (error) {
      this.logger.error("Error handling server message:", error);
    }
  };
}

// Factory function for easier creation
export function createWebSocketEventChannel(
  options: WebSocketEventChannelOptions
): EventChannel {
  return new WebSocketEventChannel(options);
}