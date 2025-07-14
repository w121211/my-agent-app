// packages/events-core/src/chat-engine/config/types.ts

import type {
  Content,
  Part,
  FunctionCall,
  FunctionResponse,
  GenerateContentResponse,
  GenerateContentConfig,
  GenerateContentParameters,
  SchemaUnion
} from '@google/genai';

// Re-export Google types for convenience
export type {
  Content,
  Part,
  FunctionCall,
  FunctionResponse,
  GenerateContentResponse,
  GenerateContentConfig,
  GenerateContentParameters,
  SchemaUnion
} from '@google/genai';

export interface SystemConfig {
  apiKey: string;
  authType: 'oauth' | 'api-key' | 'vertex-ai';
  debugMode: boolean;
  enableTools: boolean;
  maxRetries: number;
  timeout: number;
  workingDir: string;
}

export interface ChatConfig {
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  mode: 'chat' | 'agent';
  systemPrompt?: string;
  maxTurns?: number;
  maxSessionTurns?: number;
}

export interface SessionConfig {
  correlationId: string;
  abortSignal: AbortSignal;
}