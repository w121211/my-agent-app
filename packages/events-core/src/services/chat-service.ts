// packages/events-core/src/services/chat-service.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus, BaseEvent } from "../event-bus.js";
import type { ChatRepository } from "./chat-repository.js";
import type { TaskService } from "./task-service.js";
import type { ProjectFolderService } from "./project-folder-service.js";

// Define types specific to chat service
export type ChatStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"; // Updated as per design doc
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
  promptDraft?: string; // Added as per design doc
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
  private readonly projectFolderService: ProjectFolderService;

  constructor(
    eventBus: IEventBus,
    chatRepository: ChatRepository,
    taskService: TaskService,
    projectFolderService: ProjectFolderService
  ) {
    this.logger = new Logger({ name: "ChatService" });
    this.eventBus = eventBus;
    this.chatRepository = chatRepository;
    this.taskService = taskService;
    this.projectFolderService = projectFolderService;
  }

  async createDraftChat(
    targetDirectoryAbsolutePath: string,
    newTask: boolean, // Keep newTask logic for directory determination
    mode: ChatMode = "chat", // Default mode
    knowledge: string[] = [], // Default knowledge
    initialPromptDraft?: string,
    model: string = "default", // Default model from design doc
    correlationId?: string
  ): Promise<Chat> {
    const isInProjectFolder =
      await this.projectFolderService.isPathInProjectFolder(
        targetDirectoryAbsolutePath
      );

    if (!isInProjectFolder) {
      throw new Error(
        `Cannot create chat outside of project folders. Path ${targetDirectoryAbsolutePath} is not within any registered project folder.`
      );
    }

    this.logger.info(
      `Creating new draft chat in project folder at: ${targetDirectoryAbsolutePath}`
    );

    const now = new Date();

    if (newTask) {
      const result = await this.taskService.createTask(
        "New Chat Task", // Title could be dynamic or "Untitled Task for Chat"
        {},
        targetDirectoryAbsolutePath,
        correlationId
      );
      targetDirectoryAbsolutePath = result.absoluteDirectoryPath;
    }

    const chatData: Omit<Chat, "absoluteFilePath"> = {
      id: uuidv4(),
      status: "DRAFT", // Default status DRAFT
      messages: [], // Empty messages
      createdAt: now,
      updatedAt: now, // createdAt === updatedAt for new draft
      metadata: {
        title: "Untitled Chat", // Default title
        mode,
        model,
        knowledge,
        promptDraft: initialPromptDraft, // Store initial prompt here
      },
    };

    // Create chat file using repository
    const chat = await this.chatRepository.createChat(
      chatData,
      targetDirectoryAbsolutePath,
      correlationId
    );

    // Unlike old createChat, do not add a message or trigger AI response for DRAFTs.
    return chat;
  }

  async convertDraftToActive(chatId: string, correlationId?: string): Promise<Chat | null> {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      this.logger.warn(`Chat with ID ${chatId} not found for conversion to active.`);
      return null;
    }

    if (chat.status === "DRAFT") {
      chat.status = "ACTIVE";
      chat.updatedAt = new Date();
      // Assuming a method to update the chat file's content, especially status and updatedAt
      // This might involve updating the whole chat object or just metadata.
      // For now, let's assume updateChat handles this by saving the modified chat object.
      // The promptDraft should be cleared by the frontend/client when a message is actually sent.
      // Or, if the first AI response implies the promptDraft was used, it could be cleared here.
      // Design doc: "Clear promptDraft only when message is sent" - so FE responsibility.
      await this.chatRepository.updateChat(chat, correlationId); // Assumes updateChat persists the whole object or handles status update
      this.logger.info(`Chat ${chatId} converted from DRAFT to ACTIVE.`);

      // Emit event if necessary (e.g. for UI updates)
      // Not specified in design doc, but good practice
      await this.eventBus.emit<ChatUpdatedEvent>({
        kind: "ChatUpdatedEvent",
        chatId: chat.id,
        updateType: "METADATA_UPDATED", // Or a new "STATUS_UPDATED" type
        update: { metadata: { title: chat.metadata?.title } }, // Send some metadata for consistency
        chat, // Send the updated chat
        timestamp: new Date(),
        correlationId,
      });

    } else {
      this.logger.info(`Chat ${chatId} is already ${chat.status}, no conversion needed.`);
    }
    return chat;
  }

  isEmptyDraft(chat: Chat): boolean {
    // Definition from design document
    return (
      chat.status === "DRAFT" &&
      chat.messages.length === 0 &&
      (!chat.metadata?.promptDraft || chat.metadata.promptDraft.trim() === "") &&
      chat.metadata?.title === "Untitled Chat" &&
      chat.createdAt.getTime() === chat.updatedAt.getTime() // Compare time in ms
    );
  }

  async cleanupEmptyDrafts(correlationId?: string): Promise<void> {
    this.logger.info("Starting cleanup of empty draft chats.");
    const allChats = await this.chatRepository.findAll();
    let deletedCount = 0;

    for (const chat of allChats) {
      if (this.isEmptyDraft(chat)) {
        try {
          // Assuming chatRepository has a method to delete a chat by its file path or ID
          await this.chatRepository.deleteChat(chat.absoluteFilePath, correlationId);
          this.logger.info(`Deleted empty draft chat: ${chat.absoluteFilePath}`);
          deletedCount++;
        } catch (error) {
          this.logger.error(`Error deleting empty draft chat ${chat.id} at ${chat.absoluteFilePath}:`, error);
        }
      }
    }
    this.logger.info(`Cleanup finished. Deleted ${deletedCount} empty draft chats.`);
  }

  // Method to update promptDraft, will be called frequently by frontend
  async updatePromptDraft(chatId: string, promptDraft: string, correlationId?: string): Promise<Chat | null> {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      this.logger.warn(`Chat with ID ${chatId} not found for updating promptDraft.`);
      return null;
    }

    if (!chat.metadata) {
      chat.metadata = { promptDraft };
    } else {
      chat.metadata.promptDraft = promptDraft;
    }
    chat.updatedAt = new Date();

    // This assumes chatRepository.updateChat can persist these changes.
    // Alternatively, a more specific chatRepository.updateChatMetadata might be used.
    await this.chatRepository.updateChat(chat, correlationId);
    this.logger.debug(`Updated promptDraft for chat ${chatId}.`);

    // Optionally, emit an event if other parts of the system need to react to promptDraft changes in real-time.
    // The design doc mentions "All changes save immediately", implying persistence is key.
    // Real-time updates to other clients might be out of scope for "Notion-style auto-save" which is primarily about data safety for the current user.

    return chat;
  }


  async submitMessage(
    chatId: string,
    message: string,
    attachments?: Array<{ fileName: string; content: string }>,
    correlationId?: string
  ): Promise<Chat> {
    // Find the chat by ID - throws if not found
    const chat = await this.getChatById(chatId);

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
    const updatedChat = await this.chatRepository.findByPath(
      chat.absoluteFilePath
    );
    await this.processUserMessage(updatedChat, chatMessage, correlationId);

    return updatedChat;
  }

  async findChatById(chatId: string): Promise<Chat | undefined> {
    return this.chatRepository.findById(chatId);
  }

  async getChatById(chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat) {
      throw new Error(`Chat not found with ID: ${chatId}`);
    }
    return chat;
  }

  async getAllChats(): Promise<Chat[]> {
    return this.chatRepository.findAll();
  }

  async openChatFile(
    absoluteFilePath: string,
    correlationId?: string
  ): Promise<Chat> {
    return this.chatRepository.findByPath(absoluteFilePath);
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
    const lastMessage = chat.messages[chat.messages.length - 1];
    const aiResponse = `Echo: "${lastMessage?.content || "No message"}"\n\nThis is a placeholder AI response`;

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
    let updatedChatWithAIMessage = await this.chatRepository.findByPath( // Renamed for clarity
      chat.absoluteFilePath
    );

    // Convert to ACTIVE if it was DRAFT and this is the first AI response
    if (updatedChatWithAIMessage.status === "DRAFT") {
      const convertedChat = await this.convertDraftToActive(updatedChatWithAIMessage.id, correlationId);
      if (convertedChat) {
        updatedChatWithAIMessage = convertedChat; // Use the updated chat object that is now ACTIVE
      }
    }

    // Process artifacts if any were detected
    if (artifacts && artifacts.length > 0) {
      await this.processArtifacts(
        updatedChatWithAIMessage.id, // Use potentially updated chat ID if it could change (it doesn't here)
        aiMessage.id,
        artifacts,
        updatedChatWithAIMessage.absoluteFilePath,
        correlationId
      );
    }

    // Emit chat updated event with AI message added
    await this.eventBus.emit<ChatUpdatedEvent>({
      kind: "ChatUpdatedEvent",
      chatId: updatedChatWithAIMessage.id,
      updateType: "AI_RESPONSE_ADDED",
      update: {
        message: aiMessage,
      },
      chat: updatedChatWithAIMessage, // Send the latest state of the chat (potentially ACTIVE)
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
