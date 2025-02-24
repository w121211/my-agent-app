import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Enums defined using Zod
export const TaskStatusSchema = z.enum([
  "CREATED",
  "INITIALIZED",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const SubtaskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const ChatStatusSchema = z.enum(["ACTIVE", "CLOSED"]);

export const RoleSchema = z.enum(["ASSISTANT", "USER", "FUNCTION_EXECUTOR"]);

export const EventTypeSchema = z.enum([
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

// Export inferred enum types
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type SubtaskStatus = z.infer<typeof SubtaskStatusSchema>;
export type ChatStatus = z.infer<typeof ChatStatusSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;

// Base schemas and their types
export const TeamConfigSchema = z.object({
  agent: RoleSchema,
  human: RoleSchema.optional(),
});
export type TeamConfig = z.infer<typeof TeamConfigSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  seqNumber: z.number(),
  title: z.string(),
  status: SubtaskStatusSchema,
  description: z.string(),
  team: TeamConfigSchema,
  inputType: z.string(),
  outputType: z.string(),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  seqNumber: z.number(),
  title: z.string(),
  status: TaskStatusSchema,
  currentSubtaskId: z.string().optional(),
  subtasks: z.array(SubtaskSchema),
  folderPath: z.string().optional(),
  config: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Task = z.infer<typeof TaskSchema>;

export const MessageMetadataSchema = z.object({
  subtaskId: z.string().optional(),
  taskId: z.string().optional(),
  functionCalls: z.array(z.record(z.unknown())).optional(),
  isPrompt: z.boolean().optional(),
});
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: RoleSchema,
  content: z.string(),
  timestamp: z.date(),
  metadata: MessageMetadataSchema.optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ChatMetadataSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;

export const ChatSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  subtaskId: z.string(),
  messages: z.array(MessageSchema),
  status: ChatStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: ChatMetadataSchema.optional(),
});
export type Chat = z.infer<typeof ChatSchema>;

export const ChatFileSchema = z.object({
  type: z.string(),
  chatId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  title: z.string().optional(),
  messages: z.array(MessageSchema),
});
export type ChatFile = z.infer<typeof ChatFileSchema>;

// Base Event Schema and Type
export const BaseEventSchema = z.object({
  eventType: EventTypeSchema,
  timestamp: z.date(),
  correlationId: z.string().optional(),
});
export type BaseEvent = z.infer<typeof BaseEventSchema>;

// Task Event Schemas and Types
export const CreateTaskCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.CREATE_TASK_COMMAND),
  taskName: z.string(),
  taskConfig: z.record(z.unknown()),
});
export type CreateTaskCommand = z.infer<typeof CreateTaskCommandSchema>;

export const StartTaskCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.START_TASK_COMMAND),
  taskId: z.string(),
});
export type StartTaskCommand = z.infer<typeof StartTaskCommandSchema>;

export const TaskCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.TASK_CREATED_EVENT),
  taskId: z.string(),
  taskName: z.string(),
  config: z.record(z.unknown()),
});
export type TaskCreatedEvent = z.infer<typeof TaskCreatedEventSchema>;

export const TaskFolderCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.TASK_FOLDER_CREATED_EVENT),
  taskId: z.string(),
  folderPath: z.string(),
});
export type TaskFolderCreatedEvent = z.infer<
  typeof TaskFolderCreatedEventSchema
>;

export const TaskInitializedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.TASK_INITIALIZED_EVENT),
  taskId: z.string(),
  initialState: z.record(z.unknown()),
});
export type TaskInitializedEvent = z.infer<typeof TaskInitializedEventSchema>;

export const TaskLoadedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.TASK_LOADED_EVENT),
  taskId: z.string(),
  taskState: TaskSchema,
});
export type TaskLoadedEvent = z.infer<typeof TaskLoadedEventSchema>;

// Subtask Event Schemas and Types
export const StartSubtaskCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.START_SUBTASK_COMMAND),
  taskId: z.string(),
  subtaskId: z.string(),
});
export type StartSubtaskCommand = z.infer<typeof StartSubtaskCommandSchema>;

export const CompleteSubtaskCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.COMPLETE_SUBTASK_COMMAND),
  taskId: z.string(),
  subtaskId: z.string(),
  output: z.string(),
  requiresApproval: z.boolean(),
});
export type CompleteSubtaskCommand = z.infer<
  typeof CompleteSubtaskCommandSchema
>;

export const SubtaskStartedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.SUBTASK_STARTED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  input: z.unknown().optional(),
});
export type SubtaskStartedEvent = z.infer<typeof SubtaskStartedEventSchema>;

export const SubtaskCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.SUBTASK_COMPLETED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
});
export type SubtaskCompletedEvent = z.infer<typeof SubtaskCompletedEventSchema>;

export const SubtaskUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.SUBTASK_UPDATED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  status: SubtaskStatusSchema,
});
export type SubtaskUpdatedEvent = z.infer<typeof SubtaskUpdatedEventSchema>;

export const NextSubtaskTriggeredEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.NEXT_SUBTASK_TRIGGERED_EVENT),
  taskId: z.string(),
  currentSubtaskId: z.string(),
});
export type NextSubtaskTriggeredEvent = z.infer<
  typeof NextSubtaskTriggeredEventSchema
>;

// Chat Event Schemas and Types
export const StartNewChatCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.START_NEW_CHAT_COMMAND),
  taskId: z.string(),
  subtaskId: z.string(),
  metadata: ChatMetadataSchema.optional(),
});
export type StartNewChatCommand = z.infer<typeof StartNewChatCommandSchema>;

export const SubmitInitialPromptCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.SUBMIT_INITIAL_PROMPT_COMMAND),
  chatId: z.string(),
  prompt: z.string(),
});
export type SubmitInitialPromptCommand = z.infer<
  typeof SubmitInitialPromptCommandSchema
>;

export const UserSubmitMessageCommandSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.USER_SUBMIT_MESSAGE_COMMAND),
  chatId: z.string(),
  content: z.string(),
});
export type UserSubmitMessageCommand = z.infer<
  typeof UserSubmitMessageCommandSchema
>;

export const ChatCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.CHAT_CREATED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  chatId: z.string(),
});
export type ChatCreatedEvent = z.infer<typeof ChatCreatedEventSchema>;

export const ChatFileCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.CHAT_FILE_CREATED_EVENT),
  taskId: z.string(),
  subtaskId: z.string(),
  chatId: z.string(),
  filePath: z.string(),
});
export type ChatFileCreatedEvent = z.infer<typeof ChatFileCreatedEventSchema>;

export const ChatUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.CHAT_UPDATED_EVENT),
  chatId: z.string(),
  lastMessageId: z.string(),
});
export type ChatUpdatedEvent = z.infer<typeof ChatUpdatedEventSchema>;

export const AgentProcessedMessageEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.AGENT_PROCESSED_MESSAGE_EVENT),
  chatId: z.string(),
  messageId: z.string(),
});
export type AgentProcessedMessageEvent = z.infer<
  typeof AgentProcessedMessageEventSchema
>;

export const AgentResponseGeneratedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.AGENT_RESPONSE_GENERATED_EVENT),
  chatId: z.string(),
  response: MessageSchema,
});
export type AgentResponseGeneratedEvent = z.infer<
  typeof AgentResponseGeneratedEventSchema
>;

export const MessageReceivedEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.MESSAGE_RECEIVED_EVENT),
  chatId: z.string(),
  message: MessageSchema,
});
export type MessageReceivedEvent = z.infer<typeof MessageReceivedEventSchema>;

export const MessageSavedToChatFileEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.MESSAGE_SAVED_TO_CHAT_FILE_EVENT),
  chatId: z.string(),
  messageId: z.string(),
  filePath: z.string(),
});
export type MessageSavedToChatFileEvent = z.infer<
  typeof MessageSavedToChatFileEventSchema
>;

export const UserApproveWorkEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.USER_APPROVE_WORK_EVENT),
  chatId: z.string(),
  approvedWork: z.string().optional(),
});
export type UserApproveWorkEvent = z.infer<typeof UserApproveWorkEventSchema>;

// File System Event Schema and Types
export const FileSystemEventDataSchema = z.object({
  eventType: z.string(),
  srcPath: z.string(),
  isDirectory: z.boolean(),
  destPath: z.string().optional(),
});
export type FileSystemEventData = z.infer<typeof FileSystemEventDataSchema>;

export const FileSystemEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.FILE_SYSTEM_EVENT),
  data: FileSystemEventDataSchema,
});
export type FileSystemEvent = z.infer<typeof FileSystemEventSchema>;

// Test Event Schema and Type
export const TestEventSchema = BaseEventSchema.extend({
  eventType: z.literal(EventTypeSchema.enum.TEST_EVENT),
  message: z.string(),
});
export type TestEvent = z.infer<typeof TestEventSchema>;

// Utility function for generating IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Math.floor(Date.now() / 1000)}_${uuidv4().slice(0, 8)}`;
}
