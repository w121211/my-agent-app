/**
 * Connection manager implementation for WebSocket connections
 */

import { Logger, ILogObj } from "tslog";
import { ConnectionManager, EventChannelError, EventChannelErrorCode } from "./event-channel";

export interface WebSocketConnectionOptions {
  url: string;
  reconnectOptions?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };
  logger?: Logger<ILogObj>;
}

/**
 * WebSocket connection manager with automatic reconnection capabilities
 */
export class WebSocketConnectionManager implements ConnectionManager {
  private ws: WebSocket | null = null;
  private isConnectedState = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private statusChangeHandlers = new Set<(isConnected: boolean) => void>();
  private logger: Logger<ILogObj>;
  
  private maxAttempts: number;
  private initialDelayMs: number;
  private maxDelayMs: number;

  constructor(private options: WebSocketConnectionOptions) {
    this.logger = options.logger || new Logger({ name: "WebSocketConnectionManager" });
    
    // Set reconnection defaults if not provided
    const defaultReconnect = {
      maxAttempts: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000
    };
    
    const reconnectOpts = { ...defaultReconnect, ...options.reconnectOptions };
    this.maxAttempts = reconnectOpts.maxAttempts;
    this.initialDelayMs = reconnectOpts.initialDelayMs;
    this.maxDelayMs = reconnectOpts.maxDelayMs;
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.isConnectedState && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url);
        
        // Set up connection timeout
        const connectionTimeout = window.setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            const error = new EventChannelError(
              EventChannelErrorCode.CONNECTION_ERROR,
              "Connection timeout"
            );
            reject(error);
            this.handleDisconnect();
          }
        }, 10000); // 10s connection timeout
        
        this.ws.onopen = () => {
          window.clearTimeout(connectionTimeout);
          this.reconnectAttempt = 0;
          this.setConnectedState(true);
          this.logger.info("WebSocket connected to", this.options.url);
          resolve();
        };
        
        this.ws.onclose = () => {
          window.clearTimeout(connectionTimeout);
          this.handleDisconnect();
          reject(new EventChannelError(
            EventChannelErrorCode.CONNECTION_ERROR,
            "Connection closed"
          ));
        };
        
        this.ws.onerror = (event) => {
          window.clearTimeout(connectionTimeout);
          this.logger.error("WebSocket connection error:", event);
          this.handleDisconnect();
          reject(new EventChannelError(
            EventChannelErrorCode.CONNECTION_ERROR,
            "Connection error"
          ));
        };
      } catch (error) {
        this.logger.error("Failed to initiate WebSocket connection:", error);
        reject(new EventChannelError(
          EventChannelErrorCode.CONNECTION_ERROR,
          `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
        ));
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public async disconnect(): Promise<void> {
    this.cancelReconnect();
    
    if (!this.ws) {
      return;
    }
    
    try {
      this.ws.close();
    } catch (error) {
      this.logger.error("Error closing WebSocket:", error);
    }
    
    this.ws = null;
    this.setConnectedState(false);
  }

  /**
   * Check if the WebSocket is currently connected
   */
  public isConnected(): boolean {
    return this.isConnectedState && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Register a handler for connection status changes
   */
  public onStatusChange(handler: (isConnected: boolean) => void): () => void {
    this.statusChangeHandlers.add(handler);
    
    // Immediately call with current status
    handler(this.isConnected());
    
    return () => {
      this.statusChangeHandlers.delete(handler);
    };
  }

  /**
   * Get the underlying WebSocket instance
   */
  public getWebSocket(): WebSocket | null {
    return this.ws;
  }

  private handleDisconnect(): void {
    this.setConnectedState(false);
    this.scheduleReconnect();
  }

  private setConnectedState(isConnected: boolean): void {
    if (this.isConnectedState !== isConnected) {
      this.isConnectedState = isConnected;
      this.notifyStatusChange();
    }
  }

  private notifyStatusChange(): void {
    const isConnected = this.isConnected();
    this.statusChangeHandlers.forEach(handler => {
      try {
        handler(isConnected);
      } catch (error) {
        this.logger.error("Error in connection status change handler:", error);
      }
    });
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.cancelReconnect();
    
    if (this.reconnectAttempt >= this.maxAttempts) {
      this.logger.warn(`Maximum reconnection attempts (${this.maxAttempts}) reached`);
      return;
    }
    
    // Calculate exponential backoff with jitter
    const delay = Math.min(
      this.initialDelayMs * Math.pow(2, this.reconnectAttempt) * (0.5 + Math.random()),
      this.maxDelayMs
    );
    
    this.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempt + 1}/${this.maxAttempts} in ${Math.round(delay)}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempt++;
      this.logger.info(`Attempting to reconnect (${this.reconnectAttempt}/${this.maxAttempts})`);
      
      this.connect().catch(error => {
        this.logger.error("Reconnection attempt failed:", error);
      });
    }, delay);
  }
}