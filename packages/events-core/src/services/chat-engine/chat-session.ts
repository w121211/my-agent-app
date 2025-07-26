// packages/events-core/src/services/chat-engine/chat-session.ts
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { Logger, type ILogObj } from "tslog";
import type { ProviderRegistryProvider } from "ai";
import { streamText } from "ai";
import type { IEventBus } from "../../event-bus.js";
import type { 
  ChatModelConfig, 
  ChatStatus, 
  ChatFileStatus, 
  TurnInput,
  ToolCall,
  ConversationResult,
  ChatMessage,
  ChatMetadata,
  ChatFileData
} from "./types.js";
import type { UserSettingsService } from "../user-settings-service.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";
import { MessageProcessor } from "./message-processor.js";
import type { FileService } from "../file-service.js";
import type { ProjectFolderService } from "../project-folder-service.js";

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
  private messageProcessor: MessageProcessor;
  private projectPath: string;

  constructor(
    data: Omit<
      ChatFileData,
      "status" | "fileStatus" | "currentTurn" | "maxTurns"
    >,
    eventBus: IEventBus,
    providerRegistry: ProviderRegistryProvider,
    toolCallScheduler: ToolCallScheduler,
    userSettingsService: UserSettingsService,
    projectFolderService: ProjectFolderService,
    fileService: FileService,
    projectPath: string,
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
    this.messageProcessor = new MessageProcessor(projectFolderService, fileService, this.logger);
    this.projectPath = projectPath;
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

      // Process file references in user input before adding to messages
      await this.processAndAddInputToMessages(input);

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

      // Emit AI response started event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "AI_RESPONSE_STARTED",
        update: { status: "processing" },
        chat: this.toSerializableChat(),
        timestamp: new Date(),
      });

      // Process AI SDK v5 stream
      for await (const part of result.fullStream) {
        if (effectiveSignal.aborted) throw new Error("Operation aborted");

        switch (part.type) {
          case "text":
            content += part.text;
            
            // Emit streaming chunk event
            await this.eventBus.emit({
              kind: "ChatUpdatedEvent",
              chatId: this.id,
              updateType: "AI_RESPONSE_STREAMING",
              update: { 
                chunk: part.text,
                accumulatedContent: content 
              },
              chat: this.toSerializableChat(),
              timestamp: new Date(),
            });
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
        role: "assistant",
        content: content || "AI response",
        timestamp: new Date(),
      };
      this.messages.push(aiMessage);

      // Emit message added event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "MESSAGE_ADDED",
        update: { message: aiMessage },
        chat: this.toSerializableChat(),
        timestamp: new Date(),
      });

      // Handle tool calls if any
      if (toolCalls.length > 0) {
        this.status = "waiting_confirmation";
        return {
          status: "waiting_confirmation",
          toolCalls,
        };
      }

      // Emit AI response completed event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "AI_RESPONSE_COMPLETED",
        update: { 
          message: aiMessage,
          finalContent: content 
        },
        chat: this.toSerializableChat(),
        timestamp: new Date(),
      });

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

  toJSON(): ChatFileData {
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

  private toSerializableChat(): ChatFileData {
    return this.toJSON();
  }

  private async processAndAddInputToMessages(input: TurnInput): Promise<void> {
    let message: ChatMessage;

    switch (input.type) {
      case "user_message": {
        // Process file references in user message content
        const processedContent = await this.messageProcessor.processFileReferences(
          input.content,
          this.projectPath
        );
        
        // Extract file references for metadata
        const fileReferences = this.messageProcessor.extractChatFileReferences(input.content);
        
        message = {
          id: uuidv4(),
          role: "user",
          content: processedContent,
          timestamp: new Date(),
          metadata: fileReferences.length > 0 ? { fileReferences } : undefined,
        };
        break;
      }
      case "tool_results":
        message = {
          id: uuidv4(),
          role: "system",
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

    // Emit message added event for user messages
    if (input.type === "user_message") {
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "MESSAGE_ADDED",
        update: { message },
        chat: this.toSerializableChat(),
        timestamp: new Date(),
      });
    }
  }

  private buildMessagesForAI() {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private getModelConfig(): ChatModelConfig | null {
    if (this.metadata?.model && typeof this.metadata.model === "object") {
      return this.metadata.model as ChatModelConfig;
    }
    return null;
  }

  static async fromJSON(
    data: ChatFileData,
    eventBus: IEventBus,
    providerRegistry: ProviderRegistryProvider,
    toolScheduler: ToolCallScheduler,
    userSettingsService: UserSettingsService,
    projectFolderService: ProjectFolderService,
    fileService: FileService,
  ): Promise<ChatSession> {
    // Determine project path by finding the project folder containing this chat file
    const projectFolder = await projectFolderService.getProjectFolderForPath(data.absoluteFilePath);
    const projectPath = projectFolder?.path || path.dirname(data.absoluteFilePath);
    
    const chatSession = new ChatSession(
      data,
      eventBus,
      providerRegistry,
      toolScheduler,
      userSettingsService,
      projectFolderService,
      fileService,
      projectPath,
    );
    chatSession.status = data.status;
    chatSession.fileStatus = data.fileStatus;
    chatSession.currentTurn = data.currentTurn;
    chatSession.maxTurns = data.maxTurns;
    return chatSession;
  }
}
