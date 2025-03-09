import { ws } from "msw";
import { setupServer } from "msw/node";
import {
  WebSocketEventClient,
  resetWebSocketClient,
} from "../../src/websocket-event-client.js";
import { EventBus } from "@repo/events-core/event-bus";
import { EventType, TestEvent } from "@repo/events-core/types";
import { RelayMessageType } from "../../src/types.js";

// Create a WebSocket connection handler
const eventSocket = ws.link("ws://localhost:8000/ws");

// Mock the console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();

export const handlers = [
  // WebSocket handlers
  eventSocket.addEventListener("connection", ({ client }) => {
    console.log("WebSocket connection established");

    // When the client sends a message
    client.addEventListener("message", (event) => {
      console.log("Received from client:", event.data);

      try {
        const message = JSON.parse(event.data as string);

        if (message.type === RelayMessageType.SUBSCRIBE) {
          // Respond to subscription request
          client.send(
            JSON.stringify({
              type: RelayMessageType.SUBSCRIBED,
              eventType: message.eventType,
            })
          );
        } else if (message.type === RelayMessageType.UNSUBSCRIBE) {
          // Respond to unsubscription request
          client.send(
            JSON.stringify({
              type: RelayMessageType.UNSUBSCRIBED,
              eventType: message.eventType,
            })
          );
        } else if (message.type === RelayMessageType.CLIENT_EVENT) {
          // Echo back the event as a server event
          client.send(
            JSON.stringify({
              type: RelayMessageType.SERVER_EVENT,
              event: message.event,
            })
          );
        }
      } catch (error) {
        // If not a JSON message, send an error
        client.send(
          JSON.stringify({
            type: RelayMessageType.ERROR,
            code: "INVALID_FORMAT",
            message: "Invalid message format",
          })
        );
      }
    });
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => {
  // Enable API mocking before all the tests
  server.listen();
});

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers();
  // Reset the WebSocketClient singleton
  resetWebSocketClient();
  // Clear all mocks
  jest.clearAllMocks();
});

afterAll(() => {
  // Disable API mocking after tests
  server.close();
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe("WebSocketEventClient", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Create a new EventBus instance for each test
    eventBus = new EventBus();
  });

  it("should connect to WebSocket server", async () => {
    // Create a new WebSocketEventClient
    const client = new WebSocketEventClient("ws://localhost:8000/ws", eventBus);

    // Connect to the server
    client.connect();

    // Wait for the connection to be established
    await new Promise<void>((resolve) => {
      // Monitor the console log for connection message
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) => call[0] === "WebSocket connected"
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Clean up
    client.disconnect();
    expect(console.log).toHaveBeenCalledWith("WebSocket connected");
  });

  it("should subscribe to events and receive confirmation", async () => {
    // Create a new WebSocketEventClient
    const client = new WebSocketEventClient("ws://localhost:8000/ws", eventBus);

    // Connect to the server
    client.connect();

    // Wait for the connection to be established
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) => call[0] === "WebSocket connected"
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Reset the mock to clear previous log calls
    (console.log as jest.Mock).mockClear();

    // Subscribe to TEST_EVENT
    client.subscribe(EventType.TEST_EVENT);

    // Wait for subscription confirmation
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) =>
              call[0] === "Successfully subscribed to:" &&
              call[1] === EventType.TEST_EVENT
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Clean up
    client.disconnect();

    // Verify subscription was sent and confirmed
    expect(console.log).toHaveBeenCalledWith(
      "Sent subscription request for:",
      EventType.TEST_EVENT
    );
    expect(console.log).toHaveBeenCalledWith(
      "Successfully subscribed to:",
      EventType.TEST_EVENT
    );
  });

  it("should unsubscribe from events and receive confirmation", async () => {
    // Create a new WebSocketEventClient
    const client = new WebSocketEventClient("ws://localhost:8000/ws", eventBus);

    // Connect to the server
    client.connect();

    // Wait for the connection to be established
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) => call[0] === "WebSocket connected"
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Subscribe first
    client.subscribe(EventType.TEST_EVENT);

    // Wait for subscription confirmation
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) =>
              call[0] === "Successfully subscribed to:" &&
              call[1] === EventType.TEST_EVENT
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Reset the mock to clear previous log calls
    (console.log as jest.Mock).mockClear();

    // Unsubscribe from TEST_EVENT
    client.unsubscribe(EventType.TEST_EVENT);

    // Wait for unsubscription confirmation
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) =>
              call[0] === "Successfully unsubscribed from:" &&
              call[1] === EventType.TEST_EVENT
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Clean up
    client.disconnect();

    // Verify unsubscription was sent and confirmed
    expect(console.log).toHaveBeenCalledWith(
      "Sent unsubscription request for:",
      EventType.TEST_EVENT
    );
    expect(console.log).toHaveBeenCalledWith(
      "Successfully unsubscribed from:",
      EventType.TEST_EVENT
    );
  });

  it("should send events from frontend to the backend and receive echoed events", async () => {
    // Create a new WebSocketEventClient and event bus
    const client = new WebSocketEventClient("ws://localhost:8000/ws", eventBus);

    // Connect to the server
    client.connect();

    // Wait for the connection to be established
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) => call[0] === "WebSocket connected"
          )
        ) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Reset the mock to clear previous log calls
    (console.log as jest.Mock).mockClear();

    // Create a test event
    const testEvent: TestEvent = {
      eventType: EventType.TEST_EVENT,
      timestamp: new Date(),
      message: "Test event message",
    };

    // Track received events manually instead of using the eventBus
    let receivedServerEvent = false;
    const originalPublish = eventBus.publish;
    eventBus.publish = jest.fn().mockImplementation((event) => {
      // If we receive the expected event back from server, mark it
      if (event.eventType === EventType.TEST_EVENT && !receivedServerEvent) {
        receivedServerEvent = true;
      }
      // Don't actually publish to avoid the loop
      return Promise.resolve();
    });

    // Directly trigger the client's handleFrontendEvent method
    // @ts-ignore - accessing private method for testing
    await client["handleFrontendEvent"](testEvent);

    // Wait for the event to be received from the server
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Timed out waiting for event"));
      }, 1000);

      const checkInterval = setInterval(() => {
        if (
          (console.log as jest.Mock).mock.calls.some(
            (call) =>
              call[0] === "Received event from server:" &&
              call[1] === EventType.TEST_EVENT
          )
        ) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve();
        }
      }, 100);
    });

    // Restore original publish method
    eventBus.publish = originalPublish;

    // Clean up
    client.disconnect();

    // Verify that the event was sent to the server and received back
    expect(console.log).toHaveBeenCalledWith(
      "Sent event to server:",
      EventType.TEST_EVENT
    );
    expect(console.log).toHaveBeenCalledWith(
      "Received event from server:",
      EventType.TEST_EVENT
    );
  });
});
