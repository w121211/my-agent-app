// packages/events-core/src/services/chat-engine/events.ts
import type { BaseEvent } from "../../event-bus.js";
import type { ChatMessage, ChatMetadata, SerializableChat, ChatStatus } from "./chat-session.js";

// Updated event types
export type ChatUpdateType =
  | "MESSAGE_ADDED"
  | "METADATA_UPDATED"
  | "AI_RESPONSE_ADDED"
  | "STATUS_CHANGED";

export interface ChatUpdatedEvent extends BaseEvent {
  kind: "ChatUpdatedEvent";
  chatId: string;
  updateType: ChatUpdateType;
  update: {
    message?: ChatMessage;
    metadata?: Partial<ChatMetadata>;
    status?: ChatStatus;
  };
  chat: SerializableChat;
}