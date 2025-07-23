// packages/events-core/src/services/chat-engine/types.ts

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

export interface TurnInput {
  type: 'user_message' | 'tool_results' | 'continue';
  content?: string;
  attachments?: Array<{ fileName: string; content: string }>;
  results?: Array<{ id: string; result: any }>;
}

export interface ConversationResult {
  status: 'complete' | 'waiting_confirmation' | 'max_turns_reached';
  content?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
    needsConfirmation: boolean;
  }>;
}