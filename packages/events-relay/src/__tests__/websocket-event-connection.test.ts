import { ILogObj, Logger } from "tslog";
import WebSocket from "ws";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  ClientEventType,
  ServerEventType,
  ServerTestEvent,
} from "@repo/events-core/types";
import { RelayMessageType } from "../relay-types.js";
import { WebSocketEventConnection } from "../websocket-event-connection-v1.js";

// Simple mock for the event bus
const createMockEventBus = () =>
  ({
    subscribe: jest.fn(() => () => {}),
    emit: jest.fn(),
    subscribeToAllClientEvents: jest.fn(() => () => {}),
  }) as unknown as IEventBus;

describe("WebSocketEventConnection", () => {
  let connection: WebSocketEventConnection;
  let mockSocket: any;
  let eventBus: IEventBus;
  let mockLogger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock socket
    mockSocket = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Create event bus mock
    eventBus = createMockEventBus();

    // Create connection
    connection = new WebSocketEventConnection(
      mockSocket,
      "test-client-id",
      eventBus,
      mockLogger as Logger<ILogObj>
    );
  });

  test("should set up event listeners on construction", () => {
    expect(mockSocket.on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  test("should handle client events and forward to event bus", () => {
    // Arrange
    const clientEvent = {
      eventType: ClientEventType.CLIENT_TEST_EVENT,
      timestamp: new Date(),
      message: "test event",
    };

    const message = {
      type: RelayMessageType.CLIENT_EVENT,
      event: clientEvent,
    };

    // Get message handler
    const messageHandler = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === "message"
    )[1];

    // Act
    messageHandler(JSON.stringify(message));

    // Assert
    // JSON.stringify/parse 會將 Date 轉換為字串
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ClientEventType.CLIENT_TEST_EVENT,
        message: "test event",
        // 不比較 timestamp，因為它在轉換過程中變成了字串
      })
    );

    // 或者使用這種方式，檢查屬性是字串但包含相同的日期值
    const emittedEvent = (eventBus.emit as jest.Mock).mock.calls[0][0];
    expect(emittedEvent.eventType).toBe(ClientEventType.CLIENT_TEST_EVENT);
    expect(emittedEvent.message).toBe("test event");
    expect(typeof emittedEvent.timestamp).toBe("string");
    expect(new Date(emittedEvent.timestamp).getTime()).toBe(
      clientEvent.timestamp.getTime()
    );
  });

  test("should send server events to the client", () => {
    // Arrange
    const serverEvent: ServerTestEvent = {
      eventType: ServerEventType.SERVER_TEST_EVENT,
      timestamp: new Date(),
      message: "test event",
    };

    // Act
    connection.sendEvent(serverEvent);

    // Assert
    expect(mockSocket.send).toHaveBeenCalledWith(expect.any(String));
    const sentData = JSON.parse(mockSocket.send.mock.calls[0][0]);
    expect(sentData.type).toBe(RelayMessageType.SERVER_EVENT);

    // 檢查除了 timestamp 以外的所有屬性
    expect(sentData.event.eventType).toBe(ServerEventType.SERVER_TEST_EVENT);
    expect(sentData.event.message).toBe("test event");

    // 檢查 timestamp 是字串形式但代表相同的日期
    expect(typeof sentData.event.timestamp).toBe("string");
    expect(new Date(sentData.event.timestamp).getTime()).toBe(
      serverEvent.timestamp.getTime()
    );
  });

  test("should handle invalid message format", () => {
    // Get message handler
    const messageHandler = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === "message"
    )[1];

    // Act
    messageHandler("invalid json");

    // Assert
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining("INVALID_FORMAT")
    );
  });

  test("should notify when connection is closed", () => {
    // Arrange
    const closeListener = jest.fn();
    connection.onClose(closeListener);

    // Get close handler
    const closeHandler = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === "close"
    )[1];

    // Act
    closeHandler();

    // Assert
    expect(closeListener).toHaveBeenCalled();
  });

  test("should close the socket", () => {
    // Act
    connection.close();

    // Assert
    expect(mockSocket.close).toHaveBeenCalled();
  });
});
