// packages/events-core/src/services/chat-engine/chat-session.ts
import { v4 as uuidv4 } from "uuid";
import { Logger, type ILogObj } from "tslog";
import type { AssistantModelMessage, ProviderRegistryProvider } from "ai";
import { streamText } from "ai";
import type { IEventBus } from "../../event-bus.js";
import type { ChatModelConfig } from "./types.js";
import type { UserSettingsService } from "../user-settings-service.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";

// Type definitions
export type ChatStatus =
  | "idle"
  | "processing"
  | "waiting_confirmation"
  | "max_turns_reached";
export type ChatFileStatus = "ACTIVE" | "ARCHIVED";
export type Role = "ASSISTANT" | "USER" | "FUNCTION_EXECUTOR";
export type ChatMode = "chat" | "agent";

export interface UserInput {
  type: "user_message";
  content: string;
  attachments?: Array<{ fileName: string; content: string }>;
}

export interface ToolResults {
  type: "tool_results";
  results: Array<{ id: string; result: any }>;
}

export interface ContinueSignal {
  type: "continue";
}

export type TurnInput = UserInput | ToolResults | ContinueSignal;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  needsConfirmation: boolean;
}

export type ConversationResult =
  | { status: "complete"; content: string }
  | { status: "waiting_confirmation"; toolCalls: ToolCall[] }
  | { status: "max_turns_reached" };

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
  // TODO: No need legacy support
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
  status: ChatStatus = "idle";
  fileStatus: ChatFileStatus = "ACTIVE";
  currentTurn: number = 0;
  maxTurns: number = 20;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;

  private eventBus: IEventBus;
  private currentAbortController: AbortController | null = null;
  private providerRegistry: ProviderRegistryProvider;
  private toolCallScheduler: ToolCallScheduler;
  private logger: Logger<ILogObj>;
  private userSettingsService: UserSettingsService;

  constructor(
    data: Omit<
      SerializableChat,
      "status" | "fileStatus" | "currentTurn" | "maxTurns"
    >,
    eventBus: IEventBus,
    providerRegistry: ProviderRegistryProvider,
    toolCallScheduler: ToolCallScheduler,
    userSettingsService: UserSettingsService,
  ) {
    this.id = data.id;
    this.absoluteFilePath = data.absoluteFilePath;
    this.messages = data.messages;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;
    this.eventBus = eventBus;
    this.providerRegistry = providerRegistry;
    this.toolCallScheduler = toolCallScheduler;
    this.userSettingsService = userSettingsService;
    this.logger = new Logger({ name: "ChatSession" });
  }

  async runTurn(
    input: TurnInput,
    options?: { signal?: AbortSignal },
  ): Promise<ConversationResult> {
    // Check if already aborted
    if (options?.signal?.aborted) throw new Error("Operation aborted");

    // Check turn limits
    if (this.currentTurn >= this.maxTurns) {
      this.status = "max_turns_reached";
      return { status: "max_turns_reached" };
    }

    // Create internal AbortController if no external signal
    this.currentAbortController = new AbortController();
    const effectiveSignal =
      options?.signal || this.currentAbortController.signal;

    try {
      this.status = "processing";
      this.currentTurn++;

      // Add input to messages
      this.addInputToMessages(input);

      // Emit status change event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "STATUS_CHANGED",
        update: { status: this.status },
        chat: this.toSerializableChat(),
        timestamp: new Date(),
      });

      // Generate AI response using streamText directly
      const modelConfig = this.getModelConfig();
      if (!modelConfig) {
        throw new Error("Model configuration not available");
      }

      const model = this.providerRegistry.languageModel(
        `${modelConfig.provider}:${modelConfig.modelId}`,
      );

      const result = streamText({
        model,
        messages: this.buildMessagesForAI(),
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        system: modelConfig.systemPrompt,
        abortSignal: effectiveSignal,
      });

      let content = "";
      const toolCalls: ToolCall[] = [];

      // Process AI SDK v5 stream
      for await (const part of result.fullStream) {
        if (effectiveSignal.aborted) throw new Error("Operation aborted");

        switch (part.type) {
          case "text":
            content += part.text;
            break;
          case "tool-call":
            toolCalls.push({
              id: part.toolCallId || uuidv4(),
              name: part.toolName || "unknown",
              arguments: part.input || {},
              needsConfirmation: true,
            });
            break;
        }
      }

      // Add AI message to messages
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: "ASSISTANT",
        content: content || "AI response",
        timestamp: new Date(),
      };
      this.messages.push(aiMessage);

      // Handle tool calls if any
      if (toolCalls.length > 0) {
        this.status = "waiting_confirmation";
        return {
          status: "waiting_confirmation",
          toolCalls,
        };
      }

      // Turn complete
      this.status = "idle";
      return { status: "complete", content };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.status = "idle";
        throw new Error("Operation cancelled by user");
      }
      throw error;
    } finally {
      this.currentAbortController = null;
      this.updatedAt = new Date();

      // Emit final status change
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "STATUS_CHANGED",
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

  async cleanup(): Promise<void> {
    // Abort any running operations
    this.abort();

    // Note: ToolCallScheduler doesn't have cleanup method yet
    // Future enhancement: add cleanup to ToolCallScheduler
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
      case "user_message":
        message = {
          id: uuidv4(),
          role: "USER",
          content: input.content,
          timestamp: new Date(),
        };
        break;
      case "tool_results":
        message = {
          id: uuidv4(),
          role: "FUNCTION_EXECUTOR",
          content: JSON.stringify(input.results),
          timestamp: new Date(),
        };
        break;
      case "continue":
        // TODO: Consider adding a mock user meessage "Please continue." to messages.
        // Don't add continue signals as messages
        return;
    }

    this.messages.push(message);
  }

  private buildMessagesForAI(): AssistantModelMessage[] {
    return this.messages.map((msg) => ({
      // role: msg.role.toLowerCase(),
      role: "assistant",
      content: msg.content,
    }));
  }

  private getModelConfig(): ChatModelConfig | null {
    if (this.metadata?.model && typeof this.metadata.model === "object") {
      return this.metadata.model as ChatModelConfig;
    }
    return null;
  }

  static fromJSON(
    data: SerializableChat,
    eventBus: IEventBus,
    providerRegistry: ProviderRegistryProvider,
    toolScheduler: ToolCallScheduler,
    userSettingsService: UserSettingsService,
  ): ChatSession {
    const chatSession = new ChatSession(
      data,
      eventBus,
      providerRegistry,
      toolScheduler,
      userSettingsService,
    );
    chatSession.status = data.status;
    chatSession.fileStatus = data.fileStatus;
    chatSession.currentTurn = data.currentTurn;
    chatSession.maxTurns = data.maxTurns;
    return chatSession;
  }
}
