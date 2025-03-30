import { ILogObj, Logger } from "tslog";
import { inject, injectable } from "tsyringe";
import { type IEventBus } from "@repo/events-core/event-bus";
import {
  ServerTaskCreated,
  ServerTaskFolderCreated,
  ServerTaskInitialized,
  ServerTaskLoaded,
  ServerSubtaskStarted,
  ServerSubtaskCompleted,
  ServerSubtaskUpdated,
  ServerNextSubtaskTriggered,
  ServerChatCreated,
  ServerChatFileCreated,
  ServerChatUpdated,
  ServerAgentProcessedMessage,
  ServerAgentResponseGenerated,
  ServerMessageReceived,
  ServerMessageSavedToChatFile,
  ServerFileSystem,
  ServerTestEvent,
  ChatMetadata,
} from "@repo/events-core/event-types";
import {
  useEditorStore,
  TreeNodeItemType,
  hasChildrenNodeItems,
  isChatTreeNodeItem,
  isTaskTreeNodeItem,
  isSubtaskTreeNodeItem,
  ChatTreeNodeItem,
} from "./editor-store";
import { DI_TOKENS } from "../../lib/di/di-tokens";
import {
  UIPanelToggleEvent,
  UIItemSelectEvent,
  UIFolderToggleEvent,
  UILayoutChangeEvent,
  UIChatMessageSubmitEvent,
  UICreateTaskEvent,
  UICreateSubtaskEvent,
  UICreateChatEvent,
  UIPromptSubmitEvent,
} from "./ui-types";
import { UIPanelType, UILayoutType, UIUserStatus } from "./ui-types";

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
    this.eventBus.subscribe(
      "SERVER_TASK_CREATED",
      (event: ServerTaskCreated) => {
        store.createNewTask();
        this.logger.debug(`Task created: ${event.taskId}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_TASK_FOLDER_CREATED",
      (event: ServerTaskFolderCreated) => {
        this.logger.debug(`Task folder created: ${event.folderPath}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_TASK_INITIALIZED",
      (event: ServerTaskInitialized) => {
        this.logger.debug(`Task initialized: ${event.taskId}`);
      }
    );

    this.eventBus.subscribe("SERVER_TASK_LOADED", (event: ServerTaskLoaded) => {
      const taskItem = this.findItemById(event.taskId);
      if (taskItem) {
        store.setSelectedItem(taskItem);
      }
      this.logger.debug(`Task loaded: ${event.taskId}`);
    });

    // Subtask-related event handlers
    this.eventBus.subscribe(
      "SERVER_SUBTASK_STARTED",
      (event: ServerSubtaskStarted) => {
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

    this.eventBus.subscribe(
      "SERVER_SUBTASK_COMPLETED",
      (event: ServerSubtaskCompleted) => {
        this.logger.debug(`Subtask completed: ${event.subtaskId}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_SUBTASK_UPDATED",
      (event: ServerSubtaskUpdated) => {
        this.logger.debug(
          `Subtask updated: ${event.subtaskId}, status: ${event.status}`
        );
      }
    );

    this.eventBus.subscribe(
      "SERVER_NEXT_SUBTASK_TRIGGERED",
      (event: ServerNextSubtaskTriggered) => {
        this.logger.debug(
          `Next subtask triggered after: ${event.currentSubtaskId}`
        );
      }
    );

    // Chat-related event handlers
    this.eventBus.subscribe(
      "SERVER_CHAT_CREATED",
      (event: ServerChatCreated) => {
        const subtaskItem = this.findItemById(event.subtaskId);
        if (subtaskItem && hasChildrenNodeItems(subtaskItem)) {
          store.createNewChat(subtaskItem.id);
        }
        this.logger.debug(`Chat created: ${event.chatId}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_CHAT_FILE_CREATED",
      (event: ServerChatFileCreated) => {
        this.logger.debug(`Chat file created: ${event.filePath}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_CHAT_UPDATED",
      (event: ServerChatUpdated) => {
        this.logger.debug(
          `Chat updated: ${event.chatId}, last message: ${event.lastMessageId}`
        );
      }
    );

    this.eventBus.subscribe(
      "SERVER_AGENT_PROCESSED_MESSAGE",
      (event: ServerAgentProcessedMessage) => {
        this.logger.debug(`Agent processed message: ${event.messageId}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_AGENT_RESPONSE_GENERATED",
      (event: ServerAgentResponseGenerated) => {
        this.logger.debug(`Agent response generated for chat: ${event.chatId}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_MESSAGE_RECEIVED",
      (event: ServerMessageReceived) => {
        const chatItem = this.findItemById(event.chatId);
        if (chatItem && isChatTreeNodeItem(chatItem)) {
          store.sendMessage(chatItem.id, event.message.content);
        }
        this.logger.debug(`Message received for chat: ${event.chatId}`);
      }
    );

    this.eventBus.subscribe(
      "SERVER_MESSAGE_SAVED_TO_CHAT_FILE",
      (event: ServerMessageSavedToChatFile) => {
        this.logger.debug(`Message saved to chat file: ${event.filePath}`);
      }
    );

    // System-related event handlers
    this.eventBus.subscribe("SERVER_FILE_SYSTEM", (event: ServerFileSystem) => {
      this.logger.debug(`File system event: ${JSON.stringify(event.data)}`);
    });

    this.eventBus.subscribe("SERVER_TEST_EVENT", (event: ServerTestEvent) => {
      this.logger.debug(`Test event received: ${event.message}`);
    });

    this.logger.debug("Registered event handlers for editor events");
  }

  private registerUIEventHandlers(): void {
    const store = useEditorStore.getState();

    // UI Panel Toggle
    this.eventBus.subscribe<UIPanelToggleEvent>("UI_PANEL_TOGGLE", (event) => {
      store.setPanelVisibility(
        event.panelType as keyof UIPanelVisibility,
        event.isVisible
      );
      this.logger.debug(`Panel ${event.panelType} toggled: ${event.isVisible}`);
    });

    // UI Item Select
    this.eventBus.subscribe<UIItemSelectEvent>("UI_ITEM_SELECT", (event) => {
      const item = this.findItemById(event.itemId);
      if (item) {
        store.setSelectedItem(item);
        this.logger.debug(`Item selected: ${event.itemId}`);
      } else {
        this.logger.warn(`Item not found for selection: ${event.itemId}`);
      }
    });

    // UI Folder Toggle
    this.eventBus.subscribe<UIFolderToggleEvent>(
      "UI_FOLDER_TOGGLE",
      (event) => {
        store.toggleFolder(event.folderId);
        this.logger.debug(`Folder toggled: ${event.folderId}`);
      }
    );

    // UI Layout Change
    this.eventBus.subscribe<UILayoutChangeEvent>(
      "UI_LAYOUT_CHANGE",
      (event) => {
        store.setLayout(event.layout);
        this.logger.debug(`Layout changed to: ${event.layout}`);
      }
    );

    // UI Chat Message Submit
    this.eventBus.subscribe<UIChatMessageSubmitEvent>(
      "UI_CHAT_MESSAGE_SUBMIT",
      (event) => {
        this.clientSubmitMessage(event.chatId, event.content);
        this.logger.debug(`Chat message submitted for chat: ${event.chatId}`);
      }
    );

    // UI Create Task
    this.eventBus.subscribe<UICreateTaskEvent>("UI_CREATE_TASK", (event) => {
      this.clientCreateTask(event.taskName, {});
      this.logger.debug(`Create task requested: ${event.taskName}`);
    });

    // UI Create Subtask
    this.eventBus.subscribe<UICreateSubtaskEvent>(
      "UI_CREATE_SUBTASK",
      (event) => {
        // Currently no direct client command for subtask creation
        this.logger.debug(
          `Create subtask requested: ${event.subtaskName} for task ${event.taskId}`
        );
      }
    );

    // UI Create Chat
    this.eventBus.subscribe<UICreateChatEvent>("UI_CREATE_CHAT", (event) => {
      const item = this.findItemById(event.parentId);
      if (item) {
        if (hasChildrenNodeItems(item)) {
          if (isTaskTreeNodeItem(item)) {
            this.clientStartNewChat(item.id, item.id);
          } else if (isSubtaskTreeNodeItem(item)) {
            this.clientStartNewChat(item.data.taskId, item.id);
          }
          this.logger.debug(
            `Create chat requested for parent: ${event.parentId}`
          );
        } else {
          this.logger.warn(
            `Parent does not support children: ${event.parentId}`
          );
        }
      } else {
        this.logger.warn(`Parent not found for new chat: ${event.parentId}`);
      }
    });

    // UI Prompt Submit
    this.eventBus.subscribe<UIPromptSubmitEvent>(
      "UI_PROMPT_SUBMIT",
      (event) => {
        if (event.promptType === "task") {
          this.clientCreateTask(event.content, {});
        } else if (event.promptType === "chat") {
          // Handle chat creation with initial prompt
          // Would need context for which task/subtask this belongs to
          this.logger.debug(`Prompt submitted for new chat: ${event.content}`);
        }
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

  // Helper method to create new chat and get the created item back
  private createChat(parentId: string): ChatTreeNodeItem | null {
    const store = useEditorStore.getState();
    try {
      return store.createNewChat(parentId);
    } catch (error) {
      this.logger.error(`Failed to create chat in ${parentId}: ${error}`);
      return null;
    }
  }

  // Public methods to emit client events - renamed to better reflect client event emission
  public clientCreateTask(
    taskName: string,
    taskConfig: Record<string, unknown>
  ): void {
    const event = {
      eventType: "CLIENT_CREATE_TASK_COMMAND" as const,
      timestamp: new Date(),
      taskName,
      taskConfig,
    };
    this.eventBus.emit(event);
  }

  public clientStartTask(taskId: string): void {
    const event = {
      eventType: "CLIENT_START_TASK_COMMAND" as const,
      timestamp: new Date(),
      taskId,
    };
    this.eventBus.emit(event);
  }

  public clientStartSubtask(taskId: string, subtaskId: string): void {
    const event = {
      eventType: "CLIENT_START_SUBTASK_COMMAND" as const,
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
    const event = {
      eventType: "CLIENT_COMPLETE_SUBTASK_COMMAND" as const,
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
    const event = {
      eventType: "CLIENT_START_NEW_CHAT_COMMAND" as const,
      timestamp: new Date(),
      taskId,
      subtaskId,
      metadata,
    };
    this.eventBus.emit(event);

    // This is an immediate local action to improve UI responsiveness
    // The server event will eventually ensure data consistency
    if (subtaskId) {
      const subtaskItem = this.findItemById(subtaskId);
      if (subtaskItem && hasChildrenNodeItems(subtaskItem)) {
        this.createChat(subtaskItem.id);
      }
    }
  }

  public clientSubmitInitialPrompt(chatId: string, prompt: string): void {
    const event = {
      eventType: "CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND" as const,
      timestamp: new Date(),
      chatId,
      prompt,
    };
    this.eventBus.emit(event);
  }

  public clientSubmitMessage(chatId: string, content: string): void {
    const event = {
      eventType: "CLIENT_SUBMIT_MESSAGE_COMMAND" as const,
      timestamp: new Date(),
      chatId,
      content,
    };
    this.eventBus.emit(event);

    // Local state update for immediate UI feedback
    // The actual server response will come later
    try {
      useEditorStore.getState().sendMessage(chatId, content);
    } catch (error) {
      this.logger.error(`Failed to send message locally: ${error}`);
    }
  }

  public clientApproveWork(chatId: string, approvedWork?: string): void {
    const event = {
      eventType: "CLIENT_APPROVE_WORK" as const,
      timestamp: new Date(),
      chatId,
      approvedWork,
    };
    this.eventBus.emit(event);
  }

  public clientSendTestEvent(message: string): void {
    const event = {
      eventType: "CLIENT_TEST_EVENT" as const,
      timestamp: new Date(),
      message,
    };
    this.eventBus.emit(event);
  }

  // UI event emitters
  public uiTogglePanel(panelType: UIPanelType, isVisible: boolean): void {
    const event: UIPanelToggleEvent = {
      eventType: "UI_PANEL_TOGGLE",
      timestamp: new Date(),
      panelType,
      isVisible,
    };
    this.eventBus.emit(event);
  }

  public uiSelectItem(itemId: string): void {
    const event: UIItemSelectEvent = {
      eventType: "UI_ITEM_SELECT",
      timestamp: new Date(),
      itemId,
    };
    this.eventBus.emit(event);
  }

  public uiToggleFolder(folderId: string): void {
    const isExpanded = !useEditorStore.getState().isExpanded(folderId);
    const event: UIFolderToggleEvent = {
      eventType: "UI_FOLDER_TOGGLE",
      timestamp: new Date(),
      folderId,
      isExpanded,
    };
    this.eventBus.emit(event);
  }

  public uiChangeLayout(layout: UILayoutType): void {
    const event: UILayoutChangeEvent = {
      eventType: "UI_LAYOUT_CHANGE",
      timestamp: new Date(),
      layout,
    };
    this.eventBus.emit(event);
  }

  public uiSubmitChatMessage(chatId: string, content: string): void {
    const event: UIChatMessageSubmitEvent = {
      eventType: "UI_CHAT_MESSAGE_SUBMIT",
      timestamp: new Date(),
      chatId,
      content,
    };
    this.eventBus.emit(event);
  }

  public uiCreateTask(taskName: string): void {
    const event: UICreateTaskEvent = {
      eventType: "UI_CREATE_TASK",
      timestamp: new Date(),
      taskName,
    };
    this.eventBus.emit(event);
  }

  public uiCreateSubtask(taskId: string, subtaskName: string): void {
    const event: UICreateSubtaskEvent = {
      eventType: "UI_CREATE_SUBTASK",
      timestamp: new Date(),
      taskId,
      subtaskName,
    };
    this.eventBus.emit(event);
  }

  public uiCreateChat(parentId: string): void {
    const event: UICreateChatEvent = {
      eventType: "UI_CREATE_CHAT",
      timestamp: new Date(),
      parentId,
    };
    this.eventBus.emit(event);
  }

  public uiSubmitPrompt(promptType: "chat" | "task", content: string): void {
    const event: UIPromptSubmitEvent = {
      eventType: "UI_PROMPT_SUBMIT",
      timestamp: new Date(),
      promptType,
      content,
    };
    this.eventBus.emit(event);
  }

  // Utility methods for UI components
  public togglePanelVisibility(panel: UIPanelType): void {
    const panelVisibility = useEditorStore.getState().panelVisibility;
    const isCurrentlyVisible =
      panelVisibility[panel as keyof UIPanelVisibility];
    this.uiTogglePanel(panel, !isCurrentlyVisible);
  }

  public toggleLayout(): void {
    const currentLayout = useEditorStore.getState().layout;
    const newLayout =
      currentLayout === "two-column" ? "three-column" : "two-column";
    this.uiChangeLayout(newLayout);
  }

  public openPromptModal(type: "chat" | "task"): void {
    useEditorStore.getState().setPromptModal(true, type);
  }

  public closePromptModal(): void {
    useEditorStore.getState().setPromptModal(false, "task");
  }

  public updateUserStatus(userId: string, status: UIUserStatus): void {
    useEditorStore.getState().updateUserStatus(userId, status);
  }
}
