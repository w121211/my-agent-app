import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";

import { type IEventBus } from "@repo/events-core/event-bus";
import {
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerNewChatCreatedEvent,
  ServerChatFileOpenedEvent,
  ServerFileTypeDetectedEvent,
  ChatMode,
} from "@repo/events-core/event-types";
import { UIWorkspaceTreeNodeSelectedEvent } from "../../lib/ui-event-types";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import { isChatFile } from "../../lib/file-helpers";
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
    // Subscribe to UIFileSelected event
    this.eventBus.subscribe<UIWorkspaceTreeNodeSelectedEvent>(
      "UIWorkspaceTreeNodeSelected",
      (event) => this.handleUIWorkspaceTreeNodeSelectedEvent(event)
    );

    // Chat creation and initialization
    this.eventBus.subscribe<ServerNewChatCreatedEvent>(
      "ServerNewChatCreated",
      (event) => this.handleNewChatCreatedEvent(event)
    );

    // File operations
    this.eventBus.subscribe<ServerChatFileOpenedEvent>(
      "ServerChatFileOpened",
      (event) => this.handleChatFileOpenedEvent(event)
    );

    this.eventBus.subscribe<ServerFileTypeDetectedEvent>(
      "ServerFileTypeDetected",
      (event) => this.handleFileTypeDetectedEvent(event)
    );

    // Chat updates
    this.eventBus.subscribe<ServerChatUpdatedEvent>(
      "ServerChatUpdated",
      (event) => this.handleChatUpdatedEvent(event)
    );

    // AI response states
    this.eventBus.subscribe<ServerAIResponseRequestedEvent>(
      "ServerAIResponseRequested",
      (event) => this.handleAIResponseRequestedEvent(event)
    );

    this.eventBus.subscribe<ServerAIResponseGeneratedEvent>(
      "ServerAIResponseGenerated",
      (event) => this.handleAIResponseGeneratedEvent(event)
    );
  }

  /**
   * Handles UI workspace tree node selected event
   */
  private handleUIWorkspaceTreeNodeSelectedEvent(
    event: UIWorkspaceTreeNodeSelectedEvent
  ): void {
    const { path: filePath, nodeType } = event;

    // Only process file nodes
    if (nodeType !== "file") {
      return;
    }

    // Check if this is a chat file using the shared helper
    if (isChatFile(filePath)) {
      this.logger.debug(`Chat file selected: ${filePath}`);
      this.openChatFile(filePath);
    }
  }

  private handleNewChatCreatedEvent(event: ServerNewChatCreatedEvent): void {
    const { chatId, chatObject } = event;
    const store = useChatPanelStore.getState();

    this.logger.info(`New chat created: ${chatId} at ${chatObject.filePath}`);
    store.setCurrentChat(chatObject);
    store.setLoading(false);
  }

  private handleChatFileOpenedEvent(event: ServerChatFileOpenedEvent): void {
    const { filePath, chat } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is the file path we're expecting
    if (store.isChatFilePathCurrent(filePath)) {
      this.logger.info(`Chat file opened: ${filePath}`);
      store.setCurrentChat(chat);
      store.setLoading(false);
    } else {
      this.logger.debug(
        `Ignoring chat file opened event for non-current file path: ${filePath}`
      );
    }
  }

  private handleFileTypeDetectedEvent(
    event: ServerFileTypeDetectedEvent
  ): void {
    const { filePath, fileType } = event;
    this.logger.debug(`File type detected for ${filePath}: ${fileType}`);
  }

  private handleChatUpdatedEvent(event: ServerChatUpdatedEvent): void {
    const { chatId, chat, update } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.isChatIdCurrent(chatId)) {
      store.handleChatUpdate(chat, update);
    } else {
      this.logger.debug(
        `Ignoring chat update event for non-current chat: ${chatId}`
      );
    }
  }

  private handleAIResponseRequestedEvent(
    event: ServerAIResponseRequestedEvent
  ): void {
    const { chatId } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.isChatIdCurrent(chatId)) {
      store.setResponding(true);
    }
  }

  private handleAIResponseGeneratedEvent(
    event: ServerAIResponseGeneratedEvent
  ): void {
    const { chatId } = event;
    const store = useChatPanelStore.getState();

    // Only update if this is for the current chat
    if (store.isChatIdCurrent(chatId)) {
      store.setResponding(false);
    }
  }

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
        store.setMessageInput(message);
      });
  }

  public createNewChat(
    prompt: string,
    options: {
      newTask: boolean;
      mode: ChatMode;
      knowledge: string[];
      model: string;
    }
  ): void {
    this.logger.info(
      `Creating new chat, newTask: ${options.newTask}, mode: ${options.mode}`
    );

    const store = useChatPanelStore.getState();
    store.setLoading(true);

    // Clear any current chat since we're creating a new one
    store.clearCurrentChat();

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

  public openChatFile(filePath: string): void {
    this.logger.info(`Opening chat file: ${filePath}`);

    const store = useChatPanelStore.getState();

    // Set the current chat file path before we start loading
    // This ensures we only accept updates for this specific file path
    store.setCurrentChatFilePath(filePath);
    store.setLoading(true);

    this.eventBus
      .emit({
        kind: "ClientOpenChatFile",
        timestamp: new Date(),
        correlationId: `open-chat-${Date.now()}`,
        filePath,
      })
      .catch((error) => {
        this.logger.error(`Error opening chat file ${filePath}: ${error}`);
        store.setError(`Failed to open chat file: ${error}`);
        store.setLoading(false);
        store.setCurrentChatFilePath(null);
      });
  }

  public summarizeChat(): void {
    const store = useChatPanelStore.getState();
    const currentChat = store.currentChat;

    if (!currentChat) {
      this.logger.warn("Cannot summarize: no current chat");
      store.setError("No active chat to summarize");
      return;
    }

    this.logger.info(`Requesting summarization for chat ${currentChat.id}`);

    // For MVP, handle with a special user message
    this.submitUserMessage("/summarize");
  }
}
