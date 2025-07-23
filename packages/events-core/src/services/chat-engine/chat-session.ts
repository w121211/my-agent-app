// packages/events-core/src/services/chat-engine/chat-session.ts
import { v4 as uuidv4 } from "uuid";
import { Logger, type ILogObj } from "tslog";
import type { IEventBus } from "../../event-bus.js";
import type { ChatModelConfig } from "./types.js";
import { ProviderRegistryBuilder, type ProviderRegistry } from "./provider-registry-builder.js";
import { ToolRegistry } from "../tool-call/tool-registry.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";
import type { 
  ApprovalMode, 
  ToolCallRequestInfo, 
  CompletedToolCall, 
  WaitingToolCall,
  ToolConfirmationOutcome 
} from "../tool-call/types.js";

// Type definitions
export type ChatStatus = 'idle' | 'processing' | 'waiting_confirmation' | 'max_turns_reached';
export type ChatFileStatus = 'ACTIVE' | 'ARCHIVED';
export type Role = "ASSISTANT" | "USER" | "FUNCTION_EXECUTOR";
export type ChatMode = "chat" | "agent";

export interface UserInput {
  type: 'user_message';
  content: string;
  attachments?: Array<{ fileName: string; content: string }>;
}

export interface ToolResults {
  type: 'tool_results';
  results: Array<{ id: string; result: any }>;
}

export interface ContinueSignal {
  type: 'continue';
}

export type TurnInput = UserInput | ToolResults | ContinueSignal;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  needsConfirmation: boolean;
}

export type ConversationResult = 
  | { status: 'complete'; content: string }
  | { status: 'waiting_confirmation'; toolCalls: ToolCall[] }
  | { status: 'max_turns_reached' };

export interface ChatMessageMetadata {
  subtaskId?: string;
  taskId?: string;
  functionCalls?: Record<string, unknown>[];
  isPrompt?: boolean;
  fileReferences?: Array<{
    path: string;
    md5: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

export interface ChatMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
  mode?: ChatMode;
  model?: string | ChatModelConfig; // Can be string (legacy) or ChatModelConfig (new)
  knowledge?: string[];
  promptDraft?: string;
}

export interface SerializableChat {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  status: ChatStatus;
  fileStatus: ChatFileStatus;
  currentTurn: number;
  maxTurns: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}

// ChatSession class with turn management
export class ChatSession {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[] = [];
  status: ChatStatus = 'idle';
  fileStatus: ChatFileStatus = 'ACTIVE';
  currentTurn: number = 0;
  maxTurns: number = 20;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
  
  private eventBus: IEventBus;
  private currentAbortController: AbortController | null = null;
  private registry: ProviderRegistry | null = null;
  private toolCallScheduler: ToolCallScheduler | null = null;
  private toolRegistry: ToolRegistry | null = null;
  private logger: Logger<ILogObj>;

  constructor(
    data: Omit<SerializableChat, 'status' | 'fileStatus' | 'currentTurn' | 'maxTurns'>,
    eventBus: IEventBus,
    registry?: ProviderRegistry
  ) {
    this.id = data.id;
    this.absoluteFilePath = data.absoluteFilePath;
    this.messages = data.messages;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;
    this.eventBus = eventBus;
    this.registry = registry || null;
    this.logger = new Logger({ name: "ChatSession" });
    
    if (this.registry) {
      this.initializeToolSystem();
    }
  }

  async runTurn(input: TurnInput, options?: { signal?: AbortSignal }): Promise<ConversationResult> {
    // Check if already aborted
    if (options?.signal?.aborted) throw new Error('Operation aborted');

    // Check turn limits
    if (this.currentTurn >= this.maxTurns) {
      this.status = 'max_turns_reached';
      return { status: 'max_turns_reached' };
    }

    // Create internal AbortController if no external signal
    this.currentAbortController = new AbortController();
    const effectiveSignal = options?.signal || this.currentAbortController.signal;

    try {
      this.status = 'processing';
      this.currentTurn++;

      // Add input to messages
      this.addInputToMessages(input);

      // Emit status change event
      await this.eventBus.emit({
        kind: 'ChatUpdatedEvent',
        chatId: this.id,
        updateType: 'STATUS_CHANGED',
        update: { status: this.status },
        chat: this.toSerializableChat(),
        timestamp: new Date(),
      });

      // Call AI model with abort signal
      const response = await this.generateModelResponse(effectiveSignal);

      // Process model response
      if (response.hasToolCalls) {
        if (response.needsConfirmation) {
          this.status = 'waiting_confirmation';
          return { status: 'waiting_confirmation', toolCalls: response.toolCalls };
        } else {
          // Auto-execute tools
          const toolResults = await this.executeTools(response.toolCalls, { signal: effectiveSignal });
          return await this.runTurn(toolResults, { signal: effectiveSignal });
        }
      }

      if (this.checkNextSpeaker(response) === 'model') {
        // Model wants to continue
        return await this.runTurn({ type: 'continue' }, { signal: effectiveSignal });
      } else {
        // Turn complete
        this.status = 'idle';
        return { status: 'complete', content: response.content };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.status = 'idle';
        throw new Error('Operation cancelled by user');
      }
      throw error;
    } finally {
      this.currentAbortController = null;
      this.updatedAt = new Date();
      
      // Emit final status change
      await this.eventBus.emit({
        kind: 'ChatUpdatedEvent',
        chatId: this.id,
        updateType: 'STATUS_CHANGED',
        update: { status: this.status },
        chat: this.toSerializableChat(),
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
    return {
      id: this.id,
      absoluteFilePath: this.absoluteFilePath,
      messages: this.messages,
      status: this.status,
      fileStatus: this.fileStatus,
      currentTurn: this.currentTurn,
      maxTurns: this.maxTurns,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }

  private toSerializableChat(): SerializableChat {
    return this.toJSON();
  }

  private addInputToMessages(input: TurnInput): void {
    let message: ChatMessage;

    switch (input.type) {
      case 'user_message':
        message = {
          id: uuidv4(),
          role: 'USER',
          content: input.content,
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
        // Don't add continue signals as messages
        return;
    }

    this.messages.push(message);
  }

  private async generateModelResponse(signal: AbortSignal): Promise<{
    content: string;
    hasToolCalls: boolean;
    needsConfirmation: boolean;
    toolCalls: ToolCall[];
  }> {
    if (this.registry && this.isEnhancedModel()) {
      return this.generateEnhancedModelResponse(signal);
    }
    
    // Fallback to simple response for legacy models
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (signal.aborted) {
          reject(new Error('Operation aborted'));
          return;
        }

        const lastMessage = this.messages[this.messages.length - 1];
        const response = {
          content: `Echo: "${lastMessage?.content || 'No message'}"\n\nThis is a placeholder AI response for turn ${this.currentTurn}`,
          hasToolCalls: false,
          needsConfirmation: false,
          toolCalls: [],
        };

        // Add AI message to messages
        const aiMessage: ChatMessage = {
          id: uuidv4(),
          role: 'ASSISTANT',
          content: response.content,
          timestamp: new Date(),
        };
        this.messages.push(aiMessage);

        resolve(response);
      }, 100);

      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Operation aborted'));
      });
    });
  }

  private async executeTools(toolCalls: ToolCall[], options?: { signal?: AbortSignal }): Promise<ToolResults> {
    // TODO: Replace with actual tool execution
    return {
      type: 'tool_results',
      results: toolCalls.map(call => ({
        id: call.id,
        result: `Placeholder result for ${call.name}`,
      })),
    };
  }

  private checkNextSpeaker(response: any): 'user' | 'model' {
    // TODO: Implement actual next speaker logic
    return 'user';
  }
  
  // Enhanced AI functionality
  private isEnhancedModel(): boolean {
    return this.metadata?.model && typeof this.metadata.model === 'object';
  }
  
  private getModelConfig(): ChatModelConfig | null {
    if (this.isEnhancedModel() && typeof this.metadata?.model === 'object') {
      return this.metadata.model as ChatModelConfig;
    }
    return null;
  }
  
  private async generateEnhancedModelResponse(signal: AbortSignal): Promise<{
    content: string;
    hasToolCalls: boolean;
    needsConfirmation: boolean;
    toolCalls: ToolCall[];
  }> {
    const modelConfig = this.getModelConfig();
    if (!modelConfig || !this.registry) {
      throw new Error('Enhanced model response requires model config and registry');
    }
    
    try {
      const result = await this.streamText({
        model: this.registry.languageModel(`${modelConfig.provider}:${modelConfig.modelId}`),
        messages: this.buildMessagesForAI(),
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        topP: modelConfig.topP,
        system: modelConfig.systemPrompt,
        abortSignal: signal,
      });
      
      let content = '';
      const toolCalls: ToolCall[] = [];
      
      // Process AI SDK v5 stream
      for await (const part of result.fullStream) {
        if (signal.aborted) throw new Error('Operation aborted');
        
        switch (part.type) {
          case 'text':
            content += part.text;
            break;
          case 'tool-call':
            if (part.toolCalls) {
              toolCalls.push(...part.toolCalls.map(tc => ({
                id: tc.id || uuidv4(),
                name: tc.name || tc.function?.name || 'unknown',
                arguments: tc.args || tc.function?.arguments || {},
                needsConfirmation: true,
              })));
            }
            break;
        }
      }
      
      // Add AI message to messages
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: 'ASSISTANT',
        content: content || 'AI response',
        timestamp: new Date(),
      };
      this.messages.push(aiMessage);
      
      return {
        content,
        hasToolCalls: toolCalls.length > 0,
        needsConfirmation: toolCalls.some(tc => tc.needsConfirmation),
        toolCalls,
      };
    } catch (error) {
      if (signal.aborted) throw new Error('Operation aborted');
      throw error;
    }
  }
  
  private async streamText(config: any) {
    // Mock implementation of AI SDK v5 streamText
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
  
  private buildMessagesForAI(): any[] {
    return this.messages.map(msg => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    }));
  }
  
  private initializeToolSystem(): void {
    if (!this.registry) return;
    
    this.toolRegistry = new ToolRegistry(this.eventBus, this.logger);
    this.toolCallScheduler = new ToolCallScheduler({
      toolRegistry: Promise.resolve(this.toolRegistry),
      eventBus: this.eventBus,
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
  }
  
  private handleToolOutputUpdate(toolCallId: string, chunk: string): void {
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
  }
  
  private handleToolCallsUpdate(toolCalls: any[]): void {
    this.eventBus.emit({
      kind: "TOOL_CALLS_UPDATE",
      messageId: this.getCurrentMessageId(),
      toolCalls,
      timestamp: new Date(),
    });
  }
  
  private getCurrentMessageId(): string {
    return this.messages[this.messages.length - 1]?.id || "";
  }

  static fromJSON(data: SerializableChat, eventBus: IEventBus, registry?: ProviderRegistry): ChatSession {
    const chatSession = new ChatSession(data, eventBus, registry);
    chatSession.status = data.status;
    chatSession.fileStatus = data.fileStatus;
    chatSession.currentTurn = data.currentTurn;
    chatSession.maxTurns = data.maxTurns;
    return chatSession;
  }
}