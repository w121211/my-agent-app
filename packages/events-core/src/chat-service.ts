import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { IEventBus } from "./event-bus.js";
import { ChatRepository } from "./repositories.js";
import { IWorkspaceManager } from "./workspace-manager.js";
import {
  Chat,
  ChatMessage,
  ClientCreateNewChatEvent,
  ServerChatFileCreatedEvent,
  ServerChatInitializedEvent,
  ClientSubmitUserChatMessageEvent,
  ServerUserChatMessagePostProcessedEvent,
  ServerChatMessageAppendedEvent,
  ServerChatFileUpdatedEvent,
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerAIResponsePostProcessedEvent,
  ClientOpenFileEvent,
  ServerFileOpenedEvent,
} from "./event-types.js";

export class ChatService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatRepo: ChatRepository;
  private readonly workspaceManager: IWorkspaceManager;

  constructor(
    eventBus: IEventBus,
    chatRepo: ChatRepository,
    workspaceManager: IWorkspaceManager
  ) {
    this.logger = new Logger({ name: "ChatService" });
    this.eventBus = eventBus;
    this.chatRepo = chatRepo;
    this.workspaceManager = workspaceManager;

    this.eventBus.subscribe<ClientCreateNewChatEvent>(
      "ClientCreateNewChat",
      this.handleCreateNewChat.bind(this)
    );

    this.eventBus.subscribe<ClientSubmitUserChatMessageEvent>(
      "ClientSubmitUserChatMessage",
      this.handleSubmitUserChatMessage.bind(this)
    );

    this.eventBus.subscribe<ClientOpenFileEvent>(
      "ClientOpenFile",
      this.handleOpenFile.bind(this)
    );
  }

  private async handleCreateNewChat(
    event: ClientCreateNewChatEvent
  ): Promise<void> {
    const chatId = uuidv4();
    const now = new Date();

    // Create task if requested (simplified for MVP)
    let taskId = "";
    if (event.newTask) {
      taskId = uuidv4();
      // In a real implementation, emit a ClientCreateTask event
    }

    const chat: Chat = {
      id: chatId,
      taskId,
      status: "ACTIVE",
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        mode: event.mode,
        model: event.model,
        knowledge: event.knowledge,
      },
    };

    const filePath = await this.chatRepo.createChat(chat);
    chat.filePath = filePath; // Store the filePath in the chat object

    await this.eventBus.emit<ServerChatFileCreatedEvent>({
      kind: "ServerChatFileCreated",
      taskId,
      chatId,
      filePath,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });

    // If initial prompt is provided, add it as first message
    if (event.prompt) {
      const message: ChatMessage = {
        id: uuidv4(),
        role: "USER",
        content: event.prompt,
        timestamp: new Date(),
      };

      await this.chatRepo.addMessage(chatId, message);
      await this.processUserMessage(chat, message, event.correlationId);
    }

    await this.eventBus.emit<ServerChatInitializedEvent>({
      kind: "ServerChatInitialized",
      chatId,
      chatData: chat,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });
  }

  private async handleSubmitUserChatMessage(
    event: ClientSubmitUserChatMessageEvent
  ): Promise<void> {
    const chat = await this.chatRepo.findById(event.chatId);

    if (!chat) {
      throw new Error(`Chat ${event.chatId} not found`);
    }

    const message: ChatMessage = {
      id: uuidv4(),
      role: "USER",
      content: event.message,
      timestamp: new Date(),
    };

    await this.chatRepo.addMessage(chat.id, message);
    await this.processUserMessage(chat, message, event.correlationId);
  }

  private async handleOpenFile(event: ClientOpenFileEvent): Promise<void> {
    const filePath = event.filePath;

    try {
      const chat = await this.workspaceManager.readChatFile(filePath);
      const content = JSON.stringify(chat);
      const fileType = this.getFileType(filePath);

      await this.eventBus.emit<ServerFileOpenedEvent>({
        kind: "ServerFileOpened",
        filePath,
        content,
        fileType,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });

      // Initialize chat if it's a chat file
      if (fileType === "chat") {
        const chatData = chat;
        await this.eventBus.emit<ServerChatInitializedEvent>({
          kind: "ServerChatInitialized",
          chatId: chatData.id,
          chatData,
          timestamp: new Date(),
          correlationId: event.correlationId,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to open file: ${filePath}`, error);
      throw new Error(`Failed to open file: ${filePath}`);
    }
  }

  private async processUserMessage(
    chat: Chat,
    message: ChatMessage,
    correlationId?: string
  ): Promise<void> {
    // Process file references (#file syntax)
    const processedContent = message.content;
    const fileReferences = this.extractFileReferences(message.content);

    // Post-process user message
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

    await this.chatRepo.save(chat);

    await this.eventBus.emit<ServerChatFileUpdatedEvent>({
      kind: "ServerChatFileUpdated",
      chatId: chat.id,
      filePath: chat.filePath || "", // Use chat.filePath instead of getChatFilePath
      timestamp: new Date(),
      correlationId,
    });

    await this.eventBus.emit<ServerChatUpdatedEvent>({
      kind: "ServerChatUpdated",
      chatId: chat.id,
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

    await this.eventBus.emit<ServerAIResponseRequestedEvent>({
      kind: "ServerAIResponseRequested",
      chatId: chat.id,
      model,
      timestamp: new Date(),
      correlationId,
    });

    // In a real implementation, this would call an AI service
    const aiResponse = "This is a placeholder AI response";

    await this.eventBus.emit<ServerAIResponseGeneratedEvent>({
      kind: "ServerAIResponseGenerated",
      chatId: chat.id,
      response: aiResponse,
      timestamp: new Date(),
      correlationId,
    });

    const aiMessage: ChatMessage = {
      id: uuidv4(),
      role: "ASSISTANT",
      content: aiResponse,
      timestamp: new Date(),
    };

    await this.chatRepo.addMessage(chat.id, aiMessage);

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

    await this.chatRepo.save(chat);

    await this.eventBus.emit<ServerChatFileUpdatedEvent>({
      kind: "ServerChatFileUpdated",
      chatId: chat.id,
      filePath: chat.filePath || "", // Use chat.filePath instead of getChatFilePath
      timestamp: new Date(),
      correlationId,
    });

    await this.eventBus.emit<ServerChatUpdatedEvent>({
      kind: "ServerChatUpdated",
      chatId: chat.id,
      chat,
      timestamp: new Date(),
      correlationId,
    });
  }

  private extractFileReferences(
    content: string
  ): Array<{ path: string; md5: string }> {
    const references: Array<{ path: string; md5: string }> = [];
    const regex = /#([^\s]+)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      references.push({
        path: match[1],
        md5: "placeholder", // In a real implementation, calculate MD5
      });
    }

    return references;
  }

  private getFileType(filePath: string): string {
    if (filePath.endsWith(".json")) {
      return "chat";
    }
    return "unknown";
  }
}
