export type SubtaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED"

export type ChatStatus = "ACTIVE" | "CLOSED"


/**
 * Structure representing a file system node in the folder tree
 */
export type FolderTreeNode = {
  name: string
  path: string
  isDirectory: boolean
  children?: FolderTreeNode[]
}

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


  // Tool call related
  "ClientScheduleToolCalls",
  "ClientConfirmToolCall",
  "ClientCancelToolCall",

  // TODO: These events require refactoring
  "ClientRequestWorkspaceFolderTree",
  "ClientFileTreeUpdated",
  "ClientDirectoryAdded",
  "ClientFileAdded",
  "ClientEditorReloadRequested",
  "ClientEditorUpdated",
  "ClientFileChangeIgnored",
  "ClientTaskUpdated",
  "ClientUIStateUpdated",
  "ClientOpenFile",

  // Client test events
  "ClientTestPing",
] as const

export type ClientEventKind = (typeof ClientEventKind)[number]

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


  // File related
  "ServerFileOpened",
  "ServerArtifactFileCreated",

  // System related
  "ServerFileWatcherEvent",
  "ServerWorkspaceFolderTreeResponsed",
  "ServerTestPing",

  // Tool call related
  "TOOL_REGISTERED",
  "MCP_SERVER_REGISTERED",
  "TOOL_PERMISSION_REQUEST",
  "TOOL_OUTPUT_UPDATE", 
  "TOOL_CALLS_UPDATE",
  "TOOL_CALLS_COMPLETE",
] as const

export type ServerEventKind = (typeof ServerEventKind)[number]

// Combine all event types for type definitions
// TODO:The string union type is included temporarily for development convenience
// when working with custom or dynamic event types that haven't been fully typed yet
export type EventKind = ClientEventKind | ServerEventKind | string

export interface TeamConfig {
  agent: Role
  human?: Role
}

export interface Subtask {
  id: string
  taskId: string
  seqNumber: number
  title: string
  status: SubtaskStatus
  description: string
  team: TeamConfig
  inputType: string
  outputType: string
}



export interface Artifact {
  id: string
  chatId: string
  messageId: string
  fileName: string
  filePath: string
  fileType: string
  createdAt: Date
}

export interface Artifact {
  id: string
  chatId: string
  messageId: string
  fileName: string
  filePath: string
  fileType: string
  createdAt: Date
}

/**
 * Base interface for all events
 */
export interface BaseEvent {
  kind: EventKind
  timestamp: Date
  correlationId?: string
}

/**
 * Base interface for client-originated events
 */
export interface BaseClientEvent extends BaseEvent {
  kind: ClientEventKind
}

/**
 * Base interface for server-originated events
 */
export interface BaseServerEvent extends BaseEvent {
  kind: ServerEventKind
}

// Client Command Events

export interface ClientCreateTaskEvent extends BaseClientEvent {
  kind: "ClientCreateTask"
  taskName: string
  taskConfig: Record<string, unknown>
}

export interface ClientStartTaskEvent extends BaseClientEvent {
  kind: "ClientStartTask"
  taskId: string
}

export interface ClientStopTaskEvent extends BaseClientEvent {
  kind: "ClientStopTask"
  taskId: string
}

export interface ClientStartSubtaskEvent extends BaseClientEvent {
  kind: "ClientStartSubtask"
  taskId: string
  subtaskId: string
}

export interface ClientCompleteSubtaskEvent extends BaseClientEvent {
  kind: "ClientCompleteSubtask"
  taskId: string
  subtaskId: string
  output: string
  requiresApproval: boolean
}

export interface ClientStopSubtaskEvent extends BaseClientEvent {
  kind: "ClientStopSubtask"
  taskId: string
  subtaskId: string
}

export interface ClientCloneSubtaskEvent extends BaseClientEvent {
  kind: "ClientCloneSubtask"
  taskId: string
  subtaskId: string
}


export interface ClientOpenFileEvent extends BaseClientEvent {
  kind: "ClientOpenFile"
  filePath: string
}

export interface ClientOpenFileEvent extends BaseClientEvent {
  kind: "ClientOpenFile"
  filePath: string
}

export interface ClientRequestWorkspaceFolderTreeEvent extends BaseClientEvent {
  kind: "ClientRequestWorkspaceFolderTree"
  workspacePath?: string // Optional path to specify which workspace folder to query
}

export interface ClientTestPingEvent extends BaseClientEvent {
  kind: "ClientTestPing"
  message: string
}

// Client State Update Events

export interface ClientFileTreeUpdatedEvent extends BaseClientEvent {
  kind: "ClientFileTreeUpdated"
  tree: unknown
}

export interface ClientDirectoryAddedEvent extends BaseClientEvent {
  kind: "ClientDirectoryAdded"
  path: string
}

export interface ClientFileAddedEvent extends BaseClientEvent {
  kind: "ClientFileAdded"
  path: string
  content: string
}

export interface ClientEditorReloadRequestedEvent extends BaseClientEvent {
  kind: "ClientEditorReloadRequested"
  filePath: string
}

export interface ClientEditorUpdatedEvent extends BaseClientEvent {
  kind: "ClientEditorUpdated"
  filePath: string
  content: string
}

export interface ClientFileChangeIgnoredEvent extends BaseClientEvent {
  kind: "ClientFileChangeIgnored"
  filePath: string
}


export interface ClientTaskUpdatedEvent extends BaseClientEvent {
  kind: "ClientTaskUpdated"
  task: Task
}

export interface ClientUIStateUpdatedEvent extends BaseClientEvent {
  kind: "ClientUIStateUpdated"
  state: Record<string, unknown>
}

// Server Events

export interface ServerTaskCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskCreated"
  taskId: string
  taskName: string
  config: Record<string, unknown>
}

export interface ServerTaskFolderCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskFolderCreated"
  taskId: string
  folderPath: string
}

export interface ServerTaskConfigFileCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskConfigFileCreated"
  taskId: string
  filePath: string
  config: Record<string, unknown>
}

export interface ServerTaskConfigFileCreatedEvent extends BaseServerEvent {
  kind: "ServerTaskConfigFileCreated"
  taskId: string
  filePath: string
  config: Record<string, unknown>
}

export interface ServerTaskInitializedEvent extends BaseServerEvent {
  kind: "ServerTaskInitialized"
  taskId: string
  initialState: Record<string, unknown>
}

export interface ServerTaskLoadedEvent extends BaseServerEvent {
  kind: "ServerTaskLoaded"
  taskId: string
  taskState: Task
}

export interface ServerSubtaskStartedEvent extends BaseServerEvent {
  kind: "ServerSubtaskStarted"
  taskId: string
  subtaskId: string
  input?: unknown
}

export interface ServerSubtaskCompletedEvent extends BaseServerEvent {
  kind: "ServerSubtaskCompleted"
  taskId: string
  subtaskId: string
}

export interface ServerSubtaskUpdatedEvent extends BaseServerEvent {
  kind: "ServerSubtaskUpdated"
  taskId: string
  subtaskId: string
  status: SubtaskStatus
}

export interface ServerNextSubtaskTriggeredEvent extends BaseServerEvent {
  kind: "ServerNextSubtaskTriggered"
  taskId: string
  currentSubtaskId: string
}


export interface ServerFileOpenedEvent extends BaseServerEvent {
  kind: "ServerFileOpened"
  filePath: string
  content: string
  fileType: string
}

export interface ServerArtifactFileCreatedEvent extends BaseServerEvent {
  kind: "ServerArtifactFileCreated"
  chatId: string
  messageId: string
  artifactId: string
  filePath: string
  fileType: string
}

export type ChokidarFsEventKind =
  | "add"
  | "addDir"
  | "change"
  | "unlink"
  | "unlinkDir"
  | "ready"
  | "error"

export interface ChokidarFsEventData {
  fsEventKind: ChokidarFsEventKind
  srcPath: string
  isDirectory: boolean
  error?: Error // For error events
}

export interface ServerFileWatcherEvent extends BaseServerEvent {
  kind: "ServerFileWatcherEvent"
  data: ChokidarFsEventData
}

export interface ServerWorkspaceFolderTreeResponsedEvent
  extends BaseServerEvent {
  kind: "ServerWorkspaceFolderTreeResponsed"
  workspacePath: string
  folderTree: FolderTreeNode | null
  error?: string // Optional error message if the request failed
}

export interface ServerTestPingEvent extends BaseServerEvent {
  kind: "ServerTestPing"
  message: string
}

// Tool Call Events

export interface ClientScheduleToolCallsEvent extends BaseClientEvent {
  kind: "ClientScheduleToolCalls"
  toolCallRequests: Array<{
    callId: string
    name: string
    args: Record<string, unknown>
  }>
  chatId: string
  messageId: string
}

export interface ClientConfirmToolCallEvent extends BaseClientEvent {
  kind: "ClientConfirmToolCall"
  toolCallId: string
  outcome: "approved" | "denied"
  payload?: {
    newContent?: string
    modifiedArgs?: Record<string, unknown>
  }
}

export interface ClientCancelToolCallEvent extends BaseClientEvent {
  kind: "ClientCancelToolCall"
  messageId: string
  reason?: string
}

export interface ToolRegisteredEvent extends BaseServerEvent {
  kind: "TOOL_REGISTERED"
  toolName: string
  toolType: "built-in" | "mcp"
}

export interface MCPServerRegisteredEvent extends BaseServerEvent {
  kind: "MCP_SERVER_REGISTERED"
  serverName: string
  toolCount: number
}

export interface ToolPermissionRequestEvent extends BaseServerEvent {
  kind: "TOOL_PERMISSION_REQUEST"
  messageId: string
  toolCallId: string
  confirmationDetails: {
    message: string
    dangerLevel: "low" | "medium" | "high"
    affectedResources: string[]
    previewChanges?: string
  }
}

export interface ToolOutputUpdateEvent extends BaseServerEvent {
  kind: "TOOL_OUTPUT_UPDATE"
  messageId: string
  toolCallId: string
  outputChunk: string
}

export interface ToolCallsUpdateEvent extends BaseServerEvent {
  kind: "TOOL_CALLS_UPDATE"
  messageId: string
  toolCalls: Array<{
    status: "validating" | "scheduled" | "executing" | "success" | "error" | "cancelled" | "awaiting_approval"
    request: {
      callId: string
      name: string
      args: Record<string, unknown>
    }
  }>
}

export interface ToolCallsCompleteEvent extends BaseServerEvent {
  kind: "TOOL_CALLS_COMPLETE"
  messageId: string
  completedToolCalls: Array<{
    status: "success" | "error" | "cancelled"
    request: {
      callId: string
      name: string
      args: Record<string, unknown>
    }
    response?: {
      callId: string
      result: unknown
      error: string | null
      timestamp: Date
    }
    durationMs?: number
  }>
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
  | ClientOpenFileEvent
  | ClientRequestWorkspaceFolderTreeEvent
  | ClientTestPingEvent
  | ClientFileTreeUpdatedEvent
  | ClientDirectoryAddedEvent
  | ClientFileAddedEvent
  | ClientEditorReloadRequestedEvent
  | ClientEditorUpdatedEvent
  | ClientFileChangeIgnoredEvent
  | ClientTaskUpdatedEvent
  | ClientUIStateUpdatedEvent
  | ClientScheduleToolCallsEvent
  | ClientConfirmToolCallEvent
  | ClientCancelToolCallEvent

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
  | ServerFileOpenedEvent
  | ServerArtifactFileCreatedEvent
  | ServerFileWatcherEvent
  | ServerWorkspaceFolderTreeResponsedEvent
  | ServerTestPingEvent
  | ToolRegisteredEvent
  | MCPServerRegisteredEvent
  | ToolPermissionRequestEvent
  | ToolOutputUpdateEvent
  | ToolCallsUpdateEvent
  | ToolCallsCompleteEvent

// Combined event union for backward compatibility
export type EventUnion = ClientEventUnion | ServerEventUnion

/**
 * Type guard to check if an event is of a specific kind
 */
export function isEventKind<T extends BaseEvent>(
  event: BaseEvent,
  kind: EventKind
): event is T {
  return event.kind === kind
}

/**
 * Type guard to check if an event is a client event
 */
export function isClientEvent(event: BaseEvent): event is ClientEventUnion {
  return ClientEventKind.includes(event.kind as ClientEventKind)
}

/**
 * Type guard to check if an event is a server event
 */
export function isServerEvent(event: BaseEvent): event is ServerEventUnion {
  return ServerEventKind.includes(event.kind as ServerEventKind)
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
    "ClientOpenFile",
    "ClientRunTest",
  ]

  return clientCommandEvents.includes(event.kind as string)
}

export type SyncEventHandler<T extends EventUnion> = (event: T) => void

export type AsyncEventHandler<T extends EventUnion> = (
  event: T
) => Promise<void>

export interface EntityWithId {
  id: string
  updatedAt: Date
}

export interface Repository<T extends EntityWithId> {
  findById(id: string): Promise<T | undefined>
  findAll(): Promise<T[]>
  save(entity: T): Promise<void>
  remove(id: string): Promise<void>
}

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RepositoryError"
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityId: string) {
    super(`Entity with ID ${entityId} not found`)
    this.name = "EntityNotFoundError"
  }
}

export class ConcurrencyError extends RepositoryError {
  constructor(entityId: string) {
    super(`Concurrency conflict for entity ${entityId}`)
    this.name = "ConcurrencyError"
  }
}
