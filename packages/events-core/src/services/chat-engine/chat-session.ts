// packages/events-core/src/services/chat-engine/chat-session.ts

import { gateway } from "@ai-sdk/gateway";
import { streamText } from "ai";
import { v4 as uuidv4 } from "uuid";
import { Logger, type ILogObj } from "tslog";
import type {
  ToolSet,
  ToolCallUnion,
  StreamTextResult,
  UserModelMessage,
} from "ai";
import { ToolConfirmationRequiredError } from "../tool-call/tool-call-confirmation.js";
import {
  MessageProcessor,
  getUserModelMessageContentString,
} from "./message-processor.js";
import { ToolCallRunner } from "../tool-call/tool-call-runner.js";
import type { IEventBus } from "../../event-bus.js";
import type {
  ToolExecutionResult,
  ToolAlwaysAllowRule,
} from "../tool-call/tool-call-runner.js";
import type {
  ToolCallConfirmation,
  ToolCallConfirmationOutcome,
} from "../tool-call/tool-call-confirmation.js";
import type {
  ChatMessage,
  ChatSessionStatus,
  ChatSessionData,
} from "./chat-session-repository.js";
import type { ToolRegistry } from "../tool-call/tool-registry.js";

export interface TurnResult<TOOLS extends ToolSet = ToolSet> {
  sessionStatus: ChatSessionStatus;
  currentTurn: number;
  streamResult?: StreamTextResult<TOOLS, never>;
  toolCallsAwaitingConfirmation?: ToolCallUnion<TOOLS>[];
  // toolExecutionResult?: ToolExecutionResult<TOOLS>;
}

export class ChatSession<TOOLS extends ToolSet = ToolSet> {
  id: ChatSessionData["id"];
  absoluteFilePath: ChatSessionData["absoluteFilePath"];
  messages: ChatSessionData["messages"] = [];
  modelId: ChatSessionData["modelId"];
  sessionStatus: ChatSessionData["sessionStatus"] = "idle";
  fileStatus: ChatSessionData["fileStatus"] = "active";
  currentTurn: ChatSessionData["currentTurn"] = 0;
  maxTurns: ChatSessionData["maxTurns"] = 20;
  toolSet?: TOOLS; // Session-scoped enabled tools, set once during first turn
  createdAt: ChatSessionData["createdAt"];
  updatedAt: ChatSessionData["updatedAt"];
  metadata?: ChatSessionData["metadata"];

  private currentAbortController: AbortController | null = null;
  private logger: Logger<ILogObj> = new Logger({ name: "ChatSession" });
  private toolCallRunner: ToolCallRunner<TOOLS>;

  // Tool call state management
  private toolCallsAwaitingConfirmation: Array<ToolCallUnion<TOOLS>> = [];
  private toolCallConfirmations: Array<ToolCallConfirmation> = [];
  private toolAlwaysAllowRules: Array<ToolAlwaysAllowRule> = [];

  constructor(
    data: ChatSessionData,
    toolRegistry: ToolRegistry,
    private readonly eventBus: IEventBus,
    private readonly messageProcessor: MessageProcessor,
    // private readonly providerRegistry: ProviderRegistryProvider,
  ) {
    this.id = data.id;
    this.absoluteFilePath = data.absoluteFilePath;
    this.messages = data.messages;
    this.modelId = data.modelId;
    this.toolSet = data.toolSet as TOOLS;
    this.sessionStatus = data.sessionStatus;
    this.fileStatus = data.fileStatus;
    this.currentTurn = data.currentTurn;
    this.maxTurns = data.maxTurns;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;

    this.toolCallRunner = new ToolCallRunner<TOOLS>(
      toolRegistry,
      this.eventBus,
    );
  }

  async runTurn(
    input: UserModelMessage | ToolExecutionResult<TOOLS>,
    options?: { signal?: AbortSignal; toolNames?: string[] },
  ): Promise<TurnResult<TOOLS>> {
    if (options?.signal?.aborted) {
      throw new Error("Operation aborted");
    }

    if (this.currentTurn >= this.maxTurns) {
      this.sessionStatus = "max_turns_reached";
      return {
        sessionStatus: this.sessionStatus,
        currentTurn: this.currentTurn,
      };
    }

    this.currentAbortController = new AbortController();
    const effectiveSignal =
      options?.signal || this.currentAbortController.signal;

    try {
      this.sessionStatus = "processing";

      // Set toolSet on first turn. If not specified, toolSet remains undefined (no tools)
      if (
        this.toolSet === undefined &&
        options?.toolNames &&
        options.toolNames.length > 0
      ) {
        if (this.currentTurn >= 1) {
          throw new Error("Tool set must be defined on the first turn");
        }

        // Use specific tool names to create toolSet
        this.toolSet = this.toolCallRunner.toolRegistry.getToolSetByNames(
          options.toolNames,
        ) as TOOLS;

        this.eventBus.emit({
          kind: "ChatUpdatedEvent",
          chatId: this.id,
          updateType: "TOOL_SET_UPDATED",
          update: { toolSet: this.toolSet },
          chat: this.toJSON(),
          timestamp: new Date(),
        });
      }

      // 1. Processing input
      if ("status" in input) {
        // ToolExecutionResult
        if (input.status !== "completed") {
          throw new Error("Tool input's status must be 'completed'.");
        }

        if (input.executed.length === 0) {
          throw new Error("No tool execution results found");
        }

        const message: ChatMessage = {
          id: uuidv4(),
          metadata: {
            timestamp: new Date(),
          },
          message: {
            role: "tool",
            content: input.executed,
          },
        };

        this.messages.push(message);

        // Emit message added event
        await this.eventBus.emit({
          kind: "ChatUpdatedEvent",
          chatId: this.id,
          updateType: "MESSAGE_ADDED",
          update: { message },
          chat: this.toJSON(),
          timestamp: new Date(),
        });
      } else {
        // UserModelMessage
        // Process user input message with file references
        const textContent = getUserModelMessageContentString(input);

        // Extract file references for metadata
        const fileReferences =
          this.messageProcessor.extractChatFileReferences(textContent);

        // Convert to ChatMessage and add to messages
        const message: ChatMessage = {
          id: uuidv4(),
          metadata: {
            timestamp: new Date(),
            fileReferences:
              fileReferences.length > 0 ? fileReferences : undefined,
          },
          message: input,
        };

        this.messages.push(message);

        // Emit message added event
        await this.eventBus.emit({
          kind: "ChatUpdatedEvent",
          chatId: this.id,
          updateType: "MESSAGE_ADDED",
          update: { message },
          chat: this.toJSON(),
          timestamp: new Date(),
        });
      }

      // 2. Generate AI response using streamText
      const streamResult = streamText({
        // model: this.providerRegistry.languageModel(this.modelId),
        model: gateway(this.modelId),
        messages: this.messages.map((msg) => msg.message),
        tools: this.toolSet,
        abortSignal: effectiveSignal,
      });

      this.currentTurn += 1;

      // Emit AI response started event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "AI_RESPONSE_STARTED",
        update: { status: "processing" },
        chat: this.toJSON(),
        timestamp: new Date(),
      });

      // Process AI SDK stream using native types
      const toolCallsMap = new Map<string, ToolCallUnion<TOOLS>>();

      for await (const part of streamResult.fullStream) {
        if (effectiveSignal.aborted) {
          throw new Error("Operation aborted");
        }

        switch (part.type) {
          case "text":
            await this.eventBus.emit({
              kind: "ChatUpdatedEvent",
              chatId: this.id,
              updateType: "AI_RESPONSE_STREAMING",
              update: {
                chunk: part.text,
              },
              chat: this.toJSON(),
              timestamp: new Date(),
            });
            break;

          case "tool-call":
            toolCallsMap.set(part.toolCallId, part);
            break;

          case "tool-error":
            if (part.error instanceof ToolConfirmationRequiredError) {
              const toolCall = toolCallsMap.get(part.toolCallId);
              if (toolCall === undefined) {
                throw new Error(
                  `Tool call ${part.toolCallId} not found in map for confirmation`,
                );
              }
              this.toolCallsAwaitingConfirmation.push(toolCall);
            }
            break;
        }
      }

      // 3. Add response messages that were generated during the call to the conversation history
      const generatedMessages = (await streamResult.response).messages;
      const stepsMessages: ChatMessage[] = generatedMessages.map((msg) => ({
        id: uuidv4(),
        metadata: {
          timestamp: new Date(),
        },
        message: msg,
      }));
      this.messages.push(...stepsMessages);

      // Emit message added event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "MESSAGES_ADDED",
        update: { message: stepsMessages },
        chat: this.toJSON(),
        timestamp: new Date(),
      });

      // Emit AI response completed event
      await this.eventBus.emit({
        kind: "ChatUpdatedEvent",
        chatId: this.id,
        updateType: "AI_RESPONSE_COMPLETED",
        update: {
          messages: stepsMessages,
        },
        chat: this.toJSON(),
        timestamp: new Date(),
      });

      // Handle tool calls awaiting confirmation
      if (this.toolCallsAwaitingConfirmation.length > 0) {
        this.sessionStatus = "waiting_confirmation";
        return {
          sessionStatus: this.sessionStatus,
          streamResult,
          currentTurn: this.currentTurn,
          toolCallsAwaitingConfirmation: this.toolCallsAwaitingConfirmation,
        };
      }

      // No awaiting confirmation tool calls, just return the stream result
      this.sessionStatus = "idle";
      return {
        sessionStatus: this.sessionStatus,
        streamResult,
        currentTurn: this.currentTurn,
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
        chat: this.toJSON(),
        timestamp: new Date(),
      });
    }
  }

  checkNextSpeaker(): "user" | "agent" {
    // Mock implementation - always return 'user' for now
    return "user";
  }

  abort(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
  }

  async cleanup(): Promise<void> {
    this.abort();
  }

  async confirmToolCall(
    toolCallId: string,
    outcome: ToolCallConfirmationOutcome,
  ): Promise<ToolExecutionResult<TOOLS>> {
    const confirmation: ToolCallConfirmation = {
      toolCallId,
      outcome,
      timestamp: new Date(),
    };

    if (outcome === "yes_always") {
      const toolCall = this.toolCallsAwaitingConfirmation.find(
        (tc) => tc.toolCallId === toolCallId,
      );
      if (toolCall) {
        this.toolAlwaysAllowRules.push({
          toolName: toolCall.toolName,
          sourceConfirmation: confirmation,
        });
      }
    }

    this.toolCallConfirmations.push({
      toolCallId,
      outcome,
      timestamp: new Date(),
    });

    const result = await this.toolCallRunner.execute(
      this.toolCallsAwaitingConfirmation,
      this.toolCallConfirmations,
      this.toolAlwaysAllowRules,
      {
        chatSessionId: this.id,
        messages: this.messages.map((e) => e.message),
      },
    );

    // Clean up tool call state only when execution is completed
    if (result.status === "completed") {
      this.toolCallsAwaitingConfirmation = [];
      this.toolCallConfirmations = [];
    }

    return result;
  }

  toJSON(): ChatSessionData {
    return {
      _type: "chat",
      id: this.id,
      absoluteFilePath: this.absoluteFilePath,
      messages: this.messages,
      modelId: this.modelId,
      toolSet: this.toolSet,
      sessionStatus: this.sessionStatus,
      fileStatus: this.fileStatus,
      currentTurn: this.currentTurn,
      maxTurns: this.maxTurns,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}
