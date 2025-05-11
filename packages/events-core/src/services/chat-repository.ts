// packages/events-core/src/services/chat-repository.ts
import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import type { IEventBus, BaseEvent } from "../event-bus.js";
import {
  createDirectory,
  fileExists,
  readJsonFile,
  writeJsonFile,
  listDirectory,
} from "../file-helpers.js";
import type {
  Chat,
  ChatMessage,
  ChatMetadata,
  Role,
  ChatStatus,
} from "./chat-service.js";

export class ChatFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatFileError";
  }
}

export class ChatNotFoundError extends ChatFileError {
  constructor(filePath: string) {
    super(`Chat with path ${filePath} not found`);
    this.name = "ChatNotFoundError";
  }
}

// Event for notifying when a chat file is created or updated
export interface ChatFileEvent extends BaseEvent {
  kind: "ChatFileCreatedEvent" | "ChatFileUpdatedEvent";
  chatId: string;
  absoluteFilePath: string;
}

interface ChatFileData {
  _type: string;
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  title?: string;
  metadata?: ChatMetadata;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string | Date;
    metadata?: Record<string, unknown>;
  }>;
}

export class ChatRepository {
  private readonly logger: Logger<ILogObj>;
  private readonly chatCache: Map<string, Chat> = new Map(); // absoluteFilePath -> Chat
  private readonly eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.logger = new Logger({ name: "ChatRepository" });
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing ChatRepository");
    this.logger.info(`Initialized with ${this.chatCache.size} chats`);
  }

  async scanFolder(folderPath: string): Promise<void> {
    const files = await listDirectory(folderPath);

    for (const file of files) {
      if (file.isDirectory) {
        // Recursively scan subfolders
        await this.scanFolder(path.join(folderPath, file.name));
        continue;
      }

      if (file.name.endsWith(".chat.json")) {
        const chatFilePath = path.join(folderPath, file.name);
        try {
          const chat = await this.readChatFromFile(chatFilePath);
          this.chatCache.set(chatFilePath, chat);
        } catch (error) {
          this.logger.warn(`Failed to load chat file: ${chatFilePath}`, error);
        }
      }
    }
  }

  async findByPath(absoluteFilePath: string): Promise<Chat> {
    // Check cache first
    const cachedChat = this.chatCache.get(absoluteFilePath);
    if (cachedChat) {
      return cachedChat;
    }

    // Not in cache, try to load from disk
    if (await fileExists(absoluteFilePath)) {
      const chat = await this.readChatFromFile(absoluteFilePath);
      this.chatCache.set(absoluteFilePath, chat);
      return chat;
    }

    throw new ChatNotFoundError(absoluteFilePath);
  }

  async findAll(): Promise<Chat[]> {
    return Array.from(this.chatCache.values());
  }

  async findById(chatId: string): Promise<Chat | undefined> {
    this.logger.warn(
      `Searching for chat by ID ${chatId} - this performs an exhaustive cache search. ` +
        `Use findByPath when possible for better performance.`
    );

    for (const chat of this.chatCache.values()) {
      if (chat.id === chatId) {
        return chat;
      }
    }

    return undefined;
  }

  async createChat(
    chat: Omit<Chat, "filePath">,
    targetFolderAbsolutePath: string,
    correlationId?: string
  ): Promise<Chat> {
    // Ensure folder exists
    await createDirectory(targetFolderAbsolutePath);

    // Generate a unique chat number for the folder
    const chatNumber = await this.getNextChatNumber(targetFolderAbsolutePath);
    const fileName = `chat${chatNumber}.chat.json`;
    const absoluteFilePath = path.join(targetFolderAbsolutePath, fileName);

    const newChat: Chat = {
      ...chat,
      filePath: absoluteFilePath,
    };

    // Save chat to file
    await this.saveChatToFile(newChat, absoluteFilePath);

    // Emit file created event
    await this.eventBus.emit<ChatFileEvent>({
      kind: "ChatFileCreatedEvent",
      chatId: newChat.id,
      absoluteFilePath,
      timestamp: new Date(),
      correlationId,
    });

    // Cache the chat
    this.chatCache.set(absoluteFilePath, newChat);

    return newChat;
  }

  private async getNextChatNumber(folderPath: string): Promise<number> {
    const files = await listDirectory(folderPath);
    let highestChatNumber = 0;

    for (const file of files) {
      if (file.isDirectory) continue;

      const match = file.name.match(/^chat(\d+)\.chat\.json$/);
      if (match && match[1]) {
        const chatNumber = parseInt(match[1], 10);
        highestChatNumber = Math.max(highestChatNumber, chatNumber);
      }
    }

    return highestChatNumber + 1;
  }

  async addMessage(
    absoluteFilePath: string,
    message: ChatMessage,
    correlationId?: string
  ): Promise<Chat> {
    const chat = await this.findByPath(absoluteFilePath);
    chat.messages.push(message);
    chat.updatedAt = new Date();

    // Update the cache immediately
    this.chatCache.set(absoluteFilePath, chat);

    // Save to file
    await this.saveChatToFile(chat, absoluteFilePath);

    // Emit file updated event
    await this.eventBus.emit<ChatFileEvent>({
      kind: "ChatFileUpdatedEvent",
      chatId: chat.id,
      absoluteFilePath,
      timestamp: new Date(),
      correlationId,
    });

    return chat;
  }

  async readChatFile(absoluteFilePath: string): Promise<Chat> {
    if (!(await fileExists(absoluteFilePath))) {
      throw new ChatFileError(`File does not exist: ${absoluteFilePath}`);
    }

    return this.readChatFromFile(absoluteFilePath);
  }

  async deleteChat(absoluteFilePath: string): Promise<void> {
    if (await fileExists(absoluteFilePath)) {
      await fs.unlink(absoluteFilePath);
      this.logger.debug(`Deleted chat file: ${absoluteFilePath}`);
    }

    this.chatCache.delete(absoluteFilePath);
  }

  removeFromCache(absoluteFilePath: string): void {
    this.chatCache.delete(absoluteFilePath);
  }

  private async saveChatToFile(
    chat: Chat,
    absoluteFilePath: string
  ): Promise<void> {
    const chatFile: ChatFileData = {
      _type: "chat",
      id: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      title: chat.metadata?.title || "New Chat",
      metadata: chat.metadata,
      messages: chat.messages,
    };

    await writeJsonFile(absoluteFilePath, chatFile);
  }

  private async readChatFromFile(absoluteFilePath: string): Promise<Chat> {
    const chatFileData = await readJsonFile<ChatFileData>(absoluteFilePath);

    if (chatFileData._type !== "chat") {
      throw new ChatFileError(`File ${absoluteFilePath} is not a chat file`);
    }

    // Convert roles to proper type without using 'as'
    const ensureRole = (role: string): Role => {
      const validRoles: Role[] = ["ASSISTANT", "USER", "FUNCTION_EXECUTOR"];
      return validRoles.includes(role as Role) ? (role as Role) : "USER"; // Default to USER if invalid
    };

    const chat: Chat = {
      id: chatFileData.id,
      filePath: absoluteFilePath,
      messages: chatFileData.messages.map((msg) => ({
        id: msg.id,
        role: ensureRole(msg.role),
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata,
      })),
      status: "ACTIVE" as ChatStatus,
      createdAt: new Date(chatFileData.createdAt),
      updatedAt: new Date(chatFileData.updatedAt),
      metadata: chatFileData.metadata,
    };

    return chat;
  }
}
