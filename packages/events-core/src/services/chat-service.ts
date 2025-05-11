// packages/events-core/src/services/chat-service.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus, BaseEvent } from "../event-bus.js";
import type { ChatRepository } from "./chat-repository.js";
import type { TaskService } from "./task-service.js";

// Define types specific to chat service
export type ChatStatus = "ACTIVE" | "CLOSED";
export type Role = "ASSISTANT" | "USER" | "FUNCTION_EXECUTOR";
export type ChatMode = "chat" | "agent";

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
  model?: string;
  knowledge?: string[];
}

export interface Chat {
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  status: ChatStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}

// Define chat event types
export type ChatUpdateType =
  | "MESSAGE_ADDED"
  | "METADATA_UPDATED"
  | "AI_RESPONSE_ADDED";

export interface ChatUpdatedEvent extends BaseEvent {
  kind: "ChatUpdatedEvent";
  chatId: string;
  updateType: ChatUpdateType;
  update: {
    message?: ChatMessage;
    metadata?: Partial<ChatMetadata>;
  };
  chat: Chat;
}

export class ChatService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatRepository: ChatRepository;
  private readonly taskService: TaskService;

  constructor(
    eventBus: IEventBus,
    chatRepository: ChatRepository,
    taskService: TaskService
  ) {
    this.logger = new Logger({ name: "ChatService" });
    this.eventBus = eventBus;
    this.chatRepository = chatRepository;
    this.taskService = taskService;
  }

  async createChat(
    targetDirectoryAbsolutePath: string,
    newTask: boolean,
    mode: ChatMode,
    knowledge: string[],
    prompt?: string,
    model: string = "default",
    correlationId?: string
  ): Promise<Chat> {
    const now = new Date();
    let folderPath = targetDirectoryAbsolutePath;

    // Create task if requested
    if (newTask) {
      const result = await this.taskService.createTask(
        "New Chat Task",
        {}, // Default empty config
        correlationId
      );
      folderPath = result.folderPath;
    }

    const chatData: Omit<Chat, "absoluteFilePath"> = {
      id: uuidv4(),
      status: "ACTIVE",
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

    // Create chat object using repository
    const chat = await this.chatRepository.createChat(
      chatData,
      folderPath,
      correlationId
    );

    // If initial prompt is provided, add it as first message
    if (prompt) {
      const message: ChatMessage = {
        id: uuidv4(),
        role: "USER",
        content: prompt,
        timestamp: new Date(),
      };

      // Add message to chat
      await this.chatRepository.addMessage(
        chat.absoluteFilePath,
        message,
        correlationId
      );

      // Get updated chat after adding message
      const updatedChat = await this.chatRepository.findByPath(chat.absoluteFilePath);
      await this.processUserMessage(updatedChat, message, correlationId);
      return updatedChat;
    }

    return chat;
  }

  async submitMessage(
    chatId: string,
    message: string,
    attachments?: Array<{ fileName: string; content: string }>,
    correlationId?: string
  ): Promise<Chat> {
    // Find the chat by ID
    const chat = await this.chatRepository.findById(chatId);

    if (!chat) {
      this.logger.error(`Chat not found with ID: ${chatId}`);
      throw new Error(`Chat not found with ID: ${chatId}`);
    }

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      role: "USER",
      content: message,
      timestamp: new Date(),
    };

    // Add message to chat
    await this.chatRepository.addMessage(
      chat.absoluteFilePath,
      chatMessage,
      correlationId
    );

    // Process any attachments
    if (attachments && attachments.length > 0) {
      // Implementation for handling attachments would go here
    }

    // Get updated chat after adding message
    const updatedChat = await this.chatRepository.findByPath(chat.absoluteFilePath);
    await this.processUserMessage(updatedChat, chatMessage, correlationId);

    return updatedChat;
  }

  async getChatById(chatId: string): Promise<Chat | undefined> {
    return this.chatRepository.findById(chatId);
  }

  async getAllChats(): Promise<Chat[]> {
    return this.chatRepository.findAll();
  }

  async openChatFile(
    absoluteFilePath: string,
    correlationId?: string
  ): Promise<Chat> {
    try {
      return await this.chatRepository.findByPath(absoluteFilePath);
    } catch (error) {
      this.logger.error(`Failed to open chat file: ${absoluteFilePath}`, error);
      throw error;
    }
  }

  private async processUserMessage(
    chat: Chat,
    message: ChatMessage,
    correlationId?: string
  ): Promise<void> {
    // Process file references and update the message
    const fileReferences = this.extractFileReferences(message.content);
    message.metadata = {
      ...message.metadata,
      fileReferences,
    };

    // Emit chat updated event with message added update
    await this.eventBus.emit<ChatUpdatedEvent>({
      kind: "ChatUpdatedEvent",
      chatId: chat.id,
      updateType: "MESSAGE_ADDED",
      update: {
        message,
      },
      chat,
      timestamp: new Date(),
      correlationId,
    });

    // Generate AI response for chat mode
    if (chat.metadata?.mode === "chat") {
      await this.generateAIResponse(chat, correlationId);
    }
  }

  private async generateAIResponse(
    chat: Chat,
    correlationId?: string
  ): Promise<void> {
    const model = chat.metadata?.model || "default";

    // Placeholder for AI service integration
    const aiResponse = "This is a placeholder AI response";
    const artifacts = this.detectArtifacts(aiResponse);

    const aiMessage: ChatMessage = {
      id: uuidv4(),
      role: "ASSISTANT",
      content: aiResponse,
      timestamp: new Date(),
    };

    // Add AI message to chat
    await this.chatRepository.addMessage(
      chat.absoluteFilePath,
      aiMessage,
      correlationId
    );

    // Get updated chat after adding message
    const updatedChat = await this.chatRepository.findByPath(chat.absoluteFilePath);

    // Process artifacts if any were detected
    if (artifacts && artifacts.length > 0) {
      await this.processArtifacts(
        chat.id,
        aiMessage.id,
        artifacts,
        chat.absoluteFilePath,
        correlationId
      );
    }

    // Emit chat updated event with AI message added
    await this.eventBus.emit<ChatUpdatedEvent>({
      kind: "ChatUpdatedEvent",
      chatId: updatedChat.id,
      updateType: "AI_RESPONSE_ADDED",
      update: {
        message: aiMessage,
      },
      chat: updatedChat,
      timestamp: new Date(),
      correlationId,
    });
  }

  private detectArtifacts(response: string): Array<{
    id: string;
    type: string;
    content: string;
  }> {
    if (response.includes("```") || response.includes("code")) {
      return [
        {
          id: uuidv4(),
          type: "code",
          content: "console.log('Hello, World!');",
        },
      ];
    }

    return [];
  }

  private async processArtifacts(
    chatId: string,
    messageId: string,
    artifacts: Array<{ id: string; type: string; content: string }>,
    chatFilePath: string,
    correlationId?: string
  ): Promise<void> {
    // Implementation for processing artifacts would go here
  }

  private extractFileReferences(
    content: string
  ): Array<{ path: string; md5: string }> {
    const references: Array<{ path: string; md5: string }> = [];
    const regex = /#([^\s]+)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        references.push({
          path: match[1],
          md5: "placeholder",
        });
      }
    }

    return references;
  }
}
