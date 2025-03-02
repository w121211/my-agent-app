import { EventType, EventUnion } from "../../events-core/src/types.js";

/**
 * Message types for events relay communication
 */
export enum RelayMessageType {
  // Client to server messages
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  CLIENT_EVENT = "client_event",

  // Server to client messages
  SUBSCRIBED = "subscribed",
  UNSUBSCRIBED = "unsubscribed",
  SERVER_EVENT = "server_event",

  // Error messages
  ERROR = "error",
}

/**
 * Base interface for all relay messages
 */
export interface BaseRelayMessage {
  type: RelayMessageType;
}

/**
 * Message to subscribe to specific event types
 */
export interface SubscribeMessage extends BaseRelayMessage {
  type: RelayMessageType.SUBSCRIBE;
  eventType: EventType;
}

/**
 * Message to unsubscribe from specific event types
 */
export interface UnsubscribeMessage extends BaseRelayMessage {
  type: RelayMessageType.UNSUBSCRIBE;
  eventType: EventType;
}

/**
 * Confirmation of successful subscription
 */
export interface SubscribedMessage extends BaseRelayMessage {
  type: RelayMessageType.SUBSCRIBED;
  eventType: EventType;
}

/**
 * Confirmation of successful unsubscription
 */
export interface UnsubscribedMessage extends BaseRelayMessage {
  type: RelayMessageType.UNSUBSCRIBED;
  eventType: EventType;
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
  | SubscribeMessage
  | UnsubscribeMessage
  | SubscribedMessage
  | UnsubscribedMessage
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
