import WebSocket from "ws";
import { createServerEventBus } from "@repo/events-core/event-bus";
import {
  ClientEventType,
  ClientTestEvent,
  ServerEventType,
} from "@repo/events-core/types";
import { RelayMessageType } from "../relay-types.js";
import {
  WebSocketEventServer,
  createWebSocketEventServer,
} from "../websocket-event-server.js";

// Use a dedicated port for testing
const TEST_PORT = 8899;

describe("WebSocketEventServer Integration Tests", () => {
  let server: WebSocketEventServer;
  let eventBus: any;
  let client: WebSocket;

  beforeEach((done) => {
    // Setup server and client for each test
    eventBus = createServerEventBus();
    server = createWebSocketEventServer({ port: TEST_PORT, eventBus });
    server.start();

    // Connect client to server
    client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on("open", done);
  });

  afterEach((done) => {
    // Cleanup resources
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
    server.stop();
    setTimeout(done, 100); // Allow time for cleanup
  });

  test("server should forward server events to client", (done) => {
    client.on("message", (data) => {
      const message = JSON.parse(data.toString());

      expect(message.type).toBe(RelayMessageType.SERVER_EVENT);
      expect(message.event.eventType).toBe(ServerEventType.SERVER_TEST_EVENT);

      done();
    });

    // Emit a server event on the event bus
    eventBus.emit({
      eventType: ServerEventType.SERVER_TEST_EVENT,
      timestamp: new Date(),
      message: "Test message",
    });
  });

  test("server should process client events and forward to event bus", (done) => {
    // Subscribe to client event on the event bus
    eventBus.subscribe(
      ClientEventType.CLIENT_TEST_EVENT,
      (event: ClientTestEvent) => {
        expect(event.eventType).toBe(ClientEventType.CLIENT_TEST_EVENT);
        expect(event.message).toBe("Test from client");

        done();
      }
    );

    // Send a client event from WebSocket client
    client.send(
      JSON.stringify({
        type: RelayMessageType.CLIENT_EVENT,
        event: {
          eventType: ClientEventType.CLIENT_TEST_EVENT,
          timestamp: new Date(),
          message: "Test from client",
        },
      })
    );
  });

  test("server should handle invalid messages with error response", (done) => {
    client.on("message", (data) => {
      const message = JSON.parse(data.toString());

      expect(message.type).toBe(RelayMessageType.ERROR);
      expect(message.code).toBe("PARSE_ERROR");

      done();
    });

    // Send invalid data to trigger error handling
    client.send("Not valid JSON");
  });

  test("server should broadcast to multiple clients", (done) => {
    // Create a second client
    const client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
    let receivedCount = 0;

    // Handler for message receipt
    const messageHandler = () => {
      receivedCount++;
      if (receivedCount === 2) {
        client2.close();
        done();
      }
    };

    // Setup message handlers for both clients
    client.on("message", messageHandler);

    client2.on("open", () => {
      client2.on("message", messageHandler);

      // Emit event after both clients are connected
      eventBus.emit({
        eventType: ServerEventType.SERVER_TEST_EVENT,
        timestamp: new Date(),
        message: "Broadcast test",
      });
    });
  });
});
