import { Logger, ILogObj } from "tslog";
import { injectable, inject } from "tsyringe";
import { DI_TOKENS } from "../di/di-tokens";

export interface WebSocketConfig {
  hostname: string;
  port: number;
  protocol: string;
}

export interface AppConfig {
  webSocket: WebSocketConfig;
  // Additional app configuration can be added here in the future
}

@injectable()
export class ConfigService {
  private config: AppConfig;
  private logger: Logger<ILogObj>;

  constructor(@inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>) {
    this.logger = logger || new Logger({ name: "ConfigService" });

    // Default configuration
    this.config = {
      webSocket: {
        hostname: "localhost",
        port: 8000,
        protocol:
          typeof window !== "undefined" &&
          window?.location?.protocol === "https:"
            ? "wss:"
            : "ws:",
      },
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getWebSocketConfig(): WebSocketConfig {
    return this.config.webSocket;
  }

  public setWebSocketConfig(webSocketConfig: WebSocketConfig): void {
    this.config.webSocket = webSocketConfig;
    this.logger.debug("WebSocket configuration updated", webSocketConfig);
  }

  public updateConfig(config: Partial<AppConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug("Application configuration updated");
  }
}
