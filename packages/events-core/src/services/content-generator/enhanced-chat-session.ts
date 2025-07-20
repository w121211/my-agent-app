// packages/events-core/src/services/content-generator/enhanced-chat-session.ts
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../../event-bus.js";
import type { ProviderRegistry } from "./provider-registry-builder.js";
import type { ChatModelConfig, TurnInput, ConversationResult } from "./types.js";
import type { SerializableChat, ChatMessage, Role } from "../chat-engine/chat-session.js";

export class EnhancedChatSession {
  private registry: ProviderRegistry;
  private modelConfig: ChatModelConfig;
  private data: SerializableChat;
  private eventBus: IEventBus;
  private currentAbortController: AbortController | null = null;

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
        // Handle tool calls
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

  static fromJSON(data: SerializableChat, eventBus: IEventBus, registry: ProviderRegistry): EnhancedChatSession {
    return new EnhancedChatSession(data, eventBus, registry);
  }
}