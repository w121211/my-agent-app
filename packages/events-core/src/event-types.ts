export type TaskStatus =
  | "CREATED"
  | "INITIALIZED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type SubtaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type ChatStatus = "ACTIVE" | "CLOSED";

export type Role = "ASSISTANT" | "USER" | "FUNCTION_EXECUTOR";

/**
 * Structure representing a file system node in the folder tree
 */
export type FolderTreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
};

/**
 * Events originating from clients
 */
export const ClientEventKind = [
  // Client commands
  "ClientCreateTask",
  "ClientStartTask",
  "ClientStopTask",
  "ClientStartSubtask",
  "ClientCompleteSubtask",
  "ClientStopSubtask",
  "ClientCloneSubtask",
  "ClientStartNewChat",
  "ClientSubmitInitialPrompt",
  "ClientSubmitMessage",
  "ClientCloneChat",
  "ClientBranchChat",
  "ClientApproveWork",
  "ClientRequestWorkspaceFolderTree",

  // Client state updates
  "ClientFileTreeUpdated",
  "ClientDirectoryAdded",
  "ClientFileAdded",
  "ClientEditorReloadRequested",
  "ClientEditorUpdated",
  "ClientFileChangeIgnored",
  "ClientChatUpdated",
  "ClientTaskUpdated",
  "ClientUIStateUpdated",

  // Client test events
  "ClientTestPing",
] as const;

export type ClientEventKind = (typeof ClientEventKind)[number];

/**
 * Events originating from the server
 */
export const ServerEventKind = [
  // Task related
  "ServerTaskCreated",
  "ServerTaskFolderCreated",
  "ServerTaskInitialized",
  "ServerTaskLoaded",

  // Subtask related
  "ServerSubtaskStarted",
  "ServerSubtaskCompleted",
  "ServerSubtaskUpdated",
  "ServerNextSubtaskTriggered",

  // Chat related
  "ServerChatCreated",
  "ServerChatFileCreated",
  "ServerChatContentUpdated",
  "ServerAgentProcessedMessage",
  "ServerAgentResponseGenerated",
  "ServerMessageReceived",
  "ServerMessageSavedToChatFile",

  // System related
  "ServerFileWatcherEvent",
  "ServerWorkspaceFolderTreeResponsed",
  "ServerTestPing",
] as const;

export type ServerEventKind = (typeof ServerEventKind)[number];

// Combine all event types for type definitions
// TODO:The string union type is included temporarily for development convenience
// when working with custom or dynamic event types that haven't been fully typed yet
export type EventKind = ClientEventKind | ServerEventKind | string;

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

export interface ChatMessageMetadata {
  subtaskId?: string;
  taskId?: string;
  functionCalls?: Record<string, unknown>[];
  isPrompt?: boolean;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
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
  messages: ChatMessage[];
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
  messages: ChatMessage[];
}

/**
 * Base interface for all events
 */
export interface BaseEvent {
  kind: EventKind;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Base interface for client-originated events
 */
export interface BaseClientEvent extends BaseEvent {
  kind: ClientEventKind;
}

/**
 * Base interface for server-originated events
 */
export interface BaseServerEvent extends BaseEvent {
  kind: ServerEventKind;
}

// Client Command Events

export interface ClientCreateTaskEvent extends BaseClientEvent {
  kind: "ClientCreateTask";
  taskName: string;
  taskConfig: Record<string, unknown>;
}

export interface ClientStartTaskEvent extends BaseClientEvent {
  kind: "ClientStartTask";
  taskId: string;
}

export interface ClientStopTaskEvent extends BaseClientEvent {
  kind: "ClientStopTask";
  taskId: string;
}

export interface ClientStartSubtaskEvent extends BaseClientEvent {
  kind: "ClientStartSubtask";
  taskId: string;
  subtaskId: string;
}

export interface ClientCompleteSubtaskEvent extends BaseClientEvent {
  kind: "ClientCompleteSubtask";
  taskId: string;
  subtaskId: string;
  output: string;
  requiresApproval: boolean;
}

export interface ClientStopSubtaskEvent extends BaseClientEvent {
  kind: "ClientStopSubtask";
  taskId: string;
  subtaskId: string;
}

export interface ClientCloneSubtaskEvent extends BaseClientEvent {
  kind: "ClientCloneSubtask";
  taskId: string;
  subtaskId: string;
}

export interface ClientStartNewChatEvent extends BaseClientEvent {
  kind: "ClientStartNewChat";
  taskId: string;
  subtaskId: string;
  metadata?: ChatMetadata;
}

export interface ClientSubmitInitialPromptEvent extends BaseClientEvent {
  kind: "ClientSubmitInitialPrompt";
  chatId: string;
  prompt: string;
}

export interface ClientSubmitMessageEvent extends BaseClientEvent {
  kind: "ClientSubmitMessage";
  chatId: string;
  content: string;
}

export interface ClientCloneChatEvent extends BaseClientEvent {
  kind: "ClientCloneChat";
  chatId: string;
}

export interface ClientBranchChatEvent extends BaseClientEvent {
  kind: "ClientBranchChat";
  chatId: string;
  messageId: string;
}

export interface ClientApproveWorkEvent extends BaseClientEvent {
  kind: "ClientApproveWork";
  chatId: string;
  approvedWork?: string;
}

export interface ClientRequestWorkspaceFolderTreeEvent extends BaseClientEvent {
  kind: "ClientRequestWorkspaceFolderTree";
  workspacePath?: string; // Optional path to specify which workspace folder to query
}

export interface ClientTestPingEvent extends BaseClientEvent {
  kind: "ClientTestPing";
  message: string;
}

// Client State Update Events

export interface ClientFileTreeUpdatedEvent extends BaseClientEvent {
  kind: "ClientFileTreeUpdated";
  tree: unknown;
}

export interface ClientDirectoryAddedEvent extends BaseClientEvent {
  kind: "ClientDirectoryAdded";
  path: string;
}

export interface ClientFileAddedEvent extends BaseClientEvent {
  kind: "ClientFileAdded";
  path: string;
  content: string;
}

export interface ClientEditorReloadRequestedEvent extends BaseClientEvent {
  kind: "ClientEditorReloadRequested";
  filePath: string;
}

export interface ClientEditorUpdatedEvent extends BaseClientEvent {
  kind: "ClientEditorUpdated";
  filePath: string;
  content: string;
}

export interface ClientFileChangeIgnoredEvent extends BaseClientEvent {
  kind: "ClientFileChangeIgnored";
  filePath: string;
}

export interface ClientChatUpdatedEvent extends BaseClientEvent {
  kind: "ClientChatUpdated";
  chat: Chat;
}

export interface ClientTaskUpdatedEvent extends BaseClientEvent {
  kind: "ClientTaskUpdated";
  task: Task;
}

export interface ClientUIStateUpdatedEvent extends BaseClientEvent {
  kind: "ClientUIStateUpdated";
  state: Record<string, unknown>;
}

// Server Events

export interface ServerTaskCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskCreated";
  taskId: string;
  taskName: string;
  config: Record<string, unknown>;
}

export interface ServerTaskFolderCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskFolderCreated";
  taskId: string;
  folderPath: string;
}

export interface ServerTaskInitializedEvent extends BaseServerEvent {
  kind: "ServerTaskInitialized";
  taskId: string;
  initialState: Record<string, unknown>;
}

export interface ServerTaskLoadedEvent extends BaseServerEvent {
  kind: "ServerTaskLoaded";
  taskId: string;
  taskState: Task;
}

export interface ServerSubtaskStartedEvent extends BaseServerEvent {
  kind: "ServerSubtaskStarted";
  taskId: string;
  subtaskId: string;
  input?: unknown;
}

export interface ServerSubtaskCompletedEvent extends BaseServerEvent {
  kind: "ServerSubtaskCompleted";
  taskId: string;
  subtaskId: string;
}

export interface ServerSubtaskUpdatedEvent extends BaseServerEvent {
  kind: "ServerSubtaskUpdated";
  taskId: string;
  subtaskId: string;
  status: SubtaskStatus;
}

export interface ServerNextSubtaskTriggeredEvent extends BaseServerEvent {
  kind: "ServerNextSubtaskTriggered";
  taskId: string;
  currentSubtaskId: string;
}

export interface ServerChatCreatedEvent extends BaseServerEvent {
  kind: "ServerChatCreated";
  taskId: string;
  subtaskId: string;
  chatId: string;
}

export interface ServerChatFileCreatedEvent extends BaseServerEvent {
  kind: "ServerChatFileCreated";
  taskId: string;
  subtaskId: string;
  chatId: string;
  filePath: string;
}

export interface ServerChatContentUpdatedEvent extends BaseServerEvent {
  kind: "ServerChatContentUpdated";
  chatId: string;
  lastMessageId: string;
}

export interface ServerAgentProcessedMessageEvent extends BaseServerEvent {
  kind: "ServerAgentProcessedMessage";
  chatId: string;
  messageId: string;
}

export interface ServerAgentResponseGeneratedEvent extends BaseServerEvent {
  kind: "ServerAgentResponseGenerated";
  chatId: string;
  response: ChatMessage;
}

export interface ServerMessageReceivedEvent extends BaseServerEvent {
  kind: "ServerMessageReceived";
  chatId: string;
  message: ChatMessage;
}

export interface ServerMessageSavedToChatFileEvent extends BaseServerEvent {
  kind: "ServerMessageSavedToChatFile";
  chatId: string;
  messageId: string;
  filePath: string;
}

export type ChokidarFsEventKind =
  | "add"
  | "addDir"
  | "change"
  | "unlink"
  | "unlinkDir"
  | "ready"
  | "error";

export interface ChokidarFsEventData {
  fsEventKind: ChokidarFsEventKind;
  srcPath: string;
  isDirectory: boolean;
  error?: Error; // For error events
}

export interface ServerFileWatcherEvent extends BaseServerEvent {
  kind: "ServerFileWatcherEvent";
  data: ChokidarFsEventData;
}

export interface ServerWorkspaceFolderTreeResponsedEvent
  extends BaseServerEvent {
  kind: "ServerWorkspaceFolderTreeResponsed";
  workspacePath: string;
  folderTree: FolderTreeNode | null;
  error?: string; // Optional error message if the request failed
}

export interface ServerTestPingEvent extends BaseServerEvent {
  kind: "ServerTestPing";
  message: string;
}

// Union types for events
export type ClientEventUnion =
  | ClientCreateTaskEvent
  | ClientStartTaskEvent
  | ClientStopTaskEvent
  | ClientStartSubtaskEvent
  | ClientCompleteSubtaskEvent
  | ClientStopSubtaskEvent
  | ClientCloneSubtaskEvent
  | ClientStartNewChatEvent
  | ClientSubmitInitialPromptEvent
  | ClientSubmitMessageEvent
  | ClientCloneChatEvent
  | ClientBranchChatEvent
  | ClientApproveWorkEvent
  | ClientRequestWorkspaceFolderTreeEvent
  | ClientTestPingEvent
  | ClientFileTreeUpdatedEvent
  | ClientDirectoryAddedEvent
  | ClientFileAddedEvent
  | ClientEditorReloadRequestedEvent
  | ClientEditorUpdatedEvent
  | ClientFileChangeIgnoredEvent
  | ClientChatUpdatedEvent
  | ClientTaskUpdatedEvent
  | ClientUIStateUpdatedEvent;

export type ServerEventUnion =
  | ServerTaskCreatedEvent
  | ServerTaskFolderCreatedEvent
  | ServerTaskInitializedEvent
  | ServerTaskLoadedEvent
  | ServerSubtaskStartedEvent
  | ServerSubtaskCompletedEvent
  | ServerSubtaskUpdatedEvent
  | ServerNextSubtaskTriggeredEvent
  | ServerChatCreatedEvent
  | ServerChatFileCreatedEvent
  | ServerChatContentUpdatedEvent
  | ServerAgentProcessedMessageEvent
  | ServerAgentResponseGeneratedEvent
  | ServerMessageReceivedEvent
  | ServerMessageSavedToChatFileEvent
  | ServerFileWatcherEvent
  | ServerWorkspaceFolderTreeResponsedEvent
  | ServerTestPingEvent;

// Combined event union for backward compatibility
export type EventUnion = ClientEventUnion | ServerEventUnion;

/**
 * Type guard to check if an event is of a specific kind
 */
export function isEventKind<T extends BaseEvent>(
  event: BaseEvent,
  kind: EventKind
): event is T {
  return event.kind === kind;
}

/**
 * Type guard to check if an event is a client event
 */
export function isClientEvent(event: BaseEvent): event is ClientEventUnion {
  return ClientEventKind.includes(event.kind as ClientEventKind);
}

/**
 * Type guard to check if an event is a server event
 */
export function isServerEvent(event: BaseEvent): event is ServerEventUnion {
  return ServerEventKind.includes(event.kind as ServerEventKind);
}

/**
 * Type guard to check if an event is a command
 */
export function isCommandEvent(event: BaseEvent): boolean {
  const clientCommandEvents = [
    "ClientCreateTask",
    "ClientStartTask",
    "ClientStopTask",
    "ClientStartSubtask",
    "ClientCompleteSubtask",
    "ClientStopSubtask",
    "ClientCloneSubtask",
    "ClientStartNewChat",
    "ClientSubmitInitialPrompt",
    "ClientSubmitMessage",
    "ClientCloneChat",
    "ClientBranchChat",
    "ClientApproveWork",
    "ClientRunTest",
  ];

  return clientCommandEvents.includes(event.kind as string);
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
