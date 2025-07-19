// packages/events-core/src/services/chat-engine/chat-session.ts
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../../event-bus.js";

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
  model?: string;
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

  constructor(
    data: Omit<SerializableChat, 'status' | 'fileStatus' | 'currentTurn' | 'maxTurns'>,
    eventBus: IEventBus
  ) {
    this.id = data.id;
    this.absoluteFilePath = data.absoluteFilePath;
    this.messages = data.messages;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;
    this.eventBus = eventBus;
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
      // TODO: Replace with actual AI service integration
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
    // TODO: Replace with actual AI service integration
    // This is a placeholder implementation
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

  static fromJSON(data: SerializableChat, eventBus: IEventBus): ChatSession {
    const chatSession = new ChatSession(data, eventBus);
    chatSession.status = data.status;
    chatSession.fileStatus = data.fileStatus;
    chatSession.currentTurn = data.currentTurn;
    chatSession.maxTurns = data.maxTurns;
    return chatSession;
  }
}