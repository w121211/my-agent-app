import "reflect-metadata";
import { container } from "tsyringe";
import { ILogObj, Logger } from "tslog";
import { IEventBus, createClientEventBus } from "@repo/events-core/event-bus";
import {
  IWebSocketEventClient,
  getWebSocketEventClient,
} from "@repo/events-relay/websocket-event-client";
import { FileExplorerService } from "./file-explorer-service";
import { DI_TOKENS } from "./di-tokens";

// Create default logger
const defaultLogger = new Logger<ILogObj>({ name: "AppContainer" });

// Register logger
container.register<Logger<ILogObj>>(DI_TOKENS.LOGGER, {
  useValue: defaultLogger,
});

// Register EventBus (lazy singleton)
container.register<IEventBus>(DI_TOKENS.EVENT_BUS, {
  useFactory: (dependencyContainer) => {
    const logger = dependencyContainer.resolve<Logger<ILogObj>>(
      DI_TOKENS.LOGGER
    );
    return createClientEventBus({ logger });
  },
});

// Register FileExplorerService (singleton)
container.registerSingleton<FileExplorerService>(
  DI_TOKENS.FILE_EXPLORER_SERVICE,
  FileExplorerService
);

// WebSocketClient is registered dynamically with configuration

export interface WebSocketConfig {
  hostname?: string;
  port?: number;
  protocol?: string;
}

export function registerWebSocketClient(config: WebSocketConfig): void {
  const eventBus = container.resolve<IEventBus>(DI_TOKENS.EVENT_BUS);
  const logger = container.resolve<Logger<ILogObj>>(DI_TOKENS.LOGGER);

  const client = getWebSocketEventClient({
    eventBus,
    hostname: config.hostname,
    port: config.port,
    protocol: config.protocol,
    logger,
  });

  // Register WebSocketClient
  container.register<IWebSocketEventClient>(DI_TOKENS.WEBSOCKET_CLIENT, {
    useValue: client,
  });
}

export { container };
