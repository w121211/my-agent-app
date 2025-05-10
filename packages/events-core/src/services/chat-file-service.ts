// File path: packages/events-core/src/services/chat-file-service.ts

import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type {
  Chat,
  ChatMessage,
  ChatMessageMetadata,
  ChatMetadata,
  Role,
  ServerChatFileCreatedEvent,
  ServerChatFileUpdatedEvent,
} from "../event-types.js";
import {
  createDirectory,
  fileExists,
  readJsonFile,
  writeJsonFile,
  listDirectory,
} from "../file-helpers.js";

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
    metadata?: ChatMessageMetadata;
  }>;
}

export class ChatFileService {
  private readonly logger: Logger<ILogObj>;
  private readonly workspacePath: string;
  private readonly chatCache: Map<string, Chat> = new Map(); // filePath -> Chat
  private readonly eventBus: IEventBus;

  constructor(workspacePath: string, eventBus: IEventBus) {
    this.workspacePath = workspacePath;
    this.logger = new Logger({ name: "ChatFileService" });
    this.eventBus = eventBus;
  }

  /**
   * Initialize the service by scanning for existing chats in the workspace
   */
  public async initialize(): Promise<void> {
    this.logger.info("Initializing ChatFileService");
    const entries = await listDirectory(this.workspacePath);
    const folders = entries.filter((entry) => entry.isDirectory);

    for (const folder of folders) {
      const folderPath = path.join(this.workspacePath, folder.name);
      await this.scanFolder(folderPath);
    }

    this.logger.info(`Initialized with ${this.chatCache.size} chats`);
  }

  /**
   * Scan a folder for chat files and add them to cache
   */
  private async scanFolder(folderPath: string): Promise<void> {
    const files = await listDirectory(folderPath);

    for (const file of files) {
      if (file.isDirectory) continue;

      if (file.name.match(/^chat\d+\.json$/)) {
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

  /**
   * Find a chat by its file path
   */
  public async findByPath(filePath: string): Promise<Chat> {
    const normalizedPath = this.resolvePath(filePath);

    // Check cache first
    const cachedChat = this.chatCache.get(normalizedPath);
    if (cachedChat) {
      return cachedChat;
    }

    // Not in cache, try to load from disk
    if (await fileExists(normalizedPath)) {
      const chat = await this.readChatFromFile(normalizedPath);
      this.chatCache.set(normalizedPath, chat);
      return chat;
    }

    throw new ChatNotFoundError(normalizedPath);
  }

  /**
   * Find all chats in the workspace
   */
  public async findAll(): Promise<Chat[]> {
    return Array.from(this.chatCache.values());
  }

  /**
   * Find a chat by its ID
   */
  public async findById(chatId: string): Promise<Chat | undefined> {
    this.logger.warn(
      `Searching for chat by ID ${chatId} - this performs an exhaustive cache search. 
      Use findByPath when possible for better performance.`
    );

    for (const chat of this.chatCache.values()) {
      if (chat.id === chatId) {
        return chat;
      }
    }

    // Not found in cache, we could scan all files but that would be expensive
    return undefined;
  }

  /**
   * Create a new chat in the specified folder
   */
  public async createChat(
    chat: Omit<Chat, "filePath">,
    folderPath: string,
    correlationId?: string
  ): Promise<Chat> {
    // Ensure folder exists
    await createDirectory(folderPath);

    // Generate a unique chat number for the folder
    const chatNumber = await this.getNextChatNumber(folderPath);
    const fileName = `chat${chatNumber}.json`;
    const filePath = path.join(folderPath, fileName);

    const newChat: Chat = {
      ...chat,
      filePath,
    };

    this.logger.debug(`Creating new chat: ${fileName}`, newChat);

    // Save chat to file asynchronously
    this.saveChatToFile(newChat, filePath)
      .then(() => {
        // Emit file created event after the file is written
        if (this.eventBus) {
          this.eventBus.emit<ServerChatFileCreatedEvent>({
            kind: "ServerChatFileCreated",
            chatId: newChat.id,
            filePath: newChat.filePath,
            timestamp: new Date(),
            correlationId,
          });
        }
      })
      .catch((error) => {
        this.logger.error(`Failed to save chat file: ${filePath}`, error);
      });

    // Cache the chat immediately
    this.chatCache.set(filePath, newChat);

    this.logger.debug(`Created new chat with ID: ${newChat.id}`);
    return newChat;
  }

  /**
   * Get the next available chat number for a folder
   */
  private async getNextChatNumber(folderPath: string): Promise<number> {
    const files = await listDirectory(folderPath);
    let highestChatNumber = 0;

    for (const file of files) {
      if (file.isDirectory) continue;

      const match = file.name.match(/^chat(\d+)\.json$/);
      if (match && match[1]) {
        const chatNumber = parseInt(match[1], 10);
        highestChatNumber = Math.max(highestChatNumber, chatNumber);
      }
    }

    return highestChatNumber + 1;
  }

  /**
   * Add a message to a chat
   */
  public async addMessage(
    filePath: string,
    message: ChatMessage,
    correlationId?: string
  ): Promise<Chat> {
    const chat = await this.findByPath(filePath);
    chat.messages.push(message);
    chat.updatedAt = new Date();

    // Update the cache immediately
    this.chatCache.set(filePath, chat);

    // Save to file
    await this.saveChatToFile(chat, chat.filePath);

    // Emit file updated event after the file is written
    await this.eventBus.emit<ServerChatFileUpdatedEvent>({
      kind: "ServerChatFileUpdated",
      chatId: chat.id,
      filePath: chat.filePath,
      timestamp: new Date(),
      correlationId,
    });

    return chat;
  }

  /**
   * Save a chat to its file
   */
  // public async saveChat(chat: Chat, correlationId?: string): Promise<void> {
  //   // Update the cache immediately
  //   this.chatCache.set(chat.filePath, chat);

  //   // Save to file
  //   await this.saveChatToFile(chat, chat.filePath);

  //   await this.eventBus.emit<ServerChatFileUpdatedEvent>({
  //     kind: "ServerChatFileUpdated",
  //     chatId: chat.id,
  //     filePath: chat.filePath,
  //     timestamp: new Date(),
  //     correlationId,
  //   });
  // }

  /**
   * Read a chat from a specific file path
   */
  public async readChatFile(filePath: string): Promise<Chat> {
    const absolutePath = this.resolvePath(filePath);

    if (!(await fileExists(absolutePath))) {
      throw new ChatFileError(`File does not exist: ${filePath}`);
    }

    return this.readChatFromFile(absolutePath);
  }

  /**
   * Delete a chat
   */
  public async deleteChat(filePath: string): Promise<void> {
    const normalizedPath = this.resolvePath(filePath);

    if (await fileExists(normalizedPath)) {
      await fs.unlink(normalizedPath);
      this.logger.debug(`Deleted chat file: ${normalizedPath}`);
    }

    this.chatCache.delete(normalizedPath);
  }

  /**
   * Remove chat from cache (useful when file is moved or deleted)
   */
  public removeFromCache(filePath: string): void {
    const normalizedPath = this.resolvePath(filePath);
    this.chatCache.delete(normalizedPath);
  }

  /**
   * Resolve a relative path to an absolute path
   */
  private resolvePath(relativePath: string): string {
    return path.isAbsolute(relativePath)
      ? relativePath
      : path.join(this.workspacePath, relativePath);
  }

  /**
   * Save a chat to a file
   */
  private async saveChatToFile(chat: Chat, filePath: string): Promise<void> {
    const chatFile: ChatFileData = {
      _type: "chat",
      id: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      title: chat.metadata?.title || "New Chat",
      metadata: chat.metadata,
      messages: chat.messages,
    };

    await writeJsonFile(filePath, chatFile);

    this.logger.debug(`Saved chat to file: ${filePath}`, chatFile);
  }

  /**
   * Read a chat from a file
   */
  private async readChatFromFile(filePath: string): Promise<Chat> {
    const chatFileData = await readJsonFile<ChatFileData>(filePath);

    if (chatFileData._type !== "chat") {
      throw new ChatFileError(`File ${filePath} is not a chat file`);
    }

    const chat: Chat = {
      id: chatFileData.id,
      filePath,
      messages: chatFileData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as Role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata,
      })),
      status: "ACTIVE",
      createdAt: new Date(chatFileData.createdAt),
      updatedAt: new Date(chatFileData.updatedAt),
      metadata: chatFileData.metadata,
    };

    return chat;
  }
}
