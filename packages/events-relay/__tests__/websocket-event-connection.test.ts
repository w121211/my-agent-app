import { WebSocketEventConnection } from "../src/websocket-event-connection.js";
import { IEventBus } from "../../events-core/src/event-bus.js";
import { EventUnion, EventType } from "../../events-core/src/types.js";
import { Logger, ILogObj } from "tslog";
import WebSocket from "ws";

// Mock dependencies
jest.mock("ws");
jest.mock("tslog");

describe("WebSocketEventConnection", () => {
  // Test dependencies
  let mockSocket: jest.Mocked<WebSocket>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: jest.Mocked<Logger<ILogObj>>;
  let connection: WebSocketEventConnection;
  const clientId = "test-client-123";

  // Prepare mock event handlers and capture them
  let messageHandler: (data: WebSocket.Data) => void;
  let closeHandler: () => void;
  let errorHandler: (error: Error) => void;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup socket mock with event capturing
    mockSocket = {
      on: jest.fn((event: string, handler: any) => {
        if (event === "message") messageHandler = handler;
        if (event === "close") closeHandler = handler;
        if (event === "error") errorHandler = handler;
      }),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    } as unknown as jest.Mocked<WebSocket>;

    // Setup event bus mock
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      hasHandlers: jest.fn(),
      getHandlerCount: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<IEventBus>;

    // Setup logger mock
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger<ILogObj>>;

    // Create the connection
    connection = new WebSocketEventConnection(
      mockSocket,
      clientId,
      mockEventBus,
      mockLogger
    );
  });

  it("should setup event listeners on construction", () => {
    expect(mockSocket.on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("should handle subscription requests", () => {
    // Simulate subscription message
    const subscribeMessage = {
      data: {
        message_type: "subscribe",
        event_type: "TEST_EVENT",
      },
    };

    // Trigger message handler
    messageHandler(JSON.stringify(subscribeMessage));

    // Verify subscription logic
    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("subscribed")
    );
    expect(connection.isSubscribedTo("TEST_EVENT")).toBeTruthy();
  });

  it("should handle unsubscribe requests", () => {
    // First subscribe
    const subscribeMessage = {
      data: {
        message_type: "subscribe",
        event_type: "TEST_EVENT",
      },
    };
    messageHandler(JSON.stringify(subscribeMessage));

    // Then unsubscribe
    const unsubscribeMessage = {
      data: {
        message_type: "unsubscribe",
        event_type: "TEST_EVENT",
      },
    };
    messageHandler(JSON.stringify(unsubscribeMessage));

    // Verify unsubscription - Updated expectation
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Client ${clientId} unsubscribing from: TEST_EVENT`
    );
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("unsubscribed")
    );
    expect(connection.isSubscribedTo("TEST_EVENT")).toBeFalsy();
  });

  it("should forward client events to event bus", () => {
    // Create test event
    const testEvent: EventUnion = {
      eventType: EventType.TEST_EVENT,
      timestamp: new Date(),
      message: "Test message",
    };

    // Create a serialized version of the event (to match what happens with JSON)
    const serializedEvent = JSON.parse(JSON.stringify(testEvent));

    // Simulate client event message
    const clientEventMessage = {
      data: {
        message_type: "client_event",
        payload: serializedEvent,
      },
    };

    // Trigger message handler
    messageHandler(JSON.stringify(clientEventMessage));

    // Verify event bus publishing - use serialized event or objectContaining
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: testEvent.eventType,
        message: testEvent.message,
      })
    );
  });

  it("should send events to client", () => {
    // Create test event
    const testEvent: EventUnion = {
      eventType: EventType.TEST_EVENT,
      timestamp: new Date(),
      message: "Test message",
    };

    // Send event to client
    connection.sendEvent(testEvent);

    // Verify message was sent
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("server_event")
    );
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("Test message")
    );
  });

  it("should handle message parsing errors", () => {
    // Send invalid JSON
    messageHandler("invalid JSON");

    // Verify error handling
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("error")
    );
  });

  it("should notify close listeners when connection closes", () => {
    // Add close listener
    const mockCloseListener = jest.fn();
    connection.onClose(mockCloseListener);

    // Trigger close event
    closeHandler();

    // Verify listener was called
    expect(mockCloseListener).toHaveBeenCalled();
  });

  it("should close the socket when close method is called", () => {
    // Call close method
    connection.close();

    // Verify socket was closed
    expect(mockSocket.close).toHaveBeenCalled();
  });

  it("should handle errors when sending messages", () => {
    // Create error condition by setting readyState to CLOSED
    (mockSocket as any).readyState = WebSocket.CLOSED;

    // Attempt to send event
    const testEvent: EventUnion = {
      eventType: EventType.TEST_EVENT,
      timestamp: new Date(),
      message: "Test message",
    };
    connection.sendEvent(testEvent);

    // Verify warning was logged
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockSocket.send).not.toHaveBeenCalled();
  });

  it("should handle unknown message types", () => {
    // Simulate unknown message type
    const unknownMessage = {
      data: {
        message_type: "unknown_type",
      },
    };

    // Trigger message handler
    messageHandler(JSON.stringify(unknownMessage));

    // Verify warning and error sent
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("Unknown message type")
    );
  });
});
