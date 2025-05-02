"use client";

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
import { container } from "./di-container";
import { DI_TOKENS } from "./di-tokens";
// import { FileExplorerService } from "../../features/file-explorer-di/file-explorer-service";
import { EditorService } from "../../features/editor/editor-service";
import { ConnectionService } from "../../features/connection/connection-service";
import { WorkspaceTreeService } from "../../features/workspace-tree/workspace-tree-service";
import { ChatPanelService } from "../../features/chat-panel/chat-panel-service";
import { PreviewPanelService } from "../../features/preview-panel/preview-panel-service";
import { ConfigService } from "../config/config-service";

// Context for service access
type DIContextType = {
  isInitialized: boolean;
  services: {
    webSocketClient: IWebSocketEventClient | null;
    eventBus: IEventBus | null;
    // fileExplorerService: FileExplorerService | null;
    editorService: EditorService | null;
    connectionService: ConnectionService | null;
    workspaceTreeService: WorkspaceTreeService | null;
    configService: ConfigService | null;
    chatPanelService: ChatPanelService | null;
    previewPanelService: PreviewPanelService | null;
  };
};

// Initial state with null services
const initialServicesState: DIContextType["services"] = {
  webSocketClient: null,
  eventBus: null,
  // fileExplorerService: null,
  editorService: null,
  connectionService: null,
  workspaceTreeService: null,
  configService: null,
  chatPanelService: null,
  previewPanelService: null,
};

const DIContext = createContext<DIContextType>({
  isInitialized: false,
  services: initialServicesState,
});

const logger = new Logger<ILogObj>({ name: "DIProvider" });

interface DIProviderProps {
  children: ReactNode;
}

export function DIProvider({ children }: DIProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [services, setServices] = useState(initialServicesState);

  // Initialize services only after component is mounted client-side
  useEffect(() => {
    // Skip server-side execution
    if (typeof window === "undefined") {
      logger.debug("Skipping service initialization on server-side");
      return;
    }

    try {
      logger.debug("Initializing client-side services");

      // Initialize services
      const configService = container.resolve<ConfigService>(
        DI_TOKENS.CONFIG_SERVICE
      );
      const wsClient = container.resolve<IWebSocketEventClient>(
        DI_TOKENS.WEBSOCKET_CLIENT
      );
      const eventBus = container.resolve<IEventBus>(DI_TOKENS.EVENT_BUS);
      // const fileExplorerService = container.resolve<FileExplorerService>(
      //   DI_TOKENS.FILE_EXPLORER_SERVICE
      // );
      const editorService = container.resolve<EditorService>(
        DI_TOKENS.EDITOR_SERVICE
      );
      const connectionService = container.resolve<ConnectionService>(
        DI_TOKENS.CONNECTION_SERVICE
      );
      const workspaceTreeService = container.resolve<WorkspaceTreeService>(
        DI_TOKENS.WORKSPACE_TREE_SERVICE
      );
      const chatPanelService = container.resolve<ChatPanelService>(
        DI_TOKENS.CHAT_PANEL_SERVICE
      );
      const previewPanelService = container.resolve<PreviewPanelService>(
        DI_TOKENS.PREVIEW_PANEL_SERVICE
      );

      // Start services
      wsClient.connect();
      connectionService.startMonitoring();

      // Update state
      setServices({
        webSocketClient: wsClient,
        eventBus,
        // fileExplorerService,
        editorService,
        connectionService,
        workspaceTreeService,
        configService,
        chatPanelService,
        previewPanelService,
      });

      setIsInitialized(true);

      // Cleanup on unmount
      return () => {
        connectionService.stopMonitoring();
        wsClient.disconnect();
      };
    } catch (error) {
      logger.error("Failed to initialize services:", error);
    }
  }, []);

  const contextValue = useMemo<DIContextType>(
    () => ({
      isInitialized,
      services,
    }),
    [isInitialized, services]
  );

  return (
    <DIContext.Provider value={contextValue}>{children}</DIContext.Provider>
  );
}

// Custom hooks to access services
export function useWebSocketClient() {
  const { services } = useContext(DIContext);
  return services.webSocketClient;
}

export function useEventBus() {
  const { services } = useContext(DIContext);
  return services.eventBus;
}

export function useEditorService() {
  const { services } = useContext(DIContext);
  return services.editorService;
}

// export function useFileExplorerService() {
//   const { services } = useContext(DIContext);
//   return services.fileExplorerService;
// }

export function useConnectionService() {
  const { services } = useContext(DIContext);
  return services.connectionService;
}

export function useWorkspaceTreeService() {
  const { services } = useContext(DIContext);
  return services.workspaceTreeService;
}

export function useConfigService() {
  const { services } = useContext(DIContext);
  return services.configService;
}

export function useChatPanelService() {
  const { services } = useContext(DIContext);
  return services.chatPanelService;
}

export function usePreviewPanelService() {
  const { services } = useContext(DIContext);
  return services.previewPanelService;
}

// Helper hook to know when services are ready
export function useServicesInitialized() {
  const { isInitialized } = useContext(DIContext);
  return isInitialized;
}
