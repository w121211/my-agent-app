import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import {
  Chat,
  Task,
  ChatMessage,
  EntityNotFoundError,
  ConcurrencyError,
  EntityWithId,
  ChatStatus,
  Role,
  TaskStatus,
} from "./event-types.js";

// File operation helper functions
export async function createDirectory(dirPath: string): Promise<string> {
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

export async function writeJsonFile<T>(
  filePath: string,
  data: T
): Promise<void> {
  // Create a temporary file path with timestamp for uniqueness
  const tempFilePath = `${filePath}.${Date.now()}.tmp`;

  // Write data to the temporary file first
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempFilePath, content, "utf8");

  // Atomically rename the temporary file to the target file
  await fs.rename(tempFilePath, filePath);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listDirectory(
  dirPath: string
): Promise<{ name: string; isDirectory: boolean }[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }));
}

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
  protected workspacePath: string;

  constructor(workspacePath: string, loggerName?: string) {
    this.workspacePath = workspacePath;
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

  protected validateEntity(entity: T): void {
    if (!entity.id) {
      throw new Error("Entity must have an 'id' attribute");
    }

    const existing = this.entities.get(entity.id);
    if (existing && existing.updatedAt > entity.updatedAt) {
      throw new ConcurrencyError(entity.id);
    }
  }

  protected resolvePath(relativePath: string): string {
    return path.isAbsolute(relativePath)
      ? relativePath
      : path.join(this.workspacePath, relativePath);
  }
}

// Interfaces for serialized data structures
interface TaskData {
  id: string;
  seqNumber: number;
  title: string;
  status: string;
  currentSubtaskId?: string;
  folderPath?: string;
  config: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ChatFileData {
  _type: string;
  chatId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  title?: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string | Date;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Repository for Task entity management
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor(workspacePath: string) {
    super(workspacePath, "TaskRepository");
  }

  async save(task: Task): Promise<void> {
    this.validateEntity(task);
    this.entities.set(task.id, task);

    if (task.folderPath) {
      const taskFilePath = path.join(task.folderPath, "task.json");
      await writeJsonFile(taskFilePath, task);
      this.logger.info(`Task ${task.id} saved successfully`);
    }
  }

  async createTaskFolder(task: Task): Promise<string> {
    const folderName = `task-${task.id}`;
    const folderPath = this.resolvePath(folderName);
    await createDirectory(folderPath);
    this.logger.info(`Created task folder: ${folderPath}`);
    return folderPath;
  }

  async loadWorkspace(): Promise<void> {
    const entries = await listDirectory(this.workspacePath);

    const taskPromises = entries
      .filter((entry) => entry.isDirectory && entry.name.startsWith("task-"))
      .map(async (entry) => {
        const taskFilePath = path.join(
          this.workspacePath,
          entry.name,
          "task.json"
        );

        if (await fileExists(taskFilePath)) {
          const taskData = await readJsonFile<TaskData>(taskFilePath);
          const task: Task = {
            id: taskData.id,
            seqNumber: taskData.seqNumber,
            title: taskData.title,
            status: taskData.status as TaskStatus,
            currentSubtaskId: taskData.currentSubtaskId,
            folderPath: taskData.folderPath,
            config: taskData.config,
            createdAt: new Date(taskData.createdAt),
            updatedAt: new Date(taskData.updatedAt),
          };
          this.entities.set(task.id, task);
        }
      });

    await Promise.all(taskPromises);
    this.logger.info(`Loaded ${this.entities.size} tasks from workspace`);
  }
}

/**
 * Repository for Chat entity management
 */
export class ChatRepository extends BaseRepository<Chat> {
  constructor(workspacePath: string) {
    super(workspacePath, "ChatRepository");
  }

  async save(chat: Chat): Promise<void> {
    this.validateEntity(chat);
    this.entities.set(chat.id, chat);

    if (chat.filePath) {
      await this.saveChatToFile(chat, chat.filePath);
      this.logger.info(`Chat ${chat.id} saved successfully`);
    }
  }

  async createChat(chat: Chat, taskFolderPath: string): Promise<string> {
    const fileName = `${chat.id}.chat.json`;
    const filePath = path.join(taskFolderPath, fileName);

    await this.saveChatToFile(chat, filePath);
    chat.filePath = filePath;
    this.entities.set(chat.id, chat);

    return filePath;
  }

  async addMessage(chatId: string, message: ChatMessage): Promise<void> {
    const chat = await this.findById(chatId);
    if (!chat) {
      throw new EntityNotFoundError(chatId);
    }

    chat.messages.push(message);
    chat.updatedAt = new Date();
    await this.save(chat);
  }

  // async getChatFilePath(
  //   taskId: string,
  //   chatId: string
  // ): Promise<string | undefined> {
  //   const taskFolderPath = this.resolvePath(`task-${taskId}`);
  //   const chatFilePath = path.join(taskFolderPath, `${chatId}.chat.json`);

  //   if (await fileExists(chatFilePath)) {
  //     return chatFilePath;
  //   }

  //   return undefined;
  // }

  // async loadChat(taskId: string, chatId: string): Promise<Chat | undefined> {
  //   const filePath = await this.getChatFilePath(taskId, chatId);

  //   if (!filePath) {
  //     return undefined;
  //   }

  //   return this.readChatFile(filePath);
  // }

  async readChatFile(filePath: string): Promise<Chat> {
    const chatFileData = await readJsonFile<ChatFileData>(filePath);

    if (chatFileData._type !== "chat") {
      throw new Error(`File ${filePath} is not a chat file`);
    }

    // const taskId = this.extractTaskIdFromPath(filePath);

    const chat: Chat = {
      id: chatFileData.chatId,
      // taskId,
      messages: chatFileData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as Role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata,
      })),
      status: "ACTIVE" as ChatStatus,
      createdAt: new Date(chatFileData.createdAt),
      updatedAt: new Date(chatFileData.updatedAt),
      filePath,
      metadata: {
        title: chatFileData.title,
      },
    };

    this.entities.set(chat.id, chat);
    return chat;
  }

  private async saveChatToFile(chat: Chat, filePath: string): Promise<void> {
    const chatFile = {
      _type: "chat",
      chatId: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      title: chat.metadata?.title || "New Chat",
      messages: chat.messages,
    };

    await writeJsonFile(filePath, chatFile);
  }

  // private extractTaskIdFromPath(filePath: string): string {
  //   const pathParts = filePath.split(path.sep);

  //   for (const part of pathParts) {
  //     if (part.startsWith("task-")) {
  //       return part.substring(5);
  //     }
  //   }

  //   this.logger.warn(`Could not extract task ID from path: ${filePath}`);
  //   return "unknown";
  // }
}
