// chat-service.ts
import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";

import { type IEventBus } from "@repo/events-core/event-bus";
import {
  ServerFileOpenedEvent,
  ServerChatInitializedEvent,
  ClientOpenFileEvent,
  ClientSubmitUserChatMessageEvent,
  ClientCreateNewChatEvent,
  Chat,
  BaseEvent,
  ChatMode,
} from "@repo/events-core/event-types";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import { useChatStore } from "./ui-chat-store";

// UI event types
interface UIChatPanelUpdatedEvent extends BaseEvent {
  kind: "UIChatPanelUpdated";
}

interface UINewChatButtonClickedEvent extends BaseEvent {
  kind: "UINewChatButtonClicked";
}

interface ClientChatReadyEvent extends BaseEvent {
  kind: "ClientChatReady";
  chatId: string;
}

@injectable()
export class ChatService {
  private logger: Logger<ILogObj>;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger<ILogObj>({ name: "ChatService" });
    this.registerEventHandlers();
    this.logger.debug("ChatService initialized");
  }

  private registerEventHandlers(): void {
    // Subscribe to ServerFileOpened event
    this.eventBus.subscribe<ServerFileOpenedEvent>(
      "ServerFileOpened",
      (event) => this.handleFileOpened(event)
    );

    // Subscribe to ServerChatInitialized event
    this.eventBus.subscribe<ServerChatInitializedEvent>(
      "ServerChatInitialized",
      (event) => this.handleChatInitialized(event)
    );

    // Subscribe to UINewChatButtonClicked event
    this.eventBus.subscribe<UINewChatButtonClickedEvent>(
      "UINewChatButtonClicked",
      () => this.handleNewChatButtonClicked()
    );
  }

  private handleFileOpened(event: ServerFileOpenedEvent): void {
    this.logger.debug(`File opened: ${event.filePath} (${event.fileType})`);

    // Only process chat files
    if (event.fileType !== "chat") {
      return;
    }

    // Update store state
    useChatStore.getState().setLoading(true);
    useChatStore.getState().setError(null);
  }

  private async handleChatInitialized(
    event: ServerChatInitializedEvent
  ): Promise<void> {
    this.logger.debug(`Chat initialized: ${event.chatId}`);

    // Update store with chat data
    useChatStore.getState().setCurrentChat(event.chatData);

    // Update UI
    this.updateChatPanel();

    // Emit ClientChatReady to signal the chat is ready
    await this.eventBus.emit<ClientChatReadyEvent>({
      kind: "ClientChatReady",
      timestamp: new Date(),
      chatId: event.chatId,
    });

    // Set loading to false
    useChatStore.getState().setLoading(false);
  }

  private handleNewChatButtonClicked(): void {
    this.logger.debug("Handling new chat button click");
    useChatStore.getState().showNewChatModal();
  }

  private async updateChatPanel(): Promise<void> {
    // Show the chat panel
    useChatStore.getState().showChatPanel();

    // Emit UIChatPanelUpdated event
    await this.eventBus.emit<UIChatPanelUpdatedEvent>({
      kind: "UIChatPanelUpdated",
      timestamp: new Date(),
    });
  }

  // Public method to create a new chat
  public async createNewChat({
    newTask,
    mode,
    knowledge,
    prompt,
    model,
  }: {
    newTask: boolean;
    mode: ChatMode;
    knowledge: string[];
    prompt: string;
    model: string;
  }): Promise<void> {
    this.logger.debug(`Creating new chat: ${mode} mode, newTask: ${newTask}`);

    // Emit ClientCreateNewChat event
    await this.eventBus.emit<ClientCreateNewChatEvent>({
      kind: "ClientCreateNewChat",
      timestamp: new Date(),
      newTask,
      mode,
      knowledge,
      prompt,
      model,
    });

    // Update loading state
    useChatStore.getState().setLoading(true);

    // Hide the new chat modal
    useChatStore.getState().hideNewChatModal();
  }

  // Public method to open a chat file
  public async openChatFile(filePath: string): Promise<void> {
    this.logger.debug(`Opening chat file: ${filePath}`);

    // Reset state and start loading
    useChatStore.getState().reset();
    useChatStore.getState().setLoading(true);

    // Emit ClientOpenFile event
    await this.eventBus.emit<ClientOpenFileEvent>({
      kind: "ClientOpenFile",
      timestamp: new Date(),
      filePath,
    });
  }

  // Public method to submit a user message
  public async submitMessage(
    chatId: string,
    message: string,
    attachments?: Array<{ fileName: string; content: string }>
  ): Promise<void> {
    this.logger.debug(`Submitting message for chat: ${chatId}`);

    // Emit ClientSubmitUserChatMessage event
    await this.eventBus.emit<ClientSubmitUserChatMessageEvent>({
      kind: "ClientSubmitUserChatMessage",
      timestamp: new Date(),
      chatId,
      message,
      attachments,
    });

    // Update loading state
    useChatStore.getState().setLoading(true);
  }

  // Utility methods for components
  public getCurrentChat(): Chat | null {
    return useChatStore.getState().currentChat;
  }

  public isLoading(): boolean {
    return useChatStore.getState().isLoading;
  }

  public getError(): string | null {
    return useChatStore.getState().error;
  }

  public isPanelVisible(): boolean {
    return useChatStore.getState().isPanelVisible;
  }
}
