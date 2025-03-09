import { EventUnion } from "@repo/events-core/types";

/**
 * Message types for bidirectional event relay
 */
export enum RelayMessageType {
  CLIENT_EVENT = "client_event", // Client to server events
  SERVER_EVENT = "server_event", // Server to client events
  ERROR = "error", // Error messages
}

/**
 * Base interface for all relay messages
 */
export interface BaseRelayMessage {
  type: RelayMessageType;
}

/**
 * Message containing an event from client to server
 */
export interface ClientEventMessage extends BaseRelayMessage {
  type: RelayMessageType.CLIENT_EVENT;
  event: EventUnion;
}

/**
 * Message containing an event from server to client
 */
export interface ServerEventMessage extends BaseRelayMessage {
  type: RelayMessageType.SERVER_EVENT;
  event: EventUnion;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseRelayMessage {
  type: RelayMessageType.ERROR;
  code: string;
  message: string;
}

/**
 * Union type of all possible relay messages
 */
export type RelayMessage =
  | ClientEventMessage
  | ServerEventMessage
  | ErrorMessage;

/**
 * Type guard to check if a message is of a specific type
 */
export function isMessageType<T extends RelayMessage>(
  message: RelayMessage,
  type: RelayMessageType
): message is T {
  return message.type === type;
}
