// packages/events-core/src/services/tool-call/tool-call-scheduler.ts

import { Logger, type ILogObj } from "tslog"
import type { IEventBus } from "../../event-bus"
import {
  ApprovalMode,
  type ToolCall,
  type ValidatingToolCall,
  type ScheduledToolCall,
  type ExecutingToolCall,
  type WaitingToolCall,
  type CompletedToolCall,
  type SuccessfulToolCall,
  type ErroredToolCall,
  type CancelledToolCall,
  type ToolCallRequestInfo,
  type ToolCallResponseInfo,
  type ToolCallConfirmationDetails,
  type ToolConfirmationOutcome,
  type ToolConfirmationPayload,
  type Tool,
  type ToolRegistry,
  type ChatContext,
  type ConfirmHandler,
  type OutputUpdateHandler,
  type AllToolCallsCompleteHandler,
  type ToolCallsUpdateHandler,
  type ToolCallSchedulerOptions,
} from "./types"

export class ToolCallScheduler {
  private toolRegistry: Promise<ToolRegistry>
  private toolCalls: Map<string, ToolCall[]> = new Map() // messageId -> ToolCall[]
  private outputUpdateHandler?: OutputUpdateHandler
  private onAllToolCallsComplete?: AllToolCallsCompleteHandler
  private onToolCallsUpdate?: ToolCallsUpdateHandler
  private approvalMode: ApprovalMode
  private eventBus: IEventBus
  private logger: Logger<ILogObj>
  private pendingConfirmations: Map<string, WaitingToolCall> = new Map()

  constructor(options: ToolCallSchedulerOptions) {
    this.toolRegistry = options.toolRegistry
    this.outputUpdateHandler = options.outputUpdateHandler
    this.onAllToolCallsComplete = options.onAllToolCallsComplete
    this.onToolCallsUpdate = options.onToolCallsUpdate
    this.approvalMode = options.approvalMode ?? ApprovalMode.DEFAULT
    this.eventBus = options.eventBus
    this.logger = options.logger
  }

  async execute(
    request: ToolCallRequestInfo | ToolCallRequestInfo[],
    messageId: string,
    chatContext: ChatContext,
    signal?: AbortSignal,
  ): Promise<CompletedToolCall[]> {
    this.logger.info("Starting tool call execution", {
      messageId,
      requestCount: Array.isArray(request) ? request.length : 1,
    })

    const requestsToProcess = Array.isArray(request) ? request : [request]
    const toolRegistry = await this.toolRegistry

    // 1. Create initial ToolCall objects (validating state)
    const newToolCalls: ToolCall[] = requestsToProcess.map(
      (reqInfo): ToolCall => {
        const toolInstance = toolRegistry.getTool(reqInfo.name)
        if (!toolInstance) {
          return {
            status: "error",
            request: reqInfo,
            response: this.createErrorResponse(
              reqInfo,
              new Error(`Tool "${reqInfo.name}" not found`),
            ),
            durationMs: 0,
          }
        }
        return {
          status: "validating",
          request: reqInfo,
          tool: toolInstance,
          startTime: Date.now(),
        }
      },
    )

    // 2. Store tool calls and notify updates
    this.toolCalls.set(messageId, newToolCalls)
    this.notifyToolCallsUpdate(messageId)

    // 3. Process validation and permission checks for each tool call
    for (const toolCall of newToolCalls) {
      if (toolCall.status !== "validating") continue

      await this.processToolCallValidation(toolCall, messageId, signal)
    }

    // 4. Attempt to execute scheduled tool calls
    await this.attemptExecutionOfScheduledCalls(messageId, signal)

    // 5. Check and notify completion
    this.checkAndNotifyCompletion(messageId)

    return this.getCompletedToolCalls(messageId)
  }

  private async processToolCallValidation(
    toolCall: ValidatingToolCall,
    messageId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const { request: reqInfo, tool: toolInstance } = toolCall

    try {
      if (this.approvalMode === ApprovalMode.YOLO) {
        // Auto-approve mode
        this.setStatusInternal(messageId, reqInfo.callId, "scheduled")
      } else {
        // Check if confirmation is needed
        const confirmationDetails = await toolInstance.shouldConfirmExecute(
          reqInfo.args,
          signal,
        )

        if (confirmationDetails) {
          // User confirmation required
          const wrappedConfirmationDetails: ToolCallConfirmationDetails = {
            ...confirmationDetails,
            onConfirm: (
              outcome: ToolConfirmationOutcome,
              payload?: ToolConfirmationPayload,
            ) =>
              this.handleConfirmationResponse(
                messageId,
                reqInfo.callId,
                confirmationDetails.onConfirm,
                outcome,
                signal,
                payload,
              ),
          }

          this.setStatusInternal(
            messageId,
            reqInfo.callId,
            "awaiting_approval",
            wrappedConfirmationDetails,
          )
          this.pendingConfirmations.set(
            reqInfo.callId,
            toolCall as WaitingToolCall,
          )

          // Send permission request event to event bus
          this.eventBus.emit({
            kind: "TOOL_PERMISSION_REQUEST",
            messageId,
            toolCallId: reqInfo.callId,
            confirmationDetails: wrappedConfirmationDetails,
            timestamp: new Date(),
          })
        } else {
          // No confirmation needed, schedule directly
          this.setStatusInternal(messageId, reqInfo.callId, "scheduled")
        }
      }
    } catch (error) {
      this.setStatusInternal(
        messageId,
        reqInfo.callId,
        "error",
        this.createErrorResponse(
          reqInfo,
          error instanceof Error ? error : new Error(String(error)),
        ),
      )
    }
  }

  private async attemptExecutionOfScheduledCalls(
    messageId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const toolCalls = this.toolCalls.get(messageId) || []
    const scheduledCalls = toolCalls.filter(
      (tc) => tc.status === "scheduled",
    ) as ScheduledToolCall[]

    if (scheduledCalls.length === 0) return

    this.logger.info("Executing scheduled tool calls", {
      messageId,
      count: scheduledCalls.length,
    })

    // Execute all scheduled tool calls in parallel
    await Promise.all(
      scheduledCalls.map((toolCall) =>
        this.executeSingleToolCall(messageId, toolCall, signal),
      ),
    )
  }

  private async executeSingleToolCall(
    messageId: string,
    toolCall: ScheduledToolCall,
    signal?: AbortSignal,
  ): Promise<void> {
    const { request, tool } = toolCall

    try {
      // Set executing status
      this.setStatusInternal(messageId, request.callId, "executing")

      this.logger.info("Executing tool call", {
        messageId,
        toolCallId: request.callId,
        toolName: request.name,
      })

      // Execute tool (supports streaming output)
      const result = await tool.execute(request.args, {
        signal,
        onOutput: (chunk: string) => {
          // Update live output
          this.updateLiveOutput(messageId, request.callId, chunk)

          // Notify output update
          this.outputUpdateHandler?.(request.callId, chunk)

          // Send output event
          this.eventBus.emit({
            kind: "TOOL_OUTPUT_UPDATE",
            messageId,
            toolCallId: request.callId,
            outputChunk: chunk,
            timestamp: new Date(),
          })
        },
      })

      // Successfully completed
      const durationMs = Date.now() - (toolCall.startTime || 0)
      this.setStatusInternal(
        messageId,
        request.callId,
        "success",
        this.createSuccessResponse(request, result),
        { durationMs },
      )
    } catch (error) {
      // Execution failed
      const durationMs = Date.now() - (toolCall.startTime || 0)
      this.setStatusInternal(
        messageId,
        request.callId,
        "error",
        this.createErrorResponse(
          request,
          error instanceof Error ? error : new Error(String(error)),
        ),
        { durationMs },
      )
    }
  }

  async handleConfirmationResponse(
    messageId: string,
    callId: string,
    originalOnConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>,
    outcome: ToolConfirmationOutcome,
    signal?: AbortSignal,
    payload?: ToolConfirmationPayload,
  ): Promise<void> {
    this.logger.info("Handling confirmation response", {
      messageId,
      callId,
      outcome,
    })

    try {
      // Call original confirmation handler
      await originalOnConfirm(outcome)

      // Update tool call state
      const toolCall = this.findToolCall(messageId, callId)
      if (toolCall) {
        toolCall.outcome = outcome
      }

      if (outcome === "approved") {
        // User approved, schedule execution
        this.setStatusInternal(messageId, callId, "scheduled")
        await this.attemptExecutionOfScheduledCalls(messageId, signal)
      } else {
        // User denied, cancel execution
        this.setStatusInternal(
          messageId,
          callId,
          "cancelled",
          this.createCancelledResponse(callId, "User denied permission"),
        )
      }

      // Remove from pending confirmations list
      this.pendingConfirmations.delete(callId)

      // Check if all tool calls are completed
      this.checkAndNotifyCompletion(messageId)
    } catch (error) {
      this.logger.error("Error in confirmation response handling", error)
      this.setStatusInternal(
        messageId,
        callId,
        "error",
        this.createErrorResponse(
          { callId, name: "unknown", args: {} },
          error instanceof Error ? error : new Error(String(error)),
        ),
      )
    }
  }

  private setStatusInternal(
    messageId: string,
    targetCallId: string,
    newStatus: ToolCall["status"],
    auxiliaryData?: unknown,
    extraData?: unknown,
  ): void {
    const toolCalls = this.toolCalls.get(messageId) || []
    const updatedToolCalls = toolCalls.map((currentCall) => {
      if (
        currentCall.request.callId !== targetCallId ||
        currentCall.status === "success" ||
        currentCall.status === "error" ||
        currentCall.status === "cancelled"
      ) {
        return currentCall
      }

      const existingStartTime = currentCall.startTime
      const toolInstance = currentCall.tool
      const outcome = currentCall.outcome

      switch (newStatus) {
        case "success":
          return {
            request: currentCall.request,
            tool: toolInstance,
            status: "success",
            response: auxiliaryData,
            durationMs: (extraData as any)?.durationMs,
            outcome,
          } as SuccessfulToolCall

        case "error":
          return {
            request: currentCall.request,
            status: "error",
            response: auxiliaryData,
            durationMs: (extraData as any)?.durationMs,
            outcome,
          } as ErroredToolCall

        case "cancelled":
          return {
            request: currentCall.request,
            tool: toolInstance,
            status: "cancelled",
            response: auxiliaryData,
            durationMs: (extraData as any)?.durationMs,
            outcome,
          } as CancelledToolCall

        case "awaiting_approval":
          return {
            request: currentCall.request,
            tool: toolInstance,
            status: "awaiting_approval",
            confirmationDetails: auxiliaryData,
            startTime: existingStartTime,
            outcome,
          } as WaitingToolCall

        case "executing":
        case "scheduled":
        case "validating":
          return {
            ...currentCall,
            status: newStatus,
            startTime: existingStartTime,
          }

        default:
          return currentCall
      }
    })

    this.toolCalls.set(messageId, updatedToolCalls)
    this.notifyToolCallsUpdate(messageId)
  }

  private notifyToolCallsUpdate(messageId: string): void {
    const toolCalls = this.toolCalls.get(messageId) || []

    // Call callback handler
    this.onToolCallsUpdate?.(toolCalls)

    // Send event to event bus
    this.eventBus.emit({
      kind: "TOOL_CALLS_UPDATE",
      messageId,
      toolCalls,
      timestamp: new Date(),
    })
  }

  private checkAndNotifyCompletion(messageId: string): void {
    const toolCalls = this.toolCalls.get(messageId) || []
    const completedCalls = this.getCompletedToolCalls(messageId)

    if (completedCalls.length === toolCalls.length && toolCalls.length > 0) {
      this.logger.info("All tool calls completed", {
        messageId,
        totalCalls: toolCalls.length,
        successCount: completedCalls.filter((tc) => tc.status === "success")
          .length,
        errorCount: completedCalls.filter((tc) => tc.status === "error").length,
        cancelledCount: completedCalls.filter((tc) => tc.status === "cancelled")
          .length,
      })

      // Call completion callback
      this.onAllToolCallsComplete?.(completedCalls)

      // Send completion event
      this.eventBus.emit({
        kind: "TOOL_CALLS_COMPLETE",
        messageId,
        completedToolCalls: completedCalls,
        timestamp: new Date(),
      })
    }
  }

  // Tool call queries and management
  getToolCalls(messageId: string): ToolCall[] {
    return this.toolCalls.get(messageId) || []
  }

  getCompletedToolCalls(messageId: string): CompletedToolCall[] {
    const toolCalls = this.toolCalls.get(messageId) || []
    return toolCalls.filter(
      (tc) =>
        tc.status === "success" ||
        tc.status === "error" ||
        tc.status === "cancelled",
    ) as CompletedToolCall[]
  }

  getPendingApprovals(): WaitingToolCall[] {
    return Array.from(this.pendingConfirmations.values())
  }

  // Cancel and cleanup mechanisms
  async cancelToolCalls(
    messageId: string,
    reason: string = "Cancelled by user",
  ): Promise<void> {
    const toolCalls = this.toolCalls.get(messageId) || []
    const activeCalls = toolCalls.filter(
      (tc) =>
        tc.status === "validating" ||
        tc.status === "scheduled" ||
        tc.status === "executing" ||
        tc.status === "awaiting_approval",
    )

    for (const toolCall of activeCalls) {
      this.setStatusInternal(
        messageId,
        toolCall.request.callId,
        "cancelled",
        this.createCancelledResponse(toolCall.request.callId, reason),
      )
    }

    this.checkAndNotifyCompletion(messageId)
  }

  // Helper methods
  private findToolCall(
    messageId: string,
    callId: string,
  ): ToolCall | undefined {
    const toolCalls = this.toolCalls.get(messageId) || []
    return toolCalls.find((tc) => tc.request.callId === callId)
  }

  private updateLiveOutput(
    messageId: string,
    callId: string,
    output: string,
  ): void {
    const toolCalls = this.toolCalls.get(messageId) || []
    const updatedToolCalls = toolCalls.map((tc) => {
      if (tc.request.callId === callId && tc.status === "executing") {
        return {
          ...tc,
          liveOutput: (tc.liveOutput || "") + output,
        } as ExecutingToolCall
      }
      return tc
    })

    this.toolCalls.set(messageId, updatedToolCalls)
    this.notifyToolCallsUpdate(messageId)
  }

  private createErrorResponse(
    request: ToolCallRequestInfo,
    error: Error,
  ): ToolCallResponseInfo {
    return {
      callId: request.callId,
      result: null,
      error: error.message,
      timestamp: new Date(),
    }
  }

  private createSuccessResponse(
    request: ToolCallRequestInfo,
    result: unknown,
  ): ToolCallResponseInfo {
    return {
      callId: request.callId,
      result,
      error: null,
      timestamp: new Date(),
    }
  }

  private createCancelledResponse(
    callId: string,
    reason: string,
  ): ToolCallResponseInfo {
    return {
      callId,
      result: null,
      error: `Cancelled: ${reason}`,
      timestamp: new Date(),
    }
  }
}