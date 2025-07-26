// packages/events-core/src/services/chat-engine/types.ts

import type {
  UIMessage,
  UIMessagePart,
  LanguageModel,
  ToolCallUnion,
  ToolResultUnion,
  FinishReason,
  ToolSet,
  Provider,
  convertToModelMessages,
  ModelMessage,
} from "ai";

// Business-specific metadata for chat messages
export interface ChatMessageMetadata {
  timestamp: Date;
  subtaskId?: string;
  taskId?: string;
  fileReferences?: Array<{
    path: string;
    md5: string;
  }>;
}

// Direct use of AI SDK UIMessage with our metadata
export type ChatMessage = UIMessage<ChatMessageMetadata>;

// Business-specific session status (renamed to avoid conflict with AI SDK ChatStatus)
export type ChatSessionStatus =
  | "idle"
  | "processing"
  | "waiting_confirmation"
  | "max_turns_reached";

// Business-specific file status
export type ChatFileStatus = "ACTIVE" | "ARCHIVED";

// Business-specific chat modes
export type ChatMode = "chat" | "agent";

// Model registry for available AI models
export interface ModelRegistry {
  provider: Provider;
  availableModels: string[];
  metadata?: {
    displayName: string;
    capabilities: string[];
    defaultModel?: string;
  };
}

// Business metadata for chat sessions
export interface ChatMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
  mode?: ChatMode;
  model?: LanguageModel;
  knowledge?: string[];
  promptDraft?: string;
}

// User input abstraction for business flow
export interface UserInput {
  type: "user_message";
  content: string;
  attachments?: Array<{
    fileName: string;
    content: string;
  }>;
}

// Tool confirmation using AI SDK native types
export interface ToolConfirmation<TOOLS extends ToolSet> {
  type: "tool_results";
  results: ToolResultUnion<TOOLS>[];
}

// Continue signal for conversation flow
export interface ContinueSignal {
  type: "continue";
}

// Turn input types for conversation management
export type TurnInput<TOOLS extends ToolSet = any> =
  | UserInput
  | ToolConfirmation<TOOLS>
  | ContinueSignal;

// Conversation result using AI SDK native types
export type ConversationResult<TOOLS extends ToolSet = any> =
  | {
      status: "complete";
      content: string;
      finishReason: FinishReason;
    }
  | {
      status: "waiting_confirmation";
      toolCalls: ToolCallUnion<TOOLS>[];
    }
  | {
      status: "max_turns_reached";
    };

// File persistence structure using AI SDK native types
export interface ChatFileData {
  id: string;
  absoluteFilePath: string;

  // AI SDK native types
  messages: ChatMessage[]; // UIMessage<ChatMessageMetadata>[]
  model: LanguageModel;

  // Business-specific state
  sessionStatus: ChatSessionStatus;
  fileStatus: ChatFileStatus;
  currentTurn: number;
  maxTurns: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}
