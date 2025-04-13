import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";
import { type IWebSocketEventClient } from "@repo/events-relay/websocket-event-client";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import { useConnectionStateStore } from "./connection-state-store";

/**
 * Service that bridges between WebSocketClient and app state
 * Monitors WebSocket connection status and updates the store
 */
@injectable()
export class ConnectionService {
  private logger: Logger<ILogObj>;
  private checkIntervalId: number | null = null;
  private lastConnectionState: boolean = false;
  private reconnectAttempts: number = 0;

  constructor(
    @inject(DI_TOKENS.WEBSOCKET_CLIENT) private wsClient: IWebSocketEventClient,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger({ name: "ConnectionService" });
    // Don't automatically start monitoring in constructor
    // Will be explicitly started by DIProvider
  }

  /**
   * Start monitoring the connection status
   */
  public startMonitoring(): void {
    if (this.checkIntervalId !== null) {
      this.stopMonitoring();
    }

    // Initial connection state check
    this.updateConnectionState();

    // Check connection status periodically
    this.checkIntervalId = window.setInterval(() => {
      this.updateConnectionState();
    }, 3000);

    this.logger.debug("Started connection monitoring");
  }

  /**
   * Stop monitoring the connection status
   */
  public stopMonitoring(): void {
    if (this.checkIntervalId !== null) {
      window.clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      this.logger.debug("Stopped connection monitoring");
    }
  }

  /**
   * Manually trigger reconnection
   */
  public reconnect(): void {
    this.logger.info("Manual reconnection triggered");
    this.wsClient.connect();
  }

  /**
   * Check and update the current connection state
   */
  private updateConnectionState(): void {
    this.logger.debug(
      `Checking connection state. Current state: ${this.wsClient.isConnected()}`,
      this.wsClient
    );

    const isConnected = this.wsClient.isConnected();

    // Only update the store when the state changes
    if (isConnected !== this.lastConnectionState) {
      this.logger.debug(`Connection state changed: ${isConnected}`);

      const store = useConnectionStateStore.getState();

      if (isConnected) {
        // Reset reconnect attempts when connection is established
        this.reconnectAttempts = 0;
        store.setConnected(true);
        store.resetReconnectAttempts();
      } else {
        // Update disconnection state
        store.setConnected(false);
      }

      this.lastConnectionState = isConnected;
    }
  }
}
