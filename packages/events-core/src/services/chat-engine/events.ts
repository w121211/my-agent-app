// packages/events-core/src/services/chat-engine/events.ts

import type { BaseEvent } from "../../event-bus.js";
import type {
  ChatMessage,
  ChatMetadata,
  ChatSessionStatus,
  ChatSessionData,
} from "./chat-session-repository.js";

// Chat update event types using AI SDK native types
export type ChatUpdateType =
  | "MESSAGE_ADDED"
  | "METADATA_UPDATED"
  | "AI_RESPONSE_STARTED"
  | "AI_RESPONSE_STREAMING"
  | "AI_RESPONSE_COMPLETED"
  | "STATUS_CHANGED";

export interface ChatUpdatedEvent extends BaseEvent {
  kind: "ChatUpdatedEvent";
  chatId: string;
  updateType: ChatUpdateType;
  update: {
    message?: ChatMessage; // UIMessage<ChatMessageMetadata>
    metadata?: Partial<ChatMetadata>;
    status?: ChatSessionStatus;
    chunk?: string;
    accumulatedContent?: string;
    finalContent?: string;
  };
  chat: ChatSessionData; // Complete session data
}
