import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Enums defined using Zod
export const TaskStatus = z.enum([
  "CREATED",
  "INITIALIZED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const SubtaskStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);

export const ChatStatus = z.enum(["ACTIVE", "CLOSED"]);

export const Role = z.enum(["ASSISTANT", "USER", "FUNCTION_EXECUTOR"]);

export const EventType = z.enum([
  // Task Commands
  "CREATE_TASK_COMMAND",
  "START_TASK_COMMAND",

  // Task Events
  "TASK_CREATED_EVENT",
  "TASK_FOLDER_CREATED_EVENT",
  "TASK_INITIALIZED_EVENT",
  "TASK_LOADED_EVENT",

  // Subtask Commands
  "START_SUBTASK_COMMAND",
  "COMPLETE_SUBTASK_COMMAND",

  // Subtask Events
  "SUBTASK_STARTED_EVENT",
  "SUBTASK_COMPLETED_EVENT",
  "SUBTASK_UPDATED_EVENT",
  "NEXT_SUBTASK_TRIGGERED_EVENT",

  // Chat Commands
  "START_NEW_CHAT_COMMAND",
  "SUBMIT_INITIAL_PROMPT_COMMAND",
  "USER_SUBMIT_MESSAGE_COMMAND",

  // Chat Events
  "CHAT_CREATED_EVENT",
  "CHAT_FILE_CREATED_EVENT",
  "CHAT_UPDATED_EVENT",
  "AGENT_PROCESSED_MESSAGE_EVENT",
  "AGENT_RESPONSE_GENERATED_EVENT",
  "MESSAGE_RECEIVED_EVENT",
  "MESSAGE_SAVED_TO_CHAT_FILE_EVENT",
  "USER_APPROVE_WORK_EVENT",

  // File System Events
  "FILE_SYSTEM_EVENT",

  // Test Event
  "TEST_EVENT",
]);

// Export enum types
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type SubtaskStatusType = z.infer<typeof SubtaskStatus>;
export type ChatStatusType = z.infer<typeof ChatStatus>;
export type RoleType = z.infer<typeof Role>;
export type EventTypeType = z.infer<typeof EventType>;

// Base schemas
export const TeamConfig = z.object({
  agent: Role,
  human: Role.optional(),
});

export const Subtask = z.object({
  id: z.string(),
  taskId: z.string(),
  seqNumber: z.number(),
  title: z.string(),
  status: SubtaskStatus,
  description: z.string(),
  team: TeamConfig,
  inputType: z.string(),
  outputType: z.string(),
});

export const Task = z.object({
  id: z.string(),
  seqNumber: z.number(),
  title: z.string(),
  status: TaskStatus,
  currentSubtaskId: z.string().optional(),
  subtasks: z.array(Subtask),
  folderPath: z.string().optional(),
  config: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MessageMetadata = z.object({
  subtaskId: z.string().optional(),
  taskId: z.string().optional(),
  functionCalls: z.array(z.record(z.unknown())).optional(),
  isPrompt: z.boolean().optional(),
});

export const Message = z.object({
  id: z.string(),
  role: Role,
  content: z.string(),
  timestamp: z.date(),
  metadata: MessageMetadata.optional(),
});

export const ChatMetadata = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const Chat = z.object({
  id: z.string(),
  taskId: z.string(),
  subtaskId: z.string(),
  messages: z.array(Message),
  status: ChatStatus,
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: ChatMetadata.optional(),
});

export const ChatFile = z.object({
  type: z.string(),
  chatId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  title: z.string().optional(),
  messages: z.array(Message),
});

// Base Event Schema
export const BaseEvent = z.object({
  eventType: EventType,
  timestamp: z.date(),
  correlationId: z.string().optional(),
});

// Task Event Schemas
export const CreateTaskCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.CREATE_TASK_COMMAND),
  taskName: z.string(),
  taskConfig: z.record(z.unknown()),
});

export const StartTaskCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.START_TASK_COMMAND),
  taskId: z.string(),
});

export const TaskCreatedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.TASK_CREATED_EVENT),
  taskId: z.string(),
  taskName: z.string(),
  config: z.record(z.unknown()),
});

export const TaskFolderCreatedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.TASK_FOLDER_CREATED_EVENT),
  taskId: z.string(),
  folderPath: z.string(),
});

export const TaskInitializedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.TASK_INITIALIZED_EVENT),
  taskId: z.string(),
  initialState: z.record(z.unknown()),
});

export const TaskLoadedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.TASK_LOADED_EVENT),
  taskId: z.string(),
  taskState: Task,
});

// Subtask Event Schemas
export const StartSubtaskCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.START_SUBTASK_COMMAND),
  taskId: z.string(),
  subtaskId: z.string(),
});

export const CompleteSubtaskCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.COMPLETE_SUBTASK_COMMAND),
  taskId: z.string(),
  subtaskId: z.string(),
  output: z.string(),
  requiresApproval: z.boolean(),
});

export const SubtaskStartedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.SUBTASK_STARTED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  input: z.unknown().optional(),
});

export const SubtaskCompletedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.SUBTASK_COMPLETED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
});

export const SubtaskUpdatedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.SUBTASK_UPDATED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  status: SubtaskStatus,
});

export const NextSubtaskTriggeredEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.NEXT_SUBTASK_TRIGGERED_EVENT),
  taskId: z.string(),
  currentSubtaskId: z.string(),
});

// Chat Event Schemas
export const StartNewChatCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.START_NEW_CHAT_COMMAND),
  taskId: z.string(),
  subtaskId: z.string(),
  metadata: ChatMetadata.optional(),
});

export const SubmitInitialPromptCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.SUBMIT_INITIAL_PROMPT_COMMAND),
  chatId: z.string(),
  prompt: z.string(),
});

export const UserSubmitMessageCommand = BaseEvent.extend({
  eventType: z.literal(EventType.enum.USER_SUBMIT_MESSAGE_COMMAND),
  chatId: z.string(),
  content: z.string(),
});

export const ChatCreatedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.CHAT_CREATED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  chatId: z.string(),
});

export const ChatFileCreatedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.CHAT_FILE_CREATED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  chatId: z.string(),
  filePath: z.string(),
});

export const ChatUpdatedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.CHAT_UPDATED_EVENT),
  chatId: z.string(),
  lastMessageId: z.string(),
});

export const AgentProcessedMessageEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.AGENT_PROCESSED_MESSAGE_EVENT),
  chatId: z.string(),
  messageId: z.string(),
});

export const AgentResponseGeneratedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.AGENT_RESPONSE_GENERATED_EVENT),
  chatId: z.string(),
  response: Message,
});

export const MessageReceivedEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.MESSAGE_RECEIVED_EVENT),
  chatId: z.string(),
  message: Message,
});

export const MessageSavedToChatFileEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.MESSAGE_SAVED_TO_CHAT_FILE_EVENT),
  chatId: z.string(),
  messageId: z.string(),
  filePath: z.string(),
});

export const UserApproveWorkEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.USER_APPROVE_WORK_EVENT),
  chatId: z.string(),
  approvedWork: z.string().optional(),
});

// File System Event Schemas
export const FileSystemEventData = z.object({
  eventType: z.string(),
  srcPath: z.string(),
  isDirectory: z.boolean(),
  destPath: z.string().optional(),
});

export const FileSystemEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.FILE_SYSTEM_EVENT),
  data: FileSystemEventData,
});

// Test Event Schema
export const TestEvent = BaseEvent.extend({
  eventType: z.literal(EventType.enum.TEST_EVENT),
  message: z.string(),
});

// Export inferred types
export type TeamConfigType = z.infer<typeof TeamConfig>;
export type SubtaskType = z.infer<typeof Subtask>;
export type TaskType = z.infer<typeof Task>;
export type MessageMetadataType = z.infer<typeof MessageMetadata>;
export type MessageType = z.infer<typeof Message>;
export type ChatMetadataType = z.infer<typeof ChatMetadata>;
export type ChatType = z.infer<typeof Chat>;
export type ChatFileType = z.infer<typeof ChatFile>;
export type BaseEventType = z.infer<typeof BaseEvent>;

// Utility function for generating IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Math.floor(Date.now() / 1000)}_${uuidv4().slice(0, 8)}`;
}
