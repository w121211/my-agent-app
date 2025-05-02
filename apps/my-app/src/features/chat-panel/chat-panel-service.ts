// chat-panel-service.ts
import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";

import { type IEventBus } from "@repo/events-core/event-bus";
import {
  ServerFileOpenedEvent,
  ServerChatMessageAppendedEvent,
  ServerChatInitializedEvent,
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerNewChatCreatedEvent,
  Chat,
} from "@repo/events-core/event-types";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import { useChatPanelStore } from "./chat-panel-store";

@injectable()
export class ChatPanelService {
  private logger: Logger<ILogObj>;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger<ILogObj>({ name: "ChatPanelService" });
    this.registerEventHandlers();
    this.logger.debug("ChatPanelService initialized");
  }

  private registerEventHandlers(): void {
    // Subscribe to file opened events to handle chat files
    this.eventBus.subscribe<ServerFileOpenedEvent>(
      "ServerFileOpened",
      (event) => this.handleFileOpenedEvent(event)
    );

    // Subscribe to chat initialization events
    this.eventBus.subscribe<ServerChatInitializedEvent>(
      "ServerChatInitialized",
      (event) => this.handleChatInitializedEvent(event)
    );

    // Subscribe to chat message events
    this.eventBus.subscribe<ServerChatMessageAppendedEvent>(
      "ServerChatMessageAppended",
      (event) => this.handleChatMessageAppendedEvent(event)
    );

    // Subscribe to chat update events
    this.eventBus.subscribe<ServerChatUpdatedEvent>(
      "ServerChatUpdated",
      (event) => this.handleChatUpdatedEvent(event)
    );

    // Subscribe to AI response events
    this.eventBus.subscribe<ServerAIResponseRequestedEvent>(
      "ServerAIResponseRequested",
      (event) => this.handleAIResponseRequestedEvent(event)
    );

    this.eventBus.subscribe<ServerAIResponseGeneratedEvent>(
      "ServerAIResponseGenerated",
      (event) => this.handleAIResponseGeneratedEvent(event)
    );

    // Subscribe to new chat created events
    this.eventBus.subscribe<ServerNewChatCreatedEvent>(
      "ServerNewChatCreated",
      (event) => this.handleNewChatCreatedEvent(event)
    );
  }

  private handleNewChatCreatedEvent(event: ServerNewChatCreatedEvent): void {
    const { filePath, chatId } = event;

    this.logger.info(
      `Auto-opening newly created chat: ${chatId} at ${filePath}`
    );

    // Directly emit ClientOpenFile event
    this.eventBus
      .emit({
        kind: "ClientOpenFile",
        timestamp: new Date(),
        correlationId: `chat-open-${Date.now()}`,
        filePath: filePath,
      })
      .catch((error) => {
        this.logger.error(`Error opening new chat file: ${error}`);
        throw error;
      });
  }

  private handleFileOpenedEvent(event: ServerFileOpenedEvent): void {
    const { filePath, content, fileType } = event;

    // Only handle chat files
    if (!this.isChatFile(filePath, fileType)) {
      return;
    }

    this.logger.info(`Chat panel handling file: ${filePath}`);

    const store = useChatPanelStore.getState();
    store.setLoading(true);

    try {
      // Parse the chat file content
      const chatData = this.parseChatFileContent(content, fileType);

      if (chatData) {
        // Add the file path if it's not already in the data
        if (!chatData.filePath) {
          chatData.filePath = filePath;
        }

        store.setCurrentChat(chatData);
      } else {
        throw new Error("Invalid chat file format");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      store.setError(`Failed to process chat file: ${errorMessage}`);
    } finally {
      store.setLoading(false);
    }
  }

  private handleChatInitializedEvent(event: ServerChatInitializedEvent): void {
    const { chatData } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat or there is no current chat
    const currentChat = store.currentChat;
    if (!currentChat || currentChat.id === chatData.id) {
      store.setCurrentChat(chatData);
    }
  }

  private handleChatMessageAppendedEvent(
    event: ServerChatMessageAppendedEvent
  ): void {
    const { chatId, message } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.currentChat?.id === chatId) {
      store.appendMessage(message);
    }
  }

  private handleChatUpdatedEvent(event: ServerChatUpdatedEvent): void {
    const { chatId, chat } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.currentChat?.id === chatId) {
      store.setCurrentChat(chat);
    }
  }

  private handleAIResponseRequestedEvent(
    event: ServerAIResponseRequestedEvent
  ): void {
    const { chatId } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.currentChat?.id === chatId) {
      store.setResponding(true);
    }
  }

  private handleAIResponseGeneratedEvent(
    event: ServerAIResponseGeneratedEvent
  ): void {
    const { chatId } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.currentChat?.id === chatId) {
      store.setResponding(false);

      // The actual message will be added by ServerChatMessageAppended event
    }
  }

  /**
   * Determines if a file is a chat file based on fileType and path
   */
  private isChatFile(filePath: string, fileType: string): boolean {
    if (fileType === "chat" || fileType === "application/json") {
      return filePath.endsWith(".chat.json");
    }
    return false;
  }

  /**
   * Parses chat file content based on file type
   */
  private parseChatFileContent(content: string, fileType: string): Chat | null {
    try {
      if (fileType === "application/json" || fileType === "chat") {
        const chatData = JSON.parse(content);

        // Basic validation to ensure it's a chat file
        if (
          typeof chatData !== "object" ||
          !chatData ||
          !Array.isArray(chatData.messages)
        ) {
          this.logger.warn("Invalid chat file format");
          return null;
        }

        // Ensure proper date objects for timestamps
        if (chatData.createdAt) {
          chatData.createdAt = new Date(chatData.createdAt);
        }
        if (chatData.updatedAt) {
          chatData.updatedAt = new Date(chatData.updatedAt);
        }

        // Process message timestamps
        if (chatData.messages) {
          chatData.messages = chatData.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }));
        }

        return chatData as Chat;
      }

      this.logger.warn(`Unsupported chat file type: ${fileType}`);
      return null;
    } catch (error) {
      this.logger.error(`Error parsing chat file: ${error}`);
      return null;
    }
  }

  /**
   * Submits a user message to the current chat
   */
  public submitUserMessage(
    message: string,
    attachments?: Array<{ fileName: string; content: string }>
  ): void {
    const store = useChatPanelStore.getState();
    const currentChat = store.currentChat;

    if (!currentChat) {
      this.logger.warn("Cannot submit message: no current chat");
      store.setError("No active chat to send message to");
      return;
    }

    if (!message.trim() && (!attachments || attachments.length === 0)) {
      this.logger.warn("Cannot submit empty message without attachments");
      return;
    }

    this.logger.info(`Submitting user message to chat ${currentChat.id}`);

    // Clear the input field immediately for better UX
    store.setMessageInput("");

    // Emit the client event
    this.eventBus
      .emit({
        kind: "ClientSubmitUserChatMessage",
        timestamp: new Date(),
        correlationId: `msg-${Date.now()}`,
        chatId: currentChat.id,
        message,
        attachments,
      })
      .catch((error) => {
        this.logger.error(`Error submitting message: ${error}`);
        store.setError(`Failed to send message: ${error}`);

        // Restore the message input if sending failed
        store.setMessageInput(message);
      });
  }

  /**
   * Creates a new chat
   */
  public createNewChat(
    prompt: string,
    options: {
      newTask: boolean;
      mode: "chat" | "agent";
      knowledge: string[];
      model: string;
    }
  ): void {
    this.logger.info(
      `Creating new chat, newTask: ${options.newTask}, mode: ${options.mode}`
    );

    const store = useChatPanelStore.getState();
    store.setLoading(true);

    this.eventBus
      .emit({
        kind: "ClientCreateNewChat",
        timestamp: new Date(),
        correlationId: `new-chat-${Date.now()}`,
        newTask: options.newTask,
        mode: options.mode,
        knowledge: options.knowledge,
        prompt,
        model: options.model,
      })
      .catch((error) => {
        this.logger.error(`Error creating new chat: ${error}`);
        store.setError(`Failed to create new chat: ${error}`);
        store.setLoading(false);
      });
  }

  /**
   * Summarizes the current chat
   */
  public summarizeChat(): void {
    const store = useChatPanelStore.getState();
    const currentChat = store.currentChat;

    if (!currentChat) {
      this.logger.warn("Cannot summarize: no current chat");
      store.setError("No active chat to summarize");
      return;
    }

    this.logger.info(`Requesting summarization for chat ${currentChat.id}`);

    // For MVP, we'll handle this with a special user message
    this.submitUserMessage("/summarize");
  }
}
