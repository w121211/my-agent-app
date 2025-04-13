/**
 * Correlates requests with their responses based on correlation IDs
 */

import { Logger, ILogObj } from "tslog";
import { BaseEvent, EventKind } from "@repo/events-core/event-types";
import { RequestCorrelator, EventChannelError, EventChannelErrorCode } from "./event-channel";

interface PendingRequest<T extends BaseEvent> {
  resolve: (response: T) => void;
  reject: (error: Error) => void;
  timeoutId: number | null;
  responseEventKind: EventKind;
}

/**
 * Implements request-response correlation using unique correlation IDs
 */
export class EventRequestCorrelator implements RequestCorrelator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private logger: Logger<ILogObj>;
  private defaultTimeoutMs: number;

  constructor(options?: {
    defaultTimeoutMs?: number;
    logger?: Logger<ILogObj>;
  }) {
    this.logger = options?.logger || new Logger({ name: "EventRequestCorrelator" });
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 30000; // 30s default timeout
  }

  /**
   * Register a request and create a promise that will be resolved when the 
   * corresponding response is received
   */
  public registerRequest<TRes extends BaseEvent>(
    correlationId: string,
    responseEventKind: EventKind,
    timeoutMs?: number
  ): Promise<TRes> {
    if (this.pendingRequests.has(correlationId)) {
      throw new EventChannelError(
        EventChannelErrorCode.REQUEST_FAILED,
        `Request with correlation ID ${correlationId} already exists`
      );
    }

    return new Promise<TRes>((resolve, reject) => {
      const timeout = timeoutMs ?? this.defaultTimeoutMs;
      
      // Create timeout for this request
      const timeoutId = window.setTimeout(() => {
        this.cancelRequest(correlationId);
        reject(new EventChannelError(
          EventChannelErrorCode.REQUEST_TIMEOUT,
          `Request timed out after ${timeout}ms`
        ));
      }, timeout);
      
      // Store the pending request
      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeoutId,
        responseEventKind
      });
      
      this.logger.debug(`Registered request with correlation ID ${correlationId}, expecting response of type ${responseEventKind}`);
    });
  }

  /**
   * Resolve a pending request with the received response
   */
  public resolveRequest<TRes extends BaseEvent>(
    correlationId: string,
    response: TRes
  ): boolean {
    const pendingRequest = this.pendingRequests.get(correlationId);
    
    if (!pendingRequest) {
      this.logger.warn(`No pending request found for correlation ID ${correlationId}`);
      return false;
    }
    
    // Verify the response event kind matches what was expected
    if (pendingRequest.responseEventKind !== response.kind) {
      pendingRequest.reject(new EventChannelError(
        EventChannelErrorCode.INVALID_RESPONSE,
        `Expected response of type ${pendingRequest.responseEventKind} but received ${response.kind}`
      ));
      return false;
    }
    
    // Clean up the timeout
    if (pendingRequest.timeoutId !== null) {
      window.clearTimeout(pendingRequest.timeoutId);
    }
    
    // Resolve the promise with the response
    pendingRequest.resolve(response);
    
    // Remove the pending request
    this.pendingRequests.delete(correlationId);
    this.logger.debug(`Resolved request with correlation ID ${correlationId}`);
    
    return true;
  }

  /**
   * Cancel a pending request
   */
  public cancelRequest(correlationId: string): boolean {
    const pendingRequest = this.pendingRequests.get(correlationId);
    
    if (!pendingRequest) {
      return false;
    }
    
    // Clean up the timeout
    if (pendingRequest.timeoutId !== null) {
      window.clearTimeout(pendingRequest.timeoutId);
    }
    
    // Reject the promise
    pendingRequest.reject(new EventChannelError(
      EventChannelErrorCode.REQUEST_FAILED,
      "Request was cancelled"
    ));
    
    // Remove the pending request
    this.pendingRequests.delete(correlationId);
    this.logger.debug(`Cancelled request with correlation ID ${correlationId}`);
    
    return true;
  }

  /**
   * Cancel all pending requests (e.g., on disconnect)
   */
  public cancelAllRequests(reason?: string): void {
    this.logger.info(`Cancelling all pending requests (${this.pendingRequests.size})`, reason || "");
    
    // Create a copy of keys to avoid modifying while iterating
    const pendingIds = Array.from(this.pendingRequests.keys());
    
    for (const correlationId of pendingIds) {
      const pendingRequest = this.pendingRequests.get(correlationId);
      
      if (pendingRequest) {
        // Clean up the timeout
        if (pendingRequest.timeoutId !== null) {
          window.clearTimeout(pendingRequest.timeoutId);
        }
        
        // Reject the promise
        pendingRequest.reject(new EventChannelError(
          EventChannelErrorCode.REQUEST_FAILED,
          reason || "All requests cancelled"
        ));
        
        // Remove the pending request
        this.pendingRequests.delete(correlationId);
      }
    }
  }
}