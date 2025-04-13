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
import { DI_TOKENS } from "./di-tokens";

// Create default logger
const defaultLogger = new Logger<ILogObj>({ name: "AppContainer" });

// Register logger
container.register<Logger<ILogObj>>(DI_TOKENS.LOGGER, {
  useValue: defaultLogger,
});

// WebSocketClient and EventBus configuration
export interface WebSocketConfig {
  hostname: string; // Required
  port: number; // Required
  protocol: string; // Required
}

export function setupEventCommunication(
  config: WebSocketConfig
): IWebSocketEventClient {
  const logger = container.resolve<Logger<ILogObj>>(DI_TOKENS.LOGGER);

  // Create basic event bus for WebSocket client
  const baseEventBus = createClientEventBus({
    logger: logger.getSubLogger({ name: "BaseEventBus" }),
  });

  // Register WebSocket client first
  const client = getWebSocketEventClient({
    eventBus: baseEventBus,
    hostname: config.hostname,
    port: config.port,
    protocol: config.protocol,
    logger: logger.getSubLogger({ name: "WebSocketClient" }),
  });

  // Update the WebSocketClient registration with the real client
  container.register<IWebSocketEventClient>(DI_TOKENS.WEBSOCKET_CLIENT, {
    useValue: client,
  });

  // Then register ConnectionAwareEventBus that wraps the base event bus
  const connectionAwareEventBus = new ConnectionAwareEventBus(
    baseEventBus,
    client,
    logger.getSubLogger({ name: "ConnectionAwareEventBus" })
  );

  container.register<IEventBus>(DI_TOKENS.EVENT_BUS, {
    useValue: connectionAwareEventBus,
  });

  // Register FileExplorerService (singleton)
  container.registerSingleton<FileExplorerService>(
    DI_TOKENS.FILE_EXPLORER_SERVICE,
    FileExplorerService
  );

  // Register EditorService (singleton)
  container.registerSingleton<EditorService>(
    DI_TOKENS.EDITOR_SERVICE,
    EditorService
  );

  // Register WorkspaceTreeService (singleton)
  container.registerSingleton<WorkspaceTreeService>(
    DI_TOKENS.WORKSPACE_TREE_SERVICE,
    WorkspaceTreeService
  );

  // Register ConnectionService (singleton)
  container.registerSingleton<ConnectionService>(
    DI_TOKENS.CONNECTION_SERVICE,
    ConnectionService
  );

  return client;
}

export { container };
