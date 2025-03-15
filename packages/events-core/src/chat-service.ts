import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";

import { IEventBus } from "./event-bus.js";
import { ChatRepository } from "./repositories.js";
import {
  Chat,
  ChatStatus,
  EventType,
  Message,
  MessageMetadata,
  Role,
  ServerChatCreated,
  ServerMessageSavedToChatFile,
  ClientApproveWork,
  ClientStartNewChatCommand,
  ServerEventType,
  ClientEventType,
} from "./types.js";

/**
 * Service for managing chat interactions between users and agents
 */
export class ChatService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly chatRepo: ChatRepository;

  constructor(eventBus: IEventBus, chatRepo: ChatRepository) {
    this.logger = new Logger({ name: "ChatService" });
    this.eventBus = eventBus;
    this.chatRepo = chatRepo;

    // Register event handlers
    this.eventBus.subscribe<ClientStartNewChatCommand>(
      ClientEventType.CLIENT_START_NEW_CHAT_COMMAND,
      this.handleStartNewChatCommand.bind(this)
    );

    // Additional event subscriptions can be added here
    // this.eventBus.subscribe<ClientSubmitMessageCommand>(
    //   ClientEventType.CLIENT_SUBMIT_MESSAGE_COMMAND,
    //   this.handleUserSubmitMessageCommand.bind(this)
    // );
    //
    // this.eventBus.subscribe<ClientSubmitInitialPromptCommand>(
    //   ClientEventType.CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND,
    //   this.handleSubmitInitialPromptCommand.bind(this)
    // );
  }

  /**
   * Handles starting a new chat based on a command
   */
  private async handleStartNewChatCommand(
    command: ClientStartNewChatCommand
  ): Promise<void> {
    const chatId = this.generateChatId();
    const now = new Date();

    // Initialize chat object
    const chat: Chat = {
      id: chatId,
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      messages: [],
      status: ChatStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      metadata: command.metadata || {},
    };

    // Create chat in repository - this will handle both memory and file system
    const chatFilePath = await this.chatRepo.createChat(chat);

    // Emit chat created event
    await this.eventBus.emit<ServerChatCreated>({
      eventType: ServerEventType.SERVER_CHAT_CREATED,
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      chatId,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // Initialize first prompt based on subtask configuration
    const prompt = await this.generateInitialPrompt(
      command.taskId,
      command.subtaskId
    );
    const message: Message = {
      id: this.generateMessageId(),
      role: Role.USER,
      content: prompt,
      timestamp: new Date(),
      metadata: {
        taskId: chat.taskId,
        subtaskId: chat.subtaskId,
        isPrompt: true,
      },
    };

    await this.onMessageReceived(chat, message, command.correlationId);
  }

  /**
   * Processes a message received in a chat
   */
  private async onMessageReceived(
    chat: Chat,
    message: Message,
    correlationId?: string
  ): Promise<void> {
    // Add message to chat using repository
    await this.chatRepo.addMessage(chat.id, message);

    // Emit event for message saved
    await this.eventBus.emit<ServerMessageSavedToChatFile>({
      eventType: ServerEventType.SERVER_MESSAGE_SAVED_TO_CHAT_FILE,
      chatId: chat.id,
      messageId: message.id,
      filePath: chat.id, // Using chat_id as reference since file path is managed by repo
      timestamp: new Date(),
      correlationId,
    });

    // Process user message if needed
    if (message.role === Role.USER) {
      if (message.content.includes("APPROVE")) {
        await this.eventBus.emit<ClientApproveWork>({
          eventType: ClientEventType.CLIENT_APPROVE_WORK,
          chatId: chat.id,
          timestamp: new Date(),
          correlationId,
        });
        return;
      }

      // Generate and process agent response
      const response = await this.generateAgentResponse(chat, message);
      await this.onMessageReceived(chat, response, correlationId);
    }
  }

  /**
   * Generates a unique chat ID
   */
  private generateChatId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const shortUuid = uuidv4().replace(/-/g, "").substring(0, 8);
    return `chat_${timestamp}_${shortUuid}`;
  }

  /**
   * Generates a unique message ID
   */
  private generateMessageId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const shortUuid = uuidv4().replace(/-/g, "").substring(0, 8);
    return `msg_${timestamp}_${shortUuid}`;
  }

  /**
   * Generates the initial prompt for a subtask
   */
  private async generateInitialPrompt(
    taskId: string,
    subtaskId: string
  ): Promise<string> {
    // TODO: Generate based on subtask configuration
    this.logger.debug(
      `Generating initial prompt for task ${taskId}, subtask ${subtaskId}`
    );
    return "Initial prompt placeholder";
  }

  /**
   * Generates an agent response to a user message
   */
  private async generateAgentResponse(
    chat: Chat,
    userMessage: Message
  ): Promise<Message> {
    // TODO: Implement AI agent response generation
    this.logger.debug(`Generating agent response for chat ${chat.id}`);

    return {
      id: this.generateMessageId(),
      role: Role.ASSISTANT,
      content: "Agent response placeholder",
      timestamp: new Date(),
      metadata: {
        taskId: chat.taskId,
        subtaskId: chat.subtaskId,
      },
    };
  }
}
