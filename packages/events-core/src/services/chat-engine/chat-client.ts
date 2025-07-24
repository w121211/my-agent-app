// packages/events-core/src/services/chat-engine/chat-client.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../../event-bus.js";
import type { TaskService } from "../task-service.js";
import type { ProjectFolderService } from "../project-folder-service.js";
import {
  ChatSession,
  type SerializableChat,
  type ChatMode,
  type UserInput,
  type ToolResults,
  type ConversationResult,
} from "./chat-session.js";
import type { ChatModelConfig, AvailableModel } from "./types.js";
import {
  buildProviderRegistry,
  parseModelConfig,
  validateModelAvailability,
  getAvailableModels,
  type ProviderRegistry,
} from "./ai-provider-utils.js";
import { ToolRegistry } from "../tool-call/tool-registry.js";
import { ToolCallScheduler } from "../tool-call/tool-call-scheduler.js";
import { ApprovalMode } from "../tool-call/types.js";
import type { UserSettingsService } from "../user-settings-service.js";
import type { ChatSessionRepository } from "./chat-session-repository.js";

interface CreateChatConfig {
  mode?: ChatMode;
  model?: string | ChatModelConfig;
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

// ChatClient class for lifecycle management with session pool
export class ChatClient {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatSessionRepository: ChatSessionRepository;
  private readonly taskService: TaskService;
  private readonly projectFolderService: ProjectFolderService;
  private readonly userSettingsService: UserSettingsService;
  private readonly sessions: Map<string, ChatSession> = new Map(); // absoluteFilePath -> ChatSession
  private readonly sessionAccessTime: Map<string, number> = new Map();
  private readonly maxSessions: number = 10;
  private providerRegistry: ProviderRegistry | null = null;
  private globalToolRegistry: ToolRegistry | null = null;
  // ToolCallScheduler is now owned by individual ChatSession instances

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
      this.providerRegistry = await buildProviderRegistry(userSettings);
      this.globalToolRegistry = new ToolRegistry(this.eventBus, this.logger);
    } catch (error) {
      this.logger.error("Failed to initialize global dependencies", error);
    }
  }

  // Core API methods with file-first design
  async sendMessage(
    absoluteFilePath: string,
    chatSessionId: string,
    message: string,
    attachments?: MessageAttachment[],
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    // Verify ID consistency
    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    const userInput: UserInput = {
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
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    // Verify ID consistency
    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    // Reset session to allow rerun
    session.currentTurn = 0;
    session.status = "idle";

    const userInput: UserInput = {
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
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(absoluteFilePath);

    // Verify ID consistency
    if (session.id !== chatSessionId) {
      throw new Error(
        `Session ID mismatch: expected ${session.id}, got ${chatSessionId}`,
      );
    }

    if (session.status !== "waiting_confirmation") {
      throw new Error("Session is not waiting for tool confirmation");
    }

    const toolResults: ToolResults = {
      type: "tool_results",
      results: [
        {
          id: toolCallId,
          result:
            outcome === "approved"
              ? "Tool execution approved"
              : "Tool execution denied",
        },
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
    const chatSession: SerializableChat = {
      id: uuidv4(),
      absoluteFilePath: "", // Will be set by repository
      messages: [],
      status: "idle",
      fileStatus: "ACTIVE",
      currentTurn: 0,
      maxTurns: 20,
      createdAt: now,
      updatedAt: now,
      metadata: {
        mode: config?.mode || "chat",
        model: config?.model || "default",
        knowledge: config?.knowledge || [],
        title: "New Chat",
      },
    };

    const filePath = await this.chatSessionRepository.createNewFile(
      targetDirectory,
      chatSession,
    );
    chatSession.absoluteFilePath = filePath;

    // Create in-memory session with full dependencies
    const toolScheduler = this.createToolScheduler();
    const session = new ChatSession(
      chatSession,
      this.eventBus,
      this.providerRegistry!,
      toolScheduler,
      this.userSettingsService,
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

  async getOrLoadChatSession(absoluteFilePath: string): Promise<ChatSession> {
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
    const session = new ChatSession(
      chatData,
      this.eventBus,
      this.providerRegistry!,
      toolScheduler,
      this.userSettingsService,
    );

    // Add to session pool
    this.sessions.set(absoluteFilePath, session);
    this.sessionAccessTime.set(absoluteFilePath, Date.now());

    return session;
  }

  async updateChat(
    absoluteFilePath: string,
    updates: Partial<SerializableChat>,
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
      // Clean up session (now handles its own scheduler cleanup)
      await session.cleanup();
    }

    this.sessions.delete(absoluteFilePath);
    this.sessionAccessTime.delete(absoluteFilePath);
  }

  // AI mdoels methods
  async getAvailableModels(): Promise<AvailableModel[]> {
    const userSettings = await this.userSettingsService.getUserSettings();
    return getAvailableModels(userSettings);
  }

  async validateModelConfig(modelConfig: ChatModelConfig): Promise<boolean> {
    if (!this.providerRegistry) {
      await this.initializeGlobalDependencies();
    }

    if (!this.providerRegistry) {
      return false;
    }

    return validateModelAvailability(this.providerRegistry, modelConfig);
  }

  // Private helper methods
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
          messageId: "", // Will be set by session
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
          messageId: "", // Will be set by session
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
        // Clean up session (now handles its own scheduler cleanup)
        await session.cleanup();
      }
      this.sessions.delete(sessionToEvict);
      this.sessionAccessTime.delete(sessionToEvict);
    }
  }

  private async persistSession(session: ChatSession): Promise<void> {
    const chatData = session.toJSON();
    await this.chatSessionRepository.saveToFile(
      chatData.absoluteFilePath,
      chatData,
    );
  }
}
