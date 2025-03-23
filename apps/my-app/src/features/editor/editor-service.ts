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
import { useEditorStore, ItemType, FolderItem } from "./editor-store";
import { DI_TOKENS } from "../../lib/di/di-tokens";

@injectable()
export class EditorService {
  private logger: Logger<ILogObj>;

  constructor(
    @inject(DI_TOKENS.EVENT_BUS) private eventBus: IEventBus,
    @inject(DI_TOKENS.LOGGER) logger?: Logger<ILogObj>
  ) {
    this.logger = logger || new Logger<ILogObj>({ name: "EditorService" });
    this.registerEventHandlers();

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
            subtaskItem.type === "folder" &&
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
        if (subtaskItem && subtaskItem.type === "folder") {
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
        if (chatItem && chatItem.type === "chat") {
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

  // Helper method to find an item by ID in the editor store
  private findItemById(id: string): ItemType | null {
    const root = useEditorStore.getState().data;

    const findItemRecursive = (
      item: ItemType,
      targetId: string
    ): ItemType | null => {
      if (item.id === targetId) return item;

      if ((item as FolderItem).children) {
        for (const child of (item as FolderItem).children!) {
          const found = findItemRecursive(child, targetId);
          if (found) return found;
        }
      }

      return null;
    };

    return findItemRecursive(root, id);
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
}
