import { ILogObj, Logger } from "tslog";
import {
  Chat,
  Task,
  Subtask,
  Message,
  RepositoryError,
  EntityNotFoundError,
  ConcurrencyError,
  EntityWithId,
} from "./types.js";
import { IWorkspaceManager } from "./workspace-manager.js";

/**
 * Generic repository interface for entity operations
 */
export interface IRepository<T extends EntityWithId> {
  findById(id: string): Promise<T | undefined>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  remove(id: string): Promise<void>;
}

/**
 * Base repository implementation with common functionality
 */
abstract class BaseRepository<T extends EntityWithId>
  implements IRepository<T>
{
  protected entities: Map<string, T> = new Map();
  protected logger: Logger<ILogObj>;
  protected workspaceManager: IWorkspaceManager;

  constructor(workspaceManager: IWorkspaceManager, loggerName?: string) {
    this.workspaceManager = workspaceManager;
    this.logger = new Logger({ name: loggerName || this.constructor.name });
  }

  async findById(id: string): Promise<T | undefined> {
    return this.entities.get(id);
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.entities.values());
  }

  abstract save(entity: T): Promise<void>;

  async remove(id: string): Promise<void> {
    if (this.entities.has(id)) {
      this.entities.delete(id);
      this.logger.info(`Entity ${id} removed from memory`);
    }
  }

  /**
   * Validates entity before saving to ensure consistency
   */
  protected validateEntity(entity: T): void {
    if (!entity.id) {
      throw new Error("Entity must have an 'id' attribute");
    }

    const existing = this.entities.get(entity.id);
    if (existing && existing.updatedAt > entity.updatedAt) {
      throw new ConcurrencyError(entity.id);
    }
  }
}

/**
 * Repository for Task entity management
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor(workspaceManager: IWorkspaceManager) {
    super(workspaceManager, "TaskRepository");
  }

  /**
   * Saves a task to memory and file system
   */
  async save(task: Task): Promise<void> {
    this.validateEntity(task);
    this.entities.set(task.id, task);
    await this.workspaceManager.saveTaskToJson(task);
    this.logger.info(`Task ${task.id} saved successfully`);
  }

  /**
   * Creates a new task folder and returns its path
   */
  async createTaskFolder(task: Task): Promise<string> {
    const folderPath = await this.workspaceManager.createTaskFolder(task);
    return folderPath;
  }

  /**
   * Retrieves a subtask within a task
   */
  async getSubtask(
    taskId: string,
    subtaskId: string
  ): Promise<[Task, Subtask]> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new EntityNotFoundError(`Task ${taskId} not found`);
    }

    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) {
      throw new EntityNotFoundError(
        `Subtask ${subtaskId} not found in task ${taskId}`
      );
    }

    return [task, subtask];
  }

  /**
   * Saves or updates a subtask within its parent task
   */
  async saveSubtask(subtask: Subtask): Promise<void> {
    const task = await this.findById(subtask.taskId);
    if (!task) {
      throw new EntityNotFoundError(`Task ${subtask.taskId} not found`);
    }

    // Find and replace or add subtask
    const index = task.subtasks.findIndex((s) => s.id === subtask.id);
    if (index >= 0) {
      task.subtasks[index] = subtask;
    } else {
      task.subtasks.push(subtask);
    }

    // Save the entire task to maintain consistency
    await this.save(task);
  }

  /**
   * Loads all tasks from workspace into memory
   */
  async loadWorkspace(): Promise<void> {
    const tasks = await this.workspaceManager.loadWorkspace();

    // Convert the record to a map
    this.entities = new Map(Object.entries(tasks));
    this.logger.info(`Loaded ${this.entities.size} tasks from workspace`);
  }
}

/**
 * Repository for Chat entity management
 */
export class ChatRepository extends BaseRepository<Chat> {
  constructor(workspaceManager: IWorkspaceManager) {
    super(workspaceManager, "ChatRepository");
  }

  /**
   * Saves a chat to memory and file system
   */
  async save(chat: Chat): Promise<void> {
    this.validateEntity(chat);
    this.entities.set(chat.id, chat);

    const chatPath = await this.workspaceManager.getChatFilePath(
      chat.taskId,
      chat.subtaskId,
      chat.id
    );

    if (chatPath) {
      await this.workspaceManager.saveChatToFile(chat, chatPath);
      this.logger.info(`Chat ${chat.id} saved successfully`);
    }
  }

  /**
   * Creates a new chat and returns its file path
   */
  async createChat(chat: Chat): Promise<string> {
    const folderPath = await this.workspaceManager.getSubtaskFolderPath(
      chat.taskId,
      chat.subtaskId
    );

    if (!folderPath) {
      throw new RepositoryError(
        `Could not find folder for task ${chat.taskId} and subtask ${chat.subtaskId}`
      );
    }

    const filePath = await this.workspaceManager.createChatFile(
      chat,
      folderPath
    );
    await this.save(chat);
    return filePath;
  }

  /**
   * Adds a message to a chat and persists the changes
   */
  async addMessage(chatId: string, message: Message): Promise<void> {
    const chat = await this.findById(chatId);
    if (!chat) {
      throw new EntityNotFoundError(`Chat ${chatId} not found`);
    }

    chat.messages.push(message);
    chat.updatedAt = new Date();
    await this.save(chat);
  }

  /**
   * Loads a chat from file system into memory
   */
  async loadChat(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<Chat | undefined> {
    const filePath = await this.workspaceManager.getChatFilePath(
      taskId,
      subtaskId,
      chatId
    );

    if (!filePath) {
      return undefined;
    }

    const chat = await this.workspaceManager.readChatFile(filePath);
    await this.save(chat);
    return chat;
  }
}
