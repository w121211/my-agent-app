import { Logger } from "tslog";

// Create a singleton logger
export const logger = new Logger({ name: "EventSystem" });

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

export enum EventType {
  // Task Commands
  CREATE_TASK_COMMAND = "CREATE_TASK_COMMAND",
  START_TASK_COMMAND = "START_TASK_COMMAND",

  // Task Events
  TASK_CREATED_EVENT = "TASK_CREATED_EVENT",
  TASK_FOLDER_CREATED_EVENT = "TASK_FOLDER_CREATED_EVENT",
  TASK_INITIALIZED_EVENT = "TASK_INITIALIZED_EVENT",
  TASK_LOADED_EVENT = "TASK_LOADED_EVENT",

  // Subtask Commands
  START_SUBTASK_COMMAND = "START_SUBTASK_COMMAND",
  COMPLETE_SUBTASK_COMMAND = "COMPLETE_SUBTASK_COMMAND",

  // Subtask Events
  SUBTASK_STARTED_EVENT = "SUBTASK_STARTED_EVENT",
  SUBTASK_COMPLETED_EVENT = "SUBTASK_COMPLETED_EVENT",
  SUBTASK_UPDATED_EVENT = "SUBTASK_UPDATED_EVENT",
  NEXT_SUBTASK_TRIGGERED_EVENT = "NEXT_SUBTASK_TRIGGERED_EVENT",

  // Chat Commands
  START_NEW_CHAT_COMMAND = "START_NEW_CHAT_COMMAND",
  SUBMIT_INITIAL_PROMPT_COMMAND = "SUBMIT_INITIAL_PROMPT_COMMAND",
  USER_SUBMIT_MESSAGE_COMMAND = "USER_SUBMIT_MESSAGE_COMMAND",

  // Chat Events
  CHAT_CREATED_EVENT = "CHAT_CREATED_EVENT",
  CHAT_FILE_CREATED_EVENT = "CHAT_FILE_CREATED_EVENT",
  CHAT_UPDATED_EVENT = "CHAT_UPDATED_EVENT",
  AGENT_PROCESSED_MESSAGE_EVENT = "AGENT_PROCESSED_MESSAGE_EVENT",
  AGENT_RESPONSE_GENERATED_EVENT = "AGENT_RESPONSE_GENERATED_EVENT",
  MESSAGE_RECEIVED_EVENT = "MESSAGE_RECEIVED_EVENT",
  MESSAGE_SAVED_TO_CHAT_FILE_EVENT = "MESSAGE_SAVED_TO_CHAT_FILE_EVENT",
  USER_APPROVE_WORK_EVENT = "USER_APPROVE_WORK_EVENT",

  // File System Events
  FILE_SYSTEM_EVENT = "FILE_SYSTEM_EVENT",

  // Test Event
  TEST_EVENT = "TEST_EVENT",
}

export interface TeamConfig {
  agent: Role;
  human?: Role;
}

export interface Subtask {
  id: string;
  taskId: string;
  seqNumber: number;
  title: string;
  status: SubtaskStatus;
  description: string;
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
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageMetadata {
  subtaskId?: string;
  taskId?: string;
  functionCalls?: Record<string, unknown>[];
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

export interface ChatFile {
  _type: string;
  chatId: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  messages: Message[];
}

export interface BaseEvent {
  eventType: EventType;
  timestamp: Date;
  correlationId?: string;
}

// Task Events

export interface CreateTaskCommand extends BaseEvent {
  eventType: EventType.CREATE_TASK_COMMAND;
  taskName: string;
  taskConfig: Record<string, unknown>;
}

export interface StartTaskCommand extends BaseEvent {
  eventType: EventType.START_TASK_COMMAND;
  taskId: string;
}

export interface TaskCreatedEvent extends BaseEvent {
  eventType: EventType.TASK_CREATED_EVENT;
  taskId: string;
  taskName: string;
  config: Record<string, unknown>;
}

export interface TaskFolderCreatedEvent extends BaseEvent {
  eventType: EventType.TASK_FOLDER_CREATED_EVENT;
  taskId: string;
  folderPath: string;
}

export interface TaskInitializedEvent extends BaseEvent {
  eventType: EventType.TASK_INITIALIZED_EVENT;
  taskId: string;
  initialState: Record<string, unknown>;
}

export interface TaskLoadedEvent extends BaseEvent {
  eventType: EventType.TASK_LOADED_EVENT;
  taskId: string;
  taskState: Task;
}

// Subtask Events

export interface StartSubtaskCommand extends BaseEvent {
  eventType: EventType.START_SUBTASK_COMMAND;
  taskId: string;
  subtaskId: string;
}

export interface CompleteSubtaskCommand extends BaseEvent {
  eventType: EventType.COMPLETE_SUBTASK_COMMAND;
  taskId: string;
  subtaskId: string;
  output: string;
  requiresApproval: boolean;
}

export interface SubtaskStartedEvent extends BaseEvent {
  eventType: EventType.SUBTASK_STARTED_EVENT;
  taskId: string;
  subtaskId: string;
  input?: unknown;
}

export interface SubtaskCompletedEvent extends BaseEvent {
  eventType: EventType.SUBTASK_COMPLETED_EVENT;
  taskId: string;
  subtaskId: string;
}

export interface SubtaskUpdatedEvent extends BaseEvent {
  eventType: EventType.SUBTASK_UPDATED_EVENT;
  taskId: string;
  subtaskId: string;
  status: SubtaskStatus;
}

export interface NextSubtaskTriggeredEvent extends BaseEvent {
  eventType: EventType.NEXT_SUBTASK_TRIGGERED_EVENT;
  taskId: string;
  currentSubtaskId: string;
}

// Chat Events

export interface StartNewChatCommand extends BaseEvent {
  eventType: EventType.START_NEW_CHAT_COMMAND;
  taskId: string;
  subtaskId: string;
  metadata?: ChatMetadata;
}

export interface SubmitInitialPromptCommand extends BaseEvent {
  eventType: EventType.SUBMIT_INITIAL_PROMPT_COMMAND;
  chatId: string;
  prompt: string;
}

export interface UserSubmitMessageCommand extends BaseEvent {
  eventType: EventType.USER_SUBMIT_MESSAGE_COMMAND;
  chatId: string;
  content: string;
}

export interface ChatCreatedEvent extends BaseEvent {
  eventType: EventType.CHAT_CREATED_EVENT;
  taskId: string;
  subtaskId: string;
  chatId: string;
}

export interface ChatFileCreatedEvent extends BaseEvent {
  eventType: EventType.CHAT_FILE_CREATED_EVENT;
  taskId: string;
  subtaskId: string;
  chatId: string;
  filePath: string;
}

export interface ChatUpdatedEvent extends BaseEvent {
  eventType: EventType.CHAT_UPDATED_EVENT;
  chatId: string;
  lastMessageId: string;
}

export interface AgentProcessedMessageEvent extends BaseEvent {
  eventType: EventType.AGENT_PROCESSED_MESSAGE_EVENT;
  chatId: string;
  messageId: string;
}

export interface AgentResponseGeneratedEvent extends BaseEvent {
  eventType: EventType.AGENT_RESPONSE_GENERATED_EVENT;
  chatId: string;
  response: Message;
}

export interface MessageReceivedEvent extends BaseEvent {
  eventType: EventType.MESSAGE_RECEIVED_EVENT;
  chatId: string;
  message: Message;
}

export interface MessageSavedToChatFileEvent extends BaseEvent {
  eventType: EventType.MESSAGE_SAVED_TO_CHAT_FILE_EVENT;
  chatId: string;
  messageId: string;
  filePath: string;
}

export interface UserApproveWorkEvent extends BaseEvent {
  eventType: EventType.USER_APPROVE_WORK_EVENT;
  chatId: string;
  approvedWork?: string;
}

// File System Events

export interface FileSystemEventData {
  eventType: string;
  srcPath: string;
  isDirectory: boolean;
  destPath?: string;
}

export interface FileSystemEvent extends BaseEvent {
  eventType: EventType.FILE_SYSTEM_EVENT;
  data: FileSystemEventData;
}

export interface TestEvent extends BaseEvent {
  eventType: EventType.TEST_EVENT;
  message: string;
}

// Union type of all possible events in the system
export type EventUnion =
  | CreateTaskCommand
  | StartTaskCommand
  | TaskCreatedEvent
  | TaskFolderCreatedEvent
  | TaskInitializedEvent
  | TaskLoadedEvent
  | StartSubtaskCommand
  | CompleteSubtaskCommand
  | SubtaskStartedEvent
  | SubtaskCompletedEvent
  | SubtaskUpdatedEvent
  | NextSubtaskTriggeredEvent
  | StartNewChatCommand
  | SubmitInitialPromptCommand
  | UserSubmitMessageCommand
  | ChatCreatedEvent
  | ChatFileCreatedEvent
  | ChatUpdatedEvent
  | AgentProcessedMessageEvent
  | AgentResponseGeneratedEvent
  | MessageReceivedEvent
  | MessageSavedToChatFileEvent
  | UserApproveWorkEvent
  | FileSystemEvent
  | TestEvent;

// Type guard to check if an event is of a specific type
export function isEventType<T extends BaseEvent>(
  event: BaseEvent,
  type: EventType
): event is T {
  return event.eventType === type;
}

export type SyncEventHandler<T extends EventUnion> = (event: T) => void;

export type AsyncEventHandler<T extends EventUnion> = (
  event: T
) => Promise<void>;

export interface EntityWithId {
  id: string;
  updatedAt: Date;
}

export interface Repository<T extends EntityWithId> {
  findById(id: string): Promise<T | undefined>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  remove(id: string): Promise<void>;
}

// Helper for creating events with proper typing
// TODO: Refactor to use Zod for proper runtime validation of event structure
export function createEvent<T extends EventUnion>(
  eventType: EventType,
  data: T
): T {
  if (data.eventType !== eventType) {
    throw new Error(
      `Event type mismatch: expected ${eventType}, got ${data.eventType}`
    );
  }

  return { ...data } as T;
}

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityId: string) {
    super(`Entity with ID ${entityId} not found`);
    this.name = "EntityNotFoundError";
  }
}

export class ConcurrencyError extends RepositoryError {
  constructor(entityId: string) {
    super(`Concurrency conflict for entity ${entityId}`);
    this.name = "ConcurrencyError";
  }
}
