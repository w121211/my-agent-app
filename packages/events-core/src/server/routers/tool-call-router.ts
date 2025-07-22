// packages/events-core/src/server/routers/tool-call-router.ts

import { z } from "zod"
import { router, publicProcedure } from "../trpc-server"
import { ToolCallScheduler } from "../../services/tool-call/tool-call-scheduler"
import { ToolRegistry } from "../../services/tool-call/tool-registry"
import type { ToolCallRequestInfo } from "../../services/tool-call/types"

// Tool call schemas
export const toolCallRequestSchema = z.object({
  callId: z.string(),
  name: z.string(),
  args: z.record(z.unknown()),
})

export const scheduleToolCallsSchema = z.object({
  requests: z.array(toolCallRequestSchema),
  chatId: z.string(),
  messageId: z.string(),
  correlationId: z.string().optional(),
})

export const confirmToolCallSchema = z.object({
  toolCallId: z.string(),
  outcome: z.enum(["approved", "denied"]),
  payload: z.object({
    newContent: z.string().optional(),
    modifiedArgs: z.record(z.unknown()).optional(),
  }).optional(),
  correlationId: z.string().optional(),
})

export const cancelToolCallsSchema = z.object({
  messageId: z.string(),
  reason: z.string().optional(),
  correlationId: z.string().optional(),
})

export const getToolCallsSchema = z.object({
  messageId: z.string(),
  correlationId: z.string().optional(),
})

export const listToolsSchema = z.object({
  category: z.string().optional(),
  correlationId: z.string().optional(),
})

export const registerMCPServerSchema = z.object({
  serverConfig: z.object({
    name: z.string(),
    url: z.string(),
    enabled: z.boolean(),
    category: z.string().optional(),
    oauth: z.object({
      enabled: z.boolean(),
      clientId: z.string().optional(),
      authUrl: z.string().optional(),
      tokenUrl: z.string().optional(),
      scopes: z.array(z.string()).optional(),
    }).optional(),
  }),
  correlationId: z.string().optional(),
})

export function createToolCallRouter(
  toolCallScheduler: ToolCallScheduler,
  toolRegistry: ToolRegistry,
) {
  return router({
    // Schedule tool calls for execution
    schedule: publicProcedure
      .input(scheduleToolCallsSchema)
      .mutation(async ({ input }) => {
        const { requests, chatId, messageId } = input

        const completedToolCalls = await toolCallScheduler.execute(
          requests as ToolCallRequestInfo[],
          messageId,
          { chatId, messageId },
        )

        return {
          success: true,
          messageId,
          completedToolCalls: completedToolCalls.map(tc => ({
            status: tc.status,
            request: tc.request,
            response: tc.response,
            durationMs: tc.durationMs,
          })),
        }
      }),

    // Confirm or deny a tool call that requires approval
    confirm: publicProcedure
      .input(confirmToolCallSchema)
      .mutation(async ({ input }) => {
        const { toolCallId, outcome, payload } = input

        // Find the pending approval
        const pendingApprovals = toolCallScheduler.getPendingApprovals()
        const waitingToolCall = pendingApprovals.find(
          tc => tc.request.callId === toolCallId
        )

        if (!waitingToolCall) {
          throw new Error(`No pending approval found for tool call ${toolCallId}`)
        }

        // Handle the confirmation
        await waitingToolCall.confirmationDetails.onConfirm(
          outcome as "approved" | "denied",
          payload,
        )

        return {
          success: true,
          toolCallId,
          outcome,
        }
      }),

    // Cancel tool calls for a specific message
    cancel: publicProcedure
      .input(cancelToolCallsSchema)
      .mutation(async ({ input }) => {
        const { messageId, reason = "Cancelled by user" } = input

        await toolCallScheduler.cancelToolCalls(messageId, reason)

        return {
          success: true,
          messageId,
          reason,
        }
      }),

    // Get tool calls for a specific message
    getToolCalls: publicProcedure
      .input(getToolCallsSchema)
      .query(async ({ input }) => {
        const { messageId } = input

        const toolCalls = toolCallScheduler.getToolCalls(messageId)
        const completedCalls = toolCallScheduler.getCompletedToolCalls(messageId)

        return {
          messageId,
          toolCalls: toolCalls.map(tc => ({
            status: tc.status,
            request: tc.request,
            startTime: tc.startTime,
            outcome: tc.outcome,
            liveOutput: 'liveOutput' in tc ? tc.liveOutput : undefined,
            response: 'response' in tc ? tc.response : undefined,
            durationMs: 'durationMs' in tc ? tc.durationMs : undefined,
            confirmationDetails: 'confirmationDetails' in tc ? tc.confirmationDetails : undefined,
          })),
          completedCalls: completedCalls.map(tc => ({
            status: tc.status,
            request: tc.request,
            response: tc.response,
            durationMs: tc.durationMs,
          })),
        }
      }),

    // Get pending tool call approvals
    getPendingApprovals: publicProcedure
      .query(async () => {
        const pendingApprovals = toolCallScheduler.getPendingApprovals()

        return {
          pendingApprovals: pendingApprovals.map(tc => ({
            toolCallId: tc.request.callId,
            toolName: tc.request.name,
            args: tc.request.args,
            confirmationDetails: {
              message: tc.confirmationDetails.message,
              dangerLevel: tc.confirmationDetails.dangerLevel,
              affectedResources: tc.confirmationDetails.affectedResources,
              previewChanges: tc.confirmationDetails.previewChanges,
            },
          })),
        }
      }),

    // List available tools
    listTools: publicProcedure
      .input(listToolsSchema)
      .query(async ({ input }) => {
        const { category } = input

        const tools = category
          ? toolRegistry.getToolsByCategory(category)
          : toolRegistry.getAllTools()

        return {
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            metadata: tool.getMetadata(),
          })),
        }
      }),

    // Register an MCP server
    registerMCPServer: publicProcedure
      .input(registerMCPServerSchema)
      .mutation(async ({ input }) => {
        const { serverConfig } = input

        await toolRegistry.registerMCPServer(serverConfig)

        return {
          success: true,
          serverName: serverConfig.name,
        }
      }),

    // Get tool registry health status
    getHealth: publicProcedure
      .query(async () => {
        const healthReport = await toolRegistry.checkToolHealth()

        return {
          totalTools: healthReport.totalTools,
          healthyTools: healthReport.healthyTools,
          unhealthyTools: healthReport.unhealthyTools,
          mcpServers: healthReport.mcpServers,
          details: Object.fromEntries(healthReport.details),
        }
      }),
  })
}