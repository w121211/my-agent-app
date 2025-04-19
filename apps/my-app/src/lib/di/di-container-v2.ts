import "reflect-metadata";
import { container } from "tsyringe";
import { ILogObj, Logger } from "tslog";
import { IEventBus, createClientEventBus } from "@repo/events-core/event-bus";
import {
  IWebSocketEventClient,
  getWebSocketEventClient,
} from "@repo/events-relay/websocket-event-client";
import { ConnectionAwareEventBus } from "@repo/events-relay/connection-aware-event-bus";
import { FileExplorerService } from "../../features/file-explorer-di/file-explorer-service";
import { EditorService } from "../../features/editor/editor-service";
import { WorkspaceTreeService } from "../../features/workspace-tree/workspace-tree-service";
import { ConnectionService } from "../../features/connection/connection-service";
import { ConfigService } from "../config/config-service";
import { DI_TOKENS } from "./di-tokens";

// Create default logger
const defaultLogger = new Logger<ILogObj>({ name: "AppContainer" });

// Register shared services
container.register<Logger<ILogObj>>(DI_TOKENS.LOGGER, {
  useValue: defaultLogger,
});

// Register ConfigService (singleton)
container.registerSingleton<ConfigService>(
  DI_TOKENS.CONFIG_SERVICE,
  ConfigService
);

// Create factory for browser-only services
const createBrowserOnlyFactory = <T, D>(factoryFn: (deps: D) => T) => {
  return (deps: D): T => {
    if (typeof window === "undefined") {
      throw new Error(
        "This service can only be created in browser environment"
      );
    }
    return factoryFn(deps);
  };
};

// Register browser-only services
container.register<IEventBus>(DI_TOKENS.EVENT_BUS, {
  useFactory: createBrowserOnlyFactory(() => {
    const logger = container.resolve<Logger<ILogObj>>(DI_TOKENS.LOGGER);

    // Create event bus
    const eventBus = createClientEventBus({
      logger: logger.getSubLogger({ name: "ClientEventBus" }),
    });

    // Get WebSocket client
    const wsClient = container.resolve<IWebSocketEventClient>(
      DI_TOKENS.WEBSOCKET_CLIENT
    );

    // Return connection-aware event bus
    return new ConnectionAwareEventBus(
      eventBus,
      wsClient,
      logger.getSubLogger({ name: "ConnectionAwareEventBus" })
    );
  }),
});

// Register WebSocketEventClient
container.register<IWebSocketEventClient>(DI_TOKENS.WEBSOCKET_CLIENT, {
  useFactory: createBrowserOnlyFactory(() => {
    const logger = container.resolve<Logger<ILogObj>>(DI_TOKENS.LOGGER);
    const configService = container.resolve<ConfigService>(
      DI_TOKENS.CONFIG_SERVICE
    );

    const wsConfig = configService.getWebSocketConfig();

    // Create a temporary event bus for WebSocket client
    const tempEventBus = createClientEventBus({
      logger: logger.getSubLogger({ name: "TempEventBus" }),
    });

    return getWebSocketEventClient({
      eventBus: tempEventBus,
      hostname: wsConfig.hostname,
      port: wsConfig.port,
      protocol: wsConfig.protocol,
      logger: logger.getSubLogger({ name: "WebSocketEventClient" }),
    });
  }),
});

// Register feature services with browser-only factory
container.register<FileExplorerService>(DI_TOKENS.FILE_EXPLORER_SERVICE, {
  useFactory: createBrowserOnlyFactory(() => {
    return new FileExplorerService(
      container.resolve(DI_TOKENS.EVENT_BUS),
      container.resolve(DI_TOKENS.LOGGER)
    );
  }),
});

container.register<EditorService>(DI_TOKENS.EDITOR_SERVICE, {
  useFactory: createBrowserOnlyFactory(() => {
    return new EditorService(
      container.resolve(DI_TOKENS.EVENT_BUS),
      container.resolve(DI_TOKENS.LOGGER)
    );
  }),
});

container.register<WorkspaceTreeService>(DI_TOKENS.WORKSPACE_TREE_SERVICE, {
  useFactory: createBrowserOnlyFactory(() => {
    return new WorkspaceTreeService(
      container.resolve(DI_TOKENS.EVENT_BUS),
      container.resolve(DI_TOKENS.LOGGER)
    );
  }),
});

container.register<ConnectionService>(DI_TOKENS.CONNECTION_SERVICE, {
  useFactory: createBrowserOnlyFactory(() => {
    return new ConnectionService(
      container.resolve(DI_TOKENS.WEBSOCKET_CLIENT),
      container.resolve(DI_TOKENS.LOGGER)
    );
  }),
});

export { container };
