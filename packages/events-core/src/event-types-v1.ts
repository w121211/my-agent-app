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
 * Events originating from clients
 */
export enum ClientEventType {
  // Client commands
  CLIENT_CREATE_TASK_COMMAND = "CLIENT_CREATE_TASK_COMMAND",
  CLIENT_START_TASK_COMMAND = "CLIENT_START_TASK_COMMAND",
  CLIENT_START_SUBTASK_COMMAND = "CLIENT_START_SUBTASK_COMMAND",
  CLIENT_COMPLETE_SUBTASK_COMMAND = "CLIENT_COMPLETE_SUBTASK_COMMAND",
  CLIENT_START_NEW_CHAT_COMMAND = "CLIENT_START_NEW_CHAT_COMMAND",
  CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND = "CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND",
  CLIENT_SUBMIT_MESSAGE_COMMAND = "CLIENT_SUBMIT_MESSAGE_COMMAND",

  // Client events
  CLIENT_APPROVE_WORK = "CLIENT_APPROVE_WORK",
  CLIENT_TEST_EVENT = "CLIENT_TEST_EVENT",
}

/**
 * Events originating from the server
 *
 * TODO: Rename to ServerEventKind?
 */
export enum ServerEventType {
  // Task related
  SERVER_TASK_CREATED = "SERVER_TASK_CREATED",
  SERVER_TASK_FOLDER_CREATED = "SERVER_TASK_FOLDER_CREATED",
  SERVER_TASK_INITIALIZED = "SERVER_TASK_INITIALIZED",
  SERVER_TASK_LOADED = "SERVER_TASK_LOADED",

  // Subtask related
  SERVER_SUBTASK_STARTED = "SERVER_SUBTASK_STARTED",
  SERVER_SUBTASK_COMPLETED = "SERVER_SUBTASK_COMPLETED",
  SERVER_SUBTASK_UPDATED = "SERVER_SUBTASK_UPDATED",
  SERVER_NEXT_SUBTASK_TRIGGERED = "SERVER_NEXT_SUBTASK_TRIGGERED",

  // Chat related
  SERVER_CHAT_CREATED = "SERVER_CHAT_CREATED",
  SERVER_CHAT_FILE_CREATED = "SERVER_CHAT_FILE_CREATED",
  SERVER_CHAT_UPDATED = "SERVER_CHAT_UPDATED",
  SERVER_AGENT_PROCESSED_MESSAGE = "SERVER_AGENT_PROCESSED_MESSAGE",
  SERVER_AGENT_RESPONSE_GENERATED = "SERVER_AGENT_RESPONSE_GENERATED",
  SERVER_MESSAGE_RECEIVED = "SERVER_MESSAGE_RECEIVED",
  SERVER_MESSAGE_SAVED_TO_CHAT_FILE = "SERVER_MESSAGE_SAVED_TO_CHAT_FILE",

  // System related
  SERVER_FILE_SYSTEM = "SERVER_FILE_SYSTEM",
  SERVER_TEST_EVENT = "SERVER_TEST_EVENT",
}

// Combine both event types for type definitions
export type EventType = ClientEventType | ServerEventType;

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

/**
 * Base interface for all events
 */
export interface BaseEvent {
  eventType: EventType;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Base interface for client-originated events
 */
export interface BaseClientEvent extends BaseEvent {
  eventType: ClientEventType;
}

/**
 * Base interface for server-originated events
 */
export interface BaseServerEvent extends BaseEvent {
  eventType: ServerEventType;
}

// Client Command Events

export interface ClientCreateTaskCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_CREATE_TASK_COMMAND;
  taskName: string;
  taskConfig: Record<string, unknown>;
}

export interface ClientStartTaskCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_START_TASK_COMMAND;
  taskId: string;
}

export interface ClientStartSubtaskCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND;
  taskId: string;
  subtaskId: string;
}

export interface ClientCompleteSubtaskCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND;
  taskId: string;
  subtaskId: string;
  output: string;
  requiresApproval: boolean;
}

export interface ClientStartNewChatCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_START_NEW_CHAT_COMMAND;
  taskId: string;
  subtaskId: string;
  metadata?: ChatMetadata;
}

export interface ClientSubmitInitialPromptCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND;
  chatId: string;
  prompt: string;
}

export interface ClientSubmitMessageCommand extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_SUBMIT_MESSAGE_COMMAND;
  chatId: string;
  content: string;
}

// Client Events

export interface ClientApproveWork extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_APPROVE_WORK;
  chatId: string;
  approvedWork?: string;
}

export interface ClientTestEvent extends BaseClientEvent {
  eventType: ClientEventType.CLIENT_TEST_EVENT;
  message: string;
}

// Server Events

export interface ServerTaskCreated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_TASK_CREATED;
  taskId: string;
  taskName: string;
  config: Record<string, unknown>;
}

export interface ServerTaskFolderCreated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_TASK_FOLDER_CREATED;
  taskId: string;
  folderPath: string;
}

export interface ServerTaskInitialized extends BaseServerEvent {
  eventType: ServerEventType.SERVER_TASK_INITIALIZED;
  taskId: string;
  initialState: Record<string, unknown>;
}

export interface ServerTaskLoaded extends BaseServerEvent {
  eventType: ServerEventType.SERVER_TASK_LOADED;
  taskId: string;
  taskState: Task;
}

export interface ServerSubtaskStarted extends BaseServerEvent {
  eventType: ServerEventType.SERVER_SUBTASK_STARTED;
  taskId: string;
  subtaskId: string;
  input?: unknown;
}

export interface ServerSubtaskCompleted extends BaseServerEvent {
  eventType: ServerEventType.SERVER_SUBTASK_COMPLETED;
  taskId: string;
  subtaskId: string;
}

export interface ServerSubtaskUpdated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_SUBTASK_UPDATED;
  taskId: string;
  subtaskId: string;
  status: SubtaskStatus;
}

export interface ServerNextSubtaskTriggered extends BaseServerEvent {
  eventType: ServerEventType.SERVER_NEXT_SUBTASK_TRIGGERED;
  taskId: string;
  currentSubtaskId: string;
}

export interface ServerChatCreated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_CHAT_CREATED;
  taskId: string;
  subtaskId: string;
  chatId: string;
}

export interface ServerChatFileCreated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_CHAT_FILE_CREATED;
  taskId: string;
  subtaskId: string;
  chatId: string;
  filePath: string;
}

export interface ServerChatUpdated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_CHAT_UPDATED;
  chatId: string;
  lastMessageId: string;
}

export interface ServerAgentProcessedMessage extends BaseServerEvent {
  eventType: ServerEventType.SERVER_AGENT_PROCESSED_MESSAGE;
  chatId: string;
  messageId: string;
}

export interface ServerAgentResponseGenerated extends BaseServerEvent {
  eventType: ServerEventType.SERVER_AGENT_RESPONSE_GENERATED;
  chatId: string;
  response: Message;
}

export interface ServerMessageReceived extends BaseServerEvent {
  eventType: ServerEventType.SERVER_MESSAGE_RECEIVED;
  chatId: string;
  message: Message;
}

export interface ServerMessageSavedToChatFile extends BaseServerEvent {
  eventType: ServerEventType.SERVER_MESSAGE_SAVED_TO_CHAT_FILE;
  chatId: string;
  messageId: string;
  filePath: string;
}

export interface FileSystemEventData {
  eventType: string;
  srcPath: string;
  isDirectory: boolean;
  destPath?: string;
}

export interface ServerFileSystem extends BaseServerEvent {
  eventType: ServerEventType.SERVER_FILE_SYSTEM;
  data: FileSystemEventData;
}

export interface ServerTestEvent extends BaseServerEvent {
  eventType: ServerEventType.SERVER_TEST_EVENT;
  message: string;
}

// Union types for events
export type ClientEventUnion =
  | ClientCreateTaskCommand
  | ClientStartTaskCommand
  | ClientStartSubtaskCommand
  | ClientCompleteSubtaskCommand
  | ClientStartNewChatCommand
  | ClientSubmitInitialPromptCommand
  | ClientSubmitMessageCommand
  | ClientApproveWork
  | ClientTestEvent;

export type ServerEventUnion =
  | ServerTaskCreated
  | ServerTaskFolderCreated
  | ServerTaskInitialized
  | ServerTaskLoaded
  | ServerSubtaskStarted
  | ServerSubtaskCompleted
  | ServerSubtaskUpdated
  | ServerNextSubtaskTriggered
  | ServerChatCreated
  | ServerChatFileCreated
  | ServerChatUpdated
  | ServerAgentProcessedMessage
  | ServerAgentResponseGenerated
  | ServerMessageReceived
  | ServerMessageSavedToChatFile
  | ServerFileSystem
  | ServerTestEvent;

// Combined event union for backward compatibility
export type EventUnion = ClientEventUnion | ServerEventUnion;

/**
 * Type guard to check if an event is of a specific type
 */
export function isEventType<T extends BaseEvent>(
  event: BaseEvent,
  type: EventType
): event is T {
  return event.eventType === type;
}

/**
 * Type guard to check if an event is a client event
 */
export function isClientEvent(event: BaseEvent): event is BaseClientEvent {
  return Object.values(ClientEventType).includes(
    event.eventType as ClientEventType
  );
}

/**
 * Type guard to check if an event is a server event
 */
export function isServerEvent(event: BaseEvent): event is BaseServerEvent {
  return Object.values(ServerEventType).includes(
    event.eventType as ServerEventType
  );
}

/**
 * Type guard to check if an event is a command
 */
export function isCommandEvent(event: BaseEvent): boolean {
  return event.eventType.toString().includes("_COMMAND");
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

/**
 * Note:
 * The following event creation methods are commented out because they lack proper type guards.
 */
/**
 * Creates an event with proper typing and validation
 */
// export function createEvent<T extends EventUnion>(
//   eventType: EventType,
//   data: Omit<T, "eventType" | "timestamp"> & { timestamp?: Date }
// ): T {
//   return {
//     eventType,
//     timestamp: data.timestamp || new Date(),
//     ...data,
//   } as T;
// }

/**
 * Creates a client event with proper typing
 */
// export function createClientEvent<T extends ClientEventUnion>(
//   eventType: ClientEventType,
//   data: Omit<T, "eventType" | "timestamp"> & { timestamp?: Date }
// ): T {
//   return createEvent(eventType, data as any) as T;
// }

/**
 * Creates a server event with proper typing
 */
// export function createServerEvent<T extends ServerEventUnion>(
//   eventType: ServerEventType,
//   data: Omit<T, "eventType" | "timestamp"> & { timestamp?: Date }
// ): T {
//   return createEvent(eventType, data as any) as T;
// }

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
