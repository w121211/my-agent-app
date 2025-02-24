// src/repositories.ts

import { Logger } from "tslog";
import { IWorkspaceManager } from "./workspaceManager";
import { Chat, Message, Subtask, Task } from "./types.js";

// 自定義異常
export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(message: string) {
    super(message);
    this.name = "EntityNotFoundError";
  }
}

export class ConcurrencyError extends RepositoryError {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyError";
  }
}

// 通用介面
export interface Entity {
  id: string;
  updatedAt: Date;
}

export interface IRepository<T extends Entity> {
  findById(id: string): Promise<T | undefined>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  remove(entityId: string): Promise<void>;
}

// 基礎儲存庫實現
abstract class Repository<T extends Entity> implements IRepository<T> {
  protected entities: Map<string, T>;
  protected workspaceManager: IWorkspaceManager;
  protected logger: Logger;

  constructor(workspaceManager: IWorkspaceManager) {
    this.entities = new Map();
    this.workspaceManager = workspaceManager;
    this.logger = new Logger({ name: this.constructor.name });
  }

  async findById(id: string): Promise<T | undefined> {
    return this.entities.get(id);
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.entities.values());
  }

  protected async atomicOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof EntityNotFoundError ||
        error instanceof ConcurrencyError
      ) {
        throw error;
      }
      this.logger.error(`Operation failed: ${error}`);
      throw new RepositoryError(`Repository operation failed: ${error}`);
    }
  }

  protected async validateEntity(entity: T): Promise<void> {
    if (!entity.id) {
      throw new Error("Entity must have an 'id' attribute");
    }

    const existing = await this.findById(entity.id);
    if (existing && existing.updatedAt > entity.updatedAt) {
      throw new ConcurrencyError(
        `Concurrency conflict for entity ${entity.id}`
      );
    }
  }

  abstract save(entity: T): Promise<void>;
  abstract remove(entityId: string): Promise<void>;
}

export class TaskRepository extends Repository<Task> {
  constructor(workspaceManager: IWorkspaceManager) {
    super(workspaceManager);
  }

  async save(task: Task): Promise<void> {
    await this.atomicOperation(async () => {
      await this.validateEntity(task);
      this.entities.set(task.id, task);
      await this.workspaceManager.saveTaskToJson(task);
      this.logger.info(`Task ${task.id} saved successfully`);
    });
  }

  async remove(taskId: string): Promise<void> {
    await this.atomicOperation(async () => {
      if (this.entities.has(taskId)) {
        const folderPath =
          await this.workspaceManager.getTaskFolderPath(taskId);
        if (folderPath) {
          this.entities.delete(taskId);
          this.logger.info(`Task ${taskId} removed from memory`);
        }
      }
    });
  }

  async createTaskFolder(task: Task): Promise<string> {
    return this.atomicOperation(async () => {
      const folderPath = await this.workspaceManager.createTaskFolder(task);
      return folderPath;
    });
  }

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

  async saveSubtask(subtask: Subtask): Promise<void> {
    await this.atomicOperation(async () => {
      const task = await this.findById(subtask.taskId);
      if (!task) {
        throw new EntityNotFoundError(`Task ${subtask.taskId} not found`);
      }

      const index = task.subtasks.findIndex((s) => s.id === subtask.id);
      if (index !== -1) {
        task.subtasks[index] = subtask;
      } else {
        task.subtasks.push(subtask);
      }

      await this.save(task);
    });
  }

  async loadWorkspace(): Promise<void> {
    const tasks = await this.workspaceManager.loadWorkspace();
    this.entities = new Map(Object.entries(tasks));
    this.logger.info(
      `Loaded ${Object.keys(tasks).length} tasks from workspace`
    );
  }
}

export class ChatRepository extends Repository<Chat> {
  constructor(workspaceManager: IWorkspaceManager) {
    super(workspaceManager);
  }

  async save(chat: Chat): Promise<void> {
    await this.atomicOperation(async () => {
      await this.validateEntity(chat);
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
    });
  }

  async remove(chatId: string): Promise<void> {
    await this.atomicOperation(async () => {
      if (this.entities.has(chatId)) {
        this.entities.delete(chatId);
        this.logger.info(`Chat ${chatId} removed from memory`);
      }
    });
  }

  async createChat(chat: Chat): Promise<string> {
    return this.atomicOperation(async () => {
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
    });
  }

  async addMessage(chatId: string, message: Message): Promise<void> {
    await this.atomicOperation(async () => {
      const chat = await this.findById(chatId);
      if (!chat) {
        throw new EntityNotFoundError(`Chat ${chatId} not found`);
      }

      chat.messages.push(message);
      chat.updatedAt = new Date();
      await this.save(chat);
    });
  }

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
