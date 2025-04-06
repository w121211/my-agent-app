import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";
import { type IEventBus } from "@repo/events-core/event-bus";
import {
  ServerTaskCreatedEvent,
  ServerTaskFolderCreatedEvent,
  ServerTaskInitializedEvent,
  ServerTaskLoadedEvent,
  ServerSubtaskStartedEvent,
  ServerSubtaskCompletedEvent,
  ServerSubtaskUpdatedEvent,
  ServerNextSubtaskTriggeredEvent,
  ServerChatCreatedEvent,
  ServerChatFileCreatedEvent,
  ServerChatContentUpdatedEvent,
  ServerAgentProcessedMessageEvent,
  ServerAgentResponseGeneratedEvent,
  ServerMessageReceivedEvent,
  ServerMessageSavedToChatFileEvent,
  ServerFileWatcherEvent,
  ClientCreateTaskEvent,
  ClientStartTaskEvent,
  ClientStopTaskEvent,
  ClientStartSubtaskEvent,
  ClientCompleteSubtaskEvent,
  ClientStartNewChatEvent,
  ClientSubmitInitialPromptEvent,
  ClientSubmitMessageEvent,
  ClientApproveWorkEvent,
  ClientRunTestEvent,
  ChatMetadata,
} from "@repo/events-core/event-types";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import {
  useEditorStore,
  TreeNodeItemType,
  hasChildrenNodeItems,
  isChatTreeNodeItem,
} from "./editor-store";
import {
  UiNewTaskButtonClickedEvent,
  UiFolderNodeClickedEvent,
  UiFileNodeClickedEvent,
  UiStartTaskButtonClickedEvent,
  UiStopTaskButtonClickedEvent,
  UiNewChatButtonClickedEvent,
  UiSendMessageButtonClickedEvent,
  UiApproveWorkButtonClickedEvent,
  UiFileNodeSelectedEvent,
  UiFolderNodeExpansionToggledEvent,
  UiFileOpenedEvent,
  UiErrorNotificationShownEvent,
} from "./ui-event-types";

// UI types (assumed to be defined elsewhere)
export type UIPanelType = "explorer" | "editor" | "chat" | "task" | string;
export type UILayoutType = "two-column" | "three-column";
export type UIUserStatus = "editing" | "viewing" | "idle";
export interface UIPanelVisibility {
  explorer: boolean;
  editor: boolean;
  chat: boolean;
  task: boolean;
}

@injectable()
export class EditorService {
  private logger: Logger<ILogObj>;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger<ILogObj>({ name: "EditorService" });
    this.registerEventHandlers();
    this.registerUIEventHandlers();

    this.logger.debug("EditorService initialized");
  }

  private registerEventHandlers(): void {
    const store = useEditorStore.getState();

    // Task-related event handlers
    this.eventBus.subscribe<ServerTaskCreatedEvent>(
      "ServerTaskCreated",
      (event) => {
        store.createNewTask();
        this.logger.debug(`Task created: ${event.taskId}`);
      }
    );

    this.eventBus.subscribe<ServerTaskFolderCreatedEvent>(
      "ServerTaskFolderCreated",
      (event) => {
        this.logger.debug(`Task folder created: ${event.folderPath}`);
      }
    );

    this.eventBus.subscribe<ServerTaskInitializedEvent>(
      "ServerTaskInitialized",
      (event) => {
        this.logger.debug(`Task initialized: ${event.taskId}`);
      }
    );

    this.eventBus.subscribe<ServerTaskLoadedEvent>(
      "ServerTaskLoaded",
      (event) => {
        const taskItem = this.findItemById(event.taskId);
        if (taskItem) {
          store.setSelectedItem(taskItem);
        }
        this.logger.debug(`Task loaded: ${event.taskId}`);
      }
    );

    // Subtask-related event handlers
    this.eventBus.subscribe<ServerSubtaskStartedEvent>(
      "ServerSubtaskStarted",
      (event) => {
        const subtaskItem = this.findItemById(event.subtaskId);
        if (subtaskItem) {
          store.setSelectedItem(subtaskItem);
          if (
            hasChildrenNodeItems(subtaskItem) &&
            !store.isExpanded(subtaskItem.id)
          ) {
            store.toggleFolder(subtaskItem.id);
          }
        }
        this.logger.debug(`Subtask started: ${event.subtaskId}`);
      }
    );

    this.eventBus.subscribe<ServerSubtaskCompletedEvent>(
      "ServerSubtaskCompleted",
      (event) => {
        this.logger.debug(`Subtask completed: ${event.subtaskId}`);
      }
    );

    this.eventBus.subscribe<ServerSubtaskUpdatedEvent>(
      "ServerSubtaskUpdated",
      (event) => {
        this.logger.debug(
          `Subtask updated: ${event.subtaskId}, status: ${event.status}`
        );
      }
    );

    this.eventBus.subscribe<ServerNextSubtaskTriggeredEvent>(
      "ServerNextSubtaskTriggered",
      (event) => {
        this.logger.debug(
          `Next subtask triggered after: ${event.currentSubtaskId}`
        );
      }
    );

    // Chat-related event handlers
    this.eventBus.subscribe<ServerChatCreatedEvent>(
      "ServerChatCreated",
      (event) => {
        const subtaskItem = this.findItemById(event.subtaskId);
        if (subtaskItem && hasChildrenNodeItems(subtaskItem)) {
          store.createNewChat(subtaskItem.id);
        }
        this.logger.debug(`Chat created: ${event.chatId}`);
      }
    );

    this.eventBus.subscribe<ServerChatFileCreatedEvent>(
      "ServerChatFileCreated",
      (event) => {
        this.logger.debug(`Chat file created: ${event.filePath}`);
      }
    );

    this.eventBus.subscribe<ServerChatContentUpdatedEvent>(
      "ServerChatContentUpdated",
      (event) => {
        this.logger.debug(
          `Chat updated: ${event.chatId}, last message: ${event.lastMessageId}`
        );
      }
    );

    this.eventBus.subscribe<ServerAgentProcessedMessageEvent>(
      "ServerAgentProcessedMessage",
      (event) => {
        this.logger.debug(`Agent processed message: ${event.messageId}`);
      }
    );

    this.eventBus.subscribe<ServerAgentResponseGeneratedEvent>(
      "ServerAgentResponseGenerated",
      (event) => {
        this.logger.debug(`Agent response generated for chat: ${event.chatId}`);
      }
    );

    this.eventBus.subscribe<ServerMessageReceivedEvent>(
      "ServerMessageReceived",
      (event) => {
        const chatItem = this.findItemById(event.chatId);
        if (chatItem && isChatTreeNodeItem(chatItem)) {
          store.sendMessage(chatItem.id, event.message.content);
        }
        this.logger.debug(`Message received for chat: ${event.chatId}`);
      }
    );

    this.eventBus.subscribe<ServerMessageSavedToChatFileEvent>(
      "ServerMessageSavedToChatFile",
      (event) => {
        this.logger.debug(`Message saved to chat file: ${event.filePath}`);
      }
    );

    // System-related event handlers
    this.eventBus.subscribe<ServerFileWatcherEvent>(
      "ServerFileWatcherEvent",
      (event) => {
        this.logger.debug(`File system event: ${JSON.stringify(event.data)}`);
      }
    );

    this.logger.debug("Registered event handlers for editor events");
  }

  private registerUIEventHandlers(): void {
    const store = useEditorStore.getState();

    // File node selection
    this.eventBus.subscribe<UiFileNodeSelectedEvent>(
      "UiFileNodeSelected",
      (event) => {
        const item = this.findItemByPath(event.path);
        if (item) {
          store.setSelectedItem(item);
          this.logger.debug(`Item selected by path: ${event.path}`);
        }
      }
    );

    // Folder expansion toggle
    this.eventBus.subscribe<UiFolderNodeExpansionToggledEvent>(
      "UiFolderNodeExpansionToggled",
      (event) => {
        const item = this.findItemByPath(event.path);
        if (item) {
          store.toggleFolder(item.id);
          this.logger.debug(`Folder toggled: ${event.path}`);
        }
      }
    );

    // File opened
    this.eventBus.subscribe<UiFileOpenedEvent>("UiFileOpened", (event) => {
      const item = this.findItemByPath(event.path);
      if (item) {
        store.setSelectedItem(item);
        this.logger.debug(`File opened: ${event.path}`);
      }
    });

    // Chat message submit
    this.eventBus.subscribe<UiSendMessageButtonClickedEvent>(
      "UiSendMessageButtonClicked",
      (event) => {
        this.clientSubmitMessage(event.chatId, event.content);
        this.logger.debug(`Chat message submitted for chat: ${event.chatId}`);
      }
    );

    // Create task
    this.eventBus.subscribe<UiNewTaskButtonClickedEvent>(
      "UiNewTaskButtonClicked",
      () => {
        store.createNewTask();
        this.logger.debug("Create task requested");
      }
    );

    // Start new chat
    this.eventBus.subscribe<UiNewChatButtonClickedEvent>(
      "UiNewChatButtonClicked",
      (event) => {
        this.clientStartNewChat(event.taskId, event.subtaskId);
        this.logger.debug(`New chat requested for subtask: ${event.subtaskId}`);
      }
    );

    this.logger.debug("Registered UI event handlers");
  }

  // Helper method to find an item by ID in the editor store
  private findItemById(id: string): TreeNodeItemType | null {
    const root = useEditorStore.getState().data;

    const findItemRecursive = (
      item: TreeNodeItemType,
      targetId: string
    ): TreeNodeItemType | null => {
      if (item.id === targetId) return item;

      if (hasChildrenNodeItems(item)) {
        for (const child of item.children) {
          const found = findItemRecursive(child, targetId);
          if (found) return found;
        }
      }

      return null;
    };

    return findItemRecursive(root, id);
  }

  // Helper method to find an item by path
  private findItemByPath(path: string): TreeNodeItemType | null {
    // Simple implementation - in real code this would be more robust
    // For now just extract the ID from the last part of the path
    const parts = path.split("/");
    const lastPart = parts[parts.length - 1];
    const idMatch = lastPart?.match(/^([a-z0-9-]+)/i);

    if (idMatch && idMatch[1]) {
      return this.findItemById(idMatch[1]);
    }

    return null;
  }

  // Public methods to emit client events
  public clientCreateTask(
    taskName: string,
    taskConfig: Record<string, unknown>
  ): void {
    const event: ClientCreateTaskEvent = {
      kind: "ClientCreateTask",
      timestamp: new Date(),
      taskName,
      taskConfig,
    };
    this.eventBus.emit(event);
  }

  public clientStartTask(taskId: string): void {
    const event: ClientStartTaskEvent = {
      kind: "ClientStartTask",
      timestamp: new Date(),
      taskId,
    };
    this.eventBus.emit(event);
  }

  public clientStopTask(taskId: string): void {
    const event: ClientStopTaskEvent = {
      kind: "ClientStopTask",
      timestamp: new Date(),
      taskId,
    };
    this.eventBus.emit(event);
  }

  public clientStartSubtask(taskId: string, subtaskId: string): void {
    const event: ClientStartSubtaskEvent = {
      kind: "ClientStartSubtask",
      timestamp: new Date(),
      taskId,
      subtaskId,
    };
    this.eventBus.emit(event);
  }

  public clientCompleteSubtask(
    taskId: string,
    subtaskId: string,
    output: string,
    requiresApproval: boolean
  ): void {
    const event: ClientCompleteSubtaskEvent = {
      kind: "ClientCompleteSubtask",
      timestamp: new Date(),
      taskId,
      subtaskId,
      output,
      requiresApproval,
    };
    this.eventBus.emit(event);
  }

  public clientStartNewChat(
    taskId: string,
    subtaskId: string,
    metadata?: ChatMetadata
  ): void {
    const event: ClientStartNewChatEvent = {
      kind: "ClientStartNewChat",
      timestamp: new Date(),
      taskId,
      subtaskId,
      metadata,
    };
    this.eventBus.emit(event);

    // Local action to improve UI responsiveness
    if (subtaskId) {
      const subtaskItem = this.findItemById(subtaskId);
      if (subtaskItem && hasChildrenNodeItems(subtaskItem)) {
        useEditorStore.getState().createNewChat(subtaskItem.id);
      }
    }
  }

  public clientSubmitInitialPrompt(chatId: string, prompt: string): void {
    const event: ClientSubmitInitialPromptEvent = {
      kind: "ClientSubmitInitialPrompt",
      timestamp: new Date(),
      chatId,
      prompt,
    };
    this.eventBus.emit(event);
  }

  public clientSubmitMessage(chatId: string, content: string): void {
    const event: ClientSubmitMessageEvent = {
      kind: "ClientSubmitMessage",
      timestamp: new Date(),
      chatId,
      content,
    };
    this.eventBus.emit(event);

    // Local state update for immediate UI feedback
    useEditorStore.getState().sendMessage(chatId, content);
  }

  public clientApproveWork(chatId: string, approvedWork?: string): void {
    const event: ClientApproveWorkEvent = {
      kind: "ClientApproveWork",
      timestamp: new Date(),
      chatId,
      approvedWork,
    };
    this.eventBus.emit(event);
  }

  public clientRunTest(message: string): void {
    const event: ClientRunTestEvent = {
      kind: "ClientRunTest",
      timestamp: new Date(),
      message,
    };
    this.eventBus.emit(event);
  }

  // UI event emitters
  public uiNewTaskButtonClicked(): void {
    const event: UiNewTaskButtonClickedEvent = {
      kind: "UiNewTaskButtonClicked",
      timestamp: new Date(),
    };
    this.eventBus.emit(event);
  }

  public uiFolderNodeClicked(path: string): void {
    const event: UiFolderNodeClickedEvent = {
      kind: "UiFolderNodeClicked",
      timestamp: new Date(),
      path,
    };
    this.eventBus.emit(event);
  }

  public uiFileNodeClicked(path: string): void {
    const event: UiFileNodeClickedEvent = {
      kind: "UiFileNodeClicked",
      timestamp: new Date(),
      path,
    };
    this.eventBus.emit(event);
  }

  public uiStartTaskButtonClicked(taskId: string): void {
    const event: UiStartTaskButtonClickedEvent = {
      kind: "UiStartTaskButtonClicked",
      timestamp: new Date(),
      taskId,
    };
    this.eventBus.emit(event);
  }

  public uiStopTaskButtonClicked(taskId: string): void {
    const event: UiStopTaskButtonClickedEvent = {
      kind: "UiStopTaskButtonClicked",
      timestamp: new Date(),
      taskId,
    };
    this.eventBus.emit(event);
  }

  public uiNewChatButtonClicked(taskId: string, subtaskId: string): void {
    const event: UiNewChatButtonClickedEvent = {
      kind: "UiNewChatButtonClicked",
      timestamp: new Date(),
      taskId,
      subtaskId,
    };
    this.eventBus.emit(event);
  }

  public uiSendMessageButtonClicked(chatId: string, content: string): void {
    const event: UiSendMessageButtonClickedEvent = {
      kind: "UiSendMessageButtonClicked",
      timestamp: new Date(),
      chatId,
      content,
    };
    this.eventBus.emit(event);
  }

  public uiApproveWorkButtonClicked(chatId: string): void {
    const event: UiApproveWorkButtonClickedEvent = {
      kind: "UiApproveWorkButtonClicked",
      timestamp: new Date(),
      chatId,
    };
    this.eventBus.emit(event);
  }

  public uiErrorNotification(message: string, error?: Error): void {
    const event: UiErrorNotificationShownEvent = {
      kind: "UiErrorNotificationShown",
      timestamp: new Date(),
      message,
      error,
    };
    this.eventBus.emit(event);
  }

  // Utility methods for UI components
  public toggleFolderExpansion(path: string): void {
    const item = this.findItemByPath(path);
    if (item) {
      const isExpanded = useEditorStore.getState().isExpanded(item.id);

      const event: UiFolderNodeExpansionToggledEvent = {
        kind: "UiFolderNodeExpansionToggled",
        timestamp: new Date(),
        path,
        expanded: !isExpanded,
      };
      this.eventBus.emit(event);
    }
  }

  public openFile(path: string): void {
    const event: UiFileOpenedEvent = {
      kind: "UiFileOpened",
      timestamp: new Date(),
      path,
    };
    this.eventBus.emit(event);
  }
}
