// packages/events-core/src/services/chat-service.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../event-bus.js";
import type { ChatRepository } from "./chat-repository.js";
import type { TaskService } from "./task-service.js";
import type {
  Chat,
  ChatMessage,
  ServerChatCreatedEvent,
  ServerChatInitializedEvent,
  ServerChatMessageAppendedEvent,
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerUserChatMessagePostProcessedEvent,
  ServerAIResponsePostProcessedEvent,
  ChatMode,
} from "../event-types.js";

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

  /**
   * Creates a new chat
   * @param targetDirectoryAbsolutePath Absolute path to directory where chat file will be created
   */
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

    const chatData: Omit<Chat, "filePath"> = {
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

    // Emit chat created event
    await this.eventBus.emit<ServerChatCreatedEvent>({
      kind: "ServerChatCreated",
      chatId: chat.id,
      chatObject: chat,
      timestamp: new Date(),
      correlationId,
    });

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
        chat.filePath,
        message,
        correlationId
      );

      // Get updated chat after adding message
      const updatedChat = await this.chatRepository.findByPath(chat.filePath);
      await this.processUserMessage(updatedChat, message, correlationId);
      return updatedChat;
    }

    return chat;
  }

  /**
   * Submits a user message to a chat
   */
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
      chat.filePath,
      chatMessage,
      correlationId
    );

    // Process any attachments
    if (attachments && attachments.length > 0) {
      // Implementation for handling attachments would go here
    }

    // Get updated chat after adding message
    const updatedChat = await this.chatRepository.findByPath(chat.filePath);
    await this.processUserMessage(updatedChat, chatMessage, correlationId);

    return updatedChat;
  }

  /**
   * Gets a chat by ID
   */
  async getChatById(chatId: string): Promise<Chat | undefined> {
    return this.chatRepository.findById(chatId);
  }

  /**
   * Gets all chats
   */
  async getAllChats(): Promise<Chat[]> {
    return this.chatRepository.findAll();
  }

  /**
   * Opens a chat file
   */
  async openChatFile(
    absoluteFilePath: string,
    correlationId?: string
  ): Promise<Chat> {
    try {
      const chat = await this.chatRepository.findByPath(absoluteFilePath);

      // Emit chat initialized event
      await this.eventBus.emit<ServerChatInitializedEvent>({
        kind: "ServerChatInitialized",
        chatId: chat.id,
        chatData: chat,
        timestamp: new Date(),
        correlationId,
      });

      return chat;
    } catch (error) {
      this.logger.error(`Failed to open chat file: ${absoluteFilePath}`, error);
      throw error;
    }
  }

  /**
   * Process user message and generate AI response if needed
   */
  private async processUserMessage(
    chat: Chat,
    message: ChatMessage,
    correlationId?: string
  ): Promise<void> {
    // Process file references (#file syntax)
    const processedContent = message.content;
    const fileReferences = this.extractFileReferences(message.content);

    await this.eventBus.emit<ServerUserChatMessagePostProcessedEvent>({
      kind: "ServerUserChatMessagePostProcessed",
      chatId: chat.id,
      messageId: message.id,
      processedContent,
      fileReferences,
      timestamp: new Date(),
      correlationId,
    });

    message.metadata = {
      ...message.metadata,
      fileReferences,
    };

    await this.eventBus.emit<ServerChatMessageAppendedEvent>({
      kind: "ServerChatMessageAppended",
      chatId: chat.id,
      message,
      timestamp: new Date(),
      correlationId,
    });

    // Emit chat updated event with message added update
    await this.eventBus.emit<ServerChatUpdatedEvent>({
      kind: "ServerChatUpdated",
      chatId: chat.id,
      chat,
      update: {
        kind: "MESSAGE_ADDED",
        message,
      },
      timestamp: new Date(),
      correlationId,
    });

    // Generate AI response for chat mode
    if (chat.metadata?.mode === "chat") {
      await this.generateAIResponse(chat, correlationId);
    }
  }

  /**
   * Generate AI response for a chat
   */
  private async generateAIResponse(
    chat: Chat,
    correlationId?: string
  ): Promise<void> {
    const model = chat.metadata?.model || "default";

    await this.eventBus.emit<ServerAIResponseRequestedEvent>({
      kind: "ServerAIResponseRequested",
      chatId: chat.id,
      model,
      timestamp: new Date(),
      correlationId,
    });

    // Placeholder for AI service integration
    const aiResponse = "This is a placeholder AI response";
    const artifacts = this.detectArtifacts(aiResponse);

    await this.eventBus.emit<ServerAIResponseGeneratedEvent>({
      kind: "ServerAIResponseGenerated",
      chatId: chat.id,
      response: aiResponse,
      artifacts,
      timestamp: new Date(),
      correlationId,
    });

    const aiMessage: ChatMessage = {
      id: uuidv4(),
      role: "ASSISTANT",
      content: aiResponse,
      timestamp: new Date(),
    };

    // Add AI message to chat
    await this.chatRepository.addMessage(
      chat.filePath,
      aiMessage,
      correlationId
    );

    // Get updated chat after adding message
    const updatedChat = await this.chatRepository.findByPath(chat.filePath);

    // Process artifacts if any were detected
    if (artifacts && artifacts.length > 0) {
      await this.processArtifacts(
        chat.id,
        aiMessage.id,
        artifacts,
        chat.filePath,
        correlationId
      );
    }

    await this.eventBus.emit<ServerAIResponsePostProcessedEvent>({
      kind: "ServerAIResponsePostProcessed",
      chatId: chat.id,
      messageId: aiMessage.id,
      processedContent: aiResponse,
      timestamp: new Date(),
      correlationId,
    });

    await this.eventBus.emit<ServerChatMessageAppendedEvent>({
      kind: "ServerChatMessageAppended",
      chatId: chat.id,
      message: aiMessage,
      timestamp: new Date(),
      correlationId,
    });

    // Emit chat updated event with message added update
    await this.eventBus.emit<ServerChatUpdatedEvent>({
      kind: "ServerChatUpdated",
      chatId: updatedChat.id,
      chat: updatedChat,
      update: {
        kind: "MESSAGE_ADDED",
        message: aiMessage,
      },
      timestamp: new Date(),
      correlationId,
    });
  }

  /**
   * Detect artifacts in AI response
   */
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

  /**
   * Process artifacts in AI response
   */
  private async processArtifacts(
    chatId: string,
    messageId: string,
    artifacts: Array<{ id: string; type: string; content: string }>,
    chatFilePath: string,
    correlationId?: string
  ): Promise<void> {
    // Implementation for processing artifacts would go here
  }

  /**
   * Extract file references from message content
   */
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
