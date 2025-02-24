// __tests__/event-bus.test.ts

import { EventBus, IEventBus } from "../src/event-bus.js";
import { EventType, BaseEvent } from "../src/types.js";

// 模擬 Logger 以避免實際的日誌輸出
jest.mock("tslog", () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      error: jest.fn(),
    })),
  };
});

describe("EventBus", () => {
  let eventBus: IEventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe("subscribeAsync and publish", () => {
    it("should allow subscribing and publishing asynchronous events", async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined);
      const event: BaseEvent = {
        eventType: EventType.TEST_EVENT,
        timestamp: new Date(),
      };

      eventBus.subscribeAsync(EventType.TEST_EVENT, asyncHandler);
      await eventBus.publish(event);

      expect(asyncHandler).toHaveBeenCalledWith(event);
      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });

    it("should call multiple async handlers for the same event type", async () => {
      const asyncHandler1 = jest.fn().mockResolvedValue(undefined);
      const asyncHandler2 = jest.fn().mockResolvedValue(undefined);
      const event: BaseEvent = {
        eventType: EventType.TEST_EVENT,
        timestamp: new Date(),
      };

      eventBus.subscribeAsync(EventType.TEST_EVENT, asyncHandler1);
      eventBus.subscribeAsync(EventType.TEST_EVENT, asyncHandler2);
      await eventBus.publish(event);

      expect(asyncHandler1).toHaveBeenCalledWith(event);
      expect(asyncHandler2).toHaveBeenCalledWith(event);
      expect(asyncHandler1).toHaveBeenCalledTimes(1);
      expect(asyncHandler2).toHaveBeenCalledTimes(1);
    });
  });

  describe("unsubscribe", () => {
    it("should remove asynchronous handler", async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined);
      const event: BaseEvent = {
        eventType: EventType.TEST_EVENT,
        timestamp: new Date(),
      };

      eventBus.subscribeAsync(EventType.TEST_EVENT, asyncHandler);
      eventBus.unsubscribe(EventType.TEST_EVENT, asyncHandler);
      await eventBus.publish(event);

      expect(asyncHandler).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle errors in asynchronous handlers gracefully", async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error("Test error"));
      const normalHandler = jest.fn().mockResolvedValue(undefined);
      const event: BaseEvent = {
        eventType: EventType.TEST_EVENT,
        timestamp: new Date(),
      };

      eventBus.subscribeAsync(EventType.TEST_EVENT, errorHandler);
      eventBus.subscribeAsync(EventType.TEST_EVENT, normalHandler);

      await expect(eventBus.publish(event)).resolves.toBeUndefined();
      expect(normalHandler).toHaveBeenCalledWith(event);
      expect(normalHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(event); // 確認錯誤處理器也被呼叫
    });
  });

  it("should not call handlers for different event types", async () => {
    const asyncHandler = jest.fn().mockResolvedValue(undefined);
    const event: BaseEvent = {
      eventType: EventType.TEST_EVENT,
      timestamp: new Date(),
    };

    eventBus.subscribeAsync(EventType.CREATE_TASK_COMMAND, asyncHandler);
    await eventBus.publish(event);

    expect(asyncHandler).not.toHaveBeenCalled();
  });
});
