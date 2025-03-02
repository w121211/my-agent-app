import { EventBus, EventBusOptions } from "../src/event-bus.js";
import {
  AsyncEventHandler,
  EventType,
  TaskCreatedEvent,
  TestEvent,
} from "../src/types.js";
import { Logger, ILogObj } from "tslog";

// Mock logger to avoid console output during tests
jest.mock("tslog");

describe("EventBus", () => {
  let eventBus: EventBus;
  let mockLogger: Logger<ILogObj>;
  let mockHandler: AsyncEventHandler<TestEvent>;
  let testEvent: TestEvent;

  beforeEach(() => {
    // Setup mocks
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger<ILogObj>;

    const options: EventBusOptions = {
      logger: mockLogger,
      throwErrors: false,
    };

    // Create new event bus for each test
    eventBus = new EventBus(options);

    // Create mock handler
    mockHandler = jest.fn().mockResolvedValue(undefined);

    // Create test event
    testEvent = {
      eventType: EventType.TEST_EVENT,
      timestamp: new Date(),
      message: "Test message",
      correlationId: "test-correlation-id",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should subscribe and publish to handlers", async () => {
    // Subscribe handler
    eventBus.subscribe(EventType.TEST_EVENT, mockHandler);

    // Check handler count
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(1);
    expect(eventBus.hasHandlers(EventType.TEST_EVENT)).toBe(true);

    // Publish event
    await eventBus.publish(testEvent);

    // Check handler was called with correct event
    expect(mockHandler).toHaveBeenCalledWith(testEvent);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test("should handle returned unsubscribe function", async () => {
    // Subscribe handler and get unsubscribe function
    const unsubscribe = eventBus.subscribe(EventType.TEST_EVENT, mockHandler);

    // Check handler is registered
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(1);

    // Call unsubscribe function
    unsubscribe();

    // Check handler is unregistered
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(0);

    // Publish event
    await eventBus.publish(testEvent);

    // Check handler was not called
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test("should unsubscribe handlers", async () => {
    // Subscribe handler
    eventBus.subscribe(EventType.TEST_EVENT, mockHandler);

    // Unsubscribe handler directly
    eventBus.unsubscribe(EventType.TEST_EVENT, mockHandler);

    // Check handler is unregistered
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(0);

    // Publish event
    await eventBus.publish(testEvent);

    // Check handler was not called
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test("should unsubscribe all handlers for an event type", async () => {
    // Create additional handler
    const secondHandler = jest.fn().mockResolvedValue(undefined);

    // Subscribe both handlers
    eventBus.subscribe(EventType.TEST_EVENT, mockHandler);
    eventBus.subscribe(EventType.TEST_EVENT, secondHandler);

    // Check handler count
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(2);

    // Unsubscribe all handlers
    eventBus.unsubscribeAll(EventType.TEST_EVENT);

    // Check no handlers remain
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(0);

    // Publish event
    await eventBus.publish(testEvent);

    // Check neither handler was called
    expect(mockHandler).not.toHaveBeenCalled();
    expect(secondHandler).not.toHaveBeenCalled();
  });

  test("should handle errors in handlers without throwing", async () => {
    // Create handler that throws error
    const errorHandler: AsyncEventHandler<TestEvent> = jest
      .fn()
      .mockRejectedValue(new Error("Test error"));

    // Subscribe handler
    eventBus.subscribe(EventType.TEST_EVENT, errorHandler);

    // Publish event (should not throw)
    await eventBus.publish(testEvent);

    // Check error was logged
    expect(mockLogger.error).toHaveBeenCalled();
  });

  test("should throw errors when configured to do so", async () => {
    // Create event bus that throws errors
    const throwingEventBus = new EventBus({
      logger: mockLogger,
      throwErrors: true,
    });

    // Create handler that throws error
    const errorHandler: AsyncEventHandler<TestEvent> = jest
      .fn()
      .mockRejectedValue(new Error("Test error"));

    // Subscribe handler
    throwingEventBus.subscribe(EventType.TEST_EVENT, errorHandler);

    // Publish event (should throw)
    await expect(throwingEventBus.publish(testEvent)).rejects.toThrow();
  });

  test("should clear all handlers", async () => {
    // Subscribe handlers to different event types
    eventBus.subscribe(EventType.TEST_EVENT, mockHandler);
    eventBus.subscribe(EventType.TASK_CREATED_EVENT, mockHandler);

    // Check handlers are registered
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(1);
    expect(eventBus.getHandlerCount(EventType.TASK_CREATED_EVENT)).toBe(1);

    // Clear all handlers
    eventBus.clear();

    // Check all handlers are unregistered
    expect(eventBus.getHandlerCount(EventType.TEST_EVENT)).toBe(0);
    expect(eventBus.getHandlerCount(EventType.TASK_CREATED_EVENT)).toBe(0);
  });

  test("should not call handlers for unrelated event types", async () => {
    // Subscribe handler to TEST_EVENT
    eventBus.subscribe(EventType.TEST_EVENT, mockHandler);

    // Create and publish a different type of event
    const otherEvent: TaskCreatedEvent = {
      eventType: EventType.TASK_CREATED_EVENT,
      timestamp: new Date(),
      taskId: "test-task-id",
      taskName: "Test Task",
      config: {},
      correlationId: "test-correlation-id",
    };

    await eventBus.publish(otherEvent);

    // Check handler was not called
    expect(mockHandler).not.toHaveBeenCalled();
  });
});
