export type TaskStatus =
  | "CREATED"
  | "INITIALIZED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type SubtaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type ChatStatus = "ACTIVE" | "CLOSED";

export type Role = "ASSISTANT" | "USER" | "FUNCTION_EXECUTOR";

export type ChatMode = "chat" | "agent";

export type ChatUpdateType =
  | "MESSAGE_ADDED"
  | "ARTIFACT_ADDED"
  | "METADATA_UPDATED";

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

  // Chat related
  "ClientCreateNewChat",
  "ClientStartNewChat",
  "ClientSubmitUserChatMessage",
  "ClientCloneChat",
  "ClientBranchChat",
  "ClientApproveWork",

  // File related
  "ClientRequestWorkspaceFolderTree",
  "ClientOpenFile",
  "ClientOpenChatFile",

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
  "ServerTaskConfigFileCreated",
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
  "ServerChatInitialized",
  "ServerChatMessageAppended",
  "ServerChatFileUpdated",
  "ServerChatUpdated",
  "ServerNewChatCreated",

  // AI processing
  "ServerUserChatMessagePostProcessed",
  "ServerAIResponseRequested",
  "ServerAIResponseGenerated",
  "ServerAIResponsePostProcessed",

  // File related
  "ServerFileTypeDetected",
  "ServerFileOpened",
  "ServerChatFileOpened",
  "ServerChatFileLoaded",
  "ServerNonChatFileOpened",
  "ServerArtifactFileCreated",

  // System related
  "ServerFileWatcherEvent",
  "ServerWorkspaceFolderTreeResponsed",
  "ServerTestPing",
] as const;

export type ServerEventKind = (typeof ServerEventKind)[number];

// Union type for event kinds
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
  fileReferences?: Array<{
    path: string;
    md5: string;
  }>;
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
  mode?: ChatMode;
  model?: string;
  knowledge?: string[];
}

export interface Chat {
  id: string;
  filePath: string;
  messages: ChatMessage[];
  status: ChatStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}

export interface ChatUpdateData {
  kind: ChatUpdateType;
  message?: ChatMessage;
  artifact?: {
    id: string;
    type: string;
    content: string;
  };
  metadata?: Partial<ChatMetadata>;
}

export interface Artifact {
  id: string;
  chatId: string;
  messageId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  createdAt: Date;
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

export interface ClientCreateNewChatEvent extends BaseClientEvent {
  kind: "ClientCreateNewChat";
  newTask: boolean;
  mode: ChatMode;
  knowledge: string[];
  prompt: string;
  model: string;
}

export interface ClientStartNewChatEvent extends BaseClientEvent {
  kind: "ClientStartNewChat";
  taskId: string;
  subtaskId: string;
  metadata?: ChatMetadata;
}

export interface ClientSubmitUserChatMessageEvent extends BaseClientEvent {
  kind: "ClientSubmitUserChatMessage";
  chatId: string;
  message: string;
  attachments?: Array<{
    fileName: string;
    content: string;
  }>;
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

export interface ClientOpenFileEvent extends BaseClientEvent {
  kind: "ClientOpenFile";
  filePath: string;
}

export interface ClientOpenChatFileEvent extends BaseClientEvent {
  kind: "ClientOpenChatFile";
  filePath: string;
}

export interface ClientRequestWorkspaceFolderTreeEvent extends BaseClientEvent {
  kind: "ClientRequestWorkspaceFolderTree";
  workspacePath?: string;
}

export interface ClientTestPingEvent extends BaseClientEvent {
  kind: "ClientTestPing";
  message: string;
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

export interface ServerTaskConfigFileCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskConfigFileCreated";
  taskId: string;
  filePath: string;
  config: Record<string, unknown>;
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
  chatId: string;
  chatObject: Chat;
}

export interface ServerChatFileCreatedEvent extends BaseServerEvent {
  kind: "ServerChatFileCreated";
  chatId: string;
  filePath: string;
}

export interface ServerChatInitializedEvent extends BaseServerEvent {
  kind: "ServerChatInitialized";
  chatId: string;
  chatData: Chat;
}

export interface ServerChatMessageAppendedEvent extends BaseServerEvent {
  kind: "ServerChatMessageAppended";
  chatId: string;
  message: ChatMessage;
}

export interface ServerChatFileUpdatedEvent extends BaseServerEvent {
  kind: "ServerChatFileUpdated";
  chatId: string;
  filePath: string;
}

export interface ServerChatUpdatedEvent extends BaseServerEvent {
  kind: "ServerChatUpdated";
  chatId: string;
  chat: Chat;
  update: ChatUpdateData;
}

export interface ServerNewChatCreatedEvent extends BaseServerEvent {
  kind: "ServerNewChatCreated";
  chatId: string;
  chatObject: Chat;
}

export interface ServerUserChatMessagePostProcessedEvent
  extends BaseServerEvent {
  kind: "ServerUserChatMessagePostProcessed";
  chatId: string;
  messageId: string;
  processedContent: string;
  fileReferences: Array<{
    path: string;
    md5: string;
  }>;
}

export interface ServerAIResponseRequestedEvent extends BaseServerEvent {
  kind: "ServerAIResponseRequested";
  chatId: string;
  model: string;
  prompt?: string;
}

export interface ServerAIResponseGeneratedEvent extends BaseServerEvent {
  kind: "ServerAIResponseGenerated";
  chatId: string;
  response: string;
  artifacts?: Array<{
    id: string;
    type: string;
    content: string;
  }>;
}

export interface ServerAIResponsePostProcessedEvent extends BaseServerEvent {
  kind: "ServerAIResponsePostProcessed";
  chatId: string;
  messageId: string;
  processedContent: string;
}

export interface ServerFileTypeDetectedEvent extends BaseServerEvent {
  kind: "ServerFileTypeDetected";
  filePath: string;
  fileType: string;
}

export interface ServerFileOpenedEvent extends BaseServerEvent {
  kind: "ServerFileOpened";
  filePath: string;
  content: string;
  fileType: string;
}

export interface ServerChatFileOpenedEvent extends BaseServerEvent {
  kind: "ServerChatFileOpened";
  filePath: string;
  chat: Chat;
}

export interface ServerChatFileLoadedEvent extends BaseServerEvent {
  kind: "ServerChatFileLoaded";
  filePath: string;
}

export interface ServerNonChatFileOpenedEvent extends BaseServerEvent {
  kind: "ServerNonChatFileOpened";
  filePath: string;
  content: string;
  fileType: string;
}

export interface ServerArtifactFileCreatedEvent extends BaseServerEvent {
  kind: "ServerArtifactFileCreated";
  chatId: string;
  messageId: string;
  artifactId: string;
  filePath: string;
  fileType: string;
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
  error?: Error;
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
  error?: string;
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
  | ClientCreateNewChatEvent
  | ClientStartNewChatEvent
  | ClientSubmitUserChatMessageEvent
  | ClientCloneChatEvent
  | ClientBranchChatEvent
  | ClientApproveWorkEvent
  | ClientOpenFileEvent
  | ClientOpenChatFileEvent
  | ClientRequestWorkspaceFolderTreeEvent
  | ClientTestPingEvent;

export type ServerEventUnion =
  | ServerTaskCreatedEvent
  | ServerTaskFolderCreatedEvent
  | ServerTaskConfigFileCreatedEvent
  | ServerTaskInitializedEvent
  | ServerTaskLoadedEvent
  | ServerSubtaskStartedEvent
  | ServerSubtaskCompletedEvent
  | ServerSubtaskUpdatedEvent
  | ServerNextSubtaskTriggeredEvent
  | ServerChatCreatedEvent
  | ServerChatFileCreatedEvent
  | ServerChatInitializedEvent
  | ServerChatMessageAppendedEvent
  | ServerChatFileUpdatedEvent
  | ServerChatUpdatedEvent
  | ServerNewChatCreatedEvent
  | ServerUserChatMessagePostProcessedEvent
  | ServerAIResponseRequestedEvent
  | ServerAIResponseGeneratedEvent
  | ServerAIResponsePostProcessedEvent
  | ServerFileTypeDetectedEvent
  | ServerFileOpenedEvent
  | ServerChatFileOpenedEvent
  | ServerChatFileLoadedEvent
  | ServerNonChatFileOpenedEvent
  | ServerArtifactFileCreatedEvent
  | ServerFileWatcherEvent
  | ServerWorkspaceFolderTreeResponsedEvent
  | ServerTestPingEvent;

// Combined event union
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
    "ClientCreateNewChat",
    "ClientSubmitUserChatMessage",
    "ClientCloneChat",
    "ClientBranchChat",
    "ClientApproveWork",
    "ClientOpenFile",
    "ClientOpenChatFile",
  ];

  return clientCommandEvents.includes(event.kind as string);
}

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
