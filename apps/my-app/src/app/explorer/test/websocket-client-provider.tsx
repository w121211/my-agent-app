import {
  JSX,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { ILogObj, Logger } from "tslog";
import { IEventBus, createClientEventBus } from "@repo/events-core/event-bus";
// import { getWebSocketEventClient } from './websocket-event-client';
import { getWebSocketEventClient } from "@repo/events-relay/websocket-event-client";

// Event bus context
const EventBusContext = createContext<IEventBus | null>(null);

// Props interface
interface WebSocketEventClientProviderProps {
  children: ReactNode;
  hostname?: string;
  port?: number;
  protocol?: string;
  logger?: Logger<ILogObj>;
  eventBusOverride?: IEventBus; // For testing with mock event bus
}

/**
 * Provider component for WebSocket event client
 * Manages WebSocket connection and provides event bus to child components
 */
export const WebSocketEventClientProvider = ({
  children,
  hostname,
  port,
  protocol,
  logger,
  eventBusOverride,
}: WebSocketEventClientProviderProps): JSX.Element => {
  // Use provided logger or create a new one
  const providerLogger = logger || new Logger({ name: "WebSocketProvider" });

  // Create event bus - either use override (for testing) or create a real one
  const eventBus = useMemo(() => {
    if (eventBusOverride) {
      providerLogger.info("Using provided event bus override");
      return eventBusOverride;
    }

    providerLogger.info("Creating client event bus");
    return createClientEventBus({ logger: providerLogger });
  }, [eventBusOverride, providerLogger]);

  // Initialize WebSocket connection
  useEffect(() => {
    // Skip WebSocket initialization if using override
    if (eventBusOverride) {
      return;
    }

    try {
      providerLogger.info("Initializing WebSocket event client");

      const client = getWebSocketEventClient({
        hostname,
        port,
        protocol,
        eventBus,
        logger: providerLogger,
      });

      client.connect();

      // Cleanup on unmount
      return () => {
        providerLogger.info("Disconnecting WebSocket event client");
        client.disconnect();
      };
    } catch (error) {
      providerLogger.error("Failed to initialize WebSocket client:", error);
    }
  }, [hostname, port, protocol, eventBus, providerLogger, eventBusOverride]);

  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  );
};

/**
 * Hook to access the event bus in child components
 */
export const useEventBus = (): IEventBus | null => {
  return useContext(EventBusContext);
};
