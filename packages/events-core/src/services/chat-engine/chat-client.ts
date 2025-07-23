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
  type ChatStatus,
  type UserInput,
  type ToolCall,
  type ToolResults,
  type ConversationResult,
} from "./chat-session.js";
import type { ChatUpdatedEvent } from "./events.js";
import { ChatSessionRepositoryImpl, type ChatSessionRepository } from "./chat-session-repository.js";

interface CreateChatConfig {
  mode?: ChatMode;
  model?: string;
  knowledge?: string[];
  prompt?: string;
  newTask?: boolean;
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
  private readonly sessions: Map<string, ChatSession> = new Map();
  private readonly sessionAccessTime: Map<string, number> = new Map();
  private readonly maxSessions: number = 10;

  constructor(
    eventBus: IEventBus,
    chatSessionRepository: ChatSessionRepository,
    taskService: TaskService,
    projectFolderService: ProjectFolderService,
  ) {
    this.logger = new Logger({ name: "ChatClient" });
    this.eventBus = eventBus;
    this.chatSessionRepository = chatSessionRepository;
    this.taskService = taskService;
    this.projectFolderService = projectFolderService;
  }

  // Core API methods according to design specification
  async sendMessage(
    chatSessionId: string,
    message: string,
    attachments?: MessageAttachment[],
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(chatSessionId);

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
    chatSessionId: string,
    inputData?: Record<string, any>,
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(chatSessionId);

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
    chatSessionId: string,
    toolCallId: string,
    outcome: "approved" | "denied",
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(chatSessionId);

    if (session.status !== "waiting_confirmation") {
      throw new Error("Session is not waiting for tool confirmation");
    }

    const toolResults: ToolResults = {
      type: "tool_results",
      results: [{
        id: toolCallId,
        result: outcome === "approved" ? "Tool execution approved" : "Tool execution denied",
      }],
    };

    const result = await session.runTurn(toolResults);
    await this.persistSession(session);

    return result;
  }

  async abortChat(chatSessionId: string): Promise<void> {
    const session = this.sessions.get(chatSessionId);
    if (session) {
      session.abort();
    }
  }

  async createChat(
    targetDirectory: string,
    config?: CreateChatConfig,
  ): Promise<string> {
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

    const filePath = await this.chatSessionRepository.save(chatSession, targetDirectory);
    chatSession.absoluteFilePath = filePath;

    // Create in-memory session
    const session = ChatSession.fromJSON(chatSession, this.eventBus);
    this.sessions.set(chatSession.id, session);
    this.sessionAccessTime.set(chatSession.id, Date.now());

    // Send initial prompt if provided
    if (config?.prompt) {
      await this.sendMessage(chatSession.id, config.prompt);
    }

    return chatSession.id;
  }

  async getOrLoadChatSession(chatSessionId: string): Promise<ChatSession> {
    // Check if already in memory
    if (this.sessions.has(chatSessionId)) {
      this.sessionAccessTime.set(chatSessionId, Date.now());
      return this.sessions.get(chatSessionId)!;
    }

    // Check session pool size and evict if necessary
    if (this.sessions.size >= this.maxSessions) {
      await this.evictLeastRecentlyUsedSession();
    }

    // Load from repository
    const chatData = await this.chatSessionRepository.load(chatSessionId);
    const session = ChatSession.fromJSON(chatData, this.eventBus);

    // Add to session pool
    this.sessions.set(chatSessionId, session);
    this.sessionAccessTime.set(chatSessionId, Date.now());

    return session;
  }

  async updateChat(
    chatSessionId: string,
    updates: Partial<SerializableChat>,
  ): Promise<void> {
    const session = await this.getOrLoadChatSession(chatSessionId);
    
    if (updates.metadata) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    if (updates.maxTurns !== undefined) {
      session.maxTurns = updates.maxTurns;
    }
    
    session.updatedAt = new Date();
    await this.persistSession(session);
  }

  async deleteChat(chatSessionId: string): Promise<void> {
    await this.chatSessionRepository.delete(chatSessionId);
    this.sessions.delete(chatSessionId);
    this.sessionAccessTime.delete(chatSessionId);
  }

  async loadChatFromFile(filePath: string): Promise<string> {
    const chatData = await this.chatSessionRepository.loadFromFile(filePath);
    const session = ChatSession.fromJSON(chatData, this.eventBus);
    
    this.sessions.set(chatData.id, session);
    this.sessionAccessTime.set(chatData.id, Date.now());
    
    return chatData.id;
  }

  // Private helper methods
  private async evictLeastRecentlyUsedSession(): Promise<void> {
    let oldestTime = Date.now();
    let sessionToEvict: string | null = null;

    for (const [sessionId, accessTime] of this.sessionAccessTime.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        sessionToEvict = sessionId;
      }
    }

    if (sessionToEvict) {
      const session = this.sessions.get(sessionToEvict);
      if (session) {
        await this.persistSession(session);
      }
      this.sessions.delete(sessionToEvict);
      this.sessionAccessTime.delete(sessionToEvict);
    }
  }

  private async persistSession(session: ChatSession): Promise<void> {
    const chatData = session.toJSON();
    await this.chatSessionRepository.save(chatData);
  }

  // Legacy compatibility methods
  async getSession(chatId: string): Promise<ChatSession> {
    return this.getOrLoadChatSession(chatId);
  }

  async loadSession(chatId: string): Promise<void> {
    await this.getOrLoadChatSession(chatId);
  }

  async saveSession(): Promise<void> {
    // Save all active sessions
    for (const session of this.sessions.values()) {
      await this.persistSession(session);
    }
  }

  async deleteSession(): Promise<void> {
    // Delete the first active session (for backward compatibility)
    const firstSessionId = this.sessions.keys().next().value;
    if (firstSessionId) {
      await this.deleteChat(firstSessionId);
    }
  }

  async createSession(
    targetDirectoryAbsolutePath: string,
    newTask: boolean,
    mode: ChatMode,
    knowledge: string[],
    prompt?: string,
    model: string = "default",
    correlationId?: string,
  ): Promise<string> {
    return this.createChat(targetDirectoryAbsolutePath, {
      newTask,
      mode,
      knowledge,
      prompt,
      model,
    });
  }

  async sendToolConfirmation(
    chatId: string,
    toolCalls: ToolCall[],
    correlationId?: string,
  ): Promise<ConversationResult> {
    const session = await this.getOrLoadChatSession(chatId);

    if (session.status !== "waiting_confirmation") {
      throw new Error("Chat session is not waiting for tool confirmation");
    }

    const toolResults: ToolResults = {
      type: "tool_results",
      results: toolCalls.map((call) => ({
        id: call.id,
        result: `Executed ${call.name}`,
      })),
    };

    const result = await session.runTurn(toolResults);
    await this.persistSession(session);

    return result;
  }

  // Additional compatibility and utility methods
  async createEmptyChat(
    targetDirectoryAbsolutePath: string,
    correlationId?: string,
  ): Promise<SerializableChat> {
    const sessionId = await this.createChat(targetDirectoryAbsolutePath);
    const session = await this.getOrLoadChatSession(sessionId);
    return session.toJSON();
  }

  async findChatById(chatId: string): Promise<SerializableChat | undefined> {
    try {
      const session = await this.getOrLoadChatSession(chatId);
      return session.toJSON();
    } catch {
      return undefined;
    }
  }

  async getChatById(chatId: string): Promise<SerializableChat> {
    const session = await this.getOrLoadChatSession(chatId);
    return session.toJSON();
  }

  async getAllChats(): Promise<SerializableChat[]> {
    // This would need to be implemented by scanning all project folders
    // For now, return active sessions plus attempt to load from repository
    const result: SerializableChat[] = [];
    
    // Add active sessions
    for (const session of this.sessions.values()) {
      result.push(session.toJSON());
    }

    return result;
  }

  async updatePromptDraft(
    chatId: string,
    promptDraft: string,
    correlationId?: string,
  ): Promise<SerializableChat> {
    await this.updateChat(chatId, {
      metadata: { promptDraft }
    });

    const session = await this.getOrLoadChatSession(chatId);
    
    // Emit metadata updated event
    await this.eventBus.emit({
      kind: "ChatUpdatedEvent",
      chatId: session.id,
      updateType: "METADATA_UPDATED",
      update: {
        metadata: { promptDraft },
      },
      chat: session.toJSON(),
      timestamp: new Date(),
      correlationId,
    });

    return session.toJSON();
  }

  async openChatFile(
    absoluteFilePath: string,
    correlationId?: string,
  ): Promise<SerializableChat> {
    const sessionId = await this.loadChatFromFile(absoluteFilePath);
    const session = await this.getOrLoadChatSession(sessionId);
    return session.toJSON();
  }
}
