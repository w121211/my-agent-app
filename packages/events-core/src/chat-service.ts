import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { IEventBus } from "./event-bus.js";
import { ChatRepository, fileExists } from "./repositories.js";
import { TaskService } from "./task-service.js";
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
  ServerNewChatCreatedEvent,
  ServerArtifactFileCreatedEvent,
} from "./event-types.js";

export class ChatService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatRepo: ChatRepository;
  private readonly workspacePath: string;
  private readonly taskService: TaskService;

  constructor(
    eventBus: IEventBus,
    chatRepo: ChatRepository,
    workspacePath: string,
    taskService: TaskService
  ) {
    this.logger = new Logger({ name: "ChatService" });
    this.eventBus = eventBus;
    this.chatRepo = chatRepo;
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
      this.handleOpenChatFile.bind(this)
    );
  }

  private async handleCreateNewChat(
    event: ClientCreateNewChatEvent
  ): Promise<void> {
    const chatId = uuidv4();
    const now = new Date();

    // Create task if requested (using TaskService)
    let taskId = "";
    let taskFolderPath = this.workspacePath;

    if (event.newTask) {
      const result = await this.taskService.createTask(
        "New Chat Task",
        {}, // Default empty config
        event.correlationId
      );
      taskId = result.taskId;
      taskFolderPath = result.folderPath;
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

    const filePath = await this.chatRepo.createChat(chat, taskFolderPath);
    chat.filePath = filePath;

    await this.eventBus.emit<ServerChatFileCreatedEvent>({
      kind: "ServerChatFileCreated",
      taskId,
      chatId,
      filePath,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });

    await this.eventBus.emit<ServerNewChatCreatedEvent>({
      kind: "ServerNewChatCreated",
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

  private async handleOpenChatFile(event: ClientOpenFileEvent): Promise<void> {
    const filePath = event.filePath;

    // Only process chat files
    if (!filePath.endsWith(".chat.json")) {
      return;
    }

    const fullPath = this.resolvePath(filePath);

    if (!(await fileExists(fullPath))) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    try {
      const chat = await this.chatRepo.readChatFile(fullPath);
      const content = JSON.stringify(chat);

      await this.eventBus.emit<ServerFileOpenedEvent>({
        kind: "ServerFileOpened",
        filePath,
        content,
        fileType: "chat",
        timestamp: new Date(),
        correlationId: event.correlationId,
      });

      await this.eventBus.emit<ServerChatInitializedEvent>({
        kind: "ServerChatInitialized",
        chatId: chat.id,
        chatData: chat,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    } catch (error) {
      this.logger.error(`Failed to open chat file: ${filePath}`, error);
      throw new Error(`Failed to open chat file: ${filePath}`);
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
      filePath: chat.filePath || "",
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

    await this.chatRepo.addMessage(chat.id, aiMessage);

    // Process artifacts if any were detected
    if (artifacts && artifacts.length > 0) {
      await this.processArtifacts(
        chat.id,
        aiMessage.id,
        artifacts,
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

    await this.chatRepo.save(chat);

    await this.eventBus.emit<ServerChatFileUpdatedEvent>({
      kind: "ServerChatFileUpdated",
      chatId: chat.id,
      filePath: chat.filePath || "",
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
    correlationId?: string
  ): Promise<void> {
    for (const artifact of artifacts) {
      const fileName = `artifact-${artifact.id}.${this.getArtifactExtension(artifact.type)}`;
      const filePath = path.join(
        this.workspacePath,
        `task-${chatId.split("-")[0]}`,
        fileName
      );

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

  private resolvePath(relativePath: string): string {
    return path.isAbsolute(relativePath)
      ? relativePath
      : path.join(this.workspacePath, relativePath);
  }
}
