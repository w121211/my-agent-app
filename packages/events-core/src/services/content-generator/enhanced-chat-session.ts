// packages/events-core/src/services/content-generator/enhanced-chat-session.ts
import { v4 as uuidv4 } from "uuid";
import { Logger, type ILogObj } from "tslog";
import type { IEventBus } from "../../event-bus.js";
import type { ProviderRegistry } from "./provider-registry-builder.js";
import type { ChatModelConfig, TurnInput, ConversationResult } from "./types.js";
import type { SerializableChat, ChatMessage, Role } from "../chat-engine/chat-session.js";
import { ToolRegistry } from "../tool-call/tool-registry.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";
import type { 
  ApprovalMode, 
  ToolCallRequestInfo, 
  CompletedToolCall, 
  WaitingToolCall,
  ToolConfirmationOutcome 
} from "../tool-call/types.js";

export class EnhancedChatSession {
  private registry: ProviderRegistry;
  private modelConfig: ChatModelConfig;
  private data: SerializableChat;
  private eventBus: IEventBus;
  private currentAbortController: AbortController | null = null;
  private toolCallScheduler: ToolCallScheduler;
  private toolRegistry: ToolRegistry;
  private logger: Logger<ILogObj>;

  constructor(
    data: SerializableChat,
    eventBus: IEventBus,
    registry: ProviderRegistry,
  ) {
    this.data = data;
    this.eventBus = eventBus;
    this.registry = registry;
    this.modelConfig = data.metadata?.model || {
      provider: 'mock',
      modelId: 'default',
    };
    this.logger = new Logger({ name: "EnhancedChatSession" });

    // Initialize tool registry and scheduler
    this.toolRegistry = new ToolRegistry(eventBus, this.logger);
    this.toolCallScheduler = new ToolCallScheduler({
      toolRegistry: Promise.resolve(this.toolRegistry),
      eventBus,
      logger: this.logger,
      approvalMode: ApprovalMode.DEFAULT,
      outputUpdateHandler: (toolCallId, chunk) => {
        this.handleToolOutputUpdate(toolCallId, chunk);
      },
      onAllToolCallsComplete: (completedCalls) => {
        this.handleToolCallsComplete(completedCalls);
      },
      onToolCallsUpdate: (toolCalls) => {
        this.handleToolCallsUpdate(toolCalls);
      },
    });

    // Register built-in tools
    this.registerBuiltInTools();
  }

  get id(): string {
    return this.data.id;
  }

  get absoluteFilePath(): string {
    return this.data.absoluteFilePath;
  }

  get messages(): ChatMessage[] {
    return this.data.messages;
  }

  get status() {
    return this.data.status;
  }

  set status(value) {
    this.data.status = value;
  }

  get metadata() {
    return this.data.metadata;
  }

  set metadata(value) {
    this.data.metadata = value;
  }

  get updatedAt() {
    return this.data.updatedAt;
  }

  set updatedAt(value) {
    this.data.updatedAt = value;
  }

  async runTurn(
    input: TurnInput,
    options?: { signal?: AbortSignal },
  ): Promise<ConversationResult> {
    if (options?.signal?.aborted) throw new Error('Operation aborted');

    if (this.data.currentTurn >= this.data.maxTurns) {
      this.status = 'max_turns_reached';
      return { status: 'max_turns_reached' };
    }

    this.currentAbortController = new AbortController();
    const effectiveSignal = options?.signal || this.currentAbortController.signal;

    try {
      this.status = 'processing';
      this.data.currentTurn++;

      this.addInputToMessages(input);

      await this.eventBus.emit({
        kind: 'ChatUpdatedEvent',
        chatId: this.id,
        updateType: 'STATUS_CHANGED',
        update: { status: this.status },
        chat: this.toJSON(),
        timestamp: new Date(),
      });

      // Use AI SDK v5 pattern with streamText
      const result = await this.streamText({
        model: this.registry.languageModel(
          `${this.modelConfig.provider}:${this.modelConfig.modelId}`,
        ),
        messages: this.buildMessages(input),
        temperature: this.modelConfig.temperature,
        maxTokens: this.modelConfig.maxTokens,
        topP: this.modelConfig.topP,
        system: this.modelConfig.systemPrompt,
        abortSignal: effectiveSignal,
      });

      // Process AI SDK v5 stream
      for await (const part of result.fullStream) {
        await this.handleStreamPart(part);
      }

      this.status = 'idle';
      return { status: 'complete', content: await result.text };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.status = 'idle';
        throw new Error('Operation cancelled by user');
      }
      throw error;
    } finally {
      this.currentAbortController = null;
      this.data.updatedAt = new Date();
      
      await this.eventBus.emit({
        kind: 'ChatUpdatedEvent',
        chatId: this.id,
        updateType: 'STATUS_CHANGED',
        update: { status: this.status },
        chat: this.toJSON(),
        timestamp: new Date(),
      });
    }
  }

  abort(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
  }

  toJSON(): SerializableChat {
    return this.data;
  }

  // Mock implementation of streamText following AI SDK v5 pattern
  private async streamText(config: any) {
    // This would be the real streamText call in production:
    // return streamText(config);
    
    // Mock implementation for skeleton
    const mockStream = {
      fullStream: this.createMockStream(),
      text: Promise.resolve(`Mock AI response for model ${config.model.modelId}`),
    };
    
    return mockStream;
  }

  private async* createMockStream() {
    yield { type: 'start' };
    yield { type: 'text-start' };
    yield { type: 'text', text: 'Mock ' };
    yield { type: 'text', text: 'AI ' };
    yield { type: 'text', text: 'response' };
    yield { type: 'text-end' };
    yield { type: 'finish', finishReason: 'stop' };
  }

  private async handleStreamPart(part: any): Promise<void> {
    switch (part.type) {
      case 'text':
        // Handle text streaming, emit events as needed
        break;
      case 'tool-call':
        // Handle tool calls - extract from AI SDK v5 stream
        await this.handleToolCalls(part.toolCalls || []);
        break;
      case 'finish':
        // Handle completion
        const aiMessage: ChatMessage = {
          id: uuidv4(),
          role: 'ASSISTANT',
          content: 'Mock AI response', // Would be actual content in real implementation
          timestamp: new Date(),
        };
        this.data.messages.push(aiMessage);
        break;
    }
  }

  private addInputToMessages(input: TurnInput): void {
    let message: ChatMessage;

    switch (input.type) {
      case 'user_message':
        message = {
          id: uuidv4(),
          role: 'USER',
          content: input.content || '',
          timestamp: new Date(),
        };
        break;
      case 'tool_results':
        message = {
          id: uuidv4(),
          role: 'FUNCTION_EXECUTOR',
          content: JSON.stringify(input.results),
          timestamp: new Date(),
        };
        break;
      case 'continue':
        return;
    }

    this.data.messages.push(message);
  }

  private buildMessages(input: TurnInput): any[] {
    // Convert internal message format to AI SDK v5 format
    return this.data.messages.map(msg => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    }));
  }

  // Tool call handling methods
  private async handleToolCalls(toolCalls: any[]): Promise<void> {
    if (!toolCalls || toolCalls.length === 0) return;

    const toolCallMessage: ChatMessage = {
      id: uuidv4(),
      role: "FUNCTION_EXECUTOR",
      content: `Executing ${toolCalls.length} tool calls`,
      timestamp: new Date(),
      metadata: {
        functionCalls: toolCalls,
      },
    };

    this.data.messages.push(toolCallMessage);

    // Convert to tool call request format
    const toolCallRequests: ToolCallRequestInfo[] = toolCalls.map(tc => ({
      callId: tc.id || uuidv4(),
      name: tc.name || tc.function?.name || "unknown",
      args: tc.args || tc.function?.arguments || {},
    }));

    // Execute tool calls using scheduler
    const completedCalls = await this.toolCallScheduler.execute(
      toolCallRequests,
      toolCallMessage.id,
      {
        chatId: this.id,
        messageId: toolCallMessage.id,
        projectPath: this.getProjectPath(),
      },
    );

    // Check for pending approvals
    const pendingApprovals = this.toolCallScheduler.getPendingApprovals();
    if (pendingApprovals.length > 0) {
      this.status = "waiting_confirmation";
      return;
    }

    // All tool calls completed, add results and continue conversation
    const toolResults = completedCalls.map((tc) => ({
      id: tc.request.callId,
      result: tc.status === "success" ? tc.response.result : null,
      error: tc.status === "error" ? tc.response.error : null,
    }));

    // Continue conversation with tool results
    await this.runTurn(
      {
        type: "tool_results",
        results: toolResults,
      },
    );
  }

  async handleToolConfirmation(
    toolCallId: string,
    outcome: "approved" | "denied",
  ): Promise<ConversationResult> {
    const pendingApprovals = this.toolCallScheduler.getPendingApprovals();
    const waitingToolCall = pendingApprovals.find(
      tc => tc.request.callId === toolCallId
    );

    if (!waitingToolCall) {
      throw new Error(`No pending approval found for tool call ${toolCallId}`);
    }

    // Handle the confirmation
    await waitingToolCall.confirmationDetails.onConfirm(
      outcome as ToolConfirmationOutcome,
    );

    // Check if there are still pending approvals
    const remainingPendingApprovals = this.toolCallScheduler.getPendingApprovals();
    if (remainingPendingApprovals.length > 0) {
      return {
        status: "waiting_confirmation",
        toolCalls: remainingPendingApprovals.map(this.convertToLegacyToolCall),
      };
    }

    // All confirmations complete, continue execution
    this.status = "processing";
    return { status: "complete", content: "Tool execution completed" };
  }

  private handleToolOutputUpdate(toolCallId: string, chunk: string): void {
    // Handle real-time tool output updates
    this.eventBus.emit({
      kind: "TOOL_OUTPUT_UPDATE",
      messageId: this.getCurrentMessageId(),
      toolCallId,
      outputChunk: chunk,
      timestamp: new Date(),
    });
  }

  private handleToolCallsComplete(completedCalls: CompletedToolCall[]): void {
    this.logger.info("Tool calls completed", {
      chatId: this.id,
      count: completedCalls.length,
    });

    // Continue processing if all tool calls are done
    if (this.status === "waiting_confirmation") {
      this.status = "processing";
    }
  }

  private handleToolCallsUpdate(toolCalls: any[]): void {
    // Handle tool call status updates
    this.eventBus.emit({
      kind: "TOOL_CALLS_UPDATE",
      messageId: this.getCurrentMessageId(),
      toolCalls,
      timestamp: new Date(),
    });
  }

  private convertToLegacyToolCall(waitingToolCall: WaitingToolCall): any {
    return {
      id: waitingToolCall.request.callId,
      name: waitingToolCall.request.name,
      arguments: waitingToolCall.request.args,
      needsConfirmation: true,
      confirmationDetails: waitingToolCall.confirmationDetails,
    };
  }

  private getCurrentMessageId(): string {
    return this.data.messages[this.data.messages.length - 1]?.id || "";
  }

  private getProjectPath(): string | undefined {
    // Extract project path from file path or metadata
    const filePath = this.data.absoluteFilePath;
    if (filePath) {
      // Return parent directory of chat file
      return filePath.split("/").slice(0, -1).join("/");
    }
    return undefined;
  }

  // Built-in tool registration
  private async registerBuiltInTools(): Promise<void> {
    // This would register actual built-in tools in a real implementation
    // For now, we'll register some mock tools for demo purposes
    
    const mockFileReadTool = {
      name: "file_read",
      description: "Read file content",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" }
        },
        required: ["path"]
      },
      async shouldConfirmExecute() {
        return null; // Auto-approve file reads
      },
      async execute(args: any) {
        return `Mock file content for: ${args.path}`;
      },
      getMetadata() {
        return {
          name: "file_read",
          description: "Read file content",
          category: "file",
          inputSchema: this.inputSchema
        };
      }
    };

    this.toolRegistry.registerTool(mockFileReadTool);
  }

  static fromJSON(data: SerializableChat, eventBus: IEventBus, registry: ProviderRegistry): EnhancedChatSession {
    return new EnhancedChatSession(data, eventBus, registry);
  }
}