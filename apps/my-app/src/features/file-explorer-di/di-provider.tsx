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
import { FileExplorerService } from "./file-explorer-service";

// Context to provide container services to React components
type DIContextType = {
  getWebSocketClient: () => IWebSocketEventClient | null;
  getEventBus: () => IEventBus;
  getFileExplorerService: () => FileExplorerService;
};

const DIContext = createContext<DIContextType>({
  getWebSocketClient: () => null,
  getEventBus: () => {
    throw new Error("EventBus not initialized");
  },
  getFileExplorerService: () => {
    throw new Error("FileExplorerService not initialized");
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
          // const logger = container.resolve<Logger<ILogObj>>(DI_TOKENS.LOGGER);
          console.debug("WebSocket client not available", error);
          return null;
        }
      },
      getEventBus: () => container.resolve<IEventBus>(DI_TOKENS.EVENT_BUS),
      getFileExplorerService: () =>
        container.resolve<FileExplorerService>(DI_TOKENS.FILE_EXPLORER_SERVICE),
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
