import type {
  ToolCallUnion,
  ToolErrorUnion,
  ToolResultUnion,
  ToolSet,
  ModelMessage,
} from "ai";
import type { IEventBus } from "../../event-bus.js";
import type { ToolCallConfirmation } from "./tool-call-confirmation.js";
import type { ToolRegistry } from "./tool-registry.js";

export interface ToolAlwaysAllowRule {
  toolName: string;
  sourceConfirmation: ToolCallConfirmation;
}

export type ToolExecutionStatus =
  | "awaiting_approval"
  | "scheduled"
  | "executed"
  | "failed"
  | "denied";

export interface ToolCallWithStatus<TOOLS extends ToolSet> {
  toolCall: ToolCallUnion<TOOLS>;
  status: ToolExecutionStatus;
  result?: ToolResultUnion<TOOLS>;
}

export type ToolExecutionResult<TOOLS extends ToolSet> =
  | {
      status: "awaiting_confirmations";
      toolCallsAwaitingConfirmation: Array<ToolCallUnion<TOOLS>>;
    }
  | {
      status: "completed";
      executed: Array<ToolResultUnion<TOOLS>>;
      failed?: Array<ToolErrorUnion<TOOLS>>;
    };

export interface ToolExecutionContext {
  chatSessionId: string;
  // All historical messages for the conversation
  messages: Array<ModelMessage>;
}

export class ToolCallRunner<TOOLS extends ToolSet> {
  constructor(
    public readonly toolRegistry: ToolRegistry,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(
    toolCalls: ToolCallUnion<TOOLS>[],
    confirmations: ToolCallConfirmation[],
    alwaysAllowRules: ToolAlwaysAllowRule[],
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<TOOLS>> {
    const toolsWithStatus = await this.initializeToolCallStatuses(
      toolCalls,
      confirmations,
      alwaysAllowRules,
    );

    const allDecided = toolsWithStatus.every(
      (t) => t.status !== "awaiting_approval",
    );

    if (!allDecided) {
      // There are still tools awaiting confirmation
      return {
        status: "awaiting_confirmations",
        toolCallsAwaitingConfirmation: toolsWithStatus
          .filter((t) => t.status === "awaiting_approval")
          .map((t) => t.toolCall),
      };
    }

    // All tools are either scheduled or denied, we can execute them
    const executed: Array<ToolResultUnion<TOOLS>> = [];
    const failed: Array<ToolErrorUnion<TOOLS>> = [];

    // Execute all scheduled tools in parallel
    const scheduledTools = toolsWithStatus.filter(
      (t) => t.status === "scheduled",
    );

    await Promise.all(
      scheduledTools.map(async ({ toolCall }) => {
        const result = await this.executeToolDirectly(toolCall, context);
        if (result.type === "tool-result") {
          executed.push(result);
        } else {
          failed.push(result);
        }
      }),
    );

    return {
      status: "completed",
      executed,
      failed: failed.length > 0 ? failed : undefined,
    };
  }

  private async initializeToolCallStatuses(
    toolCalls: ToolCallUnion<TOOLS>[],
    confirmations: ToolCallConfirmation[],
    alwaysAllowRules: ToolAlwaysAllowRule[],
  ): Promise<ToolCallWithStatus<TOOLS>[]> {
    return Promise.all(
      toolCalls.map(async (toolCall) => {
        // 1. Check confirmation record
        const directConfirmation = confirmations.find(
          (c) => c.toolCallId === toolCall.toolCallId,
        );
        if (directConfirmation) {
          return {
            toolCall,
            status:
              directConfirmation.outcome === "no" ? "denied" : "scheduled",
          };
        }

        // 2. Check always allow rule (by toolName)
        const hasAlwaysAllow = alwaysAllowRules.some(
          (rule) => rule.toolName === toolCall.toolName,
        );
        if (hasAlwaysAllow) {
          return { toolCall, status: "scheduled" };
        }

        // 3. Check if confirmation is needed (works for both built-in and MCP tools)
        const metadata = this.toolRegistry.getToolMetadata(toolCall.toolName);
        const needsConfirmation = metadata?.confirmationLogic
          ? await metadata.confirmationLogic(toolCall.input)
          : false;
        return {
          toolCall,
          status: needsConfirmation ? "awaiting_approval" : "scheduled",
        };
      }),
    );
  }

  private async executeToolDirectly(
    toolCall: ToolCallUnion<TOOLS>,
    context: ToolExecutionContext,
  ): Promise<ToolResultUnion<TOOLS> | ToolErrorUnion<TOOLS>> {
    let tool = this.toolRegistry.getTool(toolCall.toolName);

    if (tool === undefined) {
      tool = this.toolRegistry.getMCPTool(toolCall.toolName);
    }

    if (tool === undefined) {
      throw new Error(`Tool "${toolCall.toolName}" not found`);
    }

    if (!tool.execute) {
      throw new Error(
        `Tool "${toolCall.toolName}" does not have an execute function`,
      );
    }

    try {
      const result = await tool.execute(toolCall.input, {
        toolCallId: toolCall.toolCallId,
        messages: context.messages,
      });

      const toolResult: ToolResultUnion<TOOLS> = {
        type: "tool-result",
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: toolCall.input,
        output: result,
      };

      return toolResult;
    } catch (error) {
      const toolError: ToolErrorUnion<TOOLS> = {
        type: "tool-error",
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: toolCall.input,
        error,
      };

      return toolError;
    }
  }
}
