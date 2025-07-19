// packages/events-core/src/services/chat-engine/chat-client.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../../event-bus.js";
import type { ChatRepository } from "../chat-repository.js";
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

// ChatClient class for lifecycle management
export class ChatClient {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatRepository: ChatRepository;
  private readonly taskService: TaskService;
  private readonly projectFolderService: ProjectFolderService;
  private currentChatSession: ChatSession | null = null;

  constructor(
    eventBus: IEventBus,
    chatRepository: ChatRepository,
    taskService: TaskService,
    projectFolderService: ProjectFolderService,
  ) {
    this.logger = new Logger({ name: "ChatClient" });
    this.eventBus = eventBus;
    this.chatRepository = chatRepository;
    this.taskService = taskService;
    this.projectFolderService = projectFolderService;
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
    // Validate that the target directory is within a project folder
    const isInProjectFolder =
      await this.projectFolderService.isPathInProjectFolder(
        targetDirectoryAbsolutePath,
      );

    if (!isInProjectFolder) {
      throw new Error(
        `Cannot create chat outside of project folders. Path ${targetDirectoryAbsolutePath} is not within any registered project folder.`,
      );
    }

    this.logger.info(
      `Creating new chat session in project folder at: ${targetDirectoryAbsolutePath}`,
    );

    const now = new Date();

    // Create task if requested
    if (newTask) {
      const result = await this.taskService.createTask(
        "New Chat Task",
        {},
        targetDirectoryAbsolutePath,
        correlationId,
      );
      targetDirectoryAbsolutePath = result.absoluteDirectoryPath;
    }

    const chatData: Omit<
      SerializableChat,
      "absoluteFilePath" | "status" | "fileStatus" | "currentTurn" | "maxTurns"
    > = {
      id: uuidv4(),
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        mode,
        model,
        knowledge,
        title: "New Chat",
      },
    };

    // Create chat object using repository (for file persistence)
    const persistedChat = await this.chatRepository.createChat(
      {
        ...chatData,
        status: "ACTIVE",
      },
      targetDirectoryAbsolutePath,
      correlationId,
    );

    // Create ChatSession instance with turn management
    this.currentChatSession = new ChatSession(
      {
        ...chatData,
        absoluteFilePath: persistedChat.absoluteFilePath,
      },
      this.eventBus,
    );

    // If initial prompt is provided, send it
    if (prompt) {
      await this.sendMessage(
        this.currentChatSession.id,
        prompt,
        undefined,
        correlationId,
      );
    }

    return this.currentChatSession.id;
  }

  async loadSession(chatId: string): Promise<void> {
    const persistedChat = await this.chatRepository.findById(chatId);
    if (!persistedChat) {
      throw new Error(`Chat not found with ID: ${chatId}`);
    }

    // Convert to ChatSession instance
    this.currentChatSession = ChatSession.fromJSON(
      {
        id: persistedChat.id,
        absoluteFilePath: persistedChat.absoluteFilePath,
        messages: persistedChat.messages,
        status: "idle",
        fileStatus: persistedChat.status,
        currentTurn: 0,
        maxTurns: 20,
        createdAt: persistedChat.createdAt,
        updatedAt: persistedChat.updatedAt,
        metadata: persistedChat.metadata,
      },
      this.eventBus,
    );
  }

  async saveSession(): Promise<void> {
    if (!this.currentChatSession) throw new Error("No active session");

    // Save to repository using the existing persistence format
    const chatData = this.currentChatSession.toJSON();
    await this.chatRepository.updateMetadata(
      chatData.absoluteFilePath,
      chatData.metadata || {},
    );

    // Update messages if needed
    // TODO: Implement proper sync between ChatSession instance and repository
  }

  async deleteSession(): Promise<void> {
    if (!this.currentChatSession) return;

    await this.chatRepository.deleteChat(
      this.currentChatSession.absoluteFilePath,
    );
    this.currentChatSession = null;
  }

  async getSession(chatId: string): Promise<ChatSession> {
    if (!this.currentChatSession || this.currentChatSession.id !== chatId) {
      await this.loadSession(chatId);
    }
    return this.currentChatSession!;
  }

  async sendMessage(
    chatId: string,
    message: string,
    attachments?: Array<{ fileName: string; content: string }>,
    correlationId?: string,
  ): Promise<ConversationResult> {
    const chatSession = await this.getSession(chatId);

    if (chatSession.status !== "idle") {
      throw new Error(
        `Chat session is currently ${chatSession.status}. Cannot send message.`,
      );
    }

    const userInput: UserInput = {
      type: "user_message",
      content: message,
      attachments,
    };

    const result = await chatSession.runTurn(userInput);

    // Save session after turn
    await this.saveSession();

    return result;
  }

  async sendToolConfirmation(
    chatId: string,
    toolCalls: ToolCall[],
    correlationId?: string,
  ): Promise<ConversationResult> {
    const chatSession = await this.getSession(chatId);

    if (chatSession.status !== "waiting_confirmation") {
      throw new Error("Chat session is not waiting for tool confirmation");
    }

    // Execute tools and continue conversation
    const toolResults: ToolResults = {
      type: "tool_results",
      results: toolCalls.map((call) => ({
        id: call.id,
        result: `Executed ${call.name}`, // TODO: Replace with actual execution
      })),
    };

    const result = await chatSession.runTurn(toolResults);

    // Save session after turn
    await this.saveSession();

    return result;
  }

  // Legacy compatibility methods
  async createEmptyChat(
    targetDirectoryAbsolutePath: string,
    correlationId?: string,
  ): Promise<SerializableChat> {
    const sessionId = await this.createSession(
      targetDirectoryAbsolutePath,
      false,
      "chat",
      [],
      undefined,
      "default",
      correlationId,
    );

    const chatSession = await this.getSession(sessionId);
    return chatSession.toJSON();
  }

  async createChat(
    targetDirectoryAbsolutePath: string,
    newTask: boolean,
    mode: ChatMode,
    knowledge: string[],
    prompt?: string,
    model: string = "default",
    correlationId?: string,
  ): Promise<SerializableChat> {
    const sessionId = await this.createSession(
      targetDirectoryAbsolutePath,
      newTask,
      mode,
      knowledge,
      prompt,
      model,
      correlationId,
    );

    const chatSession = await this.getSession(sessionId);
    return chatSession.toJSON();
  }

  async findChatById(chatId: string): Promise<SerializableChat | undefined> {
    try {
      const chatSession = await this.getSession(chatId);
      return chatSession.toJSON();
    } catch {
      return undefined;
    }
  }

  async getChatById(chatId: string): Promise<SerializableChat> {
    const chatSession = await this.getSession(chatId);
    return chatSession.toJSON();
  }

  async getAllChats(): Promise<SerializableChat[]> {
    const allChats = await this.chatRepository.findAll();
    return allChats.map((chat) => ({
      id: chat.id,
      absoluteFilePath: chat.absoluteFilePath,
      messages: chat.messages,
      status: "idle" as ChatStatus,
      fileStatus: chat.status,
      currentTurn: 0,
      maxTurns: 20,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      metadata: chat.metadata,
    }));
  }

  async updatePromptDraft(
    chatId: string,
    promptDraft: string,
    correlationId?: string,
  ): Promise<SerializableChat> {
    const chatSession = await this.getSession(chatId);

    const updatedMetadata = { ...chatSession.metadata, promptDraft };
    chatSession.metadata = updatedMetadata;
    chatSession.updatedAt = new Date();

    // Update repository
    await this.chatRepository.updateMetadata(
      chatSession.absoluteFilePath,
      { promptDraft },
      correlationId,
    );

    // Emit metadata updated event
    await this.eventBus.emit({
      kind: "ChatUpdatedEvent",
      chatId: chatSession.id,
      updateType: "METADATA_UPDATED",
      update: {
        metadata: { promptDraft },
      },
      chat: chatSession.toJSON(),
      timestamp: new Date(),
      correlationId,
    });

    return chatSession.toJSON();
  }

  async openChatFile(
    absoluteFilePath: string,
    correlationId?: string,
  ): Promise<SerializableChat> {
    const persistedChat =
      await this.chatRepository.findByPath(absoluteFilePath);

    return {
      id: persistedChat.id,
      absoluteFilePath: persistedChat.absoluteFilePath,
      messages: persistedChat.messages,
      status: "idle" as ChatStatus,
      fileStatus: persistedChat.status,
      currentTurn: 0,
      maxTurns: 20,
      createdAt: persistedChat.createdAt,
      updatedAt: persistedChat.updatedAt,
      metadata: persistedChat.metadata,
    };
  }
}
