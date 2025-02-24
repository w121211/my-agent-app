import { EventBus } from "../src/event-bus.js";
import { BaseEvent, EventType } from "../src/types.js";

// Mock the logger to prevent actual logging during tests
jest.mock("tslog", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

describe("EventBus", () => {
  let eventBus: EventBus;

  // Test event type for our test cases
  interface TestEvent extends BaseEvent {
    eventType: "TEST_EVENT";
    message: string;
  }

  // Create a fresh EventBus instance before each test
  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe("publish", () => {
    it("should successfully publish an event to multiple handlers", async () => {
      // Arrange
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      eventBus.subscribeAsync("TEST_EVENT", handler1);
      eventBus.subscribeAsync("TEST_EVENT", handler2);

      // Act
      await eventBus.publish(testEvent);

      // Assert
      expect(handler1).toHaveBeenCalledWith(testEvent);
      expect(handler2).toHaveBeenCalledWith(testEvent);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should handle errors in event handlers without breaking", async () => {
      // Arrange
      const successHandler = jest.fn().mockResolvedValue(undefined);
      const errorHandler = jest
        .fn()
        .mockRejectedValue(new Error("Handler error"));
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      eventBus.subscribeAsync("TEST_EVENT", successHandler);
      eventBus.subscribeAsync("TEST_EVENT", errorHandler);

      // Act
      await eventBus.publish(testEvent);

      // Assert
      expect(successHandler).toHaveBeenCalledWith(testEvent);
      expect(errorHandler).toHaveBeenCalledWith(testEvent);
      // Both handlers should have been called despite one throwing an error
      expect(successHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    it("should not call handlers for different event types", async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      // Subscribe to a different event type
      eventBus.subscribeAsync("CHAT_CREATED_EVENT", handler);

      // Act
      await eventBus.publish(testEvent);

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("subscribeAsync", () => {
    it("should successfully subscribe a handler", async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      // Act
      eventBus.subscribeAsync("TEST_EVENT", handler);
      await eventBus.publish(testEvent);

      // Assert
      expect(handler).toHaveBeenCalledWith(testEvent);
    });

    it("should allow multiple subscriptions to the same event type", async () => {
      // Arrange
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      // Act
      eventBus.subscribeAsync("TEST_EVENT", handler1);
      eventBus.subscribeAsync("TEST_EVENT", handler2);
      await eventBus.publish(testEvent);

      // Assert
      expect(handler1).toHaveBeenCalledWith(testEvent);
      expect(handler2).toHaveBeenCalledWith(testEvent);
    });
  });

  describe("unsubscribe", () => {
    it("should successfully unsubscribe a handler", async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      // Act
      eventBus.subscribeAsync("TEST_EVENT", handler);
      eventBus.unsubscribe("TEST_EVENT", handler);
      await eventBus.publish(testEvent);

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });

    it("should only unsubscribe the specified handler", async () => {
      // Arrange
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      // Act
      eventBus.subscribeAsync("TEST_EVENT", handler1);
      eventBus.subscribeAsync("TEST_EVENT", handler2);
      eventBus.unsubscribe("TEST_EVENT", handler1);
      await eventBus.publish(testEvent);

      // Assert
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(testEvent);
    });

    it("should handle unsubscribing a non-existent handler gracefully", async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(undefined);
      const testEvent: TestEvent = {
        eventType: "TEST_EVENT",
        message: "test message",
        timestamp: new Date(),
      };

      // Act & Assert
      // Should not throw an error
      expect(() => {
        eventBus.unsubscribe("TEST_EVENT", handler);
      }).not.toThrow();

      await eventBus.publish(testEvent);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
