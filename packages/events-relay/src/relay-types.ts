import {
  ClientEventUnion,
  ServerEventUnion,
} from "@repo/events-core/event-types";

/**
 * Message types for bidirectional event relay
 */
export const RelayMessageKind = [
  "CLIENT_EVENT", // Client to server events
  "SERVER_EVENT", // Server to client events
  "ERROR", // Error messages
] as const;

export type RelayMessageKind = (typeof RelayMessageKind)[number];

/**
 * Base interface for all relay messages
 */
export interface BaseRelayMessage {
  kind: RelayMessageKind;
}

/**
 * Message containing an event from client to server
 */
export interface ClientEventRelayMessage extends BaseRelayMessage {
  kind: "CLIENT_EVENT";
  event: ClientEventUnion;
}

/**
 * Message containing an event from server to client
 */
export interface ServerEventRelayMessage extends BaseRelayMessage {
  kind: "SERVER_EVENT";
  event: ServerEventUnion;
}

/**
 * Error message
 */
export interface ErrorRelayMessage extends BaseRelayMessage {
  kind: "ERROR";
  code: string;
  message: string;
}

/**
 * Union type of all possible relay messages
 */
export type RelayMessage =
  | ClientEventRelayMessage
  | ServerEventRelayMessage
  | ErrorRelayMessage;

/**
 * Type guard to check if a message is of a specific kind
 */
export function isMessageType<T extends RelayMessage>(
  message: RelayMessage,
  kind: RelayMessageKind
): message is T {
  return message.kind === kind;
}
