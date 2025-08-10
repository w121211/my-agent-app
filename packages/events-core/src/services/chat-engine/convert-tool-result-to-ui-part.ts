// import { ToolResult } from '@ai-sdk/provider-utils';
// import { ToolUIPart, UITools } from 'ai/ui';
// import { ProviderMetadata } from 'ai/types';
import type {
  ToolSet,
  ToolCallUnion,
  StreamTextResult,
  UserModelMessage,
  ToolModelMessage,
  ToolResultUnion,
  ToolUIPart,
} from "ai";

export function convertToolResultToUIPart<
  // NAME extends string,
  // INPUT,
  // OUTPUT,
  // TOOLS extends UITools = UITools,
  TOOLS extends ToolSet = ToolSet,
>(
  toolResult: ToolResult<NAME, INPUT, OUTPUT>,
  options?: {
    providerExecuted?: boolean;
    callProviderMetadata?: ProviderMetadata;
  },
): ToolUIPart<TOOLS> {
  return {
    type: `tool-${toolResult.toolName}` as `tool-${keyof TOOLS & string}`,
    toolCallId: toolResult.toolCallId,
    state: "output-available",
    input: toolResult.input,
    output: toolResult.output,
    providerExecuted: options?.providerExecuted ?? true,
    callProviderMetadata: options?.callProviderMetadata,
  } as ToolUIPart<TOOLS>;
}

/**
 * Converts a ToolResult to a ToolUIPart with 'output-error' state.
 *
 * @param toolResult - The ToolResult that failed
 * @param errorText - The error message
 * @param options - Optional configuration
 * @returns A ToolUIPart with error state
 */
export function convertToolResultToErrorUIPart<
  NAME extends string,
  INPUT,
  OUTPUT,
  TOOLS extends UITools = UITools,
>(
  toolResult: Pick<
    ToolResult<NAME, INPUT, OUTPUT>,
    "toolCallId" | "toolName" | "input"
  >,
  errorText: string,
  options?: {
    providerExecuted?: boolean;
    callProviderMetadata?: ProviderMetadata;
  },
): ToolUIPart<TOOLS> {
  return {
    type: `tool-${toolResult.toolName}` as `tool-${keyof TOOLS & string}`,
    toolCallId: toolResult.toolCallId,
    state: "output-error",
    input: toolResult.input,
    errorText,
    providerExecuted: options?.providerExecuted ?? true,
    callProviderMetadata: options?.callProviderMetadata,
  } as ToolUIPart<TOOLS>;
}

/**
 * Converts a partial tool input to a ToolUIPart with 'input-available' state.
 * Useful when you have tool input but haven't executed the tool yet.
 *
 * @param toolName - The name of the tool
 * @param toolCallId - The tool call ID
 * @param input - The tool input
 * @param options - Optional configuration
 * @returns A ToolUIPart with input-available state
 */
export function convertToolInputToUIPart<
  NAME extends string,
  INPUT,
  TOOLS extends UITools = UITools,
>(
  toolName: NAME,
  toolCallId: string,
  input: INPUT,
  options?: {
    providerExecuted?: boolean;
    callProviderMetadata?: ProviderMetadata;
  },
): ToolUIPart<TOOLS> {
  return {
    type: `tool-${toolName}` as `tool-${keyof TOOLS & string}`,
    toolCallId,
    state: "input-available",
    input,
    providerExecuted: options?.providerExecuted ?? false,
    callProviderMetadata: options?.callProviderMetadata,
  } as ToolUIPart<TOOLS>;
}

/**
 * Batch converts multiple ToolResults to ToolUIParts.
 *
 * @param toolResults - Array of ToolResults to convert
 * @param options - Optional configuration applied to all conversions
 * @returns Array of ToolUIParts
 */
export function convertToolResultsToUIParts<TOOLS extends UITools = UITools>(
  toolResults: ToolResult<string, unknown, unknown>[],
  options?: {
    providerExecuted?: boolean;
    callProviderMetadata?: ProviderMetadata;
  },
): ToolUIPart<TOOLS>[] {
  return toolResults.map((result) =>
    convertToolResultToUIPart(result, options),
  );
}
