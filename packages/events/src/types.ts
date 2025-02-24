/**
 * types.ts
 * Core type definitions for the event-driven system
 */

/**
 * Enum representing various event types in the system
 */
export enum EventType {
  // Task related events
  CREATE_TASK = "CREATE_TASK",
  START_TASK = "START_TASK",
  TASK_CREATED = "TASK_CREATED",
  TASK_STARTED = "TASK_STARTED",
  TASK_COMPLETED = "TASK_COMPLETED",

  // Subtask related events
  START_SUBTASK = "START_SUBTASK",
  COMPLETE_SUBTASK = "COMPLETE_SUBTASK",
  SUBTASK_STARTED = "SUBTASK_STARTED",
  SUBTASK_COMPLETED = "SUBTASK_COMPLETED",
  NEXT_SUBTASK_TRIGGERED = "NEXT_SUBTASK_TRIGGERED",

  // Chat related events
  START_CHAT = "START_CHAT",
  CHAT_CREATED = "CHAT_CREATED",
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  MESSAGE_SAVED = "MESSAGE_SAVED",
  USER_APPROVE_WORK = "USER_APPROVE_WORK",

  // File system events
  FILE_SYSTEM_EVENT = "FILE_SYSTEM_EVENT",

  // Testing events
  TEST_EVENT = "TEST_EVENT",
}

/**
 * Base event interface that all events will implement
 */
export interface BaseEvent {
  readonly type: EventType;
  readonly timestamp: Date;
  readonly correlationId?: string;
}

/**
 * Type definition for synchronous event handlers
 */
// export type EventHandler<T extends BaseEvent> = (event: T) => void;

/**
 * Type definition for asynchronous event handlers
 */
export type AsyncEventHandler<T extends BaseEvent> = (
  event: T
) => Promise<void>;

/**
 * Status enums for various entities
 */
export enum TaskStatus {
  CREATED = "CREATED",
  INITIALIZED = "INITIALIZED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum SubtaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum ChatStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
}

export enum Role {
  ASSISTANT = "ASSISTANT",
  USER = "USER",
  FUNCTION_EXECUTOR = "FUNCTION_EXECUTOR",
}

/**
 * Entity interfaces
 */

export interface TeamConfig {
  agent: Role;
  human?: Role;
}

export interface Subtask {
  id: string;
  taskId: string;
  seqNumber: number;
  title: string;
  description: string;
  status: SubtaskStatus;
  team: TeamConfig;
  inputType: string;
  outputType: string;
}

export interface Task {
  id: string;
  seqNumber: number;
  title: string;
  status: TaskStatus;
  currentSubtaskId?: string;
  subtasks: Subtask[];
  folderPath?: string;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageMetadata {
  subtaskId?: string;
  taskId?: string;
  functionCalls?: Array<Record<string, any>>;
  isPrompt?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface ChatMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
}

export interface Chat {
  id: string;
  taskId: string;
  subtaskId: string;
  messages: Message[];
  status: ChatStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}

/**
 * Command events
 */

// Task commands
export interface CreateTaskCommand extends BaseEvent {
  type: EventType.CREATE_TASK;
  taskName: string;
  taskConfig: Record<string, any>;
}

export interface StartTaskCommand extends BaseEvent {
  type: EventType.START_TASK;
  taskId: string;
}

// Subtask commands
export interface StartSubtaskCommand extends BaseEvent {
  type: EventType.START_SUBTASK;
  taskId: string;
  subtaskId: string;
}

export interface CompleteSubtaskCommand extends BaseEvent {
  type: EventType.COMPLETE_SUBTASK;
  taskId: string;
  subtaskId: string;
  output: string;
  requiresApproval: boolean;
}

// Chat commands
export interface StartChatCommand extends BaseEvent {
  type: EventType.START_CHAT;
  taskId: string;
  subtaskId: string;
  metadata?: ChatMetadata;
}

/**
 * Event interfaces
 */

// Task events
export interface TaskCreatedEvent extends BaseEvent {
  type: EventType.TASK_CREATED;
  taskId: string;
  taskName: string;
  config: Record<string, any>;
}

export interface TaskStartedEvent extends BaseEvent {
  type: EventType.TASK_STARTED;
  taskId: string;
  task: Task;
}

// Subtask events
export interface SubtaskStartedEvent extends BaseEvent {
  type: EventType.SUBTASK_STARTED;
  taskId: string;
  subtaskId: string;
  input?: any;
}

export interface SubtaskCompletedEvent extends BaseEvent {
  type: EventType.SUBTASK_COMPLETED;
  taskId: string;
  subtaskId: string;
}

export interface NextSubtaskTriggeredEvent extends BaseEvent {
  type: EventType.NEXT_SUBTASK_TRIGGERED;
  taskId: string;
  currentSubtaskId: string;
}

// Chat events
export interface ChatCreatedEvent extends BaseEvent {
  type: EventType.CHAT_CREATED;
  taskId: string;
  subtaskId: string;
  chatId: string;
}

export interface MessageReceivedEvent extends BaseEvent {
  type: EventType.MESSAGE_RECEIVED;
  chatId: string;
  message: Message;
}

export interface MessageSavedEvent extends BaseEvent {
  type: EventType.MESSAGE_SAVED;
  chatId: string;
  messageId: string;
  filePath: string;
}

export interface UserApproveWorkEvent extends BaseEvent {
  type: EventType.USER_APPROVE_WORK;
  chatId: string;
  approvedWork?: string;
}

// File system events
export interface FileSystemEventData {
  eventType: string; // created, modified, deleted, moved
  srcPath: string;
  isDirectory: boolean;
  destPath?: string; // For move events
}

export interface FileSystemEvent extends BaseEvent {
  type: EventType.FILE_SYSTEM_EVENT;
  data: FileSystemEventData;
}

// Test event
export interface TestEvent extends BaseEvent {
  type: EventType.TEST_EVENT;
  message: string;
}

/**
 * Type guard to check if a handler is async
 */
// export function isAsyncHandler<T extends BaseEvent>(
//   handler: EventHandler<T> | AsyncEventHandler<T>
// ): handler is AsyncEventHandler<T> {
//   return handler.constructor.name === "AsyncFunction";
// }
