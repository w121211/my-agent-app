"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { IWebSocketEventClient } from "@repo/events-relay/websocket-event-client";
import { IEventBus } from "@repo/events-core/event-bus";
import { container } from "./di-container";
import { DI_TOKENS } from "./di-tokens";
import { FileExplorerService } from "../../features/file-explorer-di/file-explorer-service";
import { EditorService } from "../../features/editor/editor-service";
import { ConnectionService } from "../../features/connection/connection-service";
import { WorkspaceTreeService } from "@/features/workspace-tree/workspace-tree-service";
import { ConfigService } from "../config/config-service";

// Context to provide container services to React components
type DIContextType = {
  getWebSocketClient: () => IWebSocketEventClient;
  getEventBus: () => IEventBus;
  getFileExplorerService: () => FileExplorerService;
  getEditorService: () => EditorService;
  getConnectionService: () => ConnectionService;
  getWorkspaceTreeService: () => WorkspaceTreeService;
  getConfigService: () => ConfigService;
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
  getConfigService: () => {
    throw new Error("ConfigService not initialized");
  },
});

interface DIProviderProps {
  children: ReactNode;
}

export function DIProvider({ children }: DIProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize WebSocket connection and monitoring
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Services are already registered in di-container.ts
    const wsClient = container.resolve<IWebSocketEventClient>(
      DI_TOKENS.WEBSOCKET_CLIENT
    );
    const connectionService = container.resolve<ConnectionService>(
      DI_TOKENS.CONNECTION_SERVICE
    );

    // Connect and start monitoring
    wsClient.connect();
    connectionService.startMonitoring();
    setIsInitialized(true);

    // Cleanup on unmount
    return () => {
      const connectionService = container.resolve<ConnectionService>(
        DI_TOKENS.CONNECTION_SERVICE
      );
      connectionService.stopMonitoring();
      wsClient.disconnect();
    };
  }, []);

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
      getWorkspaceTreeService: () =>
        container.resolve<WorkspaceTreeService>(
          DI_TOKENS.WORKSPACE_TREE_SERVICE
        ),
      getConfigService: () =>
        container.resolve<ConfigService>(DI_TOKENS.CONFIG_SERVICE),
    }),
    [isInitialized]
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
  return useMemo(() => getEditorService(), [getEditorService]);
}

export function useFileExplorerService(): FileExplorerService {
  const { getFileExplorerService } = useContext(DIContext);
  return useMemo(() => getFileExplorerService(), [getFileExplorerService]);
}

export function useConnectionService(): ConnectionService {
  const { getConnectionService } = useContext(DIContext);
  return useMemo(() => getConnectionService(), [getConnectionService]);
}

export function useWorkspaceTreeService(): WorkspaceTreeService {
  const { getWorkspaceTreeService } = useContext(DIContext);
  return useMemo(() => getWorkspaceTreeService(), [getWorkspaceTreeService]);
}

export function useConfigService(): ConfigService {
  const { getConfigService } = useContext(DIContext);
  return useMemo(() => getConfigService(), [getConfigService]);
}
