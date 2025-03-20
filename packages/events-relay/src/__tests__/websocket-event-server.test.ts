import { WebSocketServer } from "ws";
import { createServer } from "http";
import { Logger } from "tslog";
import { ServerEventType, ServerTestEvent } from "@repo/events-core/types";
import { IEventBus } from "@repo/events-core/event-bus";
import { WebSocketEventServer } from "../websocket-event-server.js";

// Mock WebSocket and HTTP server
jest.mock("ws");
jest.mock("http");

// Simple mock for the event bus
const createMockEventBus = () =>
  ({
    subscribe: jest.fn(() => () => {}),
    emit: jest.fn(),
    subscribeToAllClientEvents: jest.fn(() => () => {}),
  }) as unknown as IEventBus;

describe("WebSocketEventServer", () => {
  let server: WebSocketEventServer;
  let eventBus: IEventBus;
  let mockWsServer: any;
  let mockHttpServer: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup WebSocket server mock
    mockWsServer = {
      on: jest.fn(),
      close: jest.fn((cb) => cb()),
    };
    (WebSocketServer as unknown as jest.Mock).mockImplementation(
      () => mockWsServer
    );

    // Setup HTTP server mock
    mockHttpServer = {
      listen: jest.fn((port, callback) => callback()),
      close: jest.fn((cb) => cb()),
    };
    (createServer as jest.Mock).mockImplementation(() => mockHttpServer);

    // Create event bus mock
    eventBus = createMockEventBus();

    // Create server instance
    server = new WebSocketEventServer(eventBus, { port: 8000 });
  });

  afterEach(async () => {
    await server.stop();
  });

  test("should start the server on the specified port", () => {
    // Act
    server.start();

    // Assert
    expect(createServer).toHaveBeenCalled();
    expect(WebSocketServer).toHaveBeenCalledWith({ server: mockHttpServer });
    expect(mockHttpServer.listen).toHaveBeenCalledWith(
      8000,
      expect.any(Function)
    );
  });

  test("should handle client connections", () => {
    // Arrange
    server.start();

    const mockSocket = {
      on: jest.fn(),
      close: jest.fn(),
    };

    // Get the connection handler
    const connectionHandler = mockWsServer.on.mock.calls[0][1];

    // Act
    connectionHandler(mockSocket);

    // Assert
    expect((server as any).connections.size).toBe(1);
    expect(mockSocket.on).toHaveBeenCalledWith("message", expect.any(Function));
  });

  test("should broadcast events to all connected clients", () => {
    // Arrange
    server.start();

    // Mock connections with spy functions
    const sendEventSpy = jest.fn();
    (server as any).connections = new Map([
      [
        "client1",
        {
          sendEvent: sendEventSpy,
          isSubscribedTo: () => true,
          close: jest.fn(),
        },
      ],
      [
        "client2",
        {
          sendEvent: sendEventSpy,
          isSubscribedTo: () => true,
          close: jest.fn(),
        },
      ],
    ]);

    const testEvent: ServerTestEvent = {
      eventType: ServerEventType.SERVER_TEST_EVENT,
      timestamp: new Date(),
      message: "test",
    };

    // Act
    server.broadcastEvent(testEvent);

    // Assert
    expect(sendEventSpy).toHaveBeenCalledTimes(2);
    expect(sendEventSpy).toHaveBeenCalledWith(testEvent);
  });

  test("should close all connections when stopped", async () => {
    // Arrange
    server.start();

    // Mock connections
    const closeSpy = jest.fn();
    (server as any).connections = new Map([
      ["client1", { close: closeSpy }],
      ["client2", { close: closeSpy }],
    ]);

    // Act
    await server.stop();

    // Assert
    expect(closeSpy).toHaveBeenCalledTimes(2);
    expect(mockWsServer.close).toHaveBeenCalled();
    expect(mockHttpServer.close).toHaveBeenCalled();
    expect((server as any).connections.size).toBe(0);
  });

  test("should not restart if already running", () => {
    // Arrange
    server.start();

    // Act
    server.start();

    // Assert
    expect(WebSocketServer).toHaveBeenCalledTimes(1);
  });
});
