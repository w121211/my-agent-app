// packages/events-core/src/services/chat-engine/chat-session.ts

import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { Logger, type ILogObj } from "tslog";
import { streamText, convertToModelMessages } from "ai";
import type {
  LanguageModel,
  ToolSet,
  ToolCallUnion,
  StreamTextResult,
  TextStreamPart,
  FinishReason,
  UIMessage,
} from "ai";
import type { IEventBus } from "../../event-bus.js";
import type {
  ChatMessage,
  ChatMessageMetadata,
  ChatSessionStatus,
  ChatFileStatus,
  ChatFileData,
  ChatMetadata,
  TurnInput,
  ConversationResult,
} from "./types.js";
import type { UserSettingsService } from "../user-settings-service.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";
import { MessageProcessor } from "./message-processor.js";
import type { FileService } from "../file-service.js";
import type { ProjectFolderService } from "../project-folder-service.js";

export class ChatSession<TOOLS extends ToolSet = any> {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[] = []; // UIMessage<ChatMessageMetadata>[]
  sessionStatus: ChatSessionStatus = "idle";
  fileStatus: ChatFileStatus = "ACTIVE";
  currentTurn: number = 0;
  maxTurns: number = 20;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;

  private eventBus: IEventBus;
  private currentAbortController: AbortController | null = null;
  private model: LanguageModel;
  private toolCallScheduler: ToolCallScheduler;
  private logger: Logger<ILogObj>;
  private userSettingsService: UserSettingsService;
  private messageProcessor: MessageProcessor;
  private projectPath: string;

  constructor(
    data: ChatFileData,
    eventBus: IEventBus,
    model: LanguageModel,
    toolCallScheduler: ToolCallScheduler,
    userSettingsService: UserSettingsService,
    projectFolderService: ProjectFolderService,
    fileService: FileService,
    projectPath: string,
  ) {
    this.id = data.id;
    this.absoluteFilePath = data.absoluteFilePath;
    this.messages = data.messages;
    this.sessionStatus = data.sessionStatus;
    this.fileStatus = data.fileStatus;
    this.currentTurn = data.currentTurn;
    this.maxTurns = data.maxTurns;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;

    this.eventBus = eventBus;
    this.model = data.model;
    this.toolCallScheduler = toolCallScheduler;
    this.userSettingsService = userSettingsService;
    this.logger = new Logger({ name: "ChatSession" });
    this.messageProcessor = new MessageProcessor(
      projectFolderService,
      fileService,
      this.logger,
    );
    this.projectPath = projectPath;
  }

  async runTurn(
    input: TurnInput<TOOLS>,
    options?: { signal?: AbortSignal },
  ): Promise<ConversationResult<TOOLS>> {
    if (options?.signal?.aborted) {
      throw new Error("Operation aborted");
    }

    if (this.currentTurn >= this.maxTurns) {
      this.sessionStatus = "max_turns_reached";
      return { status: "max_turns_reached" };
    }

    this.currentAbortController = new AbortController();
    const effectiveSignal =
      options?.signal || this.currentAbortController.signal;

    try {
      this.sessionStatus = "processing";
      this.currentTurn++;

      // Process and add input to messages using UIMessage format
      await this.processAndAddInputToMessages(input);

      // Emit status change event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "STATUS_CHANGED",
        update: { status: this.sessionStatus },
        chat: this.toFileData(),
        timestamp: new Date(),
      });

      // Convert UIMessages to ModelMessages for AI SDK
      const modelMessages = convertToModelMessages(this.messages, {
        ignoreIncompleteToolCalls: true,
      });

      // Generate AI response using streamText
      const result: StreamTextResult<TOOLS, never> = streamText({
        model: this.model,
        messages: modelMessages,
        abortSignal: effectiveSignal,
      });

      let content = "";
      const toolCalls: ToolCallUnion<TOOLS>[] = [];

      // Emit AI response started event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "AI_RESPONSE_STARTED",
        update: { status: "processing" },
        chat: this.toFileData(),
        timestamp: new Date(),
      });

      // Process AI SDK stream using native types
      // for await (const part: TextStreamPart<TOOLS> of result.fullStream) {
      for await (const part of result.fullStream) {
        if (effectiveSignal.aborted) {
          throw new Error("Operation aborted");
        }

        switch (part.type) {
          case "text":
            content += part.text;

            await this.eventBus.emit({
              kind: "ChatUpdatedEvent",
              chatId: this.id,
              updateType: "AI_RESPONSE_STREAMING",
              update: {
                chunk: part.text,
                accumulatedContent: content,
              },
              chat: this.toFileData(),
              timestamp: new Date(),
            });
            break;

          case "tool-call":
            // part is already ToolCallUnion<TOOLS> type
            toolCalls.push(part);
            break;
        }
      }

      // Add AI response as UIMessage
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        metadata: {
          timestamp: new Date(),
        },
        parts: [
          {
            type: "text",
            text: content || "AI response",
          },
        ],
      };
      this.messages.push(aiMessage);

      // Emit message added event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "MESSAGE_ADDED",
        update: { message: aiMessage },
        chat: this.toFileData(),
        timestamp: new Date(),
      });

      // Handle tool calls if any
      if (toolCalls.length > 0) {
        this.sessionStatus = "waiting_confirmation";
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
          finalContent: content,
        },
        chat: this.toFileData(),
        timestamp: new Date(),
      });

      // Get finish reason from result
      const finishReason: FinishReason = await result.finishReason;

      this.sessionStatus = "idle";
      return {
        status: "complete",
        content,
        finishReason,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.sessionStatus = "idle";
        throw new Error("Operation cancelled by user");
      }
      throw error;
    } finally {
      this.currentAbortController = null;
      this.updatedAt = new Date();

      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "STATUS_CHANGED",
        update: { status: this.sessionStatus },
        chat: this.toFileData(),
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
    this.abort();
  }

  toFileData(): ChatFileData {
    return {
      id: this.id,
      absoluteFilePath: this.absoluteFilePath,
      messages: this.messages,
      model: this.model,
      sessionStatus: this.sessionStatus,
      fileStatus: this.fileStatus,
      currentTurn: this.currentTurn,
      maxTurns: this.maxTurns,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }

  private async processAndAddInputToMessages(
    input: TurnInput<TOOLS>,
  ): Promise<void> {
    let message: ChatMessage;

    switch (input.type) {
      case "user_message": {
        // Process file references in user message content
        const processedContent =
          await this.messageProcessor.processFileReferences(
            input.content,
            this.projectPath,
          );

        // Extract file references for metadata
        const fileReferences = this.messageProcessor.extractChatFileReferences(
          input.content,
        );

        message = {
          id: uuidv4(),
          role: "user",
          metadata: {
            timestamp: new Date(),
            fileReferences:
              fileReferences.length > 0 ? fileReferences : undefined,
          },
          parts: [
            {
              type: "text",
              text: processedContent,
            },
          ],
        };
        break;
      }

      case "tool_results":
        message = {
          id: uuidv4(),
          role: "system",
          metadata: {
            timestamp: new Date(),
          },
          parts: [
            {
              type: "text",
              text: JSON.stringify(input.results),
            },
          ],
        };
        break;

      case "continue":
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
        chat: this.toFileData(),
        timestamp: new Date(),
      });
    }
  }

  static async fromFileData(
    data: ChatFileData,
    eventBus: IEventBus,
    toolScheduler: ToolCallScheduler,
    userSettingsService: UserSettingsService,
    projectFolderService: ProjectFolderService,
    fileService: FileService,
  ): Promise<ChatSession<any>> {
    // Determine project path by finding the project folder containing this chat file
    const projectFolder = await projectFolderService.getProjectFolderForPath(
      data.absoluteFilePath,
    );
    const projectPath =
      projectFolder?.path || path.dirname(data.absoluteFilePath);

    return new ChatSession(
      data,
      eventBus,
      data.model, // Use the model from file data
      toolScheduler,
      userSettingsService,
      projectFolderService,
      fileService,
      projectPath,
    );
  }
}
