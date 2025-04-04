import {
  EventBus,
  createClientEventBus,
  createServerEventBus,
} from "../src/event-bus.js";
import {
  ClientRunTestEvent,
  ClientApproveWorkEvent,
  ServerChatCreatedEvent,
  ServerSystemTestExecutedEvent,
} from "../src/event-types.js";

// Mock logger to prevent unnecessary logs during testing
jest.mock("tslog", () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
    ILogObj: jest.fn(),
  };
});

describe("EventBus", () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Create a fresh event bus before each test
    eventBus = new EventBus({ environment: "server" });
  });

  afterEach(() => {
    // Clean up after each test
    eventBus.clear();
  });

  describe("subscribe and emit", () => {
    it("should invoke handler when an event is emitted", async () => {
      // Setup
      const mockHandler = jest.fn();
      const kind = "ClientRunTest";
      const testEvent: ClientRunTestEvent = {
        kind,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe
      eventBus.subscribe(kind, mockHandler);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(testEvent);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple handlers for the same event type", async () => {
      // Setup
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const kind = "ClientRunTest";
      const testEvent: ClientRunTestEvent = {
        kind,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe both handlers
      eventBus.subscribe(kind, mockHandler1);
      eventBus.subscribe(kind, mockHandler2);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler1).toHaveBeenCalledWith(testEvent);
      expect(mockHandler2).toHaveBeenCalledWith(testEvent);
    });

    it("should not invoke handlers for other event types", async () => {
      // Setup
      const mockHandler = jest.fn();
      const subscribedType = "ClientRunTest";
      const differentType = "ClientApproveWork";
      const testEvent: ClientApproveWorkEvent = {
        kind: differentType,
        timestamp: new Date(),
        chatId: "test-chat-id",
        approvedWork: "approved work",
      };

      // Subscribe to a different event type than what we'll emit
      eventBus.subscribe(subscribedType, mockHandler);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should handle async event handlers correctly", async () => {
      // Setup
      const result: string[] = [];

      const asyncHandler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        result.push("async handler completed");
      };

      const kind = "ClientRunTest";
      const testEvent: ClientRunTestEvent = {
        kind,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe
      eventBus.subscribe(kind, asyncHandler);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(result).toEqual(["async handler completed"]);
    });
  });

  describe("unsubscribe", () => {
    it("should remove specific handler from event type", async () => {
      // Setup
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const kind = "ClientRunTest";
      const testEvent: ClientRunTestEvent = {
        kind,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe both handlers
      eventBus.subscribe(kind, mockHandler1);
      eventBus.subscribe(kind, mockHandler2);

      // Unsubscribe one handler
      eventBus.unsubscribe(kind, mockHandler1);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalledWith(testEvent);
    });

    it("should do nothing when unsubscribing a non-existent handler", () => {
      // Setup
      const mockHandler = jest.fn();
      const kind = "ClientRunTest";

      // Act & Assert (should not throw)
      expect(() => {
        eventBus.unsubscribe(kind, mockHandler);
      }).not.toThrow();
    });
  });

  describe("unsubscribeAll", () => {
    it("should remove all handlers for an event type", async () => {
      // Setup
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const kind = "ClientRunTest";
      const testEvent: ClientRunTestEvent = {
        kind,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe both handlers
      eventBus.subscribe(kind, mockHandler1);
      eventBus.subscribe(kind, mockHandler2);

      // Unsubscribe all handlers for this event type
      eventBus.unsubscribeAll(kind);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).not.toHaveBeenCalled();
    });
  });

  describe("hasHandlers and getHandlerCount", () => {
    it("should properly track if handlers exist", () => {
      // Setup
      const mockHandler = jest.fn();
      const kind = "ClientRunTest";

      // Initially no handlers
      expect(eventBus.hasHandlers(kind)).toBe(false);
      expect(eventBus.getHandlerCount(kind)).toBe(0);

      // Add handler
      eventBus.subscribe(kind, mockHandler);
      expect(eventBus.hasHandlers(kind)).toBe(true);
      expect(eventBus.getHandlerCount(kind)).toBe(1);

      // Add another handler
      const mockHandler2 = jest.fn();
      eventBus.subscribe(kind, mockHandler2);
      expect(eventBus.getHandlerCount(kind)).toBe(2);

      // Remove one handler
      eventBus.unsubscribe(kind, mockHandler);
      expect(eventBus.hasHandlers(kind)).toBe(true);
      expect(eventBus.getHandlerCount(kind)).toBe(1);

      // Remove all handlers
      eventBus.unsubscribeAll(kind);
      expect(eventBus.hasHandlers(kind)).toBe(false);
      expect(eventBus.getHandlerCount(kind)).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all handlers for all event types", async () => {
      // Setup
      const mockClientHandler = jest.fn();
      const mockServerHandler = jest.fn();
      const clientKind = "ClientRunTest";
      const serverKind = "ServerSystemTestExecuted";

      const clientEvent: ClientRunTestEvent = {
        kind: clientKind,
        timestamp: new Date(),
        message: "Client test",
      };

      const serverEvent: ServerSystemTestExecutedEvent = {
        kind: serverKind,
        timestamp: new Date(),
        message: "Server test",
      };

      // Subscribe handlers
      eventBus.subscribe(clientKind, mockClientHandler);
      eventBus.subscribe(serverKind, mockServerHandler);

      // Clear all handlers
      eventBus.clear();

      // Act
      await eventBus.emit(clientEvent);
      await eventBus.emit(serverEvent);

      // Assert
      expect(mockClientHandler).not.toHaveBeenCalled();
      expect(mockServerHandler).not.toHaveBeenCalled();
      expect(eventBus.hasHandlers(clientKind)).toBe(false);
      expect(eventBus.hasHandlers(serverKind)).toBe(false);
    });
  });

  describe("subscribeToAllClientEvents", () => {
    it("should subscribe to all client event types", async () => {
      // Setup
      const mockHandler = jest.fn();

      // Subscribe to all client events
      eventBus.subscribeToAllClientEvents(mockHandler);

      // Create test events for different client event types
      const testEvent1: ClientRunTestEvent = {
        kind: "ClientRunTest",
        timestamp: new Date(),
        message: "Test 1",
      };

      const testEvent2: ClientApproveWorkEvent = {
        kind: "ClientApproveWork",
        timestamp: new Date(),
        chatId: "test-chat-id",
        approvedWork: "approved work",
      };

      // Act
      await eventBus.emit(testEvent1);
      await eventBus.emit(testEvent2);

      // Assert
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockHandler).toHaveBeenCalledWith(testEvent1);
      expect(mockHandler).toHaveBeenCalledWith(testEvent2);
    });

    it("should return a function that unsubscribes from all client events", async () => {
      // Setup
      const mockHandler = jest.fn();
      const testEvent: ClientRunTestEvent = {
        kind: "ClientRunTest",
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe to all client events and get unsubscribe function
      const unsubscribe = eventBus.subscribeToAllClientEvents(mockHandler);

      // Unsubscribe
      unsubscribe();

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("subscribeToAllServerEvents", () => {
    it("should subscribe to all server event types", async () => {
      // Setup
      const mockHandler = jest.fn();

      // Subscribe to all server events
      eventBus.subscribeToAllServerEvents(mockHandler);

      // Create test events for different server event types
      const testEvent1: ServerSystemTestExecutedEvent = {
        kind: "ServerSystemTestExecuted",
        timestamp: new Date(),
        message: "Test 1",
      };

      const testEvent2: ServerChatCreatedEvent = {
        kind: "ServerChatCreated",
        timestamp: new Date(),
        chatId: "test-chat-id",
        taskId: "test-task-id",
        subtaskId: "test-subtask-id",
      };

      // Act
      await eventBus.emit(testEvent1);
      await eventBus.emit(testEvent2);

      // Assert
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockHandler).toHaveBeenCalledWith(testEvent1);
      expect(mockHandler).toHaveBeenCalledWith(testEvent2);
    });
  });

  describe("Factory functions", () => {
    it("createClientEventBus should create an event bus with client environment", () => {
      const clientBus = createClientEventBus();
      expect(clientBus.getEnvironment()).toBe("client");
    });

    it("createServerEventBus should create an event bus with server environment", () => {
      const serverBus = createServerEventBus();
      expect(serverBus.getEnvironment()).toBe("server");
    });
  });
});
