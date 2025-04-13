import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ILogObj, Logger } from "tslog";
import { IWebSocketEventClient } from "@repo/events-relay/websocket-event-client";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  container,
  setupEventCommunication,
  WebSocketConfig,
} from "./di-container";
import { DI_TOKENS } from "./di-tokens";
import { FileExplorerService } from "../../features/file-explorer-di/file-explorer-service";
import { EditorService } from "../../features/editor/editor-service";
import { ConnectionService } from "../../features/connection/connection-service";
import { WorkspaceTreeService } from "@/features/workspace-tree/workspace-tree-service";

// Context to provide container services to React components
type DIContextType = {
  getWebSocketClient: () => IWebSocketEventClient;
  getEventBus: () => IEventBus;
  getFileExplorerService: () => FileExplorerService;
  getEditorService: () => EditorService;
  getConnectionService: () => ConnectionService;
  getWorkspaceTreeService: () => WorkspaceTreeService;
};

const DIContext = createContext<DIContextType>({
  getWebSocketClient: () => {
    throw new Error("WebSocketClient not initialized");
  },
  getEventBus: () => {
    throw new Error("EventBus not initialized");
  },
  getFileExplorerService: () => {
    throw new Error("FileExplorerService not initialized");
  },
  getEditorService: () => {
    throw new Error("EditorService not initialized");
  },
  getConnectionService: () => {
    throw new Error("ConnectionService not initialized");
  },
  getWorkspaceTreeService: () => {
    throw new Error("WorkspaceTreeService not initialized");
  },
});

interface DIProviderProps {
  children: ReactNode;
  websocketConfig: WebSocketConfig;
  logger?: Logger<ILogObj>;
}

export function DIProvider({
  children,
  websocketConfig,
  logger,
}: DIProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Register custom logger if provided
  useEffect(() => {
    if (logger) {
      container.register(DI_TOKENS.LOGGER, { useValue: logger });
    }
  }, [logger]);

  // Initialize WebSocket client and EventBus
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Setup WebSocket client and EventBus communication
    const client = setupEventCommunication(websocketConfig);

    // Connect the WebSocket client
    client.connect();

    // Mark as initialized only after WebSocket client is set up
    setIsInitialized(true);

    // Cleanup on unmount
    return () => {
      const connectionService = container.resolve<ConnectionService>(
        DI_TOKENS.CONNECTION_SERVICE
      );
      connectionService.stopMonitoring();
      client.disconnect();
    };
  }, [websocketConfig]);

  // Effect to start connection monitoring after initialization
  useEffect(() => {
    if (isInitialized) {
      // Now safely get and start the connection service
      const connectionService = container.resolve<ConnectionService>(
        DI_TOKENS.CONNECTION_SERVICE
      );
      connectionService.startMonitoring();
    }
  }, [isInitialized]);

  // Create stable context value with useMemo
  const contextValue = useMemo<DIContextType>(
    () => ({
      getWebSocketClient: () =>
        container.resolve<IWebSocketEventClient>(DI_TOKENS.WEBSOCKET_CLIENT),
      getEventBus: () => container.resolve<IEventBus>(DI_TOKENS.EVENT_BUS),
      getFileExplorerService: () =>
        container.resolve<FileExplorerService>(DI_TOKENS.FILE_EXPLORER_SERVICE),
      getEditorService: () =>
        container.resolve<EditorService>(DI_TOKENS.EDITOR_SERVICE),
      getConnectionService: () =>
        container.resolve<ConnectionService>(DI_TOKENS.CONNECTION_SERVICE),
      getWorkspaceTreeService: () => {
        // logger?.debug("DIProvider - Resolving WorkspaceTreeService");
        // return container.resolve<WorkspaceTreeService>(
        //   DI_TOKENS.WORKSPACE_TREE_SERVICE
        // );
        try {
          return container.resolve<WorkspaceTreeService>(
            DI_TOKENS.WORKSPACE_TREE_SERVICE
          );
        } catch (error) {
          logger?.error("Failed to resolve WorkspaceTreeService", error);
          throw new Error("WorkspaceTreeService not available");
        }
      },
    }),
    [isInitialized] // Re-create when initialized changes
  );

  return (
    <DIContext.Provider value={contextValue}>{children}</DIContext.Provider>
  );
}

// Custom hooks to access services
export function useWebSocketClient(): IWebSocketEventClient {
  const { getWebSocketClient } = useContext(DIContext);
  return useMemo(() => getWebSocketClient(), [getWebSocketClient]);
}

export function useEventBus(): IEventBus {
  const { getEventBus } = useContext(DIContext);
  return useMemo(() => getEventBus(), [getEventBus]);
}

export function useEditorService(): EditorService {
  const { getEditorService } = useContext(DIContext);
  const service = useMemo(() => getEditorService(), [getEditorService]);
  return service;
}

export function useFileExplorerService(): FileExplorerService {
  const { getFileExplorerService } = useContext(DIContext);
  const service = useMemo(
    () => getFileExplorerService(),
    [getFileExplorerService]
  );
  return service;
}

export function useConnectionService(): ConnectionService {
  const { getConnectionService } = useContext(DIContext);
  return useMemo(() => getConnectionService(), [getConnectionService]);
}

export function useWorkspaceTreeService(): WorkspaceTreeService {
  const { getWorkspaceTreeService } = useContext(DIContext);
  return useMemo(() => getWorkspaceTreeService(), [getWorkspaceTreeService]);
}
