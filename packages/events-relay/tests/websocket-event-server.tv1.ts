import { WebSocketServer } from "ws";
import { Server as HttpServer } from "http";
import { Logger, ILogObj } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import { EventUnion, EventType } from "@repo/events-core/types";
import {
  WebSocketEventServer,
  getWebSocketEventServer,
  resetWebSocketEventServer,
} from "@repo/events-core/websocket-event-server";
import { WebSocketEventConnection } from "../websocket-event-connection-v1.js";

// Mock dependencies
jest.mock("ws");
jest.mock("http");
jest.mock("tslog");
jest.mock("../websocket-event-connection.js");

describe("WebSocketEventServer", () => {
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: jest.Mocked<Logger<ILogObj>>;
  let mockHttpServer: jest.Mocked<HttpServer>;
  let mockWsServer: jest.Mocked<WebSocketServer>;
  let server: WebSocketEventServer;
  let connectionHandler: (socket: any, request: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    resetWebSocketEventServer();

    // Setup mocks
    mockEventBus = {
      subscribe: jest.fn().mockReturnValue(jest.fn()),
      publish: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      hasHandlers: jest.fn(),
      getHandlerCount: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<IEventBus>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger<ILogObj>>;

    // Mock HTTP server
    mockHttpServer = {
      listen: jest.fn((port, callback) => {
        callback?.();
        return mockHttpServer;
      }),
      close: jest.fn((callback) => {
        callback?.(null);
        return mockHttpServer;
      }),
    } as unknown as jest.Mocked<HttpServer>;

    // Mock WebSocket server
    mockWsServer = {
      on: jest.fn((event, handler) => {
        if (event === "connection") {
          connectionHandler = handler;
        }
        return mockWsServer;
      }),
      close: jest.fn((callback) => {
        callback?.(null);
        return mockWsServer;
      }),
    } as unknown as jest.Mocked<WebSocketServer>;

    // Setup HTTP server creation mock
    (require("http").createServer as jest.Mock).mockReturnValue(mockHttpServer);

    // Setup WebSocketServer constructor mock
    (WebSocketServer as unknown as jest.Mock).mockImplementation(
      () => mockWsServer
    );

    // Create server instance
    server = new WebSocketEventServer(mockEventBus, {
      port: 8001,
      logger: mockLogger,
    });
  });

  describe("start", () => {
    it("should initialize and start WebSocket server", () => {
      server.start();

      expect(WebSocketServer).toHaveBeenCalledWith({ server: mockHttpServer });
      expect(mockWsServer.on).toHaveBeenCalledWith(
        "connection",
        expect.any(Function)
      );
      expect(mockHttpServer.listen).toHaveBeenCalledWith(
        8001,
        expect.any(Function)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "WebSocket server started on port 8001"
      );
    });

    it("should not start server if already running", () => {
      server.start();
      server.start();

      expect(WebSocketServer).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "WebSocket server is already running"
      );
    });

    it("should subscribe to all event types", () => {
      server.start();

      // Check that we subscribe to each event type
      const eventTypes = Object.values(EventType);
      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(eventTypes.length);

      // Verify subscription for at least one event type
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
    });
  });

  describe("stop", () => {
    it("should close the server and connections", async () => {
      server.start();

      const stopPromise = server.stop();
      await expect(stopPromise).resolves.toBeUndefined();

      expect(mockWsServer.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("WebSocket server stopped");
    });

    it("should handle case when server is not running", async () => {
      const stopPromise = server.stop();
      await expect(stopPromise).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "WebSocket server is not running"
      );
    });
  });

  describe("client connections", () => {
    it("should handle new connections", () => {
      server.start();

      const mockSocket = {};
      const mockRequest = {};

      // Mock WebSocketEventConnection implementation
      const mockConnection = {
        onClose: jest.fn((callback) => callback()),
        close: jest.fn(),
        sendEvent: jest.fn(),
        isSubscribedTo: jest.fn().mockReturnValue(true),
      };

      (WebSocketEventConnection as unknown as jest.Mock).mockImplementation(
        () => mockConnection
      );

      // Trigger connection event
      connectionHandler(mockSocket, mockRequest);

      expect(WebSocketEventConnection).toHaveBeenCalledWith(
        mockSocket,
        expect.any(String),
        mockEventBus,
        mockLogger
      );

      expect(mockConnection.onClose).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("New client connected")
      );
    });
  });

  describe("broadcasting", () => {
    it("should broadcast events to subscribed clients", () => {
      server.start();

      // Create mock connections
      const mockConnection1 = {
        onClose: jest.fn(),
        sendEvent: jest.fn(),
        isSubscribedTo: jest.fn().mockReturnValue(true),
        close: jest.fn(),
      };

      const mockConnection2 = {
        onClose: jest.fn(),
        sendEvent: jest.fn(),
        isSubscribedTo: jest.fn().mockReturnValue(false),
        close: jest.fn(),
      };

      // Add connections
      (server as any).connections.set("client1", mockConnection1);
      (server as any).connections.set("client2", mockConnection2);

      // Create test event
      const testEvent: EventUnion = {
        eventType: EventType.TEST_EVENT,
        timestamp: new Date(),
        message: "Test message",
      };

      // Broadcast event
      (server as any).broadcastToSubscribers(testEvent);

      // Verify broadcasting behavior
      expect(mockConnection1.isSubscribedTo).toHaveBeenCalledWith(
        EventType.TEST_EVENT
      );
      expect(mockConnection1.sendEvent).toHaveBeenCalledWith(testEvent);
      expect(mockConnection2.isSubscribedTo).toHaveBeenCalledWith(
        EventType.TEST_EVENT
      );
      expect(mockConnection2.sendEvent).not.toHaveBeenCalled();
    });
  });

  describe("singleton", () => {
    it("should return the same instance with getWebSocketEventServer", () => {
      const instance1 = getWebSocketEventServer(mockEventBus);
      const instance2 = getWebSocketEventServer(mockEventBus);

      expect(instance1).toBe(instance2);
    });

    it("should reset instance with resetWebSocketEventServer", () => {
      const instance1 = getWebSocketEventServer(mockEventBus);
      resetWebSocketEventServer();
      const instance2 = getWebSocketEventServer(mockEventBus);

      expect(instance1).not.toBe(instance2);
    });
  });
});
