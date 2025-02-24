import { Logger } from "tslog";
import {
  BaseEvent,
  EventType,
  CreateTaskCommand,
  StartTaskCommand,
  StartNewChatCommand,
  UserSubmitMessageCommand,
  TestEvent,
} from "./types.js";

const logger = new Logger({ name: "EventFactory" });

// Event validator type
type EventValidator<T extends BaseEvent> = (data: unknown) => data is T;

// Event creator type
type EventCreator<T extends BaseEvent> = (data: unknown) => T;

// Generic event creation error
class EventCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventCreationError";
  }
}

// Helper functions for data validation
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

function ensureDate(value: unknown): Date {
  if (typeof value === "string") {
    const date = new Date(value);
    if (isValidDate(date)) return date;
  }
  if (value instanceof Date && isValidDate(value)) return value;
  throw new EventCreationError("Invalid date value");
}

function ensureString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new EventCreationError(
      `Invalid ${fieldName}: must be a non-empty string`
    );
  }
  return value;
}

// Base event creator
function createBaseEventData(data: unknown, eventType: EventType): BaseEvent {
  if (!data || typeof data !== "object") {
    throw new EventCreationError("Event data must be an object");
  }

  const eventData = data as Record<string, unknown>;
  return {
    eventType,
    timestamp: ensureDate(eventData.timestamp),
    correlationId: eventData.correlationId as string | undefined,
  };
}

// Event validators and creators
const eventHandlers: Partial<Record<EventType, EventCreator<BaseEvent>>> = {
  [EventType.CREATE_TASK_COMMAND]: (data: unknown): CreateTaskCommand => {
    const base = createBaseEventData(data, EventType.CREATE_TASK_COMMAND);
    const eventData = data as Record<string, unknown>;

    return {
      ...base,
      eventType: EventType.CREATE_TASK_COMMAND,
      taskName: ensureString(eventData.taskName, "taskName"),
      taskConfig: eventData.taskConfig as Record<string, unknown>,
    };
  },

  [EventType.START_TASK_COMMAND]: (data: unknown): StartTaskCommand => {
    const base = createBaseEventData(data, EventType.START_TASK_COMMAND);
    const eventData = data as Record<string, unknown>;

    return {
      ...base,
      eventType: EventType.START_TASK_COMMAND,
      taskId: ensureString(eventData.taskId, "taskId"),
    };
  },

  [EventType.START_NEW_CHAT_COMMAND]: (data: unknown): StartNewChatCommand => {
    const base = createBaseEventData(data, EventType.START_NEW_CHAT_COMMAND);
    const eventData = data as Record<string, unknown>;

    return {
      ...base,
      taskId: ensureString(eventData.taskId, "taskId"),
      subtaskId: ensureString(eventData.subtaskId, "subtaskId"),
      metadata: eventData.metadata as Record<string, unknown> | undefined,
    };
  },

  [EventType.USER_SUBMIT_MESSAGE_COMMAND]: (
    data: unknown
  ): UserSubmitMessageCommand => {
    const base = createBaseEventData(
      data,
      EventType.USER_SUBMIT_MESSAGE_COMMAND
    );
    const eventData = data as Record<string, unknown>;

    return {
      ...base,
      chatId: ensureString(eventData.chatId, "chatId"),
      content: ensureString(eventData.content, "content"),
    };
  },

  [EventType.TEST_EVENT]: (data: unknown): TestEvent => {
    const base = createBaseEventData(data, EventType.TEST_EVENT);
    const eventData = data as Record<string, unknown>;

    return {
      ...base,
      message: ensureString(eventData.message, "message"),
    };
  },
};

// Event type conversion
export function toEventType(eventTypeStr: string): EventType {
  const upperCaseType = eventTypeStr.toUpperCase();
  if (!Object.values(EventType).includes(upperCaseType as EventType)) {
    throw new EventCreationError(`Invalid event type: ${eventTypeStr}`);
  }
  return upperCaseType as EventType;
}

// Main event creation function
export function createEvent<T extends BaseEvent>(
  eventType: EventType | string,
  eventData: unknown
): T {
  try {
    const resolvedEventType =
      typeof eventType === "string" ? toEventType(eventType) : eventType;

    const creator = eventHandlers[resolvedEventType];
    if (!creator) {
      throw new EventCreationError(
        `No event handler found for type: ${resolvedEventType}`
      );
    }

    logger.debug(`Creating event of type ${resolvedEventType}`, {
      eventData,
    });

    const event = creator(eventData) as T;
    logger.debug("Event created successfully", { event });

    return event;
  } catch (error) {
    if (error instanceof EventCreationError) {
      throw error;
    }
    throw new EventCreationError(
      `Failed to create event: ${(error as Error).message}`
    );
  }
}
