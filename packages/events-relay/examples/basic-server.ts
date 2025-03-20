import { ILogObj, Logger } from "tslog";
import { createServerEventBus } from "@repo/events-core/event-bus";
import {
  ServerEventType,
  ClientEventType,
  isEventType,
  ServerTestEvent,
  ClientTestEvent,
} from "@repo/events-core/event-types";
import { createWebSocketEventServer } from "../src/websocket-event-server.js";

// Create a root logger
const logger: Logger<ILogObj> = new Logger({ name: "EventServerDemo" });

// Server configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;
const TEST_EVENT_INTERVAL_MS = 5000; // Send test event every 5 seconds

/**
 * Run the event server demo
 */
function runEventServerDemo(): void {
  logger.info(`Starting Event Server Demo on port ${PORT}`);

  // Create the event bus for the server
  const eventBus = createServerEventBus({ logger });

  // Create and start the WebSocket event server
  const eventServer = createWebSocketEventServer({
    port: PORT,
    eventBus,
    logger,
  });
  eventServer.start();

  // Register handler for client test events
  eventBus.subscribe(
    ClientEventType.CLIENT_TEST_EVENT,
    (event: ClientTestEvent) => {
      if (isEventType(event, ClientEventType.CLIENT_TEST_EVENT)) {
        logger.info(`Received CLIENT_TEST_EVENT: ${event.message}`);

        // Respond with a server test event
        const serverTestEvent: ServerTestEvent = {
          eventType: ServerEventType.SERVER_TEST_EVENT,
          timestamp: new Date(),
          message: `Response to: ${event.message}`,
          correlationId: event.correlationId,
        };

        eventBus.emit(serverTestEvent).catch((error) => {
          logger.error("Failed to emit server test event:", error);
        });
      }
    }
  );

  // Send periodic test events
  setInterval(() => {
    const serverTestEvent: ServerTestEvent = {
      eventType: ServerEventType.SERVER_TEST_EVENT,
      timestamp: new Date(),
      message: `Periodic test event - ${new Date().toISOString()}`,
    };

    eventBus.emit(serverTestEvent).catch((error) => {
      logger.error("Failed to emit periodic server test event:", error);
    });

    logger.debug("Sent periodic test event");
  }, TEST_EVENT_INTERVAL_MS);

  // Handle process termination
  process.on("SIGINT", () => {
    logger.info("Shutting down event server...");
    eventServer.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Shutting down event server...");
    eventServer.stop();
    process.exit(0);
  });

  logger.info("Event Server Demo is running. Press Ctrl+C to stop.");
}

// Run the demo
runEventServerDemo();
