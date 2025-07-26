// packages/events-core/src/services/chat-engine/types.ts

// Standard AI SDK types for consistency
export type MessageRole = "user" | "assistant" | "system";
export type ChatStatus = "idle" | "processing" | "waiting_confirmation" | "max_turns_reached";
export type ChatFileStatus = "ACTIVE" | "ARCHIVED"; 
export type ChatMode = "chat" | "agent";

export interface ChatModelConfig {
  provider: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
}

export interface AvailableModel {
  id: string;
  provider: string;
  modelId: string;
  displayName: string;
  capabilities: string[];
}

export interface UserInput {
  type: "user_message";
  content: string;
  attachments?: Array<{ fileName: string; content: string }>;
}

export interface ToolResults {
  type: "tool_results";
  results: Array<{ id: string; result: any }>;
}

export interface ContinueSignal {
  type: "continue";
}

export type TurnInput = UserInput | ToolResults | ContinueSignal;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  needsConfirmation: boolean;
}

export type ConversationResult =
  | { status: "complete"; content: string }
  | { status: "waiting_confirmation"; toolCalls: ToolCall[] }
  | { status: "max_turns_reached" };

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
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

export interface ChatMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
  mode?: ChatMode;
  model?: string | ChatModelConfig;
  knowledge?: string[];
  promptDraft?: string;
}

// Use ChatFileData instead of SerializableChat for clarity
export interface ChatFileData {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  status: ChatStatus;
  fileStatus: ChatFileStatus;
  currentTurn: number;
  maxTurns: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}