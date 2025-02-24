import { v4 as uuidv4 } from "uuid";

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

// Enums matching the Python backend
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

// Base interfaces for data models
export interface TeamConfig {
  agent: Role;
  human?: Role;
}

export interface Subtask {
  id: string;
  task_id: string;
  seq_number: number;
  title: string;
  status: SubtaskStatus;
  description: string;
  team: TeamConfig;
  input_type: string;
  output_type: string;
}

export interface Task {
  id: string;
  seq_number: number;
  title: string;
  status: TaskStatus;
  current_subtask_id?: string;
  subtasks: Subtask[];
  folder_path: string | null;
  config: Record<string, any>;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface MessageMetadata {
  subtask_id?: string;
  task_id?: string;
  function_calls?: Record<string, any>[];
  is_prompt?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string; // ISO date string
  metadata?: MessageMetadata;
}

export interface ChatMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
}

export interface Chat {
  id: string;
  task_id: string;
  subtask_id: string;
  messages: Message[];
  status: ChatStatus;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  metadata?: ChatMetadata;
}

export interface ChatFile {
  _type: string;
  chat_id: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  title?: string;
  messages: Message[];
}

// Base Event interface
export interface BaseEvent {
  event_type: EventType;
  timestamp: string; // ISO date string
  correlation_id?: string;
}

// Helper function to create base event
// export function createBaseEvent(type: EventType): BaseEvent {
//   return {
//     type,
//     timestamp: new Date().toISOString(),
//     correlation_id: uuidv4(),
//   };
// }

// Task Event Interfaces
export interface CreateTaskCommand extends BaseEvent {
  event_type: EventType.CREATE_TASK_COMMAND;
  task_name: string;
  task_config: Record<string, any>;
}

export interface StartTaskCommand extends BaseEvent {
  event_type: EventType.START_TASK_COMMAND;
  task_id: string;
}

export interface TaskCreatedEvent extends BaseEvent {
  event_type: EventType.TASK_CREATED_EVENT;
  task_id: string;
  task_name: string;
  config: Record<string, any>;
}

export interface TaskFolderCreatedEvent extends BaseEvent {
  event_type: EventType.TASK_FOLDER_CREATED_EVENT;
  task_id: string;
  folder_path: string;
}

export interface TaskInitializedEvent extends BaseEvent {
  event_type: EventType.TASK_INITIALIZED_EVENT;
  task_id: string;
  initial_state: Record<string, any>;
}

export interface TaskLoadedEvent extends BaseEvent {
  event_type: EventType.TASK_LOADED_EVENT;
  task_id: string;
  task_state: Task;
}

// Subtask Event Interfaces
export interface StartSubtaskCommand extends BaseEvent {
  event_type: EventType.START_SUBTASK_COMMAND;
  task_id: string;
  subtask_id: string;
}

export interface CompleteSubtaskCommand extends BaseEvent {
  event_type: EventType.COMPLETE_SUBTASK_COMMAND;
  task_id: string;
  subtask_id: string;
  output: string;
  requires_approval: boolean;
}

export interface SubtaskStartedEvent extends BaseEvent {
  event_type: EventType.SUBTASK_STARTED_EVENT;
  task_id: string;
  subtask_id: string;
  input?: any;
}

export interface SubtaskCompletedEvent extends BaseEvent {
  event_type: EventType.SUBTASK_COMPLETED_EVENT;
  task_id: string;
  subtask_id: string;
}

export interface SubtaskUpdatedEvent extends BaseEvent {
  event_type: EventType.SUBTASK_UPDATED_EVENT;
  task_id: string;
  subtask_id: string;
  status: SubtaskStatus;
}

export interface NextSubtaskTriggeredEvent extends BaseEvent {
  event_type: EventType.NEXT_SUBTASK_TRIGGERED_EVENT;
  task_id: string;
  current_subtask_id: string;
}

// Chat Event Interfaces
export interface StartNewChatCommand extends BaseEvent {
  event_type: EventType.START_NEW_CHAT_COMMAND;
  task_id: string;
  subtask_id: string;
  metadata?: ChatMetadata;
}

export interface SubmitInitialPromptCommand extends BaseEvent {
  event_type: EventType.SUBMIT_INITIAL_PROMPT_COMMAND;
  chat_id: string;
  prompt: string;
}

export interface UserSubmitMessageCommand extends BaseEvent {
  event_type: EventType.USER_SUBMIT_MESSAGE_COMMAND;
  chat_id: string;
  content: string;
}

export interface ChatCreatedEvent extends BaseEvent {
  event_type: EventType.CHAT_CREATED_EVENT;
  task_id: string;
  subtask_id: string;
  chat_id: string;
}

export interface ChatFileCreatedEvent extends BaseEvent {
  event_type: EventType.CHAT_FILE_CREATED_EVENT;
  task_id: string;
  subtask_id: string;
  chat_id: string;
  file_path: string;
}

export interface ChatUpdatedEvent extends BaseEvent {
  event_type: EventType.CHAT_UPDATED_EVENT;
  chat_id: string;
  last_message_id: string;
}

export interface AgentProcessedMessageEvent extends BaseEvent {
  event_type: EventType.AGENT_PROCESSED_MESSAGE_EVENT;
  chat_id: string;
  message_id: string;
}

export interface AgentResponseGeneratedEvent extends BaseEvent {
  event_type: EventType.AGENT_RESPONSE_GENERATED_EVENT;
  chat_id: string;
  response: Message;
}

export interface MessageReceivedEvent extends BaseEvent {
  event_type: EventType.MESSAGE_RECEIVED_EVENT;
  chat_id: string;
  message: Message;
}

export interface MessageSavedToChatFileEvent extends BaseEvent {
  event_type: EventType.MESSAGE_SAVED_TO_CHAT_FILE_EVENT;
  chat_id: string;
  message_id: string;
  file_path: string;
}

export interface UserApproveWorkEvent extends BaseEvent {
  event_type: EventType.USER_APPROVE_WORK_EVENT;
  chat_id: string;
  approved_work?: string;
}

// File System Events
export interface FileSystemEventData {
  event_type: string;
  src_path: string;
  is_directory: boolean;
  dest_path?: string;
}

export interface FileSystemEvent extends BaseEvent {
  event_type: EventType.FILE_SYSTEM_EVENT;
  data: FileSystemEventData;
}

// Test Event
export interface TestEvent extends BaseEvent {
  event_type: EventType.TEST_EVENT;
  message: string;
}

// Type for all possible events
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
