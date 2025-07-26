// packages/events-core/src/services/tool-call/types.ts

import type { IEventBus } from "../../event-bus.js";
import type { Logger, ILogObj } from "tslog";

export type ToolCallStatus =
  | "validating"
  | "scheduled"
  | "executing"
  | "success"
  | "error"
  | "cancelled"
  | "awaiting_approval";

export type ToolConfirmationOutcome = "approved" | "denied" | "cancelled";

export interface ToolCallRequestInfo {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolCallResponseInfo {
  callId: string;
  result: unknown;
  error: string | null;
  timestamp: Date;
}

export interface ToolCallConfirmationDetails {
  message: string;
  dangerLevel: "low" | "medium" | "high";
  affectedResources: string[];
  previewChanges?: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}

export interface ToolConfirmationPayload {
  newContent?: string;
  modifiedArgs?: Record<string, unknown>;
}

export type ValidatingToolCall = {
  status: "validating";
  request: ToolCallRequestInfo;
  tool: Tool;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ScheduledToolCall = {
  status: "scheduled";
  request: ToolCallRequestInfo;
  tool: Tool;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ErroredToolCall = {
  status: "error";
  request: ToolCallRequestInfo;
  response: ToolCallResponseInfo;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
};

export type SuccessfulToolCall = {
  status: "success";
  request: ToolCallRequestInfo;
  tool: Tool;
  response: ToolCallResponseInfo;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ExecutingToolCall = {
  status: "executing";
  request: ToolCallRequestInfo;
  tool: Tool;
  liveOutput?: string;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type CancelledToolCall = {
  status: "cancelled";
  request: ToolCallRequestInfo;
  response: ToolCallResponseInfo;
  tool: Tool;
  durationMs?: number;
  outcome?: ToolConfirmationOutcome;
};

export type WaitingToolCall = {
  status: "awaiting_approval";
  request: ToolCallRequestInfo;
  tool: Tool;
  confirmationDetails: ToolCallConfirmationDetails;
  startTime?: number;
  outcome?: ToolConfirmationOutcome;
};

export type ToolCall =
  | ValidatingToolCall
  | ScheduledToolCall
  | ErroredToolCall
  | SuccessfulToolCall
  | ExecutingToolCall
  | CancelledToolCall
  | WaitingToolCall;

export type CompletedToolCall =
  | SuccessfulToolCall
  | CancelledToolCall
  | ErroredToolCall;

export interface ExecutionContext {
  chatId: string;
  messageId: string;
  projectPath?: string;
  userId?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: unknown;

  shouldConfirmExecute(
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | null>;

  execute(
    args: Record<string, unknown>,
    options: {
      signal?: AbortSignal;
      onOutput?: (chunk: string) => void;
      context?: ExecutionContext;
    },
  ): Promise<unknown>;

  getMetadata(): ToolMetadata;
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  inputSchema: unknown;
}

export interface ToolHealthReport {
  totalTools: number;
  healthyTools: number;
  unhealthyTools: number;
  mcpServers: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
  details: Map<
    string,
    { status: string; metadata?: ToolMetadata; error?: string }
  >;
}

export enum ApprovalMode {
  DEFAULT = "default",
  YOLO = "yolo",
}

export interface ChatContext {
  chatId: string;
  messageId: string;
  projectPath?: string;
}

export type ConfirmHandler = (
  toolCall: WaitingToolCall,
) => Promise<ToolConfirmationOutcome>;

export type OutputUpdateHandler = (
  toolCallId: string,
  outputChunk: string,
) => void;

export type AllToolCallsCompleteHandler = (
  completedToolCalls: CompletedToolCall[],
) => void;

export type ToolCallsUpdateHandler = (toolCalls: ToolCall[]) => void;

// MCP related types
export interface MCPServerConfig {
  name: string;
  url: string;
  enabled: boolean;
  category?: string;
  oauth?: {
    enabled: boolean;
    clientId?: string;
    authUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
  };
}

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema: unknown;
}

export interface MCPClient {
  listTools(): Promise<MCPToolInfo[]>;
  listResources(): Promise<unknown[]>;
  listPrompts(): Promise<unknown[]>;
  callTool(
    name: string,
    args: Record<string, unknown>,
    options?: {
      signal?: AbortSignal;
      onProgress?: (chunk: string) => void;
    },
  ): Promise<unknown>;
  authenticate(token: string): Promise<void>;
  ping(): Promise<void>;
}

export interface ToolCallSchedulerOptions {
  toolRegistry: Promise<ToolRegistry>;
  outputUpdateHandler?: OutputUpdateHandler;
  onAllToolCallsComplete?: AllToolCallsCompleteHandler;
  onToolCallsUpdate?: ToolCallsUpdateHandler;
  approvalMode?: ApprovalMode;
  eventBus: IEventBus;
  logger: Logger<ILogObj>;
}

export interface ToolRegistry {
  registerTool(tool: Tool): void;
  registerMCPServer(serverConfig: MCPServerConfig): Promise<void>;
  getTool(name: string): Tool | undefined;
  getAllTools(): Tool[];
  getToolsByCategory(category: string): Tool[];
  checkToolHealth(): Promise<ToolHealthReport>;
}
