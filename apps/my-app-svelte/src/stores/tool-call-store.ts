// src/stores/tool-call-store.ts

import { writable, derived, type Writable } from "svelte/store"
import type { 
  ToolCall, 
  ToolCallStatus,
  PendingApproval 
} from "../types/tool-call.types"

// Main tool calls map: messageId -> ToolCall[]
export const toolCallsMap: Writable<Map<string, ToolCall[]>> = writable(new Map())

// Derived store to get tool calls for a specific message
export function getMessageToolCalls(messageId: string) {
  return derived(
    toolCallsMap,
    ($toolCallsMap) => $toolCallsMap.get(messageId) || []
  )
}

// Derived store to get all pending approvals across all messages
export const pendingApprovals = derived(toolCallsMap, ($toolCallsMap) => {
  const allToolCalls = Array.from($toolCallsMap.values()).flat()
  return allToolCalls.filter((tc) => tc.status === "awaiting_approval")
})

// Derived store to check if any tool calls are executing
export const hasExecutingToolCalls = derived(toolCallsMap, ($toolCallsMap) => {
  const allToolCalls = Array.from($toolCallsMap.values()).flat()
  return allToolCalls.some((tc) => tc.status === "executing")
})

// Tool call operations
export const toolCallOperations = {
  // Update all tool calls for a message
  updateToolCalls(messageId: string, toolCalls: ToolCall[]) {
    toolCallsMap.update((map) => {
      const newMap = new Map(map)
      newMap.set(messageId, toolCalls)
      return newMap
    })
  },

  // Update a specific tool call's status and data
  updateToolCallStatus(
    messageId: string,
    toolCallId: string,
    status: ToolCallStatus,
    data?: Partial<ToolCall>
  ) {
    toolCallsMap.update((map) => {
      const newMap = new Map(map)
      const toolCalls = newMap.get(messageId) || []
      const updatedToolCalls = toolCalls.map((tc) =>
        tc.request.callId === toolCallId 
          ? { ...tc, status, ...data } 
          : tc
      )
      newMap.set(messageId, updatedToolCalls)
      return newMap
    })
  },

  // Add live output to an executing tool call
  appendLiveOutput(messageId: string, toolCallId: string, outputChunk: string) {
    toolCallOperations.updateToolCallStatus(messageId, toolCallId, "executing", {
      liveOutput: (getCurrentLiveOutput(messageId, toolCallId) || "") + outputChunk
    })
  },

  // Remove tool calls for a message (cleanup)
  removeToolCalls(messageId: string) {
    toolCallsMap.update((map) => {
      const newMap = new Map(map)
      newMap.delete(messageId)
      return newMap
    })
  },

  // Clear all tool calls
  clearAll() {
    toolCallsMap.set(new Map())
  },

  // Get summary statistics for a message
  getMessageSummary(messageId: string) {
    const toolCalls = getCurrentToolCalls(messageId)
    return {
      total: toolCalls.length,
      pending: toolCalls.filter(tc => tc.status === "awaiting_approval").length,
      executing: toolCalls.filter(tc => tc.status === "executing").length,
      completed: toolCalls.filter(tc => 
        tc.status === "success" || tc.status === "error" || tc.status === "cancelled"
      ).length,
      successful: toolCalls.filter(tc => tc.status === "success").length,
      failed: toolCalls.filter(tc => tc.status === "error").length
    }
  }
}

// Helper functions to get current values synchronously
function getCurrentToolCalls(messageId: string): ToolCall[] {
  let currentToolCalls: ToolCall[] = []
  toolCallsMap.subscribe(map => {
    currentToolCalls = map.get(messageId) || []
  })()
  return currentToolCalls
}

function getCurrentLiveOutput(messageId: string, toolCallId: string): string | undefined {
  const toolCalls = getCurrentToolCalls(messageId)
  const toolCall = toolCalls.find(tc => tc.request.callId === toolCallId)
  return toolCall?.liveOutput
}