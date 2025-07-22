// src/services/tool-call-service.ts

import { Logger } from "tslog"
import { trpcClient } from "../lib/trpc-client"
import { toolCallOperations } from "../stores/tool-call-store"
import type { 
  ToolCallRequestInfo, 
  ScheduleToolCallsRequest,
  ConfirmToolCallRequest,
  ToolCall,
  ToolEvent
} from "../types/tool-call.types"

class ToolCallService {
  private logger = new Logger({ name: "ToolCallService" })

  // Schedule tool calls for execution
  async scheduleToolCalls(
    requests: ToolCallRequestInfo[],
    chatId: string,
    messageId: string,
    correlationId?: string
  ) {
    try {
      this.logger.info("Scheduling tool calls:", { 
        requestCount: requests.length, 
        chatId, 
        messageId 
      })

      const input: ScheduleToolCallsRequest = {
        requests,
        chatId,
        messageId,
        correlationId
      }

      const result = await trpcClient.toolCall.schedule.mutate(input)

      this.logger.info("Tool calls scheduled successfully:", {
        messageId: result.messageId,
        completedCount: result.completedToolCalls.length
      })

      return result
    } catch (error) {
      this.logger.error("Failed to schedule tool calls:", error)
      throw error
    }
  }

  // Confirm or deny a tool call that requires approval
  async confirmToolCall(
    toolCallId: string,
    outcome: "approved" | "denied",
    payload?: { newContent?: string; modifiedArgs?: Record<string, unknown> },
    correlationId?: string
  ) {
    try {
      this.logger.info("Confirming tool call:", { toolCallId, outcome })

      const input: ConfirmToolCallRequest = {
        toolCallId,
        outcome,
        payload,
        correlationId
      }

      const result = await trpcClient.toolCall.confirm.mutate(input)

      this.logger.info("Tool call confirmation processed:", {
        toolCallId: result.toolCallId,
        outcome: result.outcome
      })

      return result
    } catch (error) {
      this.logger.error("Failed to confirm tool call:", error)
      throw error
    }
  }

  // Cancel all tool calls for a message
  async cancelToolCalls(
    messageId: string,
    reason = "Cancelled by user",
    correlationId?: string
  ) {
    try {
      this.logger.info("Cancelling tool calls:", { messageId, reason })

      const result = await trpcClient.toolCall.cancel.mutate({
        messageId,
        reason,
        correlationId
      })

      this.logger.info("Tool calls cancelled:", {
        messageId: result.messageId
      })

      return result
    } catch (error) {
      this.logger.error("Failed to cancel tool calls:", error)
      throw error
    }
  }

  // Get tool calls for a specific message
  async getToolCalls(messageId: string, correlationId?: string) {
    try {
      this.logger.info("Fetching tool calls:", { messageId })

      const result = await trpcClient.toolCall.getToolCalls.query({
        messageId,
        correlationId
      })

      this.logger.info("Tool calls fetched:", {
        messageId: result.messageId,
        toolCallCount: result.toolCalls.length,
        completedCount: result.completedCalls.length
      })

      // Update the store with the fetched tool calls
      toolCallOperations.updateToolCalls(messageId, result.toolCalls)

      return result
    } catch (error) {
      this.logger.error("Failed to fetch tool calls:", error)
      throw error
    }
  }

  // Get pending approvals across all tool calls
  async getPendingApprovals(correlationId?: string) {
    try {
      this.logger.info("Fetching pending approvals")

      const result = await trpcClient.toolCall.getPendingApprovals.query({
        correlationId
      })

      this.logger.info("Pending approvals fetched:", {
        pendingCount: result.pendingApprovals.length
      })

      return result
    } catch (error) {
      this.logger.error("Failed to fetch pending approvals:", error)
      throw error
    }
  }

  // List available tools
  async listTools(category?: string, correlationId?: string) {
    try {
      this.logger.info("Listing available tools:", { category })

      const result = await trpcClient.toolCall.listTools.query({
        category,
        correlationId
      })

      this.logger.info("Tools listed:", {
        toolCount: result.tools.length
      })

      return result
    } catch (error) {
      this.logger.error("Failed to list tools:", error)
      throw error
    }
  }

  // Register an MCP server
  async registerMCPServer(
    serverConfig: {
      name: string
      url: string
      enabled: boolean
      category?: string
      oauth?: {
        enabled: boolean
        clientId?: string
        authUrl?: string
        tokenUrl?: string
        scopes?: string[]
      }
    },
    correlationId?: string
  ) {
    try {
      this.logger.info("Registering MCP server:", { serverName: serverConfig.name })

      const result = await trpcClient.toolCall.registerMCPServer.mutate({
        serverConfig,
        correlationId
      })

      this.logger.info("MCP server registered:", {
        serverName: result.serverName
      })

      return result
    } catch (error) {
      this.logger.error("Failed to register MCP server:", error)
      throw error
    }
  }

  // Get tool registry health status
  async getToolRegistryHealth(correlationId?: string) {
    try {
      this.logger.info("Checking tool registry health")

      const result = await trpcClient.toolCall.getHealth.query({
        correlationId
      })

      this.logger.info("Tool registry health checked:", {
        totalTools: result.totalTools,
        healthyTools: result.healthyTools,
        unhealthyTools: result.unhealthyTools
      })

      return result
    } catch (error) {
      this.logger.error("Failed to check tool registry health:", error)
      throw error
    }
  }

  // Handle tool call events (for real-time updates)
  handleToolEvent(event: ToolEvent) {
    this.logger.debug("Handling tool event:", { type: event.type, messageId: event.messageId })

    switch (event.type) {
      case "TOOL_CALLS_UPDATE":
        toolCallOperations.updateToolCalls(event.messageId, event.toolCalls)
        break

      case "TOOL_OUTPUT_UPDATE":
        toolCallOperations.appendLiveOutput(
          event.messageId, 
          event.toolCallId, 
          event.outputChunk
        )
        break

      case "TOOL_PERMISSION_REQUEST":
        // Handle permission request notification
        this.logger.info("Permission requested for tool call:", {
          toolCallId: event.toolCallId,
          messageId: event.messageId
        })
        break

      case "TOOL_CALLS_COMPLETE":
        // Handle tool call completion
        this.logger.info("Tool calls completed:", {
          messageId: event.messageId,
          completedCount: event.completedToolCalls.length
        })
        break

      default:
        this.logger.warn("Unknown tool event type:", event.type)
    }
  }

  // Poll for tool call updates (fallback if real-time events aren't available)
  async pollToolCallUpdates(messageId: string, intervalMs = 1000): Promise<() => void> {
    let polling = true
    
    const poll = async () => {
      while (polling) {
        try {
          await this.getToolCalls(messageId)
          await new Promise(resolve => setTimeout(resolve, intervalMs))
        } catch (error) {
          this.logger.error("Error during tool call polling:", error)
          await new Promise(resolve => setTimeout(resolve, intervalMs * 2)) // Backoff on error
        }
      }
    }

    poll() // Start polling

    // Return cleanup function
    return () => {
      polling = false
    }
  }
}

export const toolCallService = new ToolCallService()