import {
  EventBus,
  createClientEventBus,
  createServerEventBus,
} from "../event-bus.js";
import {
  ClientEventType,
  ServerEventType,
  ClientTestEvent,
  ClientApproveWork,
  ServerChatCreated,
  ServerTestEvent,
} from "../types.js";

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
      const eventType = ClientEventType.CLIENT_TEST_EVENT;
      const testEvent: ClientTestEvent = {
        eventType,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe
      eventBus.subscribe(eventType, mockHandler);

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
      const eventType = ClientEventType.CLIENT_TEST_EVENT;
      const testEvent: ClientTestEvent = {
        eventType,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe both handlers
      eventBus.subscribe(eventType, mockHandler1);
      eventBus.subscribe(eventType, mockHandler2);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler1).toHaveBeenCalledWith(testEvent);
      expect(mockHandler2).toHaveBeenCalledWith(testEvent);
    });

    it("should not invoke handlers for other event types", async () => {
      // Setup
      const mockHandler = jest.fn();
      const subscribedType = ClientEventType.CLIENT_TEST_EVENT;
      const differentType = ClientEventType.CLIENT_APPROVE_WORK;
      const testEvent: ClientApproveWork = {
        eventType: differentType,
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

      const eventType = ClientEventType.CLIENT_TEST_EVENT;
      const testEvent: ClientTestEvent = {
        eventType,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe
      eventBus.subscribe(eventType, asyncHandler);

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
      const eventType = ClientEventType.CLIENT_TEST_EVENT;
      const testEvent: ClientTestEvent = {
        eventType,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe both handlers
      eventBus.subscribe(eventType, mockHandler1);
      eventBus.subscribe(eventType, mockHandler2);

      // Unsubscribe one handler
      eventBus.unsubscribe(eventType, mockHandler1);

      // Act
      await eventBus.emit(testEvent);

      // Assert
      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalledWith(testEvent);
    });

    it("should do nothing when unsubscribing a non-existent handler", () => {
      // Setup
      const mockHandler = jest.fn();
      const eventType = ClientEventType.CLIENT_TEST_EVENT;

      // Act & Assert (should not throw)
      expect(() => {
        eventBus.unsubscribe(eventType, mockHandler);
      }).not.toThrow();
    });
  });

  describe("unsubscribeAll", () => {
    it("should remove all handlers for an event type", async () => {
      // Setup
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const eventType = ClientEventType.CLIENT_TEST_EVENT;
      const testEvent: ClientTestEvent = {
        eventType,
        timestamp: new Date(),
        message: "Test message",
      };

      // Subscribe both handlers
      eventBus.subscribe(eventType, mockHandler1);
      eventBus.subscribe(eventType, mockHandler2);

      // Unsubscribe all handlers for this event type
      eventBus.unsubscribeAll(eventType);

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
      const eventType = ClientEventType.CLIENT_TEST_EVENT;

      // Initially no handlers
      expect(eventBus.hasHandlers(eventType)).toBe(false);
      expect(eventBus.getHandlerCount(eventType)).toBe(0);

      // Add handler
      eventBus.subscribe(eventType, mockHandler);
      expect(eventBus.hasHandlers(eventType)).toBe(true);
      expect(eventBus.getHandlerCount(eventType)).toBe(1);

      // Add another handler
      const mockHandler2 = jest.fn();
      eventBus.subscribe(eventType, mockHandler2);
      expect(eventBus.getHandlerCount(eventType)).toBe(2);

      // Remove one handler
      eventBus.unsubscribe(eventType, mockHandler);
      expect(eventBus.hasHandlers(eventType)).toBe(true);
      expect(eventBus.getHandlerCount(eventType)).toBe(1);

      // Remove all handlers
      eventBus.unsubscribeAll(eventType);
      expect(eventBus.hasHandlers(eventType)).toBe(false);
      expect(eventBus.getHandlerCount(eventType)).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all handlers for all event types", async () => {
      // Setup
      const mockClientHandler = jest.fn();
      const mockServerHandler = jest.fn();
      const clientEventType = ClientEventType.CLIENT_TEST_EVENT;
      const serverEventType = ServerEventType.SERVER_TEST_EVENT;

      const clientEvent: ClientTestEvent = {
        eventType: clientEventType,
        timestamp: new Date(),
        message: "Client test",
      };

      const serverEvent: ServerTestEvent = {
        eventType: serverEventType,
        timestamp: new Date(),
        message: "Server test",
      };

      // Subscribe handlers
      eventBus.subscribe(clientEventType, mockClientHandler);
      eventBus.subscribe(serverEventType, mockServerHandler);

      // Clear all handlers
      eventBus.clear();

      // Act
      await eventBus.emit(clientEvent);
      await eventBus.emit(serverEvent);

      // Assert
      expect(mockClientHandler).not.toHaveBeenCalled();
      expect(mockServerHandler).not.toHaveBeenCalled();
      expect(eventBus.hasHandlers(clientEventType)).toBe(false);
      expect(eventBus.hasHandlers(serverEventType)).toBe(false);
    });
  });

  describe("subscribeToAllClientEvents", () => {
    it("should subscribe to all client event types", async () => {
      // Setup
      const mockHandler = jest.fn();

      // Subscribe to all client events
      eventBus.subscribeToAllClientEvents(mockHandler);

      // Create test events for different client event types
      const testEvent1: ClientTestEvent = {
        eventType: ClientEventType.CLIENT_TEST_EVENT,
        timestamp: new Date(),
        message: "Test 1",
      };

      // Need to create an appropriate event type for CLIENT_APPROVE_WORK
      const testEvent2: ClientApproveWork = {
        eventType: ClientEventType.CLIENT_APPROVE_WORK,
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
      const testEvent: ClientTestEvent = {
        eventType: ClientEventType.CLIENT_TEST_EVENT,
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
      const testEvent1: ServerTestEvent = {
        eventType: ServerEventType.SERVER_TEST_EVENT,
        timestamp: new Date(),
        message: "Test 1",
      };

      const testEvent2: ServerChatCreated = {
        eventType: ServerEventType.SERVER_CHAT_CREATED,
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
