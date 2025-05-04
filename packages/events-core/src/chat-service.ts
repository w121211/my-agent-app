import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { IEventBus } from "./event-bus.js";
import { ChatFileService } from "./chat-file-service.js";
import { TaskService } from "./task-service.js";
import {
  Chat,
  ChatMessage,
  ClientCreateNewChatEvent,
  ServerChatCreatedEvent,
  ServerChatInitializedEvent,
  ClientSubmitUserChatMessageEvent,
  ServerUserChatMessagePostProcessedEvent,
  ServerChatMessageAppendedEvent,
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerAIResponsePostProcessedEvent,
  ClientOpenFileEvent,
  ClientOpenChatFileEvent,
  ServerNewChatCreatedEvent,
  ServerArtifactFileCreatedEvent,
  ServerChatFileOpenedEvent,
  ServerFileTypeDetectedEvent,
} from "./event-types.js";

export class ChatService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatFileService: ChatFileService;
  private readonly workspacePath: string;
  private readonly taskService: TaskService;

  constructor(
    eventBus: IEventBus,
    chatFileService: ChatFileService,
    workspacePath: string,
    taskService: TaskService
  ) {
    this.logger = new Logger({ name: "ChatService" });
    this.eventBus = eventBus;
    this.chatFileService = chatFileService;
    this.workspacePath = workspacePath;
    this.taskService = taskService;

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

    this.eventBus.subscribe<ClientOpenChatFileEvent>(
      "ClientOpenChatFile",
      this.handleOpenChatFile.bind(this)
    );
  }

  private async handleCreateNewChat(
    event: ClientCreateNewChatEvent
  ): Promise<void> {
    const now = new Date();

    // Create task if requested (using TaskService)
    let taskFolderPath = this.workspacePath;

    if (event.newTask) {
      const result = await this.taskService.createTask(
        "New Chat Task",
        {}, // Default empty config
        event.correlationId
      );
      taskFolderPath = result.folderPath;
    }

    const chatData: Omit<Chat, "filePath"> = {
      id: uuidv4(),
      status: "ACTIVE",
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        mode: event.mode,
        model: event.model,
        knowledge: event.knowledge,
        title: "New Chat",
      },
    };

    // Create chat object in memory first
    const chat = await this.chatFileService.createChat(
      chatData,
      taskFolderPath,
      event.correlationId
    );

    // Emit chat created event
    await this.eventBus.emit<ServerChatCreatedEvent>({
      kind: "ServerChatCreated",
      chatId: chat.id,
      chatObject: chat,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });

    // TODO: Seems like a duplicate of the above event, consider removing
    // Emit new chat created event with the full chat object
    await this.eventBus.emit<ServerNewChatCreatedEvent>({
      kind: "ServerNewChatCreated",
      chatId: chat.id,
      chatObject: chat,
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

      // Add message to chat
      const updatedChat = await this.chatFileService.addMessage(
        chat.filePath,
        message,
        event.correlationId
      );

      await this.processUserMessage(updatedChat, message, event.correlationId);
    }
  }

  private async handleSubmitUserChatMessage(
    event: ClientSubmitUserChatMessageEvent
  ): Promise<void> {
    // Find the chat by ID
    const chat = await this.chatFileService.findById(event.chatId);

    if (!chat) {
      this.logger.error(`Chat not found with ID: ${event.chatId}`);
      throw new Error(`Chat not found with ID: ${event.chatId}`);
    }

    const message: ChatMessage = {
      id: uuidv4(),
      role: "USER",
      content: event.message,
      timestamp: new Date(),
    };

    // Add message to chat
    await this.chatFileService.addMessage(
      chat.filePath,
      message,
      event.correlationId
    );

    // Get updated chat after adding message
    const updatedChat = await this.chatFileService.findByPath(chat.filePath);
    await this.processUserMessage(updatedChat, message, event.correlationId);
  }

  // TODO: Consider moving this to chat-file-service
  private async handleOpenFile(event: ClientOpenFileEvent): Promise<void> {
    const filePath = event.filePath;

    // Detect file type
    const fileType = this.determineFileType(filePath);

    await this.eventBus.emit<ServerFileTypeDetectedEvent>({
      kind: "ServerFileTypeDetected",
      filePath,
      fileType,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });

    // For chat files, redirect to the chat-specific handler
    if (fileType === "chat") {
      await this.handleOpenChatFile({
        kind: "ClientOpenChatFile",
        filePath,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    }

    // Non-chat files are handled by FileService, so do nothing here
  }

  private async handleOpenChatFile(
    event: ClientOpenChatFileEvent
  ): Promise<void> {
    const filePath = event.filePath;

    // Check if chat exists in memory cache
    try {
      const chat = await this.chatFileService.findByPath(filePath);

      // Emit chat file opened event with the full chat object
      await this.eventBus.emit<ServerChatFileOpenedEvent>({
        kind: "ServerChatFileOpened",
        filePath,
        chat,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });

      // Emit chat initialized event
      await this.eventBus.emit<ServerChatInitializedEvent>({
        kind: "ServerChatInitialized",
        chatId: chat.id,
        chatData: chat,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    } catch (error) {
      this.logger.error(`Failed to open chat file: ${filePath}`, error);
      throw error;
    }
  }

  private determineFileType(filePath: string): string {
    if (filePath.match(/chat\d+\.json$/)) {
      return "chat";
    }

    const extension = path.extname(filePath).toLowerCase();

    const fileTypeMap: Record<string, string> = {
      ".js": "javascript",
      ".ts": "typescript",
      ".jsx": "javascript",
      ".tsx": "typescript",
      ".html": "html",
      ".css": "css",
      ".json": "json",
      ".md": "markdown",
      ".txt": "text",
      // Add more mappings as needed
    };

    return fileTypeMap[extension] || "unknown";
  }

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
    await this.chatFileService.addMessage(
      chat.filePath,
      aiMessage,
      correlationId
    );

    // Get updated chat after adding message
    const updatedChat = await this.chatFileService.findByPath(chat.filePath);

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
    for (const artifact of artifacts) {
      const fileName = `artifact-${artifact.id}.${this.getArtifactExtension(artifact.type)}`;

      // Extract folder path from chat file path
      const folderPath = path.dirname(chatFilePath);
      const filePath = path.join(folderPath, fileName);

      await fs.writeFile(filePath, artifact.content, "utf8");

      await this.eventBus.emit<ServerArtifactFileCreatedEvent>({
        kind: "ServerArtifactFileCreated",
        chatId,
        messageId,
        artifactId: artifact.id,
        filePath,
        fileType: artifact.type,
        timestamp: new Date(),
        correlationId,
      });

      // Update the chat with artifact information
      const chat = await this.chatFileService.findByPath(chatFilePath);
      await this.eventBus.emit<ServerChatUpdatedEvent>({
        kind: "ServerChatUpdated",
        chatId: chat.id,
        chat,
        update: {
          kind: "ARTIFACT_ADDED",
          artifact,
        },
        timestamp: new Date(),
        correlationId,
      });
    }
  }

  private getArtifactExtension(type: string): string {
    switch (type) {
      case "code":
        return "js";
      case "markdown":
        return "md";
      case "diagram":
        return "svg";
      default:
        return "txt";
    }
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
