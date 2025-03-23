import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { ILogObj, Logger } from "tslog";
import { IWebSocketEventClient } from "@repo/events-relay/websocket-event-client";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  container,
  registerWebSocketClient,
  WebSocketConfig,
} from "./di-container";
import { DI_TOKENS } from "./di-tokens";
import { FileExplorerService } from "../../features/file-explorer-di/file-explorer-service";
import { EditorService } from "../../features/editor/editor-service";

// Context to provide container services to React components
type DIContextType = {
  getWebSocketClient: () => IWebSocketEventClient | null;
  getEventBus: () => IEventBus;
  getFileExplorerService: () => FileExplorerService;
  getEditorService: () => EditorService;
};

const DIContext = createContext<DIContextType>({
  getWebSocketClient: () => null,
  getEventBus: () => {
    throw new Error("EventBus not initialized");
  },
  getFileExplorerService: () => {
    throw new Error("FileExplorerService not initialized");
  },
  getEditorService: () => {
    throw new Error("EditorService not initialized");
  },
});

interface DIProviderProps {
  children: ReactNode;
  websocketConfig?: WebSocketConfig;
  logger?: Logger<ILogObj>;
}

export function DIProvider({
  children,
  websocketConfig,
  logger,
}: DIProviderProps) {
  // Register custom logger if provided
  useEffect(() => {
    if (logger) {
      container.register(DI_TOKENS.LOGGER, { useValue: logger });
    }
  }, [logger]);

  // Initialize WebSocket client if config is provided
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (websocketConfig) {
      registerWebSocketClient(websocketConfig);

      // Connect the WebSocket client
      const client = container.resolve<IWebSocketEventClient>(
        DI_TOKENS.WEBSOCKET_CLIENT
      );
      client.connect();

      // Cleanup on unmount
      return () => {
        client.disconnect();
      };
    } else {
      console.warn(
        "WebSocket configuration not provided, skipping initialization"
      );
    }
  }, [websocketConfig]);

  // Create stable context value with useMemo
  const contextValue = useMemo<DIContextType>(
    () => ({
      getWebSocketClient: () => {
        try {
          return container.resolve<IWebSocketEventClient>(
            DI_TOKENS.WEBSOCKET_CLIENT
          );
        } catch (error) {
          // WebSocket client is optional and may not be registered
          console.debug("WebSocket client not available", error);
          return null;
        }
      },
      getEventBus: () => container.resolve<IEventBus>(DI_TOKENS.EVENT_BUS),
      getFileExplorerService: () =>
        container.resolve<FileExplorerService>(DI_TOKENS.FILE_EXPLORER_SERVICE),
      getEditorService: () =>
        container.resolve<EditorService>(DI_TOKENS.EDITOR_SERVICE),
    }),
    []
  );

  return (
    <DIContext.Provider value={contextValue}>{children}</DIContext.Provider>
  );
}

// Custom hooks to access services
export function useWebSocketClient(): IWebSocketEventClient | null {
  const { getWebSocketClient } = useContext(DIContext);
  return useMemo(() => getWebSocketClient(), []);
}

export function useEventBus(): IEventBus {
  const { getEventBus } = useContext(DIContext);
  return useMemo(() => getEventBus(), []);
}

export function useFileExplorerService(): FileExplorerService {
  const { getFileExplorerService } = useContext(DIContext);
  // Use React's useMemo to ensure we don't create a new reference on every render
  const service = React.useMemo(() => getFileExplorerService(), []);
  return service;
}

export function useEditorService(): EditorService {
  const { getEditorService } = useContext(DIContext);
  // Use React's useMemo to ensure we don't create a new reference on every render
  const service = React.useMemo(() => getEditorService(), []);
  return service;
}
