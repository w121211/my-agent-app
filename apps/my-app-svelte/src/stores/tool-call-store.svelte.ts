// src/stores/tool-call-store.svelte.ts

import type { 
  ToolCall, 
  ToolCallStatus,
  PendingApproval 
} from "../types/tool-call.types"

interface ToolCallState {
  toolCallsMap: Map<string, ToolCall[]>;
}

// Unified state object
export const toolCallState = $state<ToolCallState>({
  toolCallsMap: new Map(),
});

// Derived store to get tool calls for a specific message
export function getMessageToolCalls(messageId: string) {
  return $derived(toolCallState.toolCallsMap.get(messageId) || []);
}

// Derived store to get all pending approvals across all messages
export const pendingApprovals = $derived(() => {
  const allToolCalls = Array.from(toolCallState.toolCallsMap.values()).flat();
  return allToolCalls.filter((tc) => tc.status === "awaiting_approval");
});

// Derived store to check if any tool calls are executing
export const hasExecutingToolCalls = $derived(() => {
  const allToolCalls = Array.from(toolCallState.toolCallsMap.values()).flat();
  return allToolCalls.some((tc) => tc.status === "executing");
});

// Tool call operations
export const toolCallOperations = {
  // Update all tool calls for a message
  updateToolCalls(messageId: string, toolCalls: ToolCall[]) {
    toolCallState.toolCallsMap.set(messageId, toolCalls);
  },

  // Update a specific tool call's status and data
  updateToolCallStatus(
    messageId: string,
    toolCallId: string,
    status: ToolCallStatus,
    data?: Partial<ToolCall>
  ) {
    const toolCalls = toolCallState.toolCallsMap.get(messageId) || [];
    const updatedToolCalls = toolCalls.map((tc) =>
      tc.request.callId === toolCallId 
        ? { ...tc, status, ...data } 
        : tc
    );
    toolCallState.toolCallsMap.set(messageId, updatedToolCalls);
  },

  // Add live output to an executing tool call
  appendLiveOutput(messageId: string, toolCallId: string, outputChunk: string) {
    toolCallOperations.updateToolCallStatus(messageId, toolCallId, "executing", {
      liveOutput: (getCurrentLiveOutput(messageId, toolCallId) || "") + outputChunk
    });
  },

  // Remove tool calls for a message (cleanup)
  removeToolCalls(messageId: string) {
    toolCallState.toolCallsMap.delete(messageId);
  },

  // Clear all tool calls
  clearAll() {
    toolCallState.toolCallsMap.clear();
  },

  // Get summary statistics for a message
  getMessageSummary(messageId: string) {
    const toolCalls = getCurrentToolCalls(messageId);
    return {
      total: toolCalls.length,
      pending: toolCalls.filter(tc => tc.status === "awaiting_approval").length,
      executing: toolCalls.filter(tc => tc.status === "executing").length,
      completed: toolCalls.filter(tc => 
        tc.status === "success" || tc.status === "error" || tc.status === "cancelled"
      ).length,
      successful: toolCalls.filter(tc => tc.status === "success").length,
      failed: toolCalls.filter(tc => tc.status === "error").length
    };
  }
};

// Helper functions to get current values synchronously
function getCurrentToolCalls(messageId: string): ToolCall[] {
  return toolCallState.toolCallsMap.get(messageId) || [];
}

function getCurrentLiveOutput(messageId: string, toolCallId: string): string | undefined {
  const toolCalls = getCurrentToolCalls(messageId);
  const toolCall = toolCalls.find(tc => tc.request.callId === toolCallId);
  return toolCall?.liveOutput;
}