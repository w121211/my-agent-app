import {
  ReactNode,
  useEffect,
  useContext,
  createContext,
  useState,
} from "react";
import { ILogObj, Logger } from "tslog";
import { IEventBus, createClientEventBus } from "@repo/events-core/event-bus";
import {
  WebSocketEventClient,
  getWebSocketEventClient,
} from "@repo/events-relay/websocket-event-client";
import { useFileExplorerServiceStore } from "../file-explorer/file-explorer-service-store";

// Context type definition
type WebSocketEventClientContextType = {
  client: WebSocketEventClient | null;
  eventBus: IEventBus | null;
};

// Create context with null default values
const WebSocketEventClientContext =
  createContext<WebSocketEventClientContextType>({
    client: null,
    eventBus: null,
  });

interface WebSocketEventClientProviderProps {
  children: ReactNode;
  hostname?: string;
  port?: number;
  protocol?: string;
  logger?: Logger<ILogObj>;
}

export const WebSocketEventClientProvider = ({
  children,
  hostname,
  port,
  protocol,
  logger,
}: WebSocketEventClientProviderProps) => {
  const [client, setClient] = useState<WebSocketEventClient | null>(null);
  const [eventBus, setEventBus] = useState<IEventBus | null>(null);

  // Initialize EventBus on mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    const bus = createClientEventBus({ logger });
    setEventBus(bus);
    
    // Initialize FileExplorerService with the event bus
    useFileExplorerServiceStore.getState().initialize(bus);

    // Cleanup on unmount
    return () => {
      bus.clear();
      setEventBus(null);
    };
  }, [logger]);

  // Initialize and connect WebSocket client when EventBus is ready
  useEffect(() => {
    // Only proceed when EventBus is initialized
    if (!eventBus || typeof window === "undefined") return;

    const wsClient = getWebSocketEventClient({
      eventBus,
      hostname,
      port,
      protocol,
      logger,
    });

    // Connect to the server
    wsClient.connect();

    // Update the state
    setClient(wsClient);

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
      setClient(null);
    };
  }, [eventBus, hostname, port, protocol, logger]);

  return (
    <WebSocketEventClientContext.Provider value={{ client, eventBus }}>
      {children}
    </WebSocketEventClientContext.Provider>
  );
};

/**
 * Hook to use the WebSocket client in components
 */
export const useWebSocketEventClient = (): WebSocketEventClient | null => {
  const { client } = useContext(WebSocketEventClientContext);
  return client;
};

/**
 * Hook to use the EventBus in components
 */
export const useEventBus = (): IEventBus | null => {
  const { eventBus } = useContext(WebSocketEventClientContext);
  return eventBus;
};

export default WebSocketEventClientProvider;