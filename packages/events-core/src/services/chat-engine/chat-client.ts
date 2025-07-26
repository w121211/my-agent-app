// packages/events-core/src/services/chat-engine/chat-client.ts

import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { LanguageModel, ToolSet } from "ai";
import type { IEventBus } from "../../event-bus.js";
import type { TaskService } from "../task-service.js";
import type { ProjectFolderService } from "../project-folder-service.js";
import { ChatSession } from "./chat-session.js";
import type {
  ChatFileData,
  ChatMode,
  ConversationResult,
  ModelRegistry,
  TurnInput,
} from "./types.js";
import { buildProviderRegistry } from "./ai-provider-utils.js";
import { ToolRegistry } from "../tool-call/tool-registry.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";
import { ApprovalMode } from "../tool-call/types.js";
import type { UserSettingsService } from "../user-settings-service.js";
import type { ChatSessionRepository } from "./chat-session-repository.js";

interface CreateChatConfig {
  mode?: ChatMode;
  model?: LanguageModel;
  knowledge?: string[];
  prompt?: string;
  newTask?: boolean;
}

interface CreateChatResult {
  absoluteFilePath: string;
  chatSessionId: string;
}

interface MessageAttachment {
  fileName: string;
  content: string;
}

export class ChatClient<TOOLS extends ToolSet = any> {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatSessionRepository: ChatSessionRepository;
  private readonly taskService: TaskService;
  private readonly projectFolderService: ProjectFolderService;
  private readonly userSettingsService: UserSettingsService;
  private readonly sessions: Map<string, ChatSession<TOOLS>> = new Map();
  private readonly sessionAccessTime: Map<string, number> = new Map();
  private readonly maxSessions: number = 10;
  private modelRegistries: ModelRegistry[] = [];
  private globalToolRegistry: ToolRegistry | null = null;

  constructor(
    eventBus: IEventBus,
    chatSessionRepository: ChatSessionRepository,
    taskService: TaskService,
    projectFolderService: ProjectFolderService,
    userSettingsService: UserSettingsService,
  ) {
    this.logger = new Logger({ name: "ChatClient" });
    this.eventBus = eventBus;
    this.chatSessionRepository = chatSessionRepository;
    this.taskService = taskService;
    this.projectFolderService = projectFolderService;
    this.userSettingsService = userSettingsService;

    this.initializeGlobalDependencies();
  }

  private async initializeGlobalDependencies(): Promise<void> {
    try {
      const userSettings = await this.userSettingsService.getUserSettings();
      const providerRegistry = await buildProviderRegistry(userSettings);

      // Build model registries from provider registry
      this.modelRegistries = [
        {
          provider: providerRegistry,
          availableModels: ["anthropic:claude-3-sonnet", "openai:gpt-4"], // Example models
          metadata: {
            displayName: "Default Provider Registry",
            capabilities: ["text", "tools"],
            defaultModel: "anthropic:claude-3-sonnet",
          },
        },
      ];

      this.globalToolRegistry = new ToolRegistry(this.eventBus, this.logger);
    } catch (error) {
      this.logger.error("Failed to initialize global dependencies", error);
    }
  }

  async sendMessage(
    absoluteFilePath: string,
    chatSessionId: string,
    message: string,
    attachments?: MessageAttachment[],
  ): Promise<ConversationResult<TOOLS>> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    const userInput: TurnInput<TOOLS> = {
      type: "user_message",
      content: message,
      attachments,
    };

    const result = await session.runTurn(userInput);
    await this.persistSession(session);

    return result;
  }

  async rerunChat(
    absoluteFilePath: string,
    chatSessionId: string,
    inputData?: Record<string, any>,
  ): Promise<ConversationResult<TOOLS>> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    // Reset session to allow rerun
    session.currentTurn = 0;
    session.sessionStatus = "idle";

    const userInput: TurnInput<TOOLS> = {
      type: "user_message",
      content: inputData?.message || "Rerun previous conversation",
    };

    const result = await session.runTurn(userInput);
    await this.persistSession(session);

    return result;
  }

  async confirmToolCall(
    absoluteFilePath: string,
    chatSessionId: string,
    toolCallId: string,
    outcome: "approved" | "denied",
  ): Promise<ConversationResult<TOOLS>> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    if (session.sessionStatus !== "waiting_confirmation") {
      throw new Error("Session is not waiting for tool confirmation");
    }

    const toolResults: TurnInput<TOOLS> = {
      type: "tool_results",
      results: [
        {
          type: "tool-result",
          toolCallId,
          toolName: "unknown",
          input: {},
          output:
            outcome === "approved"
              ? "Tool execution approved"
              : "Tool execution denied",
        } as any, // Type assertion needed for ToolResultUnion
      ],
    };

    const result = await session.runTurn(toolResults);
    await this.persistSession(session);

    return result;
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

  async createChat(
    targetDirectory: string,
    config?: CreateChatConfig,
  ): Promise<CreateChatResult> {
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

    const now = new Date();
    const defaultModel: LanguageModel =
      config?.model ||
      this.modelRegistries[0]?.metadata?.defaultModel ||
      "anthropic:claude-3-sonnet";

    const chatSession: ChatFileData = {
      id: uuidv4(),
      absoluteFilePath: "", // Will be set by repository
      messages: [], // UIMessage array
      model: defaultModel,
      sessionStatus: "idle",
      fileStatus: "ACTIVE",
      currentTurn: 0,
      maxTurns: 20,
      createdAt: now,
      updatedAt: now,
      metadata: {
        mode: config?.mode || "chat",
        model: defaultModel,
        knowledge: config?.knowledge || [],
        title: "New Chat",
      },
    };

    const filePath = await this.chatSessionRepository.createNewFile(
      targetDirectory,
      chatSession,
    );
    chatSession.absoluteFilePath = filePath;

    // Create in-memory session
    const toolScheduler = this.createToolScheduler();
    const session = await ChatSession.fromFileData(
      chatSession,
      this.eventBus,
      toolScheduler,
      this.userSettingsService,
      this.projectFolderService,
      await import("../file-service.js").then(
        (m) => new m.FileService(this.eventBus),
      ),
    );

    this.sessions.set(filePath, session);
    this.sessionAccessTime.set(filePath, Date.now());

    // Send initial prompt if provided
    if (config?.prompt) {
      await this.sendMessage(filePath, chatSession.id, config.prompt);
    }

    return {
      absoluteFilePath: filePath,
      chatSessionId: chatSession.id,
    };
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
    const chatData =
      await this.chatSessionRepository.loadFromFile(absoluteFilePath);
    const toolScheduler = this.createToolScheduler();

    const session = await ChatSession.fromFileData(
      chatData,
      this.eventBus,
      toolScheduler,
      this.userSettingsService,
      this.projectFolderService,
      await import("../file-service.js").then(
        (m) => new m.FileService(this.eventBus),
      ),
    );

    // Add to session pool
    this.sessions.set(absoluteFilePath, session);
    this.sessionAccessTime.set(absoluteFilePath, Date.now());

    return session;
  }

  async updateChat(
    absoluteFilePath: string,
    updates: Partial<ChatFileData>,
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
    return this.modelRegistries;
  }

  private createToolScheduler(): ToolCallScheduler {
    if (!this.globalToolRegistry) {
      throw new Error("Global tool registry not initialized");
    }

    return new ToolCallScheduler({
      toolRegistry: Promise.resolve(this.globalToolRegistry),
      eventBus: this.eventBus,
      logger: this.logger,
      approvalMode: ApprovalMode.DEFAULT,
      outputUpdateHandler: (toolCallId, chunk) => {
        this.eventBus.emit({
          kind: "TOOL_OUTPUT_UPDATE",
          messageId: "",
          toolCallId,
          outputChunk: chunk,
          timestamp: new Date(),
        });
      },
      onAllToolCallsComplete: (completedCalls) => {
        this.logger.info("Tool calls completed", {
          count: completedCalls.length,
        });
      },
      onToolCallsUpdate: (toolCalls) => {
        this.eventBus.emit({
          kind: "TOOL_CALLS_UPDATE",
          messageId: "",
          toolCalls,
          timestamp: new Date(),
        });
      },
    });
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
    const chatData = session.toFileData();
    await this.chatSessionRepository.saveToFile(
      chatData.absoluteFilePath,
      chatData,
    );
  }
}
