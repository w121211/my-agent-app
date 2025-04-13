/**
 * Jest CLI command to run this test:
 * pnpm jest --selectProjects=msw-jsdom-tests --testPathPattern=connection-aware-event-bus
 */
import { ws } from "msw";
import { setupServer } from "msw/node";
import { Logger } from "tslog";
import { createClientEventBus } from "@repo/events-core/event-bus";
import {
  ClientTestPingEvent,
  ServerTestPingEvent,
} from "@repo/events-core/event-types";
import { WebSocketEventClient } from "../../src/websocket-event-client.js";
import { ConnectionAwareEventBus } from "../../src/connection-aware-event-bus.js";
import {
  ClientEventRelayMessage,
  ErrorRelayMessage,
  ServerEventRelayMessage,
} from "../../src/relay-types.js";

const logger = new Logger({
  name: "ConnectionAwareEventBusTest",
});

// Create a WebSocket connection handler
const eventSocket = ws.link("ws://localhost:8000/ws");

export const handlers = [
  // WebSocket handlers
  eventSocket.addEventListener("connection", ({ client }) => {
    logger.info("WebSocket connection established");

    // When client sends a message
    client.addEventListener("message", (event) => {
      try {
        const message: ClientEventRelayMessage = JSON.parse(
          event.data as string
        );

        if (message.kind === "CLIENT_EVENT") {
          // Echo back the event as a SERVER_EVENT with modified type
          const clientEvent = message.event as unknown as ClientTestPingEvent;
          const serverEvent: ServerTestPingEvent = {
            kind: "ServerTestPing",
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
          kind: "ServerTestPing",
          message: "This is a server-initiated test event",
          timestamp: new Date(),
        },
      };
      client.send(JSON.stringify(ServerEventRelayMessage));
    }, 500);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ConnectionAwareEventBus", () => {
  it("should pass through events when connection is established", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );
    const mockHandler = jest.fn();

    // Connect and wait for connection
    wsClient.connect();

    // Wait for connection to establish
    await new Promise<void>((resolve) => {
      // Subscribe to server event to verify connection
      const unsubscribe = originalEventBus.subscribe<ServerTestPingEvent>(
        "ServerTestPing",
        () => {
          unsubscribe();
          resolve();
        }
      );
    });

    // Subscribe through the connection-aware event bus
    connectionAwareEventBus.subscribe("ServerTestPing", mockHandler);

    // Act - emit a server event through the original event bus (simulating a received event)
    await originalEventBus.emit({
      kind: "ServerTestPing",
      message: "Test server event",
      timestamp: new Date(),
    });

    // Assert
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerTestPing",
        message: "Test server event",
      })
    );

    // Cleanup
    wsClient.disconnect();
  });

  it("should throw error when emitting client events with no connection", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );

    // Do not connect - ensure disconnected state

    // Act & Assert - should throw error when emitting client event
    await expect(
      connectionAwareEventBus.emit({
        kind: "ClientTestPing",
        message: "This should fail",
        timestamp: new Date(),
      })
    ).rejects.toThrow("WebSocket disconnected");
  });

  it("should allow server events to pass through even when disconnected", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );
    const mockHandler = jest.fn();

    // Do not connect - ensure disconnected state
    connectionAwareEventBus.subscribe("ServerTestPing", mockHandler);

    // Act - emit a server event through the connection-aware event bus
    await connectionAwareEventBus.emit({
      kind: "ServerTestPing",
      message: "Server event while disconnected",
      timestamp: new Date(),
    });

    // Assert
    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerTestPing",
        message: "Server event while disconnected",
      })
    );
  });

  it("should properly handle subscriptions and unsubscriptions", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );
    const mockHandler = jest.fn();

    // Act - subscribe
    const unsubscribe = connectionAwareEventBus.subscribe(
      "ServerTestPing",
      mockHandler
    );

    // Assert - should have one handler
    expect(connectionAwareEventBus.getHandlerCount("ServerTestPing")).toBe(1);

    // Act - unsubscribe
    unsubscribe();

    // Assert - should have no handlers
    expect(connectionAwareEventBus.getHandlerCount("ServerTestPing")).toBe(0);
  });

  it("should successfully emit client events when connected", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );
    const receivedEvents: ServerTestPingEvent[] = [];

    // Connect and wait for connection
    wsClient.connect();

    // Subscribe to server events to verify we get a response
    const unsubscribe = connectionAwareEventBus.subscribe<ServerTestPingEvent>(
      "ServerTestPing",
      (event) => {
        receivedEvents.push(event);
      }
    );

    // Wait for connection to establish
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    // Act - emit a client event through the connection-aware event bus
    await connectionAwareEventBus.emit({
      kind: "ClientTestPing",
      message: "Hello from connection-aware bus",
      timestamp: new Date(),
    });

    // Assert - wait for response
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        const responseEvent = receivedEvents.find(
          (event) =>
            event.message === "Received: Hello from connection-aware bus"
        );

        if (responseEvent) {
          clearInterval(checkInterval);
          expect(responseEvent.kind).toBe("ServerTestPing");
          unsubscribe();
          wsClient.disconnect();
          resolve();
        }
      }, 100);

      // Timeout after 2 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        unsubscribe();
        wsClient.disconnect();
        throw new Error("Timeout waiting for server response");
      }, 2000);
    });
  });

  it("should delegate group subscription methods correctly", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );

    const clientEventHandler = jest.fn();
    const serverEventHandler = jest.fn();

    // Act - subscribe to all client and server events
    const unsubscribeClient =
      connectionAwareEventBus.subscribeToAllClientEvents(clientEventHandler);
    const unsubscribeServer =
      connectionAwareEventBus.subscribeToAllServerEvents(serverEventHandler);

    // Assert - handlers should be registered for various event types
    expect(connectionAwareEventBus.hasHandlers("ClientTestPing")).toBe(true);
    expect(connectionAwareEventBus.hasHandlers("ServerTestPing")).toBe(true);

    // Act - unsubscribe
    unsubscribeClient();
    unsubscribeServer();

    // Assert - handlers should be removed
    expect(connectionAwareEventBus.hasHandlers("ClientTestPing")).toBe(false);
    expect(connectionAwareEventBus.hasHandlers("ServerTestPing")).toBe(false);
  });

  it("should clear all handlers when clear() is called", async () => {
    // Arrange
    const originalEventBus = createClientEventBus();
    const wsClient = new WebSocketEventClient(
      "ws://localhost:8000/ws",
      originalEventBus
    );
    const connectionAwareEventBus = new ConnectionAwareEventBus(
      originalEventBus,
      wsClient
    );

    // Add some handlers
    connectionAwareEventBus.subscribe("ServerTestPing", jest.fn());
    connectionAwareEventBus.subscribe("ClientTestPing", jest.fn());

    // Verify handlers exist
    expect(connectionAwareEventBus.hasHandlers("ServerTestPing")).toBe(true);
    expect(connectionAwareEventBus.hasHandlers("ClientTestPing")).toBe(true);

    // Act - clear all handlers
    connectionAwareEventBus.clear();

    // Assert - no handlers should remain
    expect(connectionAwareEventBus.hasHandlers("ServerTestPing")).toBe(false);
    expect(connectionAwareEventBus.hasHandlers("ClientTestPing")).toBe(false);
  });
});
