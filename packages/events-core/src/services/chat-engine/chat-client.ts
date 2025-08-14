// packages/events-core/src/services/chat-engine/chat-client.ts

import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { StreamTextResult, ToolSet, UserModelMessage } from "ai";
import { ChatSession } from "./chat-session.js";
import { MessageProcessor } from "./message-processor.js";
import type { IEventBus } from "../../event-bus.js";
import type { ProjectFolderService } from "../project-folder-service.js";
import type { TaskService } from "../task-service.js";
import type { UserSettingsService } from "../user-settings-service.js";
import type { FileService } from "../file-service.js";
import type { ToolCallConfirmationOutcome } from "../tool-call/tool-call-confirmation.js";
import type { ToolExecutionResult } from "../tool-call/tool-call-runner.js";
import type { ToolRegistry } from "../tool-call/tool-registry.js";
import type { TurnResult } from "./chat-session.js";
import type {
  ChatMode,
  ChatSessionData,
  ChatSessionRepository,
} from "./chat-session-repository.js";
import type { ModelRegistry } from "./types.js";

// const DEFAULT_MODEL_ID = "anthropic:claude-3-sonnet"; // Format: `providerId:modelId`
const DEFAULT_MODEL_ID = "openai/gpt-4o"; // Gateway model id format: `providerId/modelId`

export interface CreateChatSessionConfig {
  mode?: ChatMode;
  // modelId?: `${string}:${string}`; // `providerId:modelId`, e.g. "openai:gpt-4o"
  modelId?: `${string}/${string}`; // `providerId/modelId`, e.g. "openai/gpt-4o"
  knowledge?: string[];
  prompt?: string;
  newTask?: boolean;
}

export class ChatClient<TOOLS extends ToolSet> {
  private readonly logger: Logger<ILogObj> = new Logger({ name: "ChatClient" });
  private readonly sessions: Map<string, ChatSession<TOOLS>> = new Map();
  private readonly sessionAccessTime: Map<string, number> = new Map();
  private readonly maxSessions: number = 10;

  constructor(
    private readonly eventBus: IEventBus,
    private readonly chatSessionRepository: ChatSessionRepository,
    private readonly taskService: TaskService,
    private readonly projectFolderService: ProjectFolderService,
    private readonly userSettingsService: UserSettingsService,
    private readonly fileService: FileService,
    private readonly toolRegistry: ToolRegistry,
    // private readonly providerRegistry: ProviderRegistryProvider,
  ) {}

  async sendMessage(
    absoluteFilePath: string,
    chatSessionId: string,
    input: UserModelMessage | ToolExecutionResult<TOOLS>,
  ): Promise<{
    turnResult: TurnResult<TOOLS>;
    updatedChatSession: ChatSession<TOOLS>;
  }> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    // Handle user message or tool execution result
    let result = await session.runTurn(input);

    while (true) {
      await this.persistSession(session);

      // If output has tool calls awaiting confirmation, return early
      if (
        result.toolCallsAwaitingConfirmation !== undefined &&
        result.toolCallsAwaitingConfirmation.length > 0
      ) {
        return {
          turnResult: result,
          updatedChatSession: session,
        };
      }

      // Check next speaker
      const nextSpeaker = session.checkNextSpeaker();

      if (nextSpeaker !== "agent") {
        break;
      }

      // Mock human input for agent continuation
      const mockHumanInput: UserModelMessage = {
        role: "user",
        content: "Continue.",
      };

      result = await session.runTurn(mockHumanInput);
    }

    return {
      turnResult: result,
      updatedChatSession: session,
    };
  }

  // TODO: Create a backup of the current session before rerun to prevent data loss.
  async rerunChat(
    absoluteFilePath: string,
    chatSessionId: string,
  ): Promise<TurnResult<TOOLS>> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    // Reset session to allow rerun
    session.currentTurn = 0;
    session.sessionStatus = "idle";

    // Filter user messages directly from session history
    const userMessages = session.messages.filter(
      (msg) => msg.message.role === "user",
    );

    if (userMessages.length === 0) {
      throw new Error("No user messages found in session history to rerun");
    }

    let lastResult: TurnResult<TOOLS> | null = null;

    // Iterate through each user message in the conversation history
    for (const userMessage of userMessages) {
      // Use the ModelMessage directly from the ChatMessage
      const modelMessage = userMessage.message;
      if (modelMessage.role === "user") {
        lastResult = await session.runTurn(modelMessage);
      }

      // If session reaches max turns or other stopping condition, break
      if (lastResult?.sessionStatus === "max_turns_reached") {
        break;
      }
    }

    await this.persistSession(session);

    return lastResult!;
  }

  async confirmToolCall(
    absoluteFilePath: string,
    chatSessionId: string,
    toolCallId: string,
    outcome: ToolCallConfirmationOutcome,
  ): Promise<{
    turnResult: TurnResult<TOOLS>;
    updatedChatSession: ChatSession<TOOLS>;
  }> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    if (session.sessionStatus !== "waiting_confirmation") {
      throw new Error("Session is not waiting for tool confirmation");
    }

    // Get tool execution result from confirmation
    const toolExecutionResult = await session.confirmToolCall(
      toolCallId,
      outcome,
    );

    if (toolExecutionResult.status === "awaiting_confirmations") {
      // Still awaiting more confirmations, persist session and return current state
      await this.persistSession(session);
      const turnResult: TurnResult<TOOLS> = {
        sessionStatus: session.sessionStatus,
        streamResult: {} as StreamTextResult<TOOLS, never>, // This will be updated when we support proper streaming
        currentTurn: session.currentTurn,
        toolCallsAwaitingConfirmation:
          toolExecutionResult.toolCallsAwaitingConfirmation,
      };
      return {
        turnResult,
        updatedChatSession: session,
      };
    }

    // Route through sendMessage with tool execution result - unified entry point
    return await this.sendMessage(
      absoluteFilePath,
      chatSessionId,
      toolExecutionResult,
    );
  }

  async abortChat(
    absoluteFilePath: string,
    chatSessionId: string,
  ): Promise<void> {
    const session = this.sessions.get(absoluteFilePath);
    if (session && session.id === chatSessionId) {
      session.abort();
    }
  }

  async createChatSession(
    targetDirectory: string,
    config?: CreateChatSessionConfig,
  ): Promise<ChatSession<TOOLS>> {
    // Validate project folder
    const isInProjectFolder =
      await this.projectFolderService.isPathInProjectFolder(targetDirectory);

    if (!isInProjectFolder) {
      throw new Error(
        `Cannot create chat outside of project folders. Path ${targetDirectory} is not within any registered project folder.`,
      );
    }

    // Create task if requested
    if (config?.newTask) {
      const result = await this.taskService.createTask(
        "New Chat Task",
        {},
        targetDirectory,
      );
      targetDirectory = result.absoluteDirectoryPath;
    }

    // if (this.providerRegistry === null) {
    //   throw new Error("Provider registry not initialized");
    // }

    const now = new Date();
    const chatSessionData: ChatSessionData = {
      _type: "chat",
      id: uuidv4(),
      absoluteFilePath: "", // Will be set by repository
      messages: [],
      modelId: config?.modelId ?? DEFAULT_MODEL_ID,
      sessionStatus: "idle",
      fileStatus: "active",
      currentTurn: 0,
      maxTurns: 20,
      createdAt: now,
      updatedAt: now,
      metadata: {
        mode: config?.mode || "chat",
        knowledge: config?.knowledge || [],
        title: "New Chat",
      },
    };

    const filePath = await this.chatSessionRepository.createNewFile(
      targetDirectory,
      chatSessionData,
    );
    chatSessionData.absoluteFilePath = filePath;

    const chatSession = this.createChatSessionFromData(chatSessionData);

    // Add to session pool
    this.sessions.set(chatSession.absoluteFilePath, chatSession);
    this.sessionAccessTime.set(chatSession.absoluteFilePath, Date.now());

    return chatSession;
  }

  async getOrLoadChatSession(
    absoluteFilePath: string,
  ): Promise<ChatSession<TOOLS>> {
    // Check if already in memory
    if (this.sessions.has(absoluteFilePath)) {
      this.sessionAccessTime.set(absoluteFilePath, Date.now());
      return this.sessions.get(absoluteFilePath)!;
    }

    // Check session pool size and evict if necessary
    if (this.sessions.size >= this.maxSessions) {
      await this.evictLeastRecentlyUsedSession();
    }

    // Load from repository
    const chatSessionData =
      await this.chatSessionRepository.loadFromFile(absoluteFilePath);

    return this.createChatSessionFromData(chatSessionData);
  }

  async updateChat(
    absoluteFilePath: string,
    updates: Partial<ChatSessionData>,
  ): Promise<void> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (updates.metadata) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    if (updates.maxTurns !== undefined) {
      session.maxTurns = updates.maxTurns;
    }

    session.updatedAt = new Date();
    await this.persistSession(session);
  }

  async deleteChat(absoluteFilePath: string): Promise<void> {
    const fs = await import("fs/promises");
    await fs.unlink(absoluteFilePath);

    const session = this.sessions.get(absoluteFilePath);
    if (session) {
      await session.cleanup();
    }

    this.sessions.delete(absoluteFilePath);
    this.sessionAccessTime.delete(absoluteFilePath);
  }

  async getAvailableModels(): Promise<ModelRegistry[]> {
    // Get available models from ai provider utils
    throw new Error("Method not implemented.");
  }

  private createChatSessionFromData(data: ChatSessionData): ChatSession<TOOLS> {
    const messageProcessor = new MessageProcessor(this.fileService);
    const chatSession = new ChatSession<TOOLS>(
      data,
      this.toolRegistry,
      this.eventBus,
      messageProcessor,
      // this.providerRegistry,
    );

    return chatSession;
  }

  private async evictLeastRecentlyUsedSession(): Promise<void> {
    let oldestTime = Date.now();
    let sessionToEvict: string | null = null;

    for (const [filePath, accessTime] of this.sessionAccessTime.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        sessionToEvict = filePath;
      }
    }

    if (sessionToEvict) {
      const session = this.sessions.get(sessionToEvict);
      if (session) {
        await this.persistSession(session);
        await session.cleanup();
      }
      this.sessions.delete(sessionToEvict);
      this.sessionAccessTime.delete(sessionToEvict);
    }
  }

  private async persistSession(session: ChatSession<TOOLS>): Promise<void> {
    const chatData = session.toJSON();
    await this.chatSessionRepository.saveToFile(
      chatData.absoluteFilePath,
      chatData,
    );
  }
}
