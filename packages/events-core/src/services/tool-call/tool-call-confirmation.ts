// packages/events-core/src/services/tool-call/tool-wrapper.ts

import type { Tool } from "ai";

export type ToolCallConfirmationOutcome = "yes" | "yes_always" | "no";

export class ToolConfirmationRequiredError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly input: unknown,
    message?: string,
  ) {
    super(message ?? `Tool "${toolName}" requires user confirmation`);
    this.name = "ToolConfirmationRequiredError";
  }
}

export interface ToolCallConfirmation {
  toolCallId: string;
  //   toolName: string;
  outcome: ToolCallConfirmationOutcome;
  timestamp: Date;
}

export function wrapToolWithConfirmation(
  toolName: string,
  tool: Tool,
  confirmationLogic?: (input: unknown) => Promise<boolean>,
): Tool {
  if (!confirmationLogic) {
    return tool;
  }

  return {
    ...tool,
    execute: async (input, options) => {
      const needsConfirmation = await confirmationLogic(input);
      if (needsConfirmation) {
        throw new ToolConfirmationRequiredError(toolName, input);
      }

      // If no confirmation is needed, execute the original tool
      if (tool.execute) {
        return await tool.execute(input, options);
      }

      throw new Error(`Tool "${toolName}" has no execute function`);
    },
  };
}
