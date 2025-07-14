// packages/events-core/src/chat-engine/events/types.ts

export interface ThoughtSummary {
  subject: string;
  description: string;
}

export interface ToolCallInfo {
  callId: string;
  name: string;
  args: Record<string, unknown>;
  isClientInitiated: boolean;
}

export interface ChatCompressionInfo {
  originalTokens: number;
  newTokens: number;
  compressionRatio: number;
}

export interface ErrorInfo {
  error: Error;
  isRetryable: boolean;
}

export interface MaxSessionTurnsInfo {
  sessionTurns: number;
  maxSessionTurns: number;
}

export type ChatStreamEvent =
  | { type: 'content'; value: string }
  | { type: 'thought'; value: ThoughtSummary }
  | { type: 'tool_call_request'; value: ToolCallInfo }
  | { type: 'error'; value: ErrorInfo }
  | { type: 'user_cancelled' }
  | { type: 'max_session_turns_reached'; value: MaxSessionTurnsInfo }
  | { type: 'chat_compressed'; value: ChatCompressionInfo };