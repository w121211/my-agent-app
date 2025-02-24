// src/eventFactory.ts

import { Logger } from "tslog";
import {
  BaseEvent,
  CreateTaskCommand,
  EventType,
  StartNewChatCommand,
  StartTaskCommand,
  TestEvent,
  UserSubmitMessageCommand,
} from "./types.js";

// 事件類型到事件類的映射
const EVENT_TYPE_MAP: Record<EventType, new (data: any) => BaseEvent> = {
  [EventType.CREATE_TASK_COMMAND]: CreateTaskCommandImpl,
  [EventType.START_TASK_COMMAND]: StartTaskCommandImpl,
  [EventType.START_NEW_CHAT_COMMAND]: StartNewChatCommandImpl,
  [EventType.USER_SUBMIT_MESSAGE_COMMAND]: UserSubmitMessageCommandImpl,
  [EventType.TEST_EVENT]: TestEventImpl,
  // 可以根據需要添加其他映射
};

// 具體事件實現類
class CreateTaskCommandImpl implements CreateTaskCommand {
  eventType = EventType.CREATE_TASK_COMMAND;
  timestamp: Date;
  correlationId?: string;
  taskName: string;
  taskConfig: Record<string, any>;

  constructor(data: any) {
    this.timestamp = new Date(data.timestamp);
    this.correlationId = data.correlationId;
    this.taskName = data.taskName;
    this.taskConfig = data.taskConfig;
  }
}

class StartTaskCommandImpl implements StartTaskCommand {
  eventType = EventType.START_TASK_COMMAND;
  timestamp: Date;
  correlationId?: string;
  taskId: string;

  constructor(data: any) {
    this.timestamp = new Date(data.timestamp);
    this.correlationId = data.correlationId;
    this.taskId = data.taskId;
  }
}

class StartNewChatCommandImpl implements StartNewChatCommand {
  eventType = EventType.START_NEW_CHAT_COMMAND;
  timestamp: Date;
  correlationId?: string;
  taskId: string;
  subtaskId: string;
  metadata?: import("./types.js").ChatMetadata;

  constructor(data: any) {
    this.timestamp = new Date(data.timestamp);
    this.correlationId = data.correlationId;
    this.taskId = data.taskId;
    this.subtaskId = data.subtaskId;
    this.metadata = data.metadata;
  }
}

class UserSubmitMessageCommandImpl implements UserSubmitMessageCommand {
  eventType = EventType.USER_SUBMIT_MESSAGE_COMMAND;
  timestamp: Date;
  correlationId?: string;
  chatId: string;
  content: string;

  constructor(data: any) {
    this.timestamp = new Date(data.timestamp);
    this.correlationId = data.correlationId;
    this.chatId = data.chatId;
    this.content = data.content;
  }
}

class TestEventImpl implements TestEvent {
  eventType = EventType.TEST_EVENT;
  timestamp: Date;
  correlationId?: string;
  message: string;

  constructor(data: any) {
    this.timestamp = new Date(data.timestamp);
    this.correlationId = data.correlationId;
    this.message = data.message;
  }
}

export function toEventType(eventTypeStr: string): EventType {
  const upperCaseType = eventTypeStr.toUpperCase();
  if (!(upperCaseType in EventType)) {
    throw new Error(`Invalid event type: ${eventTypeStr}`);
  }
  return EventType[upperCaseType as keyof typeof EventType];
}

export function createEvent(
  eventType: EventType | string,
  eventData: any
): BaseEvent {
  const logger = new Logger({ name: "EventFactory" });
  logger.debug(`Creating event of type ${eventType} with data:`, eventData);

  // 如果 eventType 是字串，轉換為 EventType 枚舉
  const resolvedEventType =
    typeof eventType === "string" ? toEventType(eventType) : eventType;

  // 獲取事件類
  const EventClass = EVENT_TYPE_MAP[resolvedEventType];
  if (!EventClass) {
    throw new Error(`No event class found for type: ${resolvedEventType}`);
  }

  // 創建事件實例
  return new EventClass(eventData);
}
