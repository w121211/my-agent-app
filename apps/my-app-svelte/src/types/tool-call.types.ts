// src/types/tool-call.types.ts

export type ToolCallStatus =
  | "validating"
  | "scheduled"
  | "executing"
  | "success"
  | "error" 
  | "cancelled"
  | "awaiting_approval"

export type ToolConfirmationOutcome = "approved" | "denied" | "cancelled"

export interface ToolCallRequestInfo {
  callId: string
  name: string
  args: Record<string, unknown>
}

export interface ToolCallResponseInfo {
  callId: string
  result: unknown
  error: string | null
  timestamp: Date
}

export interface ToolCallConfirmationDetails {
  message: string
  dangerLevel: "low" | "medium" | "high"
  affectedResources: string[]
  previewChanges?: string
}

export interface ToolConfirmationPayload {
  newContent?: string
  modifiedArgs?: Record<string, unknown>
}

export interface ToolCall {
  status: ToolCallStatus
  request: ToolCallRequestInfo
  startTime?: number
  outcome?: ToolConfirmationOutcome
  liveOutput?: string
  response?: ToolCallResponseInfo
  durationMs?: number
  confirmationDetails?: ToolCallConfirmationDetails
}

export interface ToolMetadata {
  name: string
  description: string
  category: string
}

// API Request/Response types matching backend tRPC schema
export interface ScheduleToolCallsRequest {
  requests: ToolCallRequestInfo[]
  chatId: string
  messageId: string
  correlationId?: string
}

export interface ScheduleToolCallsResponse {
  success: boolean
  messageId: string
  completedToolCalls: {
    status: ToolCallStatus
    request: ToolCallRequestInfo
    response: ToolCallResponseInfo
    durationMs?: number
  }[]
}

export interface ConfirmToolCallRequest {
  toolCallId: string
  outcome: "approved" | "denied"
  payload?: ToolConfirmationPayload
  correlationId?: string
}

export interface ConfirmToolCallResponse {
  success: boolean
  toolCallId: string
  outcome: string
}

export interface GetToolCallsResponse {
  messageId: string
  toolCalls: ToolCall[]
  completedCalls: {
    status: ToolCallStatus
    request: ToolCallRequestInfo
    response: ToolCallResponseInfo
    durationMs?: number
  }[]
}

export interface PendingApproval {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  confirmationDetails: Omit<ToolCallConfirmationDetails, 'onConfirm'>
}

export interface GetPendingApprovalsResponse {
  pendingApprovals: PendingApproval[]
}

export interface ListToolsResponse {
  tools: {
    name: string
    description: string
    metadata: ToolMetadata
  }[]
}

// Events for tool call updates
export interface ToolCallEvent {
  type: string
  messageId: string
  timestamp: Date
}

export interface ToolCallsUpdateEvent extends ToolCallEvent {
  type: "TOOL_CALLS_UPDATE"
  toolCalls: ToolCall[]
}

export interface ToolPermissionRequestEvent extends ToolCallEvent {
  type: "TOOL_PERMISSION_REQUEST"
  toolCallId: string
  confirmationDetails: ToolCallConfirmationDetails
}

export interface ToolOutputUpdateEvent extends ToolCallEvent {
  type: "TOOL_OUTPUT_UPDATE"
  toolCallId: string
  outputChunk: string
}

export interface ToolCallsCompleteEvent extends ToolCallEvent {
  type: "TOOL_CALLS_COMPLETE"
  completedToolCalls: ToolCall[]
}

export type ToolEvent = 
  | ToolCallsUpdateEvent
  | ToolPermissionRequestEvent
  | ToolOutputUpdateEvent
  | ToolCallsCompleteEvent