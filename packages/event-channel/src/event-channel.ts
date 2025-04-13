/**
 * Core interfaces for event communication system
 */

import { Logger, ILogObj } from "tslog";
import { BaseEvent, EventKind } from "@repo/events-core/event-types";

/**
 * Error codes for event channel operations
 */
export enum EventChannelErrorCode {
  CONNECTION_ERROR = "CONNECTION_ERROR",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
  REQUEST_FAILED = "REQUEST_FAILED",
  INVALID_RESPONSE = "INVALID_RESPONSE"
}

/**
 * Custom error type for event channel operations
 */
export class EventChannelError extends Error {
  constructor(
    public code: EventChannelErrorCode,
    message: string
  ) {
    super(message);
    this.name = "EventChannelError";
  }
}

/**
 * Core event channel interface for bidirectional communication
 */
export interface EventChannel {
  // For events that don't need a response
  sendEvent<T extends BaseEvent>(event: T): Promise<void>;
  
  // For events that need a response (returns a Promise)
  sendRequest<TReq extends BaseEvent, TRes extends BaseEvent>(
    requestEvent: TReq,
    responseEventKind: EventKind, 
    timeoutMs?: number
  ): Promise<TRes>;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Connection status
  onConnectionStatusChange(handler: (isConnected: boolean) => void): () => void;
  isConnected(): boolean;
}

/**
 * Connection manager interface for handling WebSocket connections
 */
export interface ConnectionManager {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  onStatusChange(handler: (isConnected: boolean) => void): () => void;
}

/**
 * Request correlator for matching requests with responses
 */
export interface RequestCorrelator {
  registerRequest<TRes extends BaseEvent>(
    correlationId: string,
    responseEventKind: EventKind,
    timeoutMs?: number
  ): Promise<TRes>;
  
  resolveRequest<TRes extends BaseEvent>(
    correlationId: string, 
    response: TRes
  ): boolean;
  
  cancelRequest(correlationId: string): boolean;
  
  cancelAllRequests(reason?: string): void;
}