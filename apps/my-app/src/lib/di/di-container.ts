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

// Register core services
container.register<Logger<ILogObj>>(DI_TOKENS.LOGGER, {
  useValue: defaultLogger,
});

// Register ConfigService (singleton)
container.registerSingleton<ConfigService>(
  DI_TOKENS.CONFIG_SERVICE,
  ConfigService
);

// Register feature services
container.registerSingleton<FileExplorerService>(
  DI_TOKENS.FILE_EXPLORER_SERVICE,
  FileExplorerService
);

container.registerSingleton<EditorService>(
  DI_TOKENS.EDITOR_SERVICE,
  EditorService
);

container.registerSingleton<WorkspaceTreeService>(
  DI_TOKENS.WORKSPACE_TREE_SERVICE,
  WorkspaceTreeService
);

container.registerSingleton<ConnectionService>(
  DI_TOKENS.CONNECTION_SERVICE,
  ConnectionService
);

// For browser-specific services, use factory registrations
container.register<IWebSocketEventClient>(DI_TOKENS.WEBSOCKET_CLIENT, {
  useFactory: (dependencyContainer) => {
    if (typeof window === "undefined") {
      throw new Error(
        "WebSocketClient can only be created in browser environment"
      );
    }

    const logger = dependencyContainer.resolve<Logger<ILogObj>>(
      DI_TOKENS.LOGGER
    );
    const configService = dependencyContainer.resolve<ConfigService>(
      DI_TOKENS.CONFIG_SERVICE
    );

    const wsConfig = configService.getWebSocketConfig();

    const baseEventBus = createClientEventBus({
      logger: logger.getSubLogger({ name: "BaseEventBus" }),
    });

    return getWebSocketEventClient({
      eventBus: baseEventBus,
      hostname: wsConfig.hostname,
      port: wsConfig.port,
      protocol: wsConfig.protocol,
      logger: logger.getSubLogger({ name: "WebSocketClient" }),
    });
  },
});

container.register<IEventBus>(DI_TOKENS.EVENT_BUS, {
  useFactory: (dependencyContainer) => {
    if (typeof window === "undefined") {
      throw new Error("EventBus can only be created in browser environment");
    }

    const logger = dependencyContainer.resolve<Logger<ILogObj>>(
      DI_TOKENS.LOGGER
    );
    const baseEventBus = createClientEventBus({
      logger: logger.getSubLogger({ name: "BaseEventBus" }),
    });

    const wsClient = dependencyContainer.resolve<IWebSocketEventClient>(
      DI_TOKENS.WEBSOCKET_CLIENT
    );

    return new ConnectionAwareEventBus(
      baseEventBus,
      wsClient,
      logger.getSubLogger({ name: "ConnectionAwareEventBus" })
    );
  },
});

export { container };
