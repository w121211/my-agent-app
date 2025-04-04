// ```
// $ pnpm jest --selectProjects=msw-jsdom-tests tests/jsdom/websocket-event-client.test.ts -t "should relay client events to server and receive responses"
// ```
import { ws } from "msw";
import { setupServer } from "msw/node";
import { Logger } from "tslog";
import { createClientEventBus } from "@repo/events-core/event-bus";
import {
  ClientRunTestEvent,
  ServerSystemTestExecutedEvent,
} from "@repo/events-core/event-types";
import {
  WebSocketEventClient,
  getWebSocketEventClient,
  resetWebSocketClient,
} from "../../src/websocket-event-client.js";
import {
  ClientEventRelayMessage,
  ErrorRelayMessage,
  RelayMessageKind,
  ServerEventRelayMessage,
} from "../../src/relay-types.js";

const logger = new Logger({
  name: "WebSocketEventClient",
});

// Create a WebSocket connection handler
const eventSocket = ws.link("ws://localhost:8000/ws");

export const handlers = [
  // WebSocket handlers
  eventSocket.addEventListener("connection", ({ client }) => {
    logger.info("WebSocket connection established");

    // When client sends a message
    client.addEventListener("message", (event) => {
      console.log("Received from client:", event.data);

      try {
        const message: ClientEventRelayMessage = JSON.parse(
          event.data as string
        );

        if (message.kind === "CLIENT_EVENT") {
          // Echo back the event as a SERVER_EVENT with modified type
          const clientEvent = message.event as unknown as ClientRunTestEvent;
          const serverEvent: ServerSystemTestExecutedEvent = {
            kind: "ServerSystemTestExecuted",
            message: `Received: ${clientEvent.message || "no message"}`,
            timestamp: new Date(),
          };
          const serverEventRelayMessage: ServerEventRelayMessage = {
            kind: "SERVER_EVENT",
            event: serverEvent,
          };
          // Send the converted event back to client
          client.send(JSON.stringify(serverEventRelayMessage));
        }
      } catch (error) {
        // Send an error message if not valid JSON
        const errorMessage: ErrorRelayMessage = {
          kind: "ERROR",
          code: "INVALID_JSON",
          message: "Invalid JSON received",
        };
        client.send(JSON.stringify(errorMessage));
      }
    });

    // Simulate a server-initiated event
    setTimeout(() => {
      const ServerEventRelayMessage: ServerEventRelayMessage = {
        kind: "SERVER_EVENT",
        event: {
          kind: "ServerSystemTestExecuted",
          message: "This is a server-initiated test event",
          timestamp: new Date(),
        },
      };
      client.send(JSON.stringify(ServerEventRelayMessage));
    }, 1000);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetWebSocketClient();
});
afterAll(() => server.close());

describe("WebSocketEventClient", () => {
  it("should connect to websocket server", async () => {
    // Arrange
    const eventBus = createClientEventBus();
    const client = new WebSocketEventClient("ws://localhost:8000/ws", eventBus);

    // Act & Assert
    await new Promise<void>((resolve) => {
      // If no event is received in 2 seconds, fail the test
      const timeoutId = setTimeout(() => {
        unsubscribe();
        throw new Error("Connection timeout");
      }, 2000);

      // Subscribe to any server event to verify connection
      const unsubscribe = eventBus.subscribe("ServerSystemTestExecuted", () => {
        clearTimeout(timeoutId); // Clear the timeout when event is received
        unsubscribe();
        resolve();
      });

      client.connect();
    });

    // Cleanup
    client.disconnect();
  });

  it("should relay client events to server and receive responses", async () => {
    // Arrange
    const eventBus = createClientEventBus();
    const receivedEvents: any[] = [];

    // Act
    const client = getWebSocketEventClient({ eventBus });
    client.connect();

    // Subscribe to server events
    const unsubscribe = eventBus.subscribe(
      "ServerSystemTestExecuted",
      (event) => {
        receivedEvents.push(event);
      }
    );

    // Wait a bit for the connection to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(eventBus.getHandlerCount("ClientRunTest"));

    // Emit a client event
    await eventBus.emit({
      kind: "ClientRunTest",
      message: "Hello server",
      timestamp: new Date(),
    });

    // Assert - wait for response
    await new Promise<void>((resolve) => {
      // Timeout after 2 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        unsubscribe();
        client.disconnect();
        throw new Error("Timeout waiting for server response");
      }, 2000);

      const checkInterval = setInterval(() => {
        const responseEvent = receivedEvents.find(
          (event) => event.message === "Received: Hello server"
        );

        if (responseEvent) {
          console.log("Received response event:", responseEvent);

          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          expect(responseEvent.kind).toBe("ServerSystemTestExecuted");

          // Cleanup
          unsubscribe();
          client.disconnect();
          resolve();
        }
      }, 100);
    });
  });

  it("should receive server-initiated events", async () => {
    // Arrange
    const eventBus = createClientEventBus();
    const receivedEvents: any[] = [];

    // Act
    const client = getWebSocketEventClient({ eventBus });

    // Subscribe to server events
    const unsubscribe = eventBus.subscribe(
      "ServerSystemTestExecuted",
      (event) => {
        console.log("Received server event:", event);
        receivedEvents.push(event);
      }
    );

    client.connect();

    // Assert - wait for the server-initiated event (sent after 1s)
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const serverEvent = receivedEvents.find(
          (event) => event.message === "This is a server-initiated test event"
        );

        expect(serverEvent).toBeDefined();
        expect(serverEvent.kind).toBe("ServerSystemTestExecuted");

        // Cleanup
        unsubscribe();
        client.disconnect();
        resolve();
      }, 1500); // Wait longer than the timeout in the mock (1000ms)
    });
  });

  it("should handle reconnection attempts on connection failure", async () => {
    // Arrange
    const eventBus = createClientEventBus();
    const client = new WebSocketEventClient(
      "ws://nonexistent-server:8000/ws",
      eventBus
    );

    // Spy on console.log to check for reconnection attempts
    const consoleLogSpy = jest.spyOn(console, "log");

    // Act
    client.connect();

    // Assert - check for reconnection attempt logs
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Attempting to reconnect \(1\/\d+\)/)
        );

        // Cleanup
        client.disconnect();
        consoleLogSpy.mockRestore();
        resolve();
      }, 1500); // Wait for the first reconnection attempt
    });
  });
});
