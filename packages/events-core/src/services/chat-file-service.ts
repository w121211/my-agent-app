// packages/events-core/src/services/chat-file-service.ts
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
import type { WorkspacePathService } from "./workspace-path-service.js";

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
  private readonly chatCache: Map<string, Chat> = new Map(); // filePath -> Chat
  private readonly eventBus: IEventBus;
  private readonly pathService: WorkspacePathService;

  constructor(pathService: WorkspacePathService, eventBus: IEventBus) {
    this.logger = new Logger({ name: "ChatFileService" });
    this.eventBus = eventBus;
    this.pathService = pathService;
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing ChatFileService");

    // Scan all workspaces for chat files
    const workspaces = this.pathService.getAvailableWorkspaces();

    for (const workspace of workspaces) {
      await this.scanWorkspace(workspace);
    }

    this.logger.info(`Initialized with ${this.chatCache.size} chats`);
  }

  private async scanWorkspace(workspacePath: string): Promise<void> {
    const entries = await listDirectory(workspacePath);

    for (const entry of entries) {
      const fullPath = path.join(workspacePath, entry.name);

      if (entry.isDirectory) {
        await this.scanFolder(fullPath);
      } else if (entry.name.endsWith(".chat.json")) {
        // Handle chat files in the workspace root
        try {
          const chat = await this.readChatFromFile(fullPath);
          this.chatCache.set(fullPath, chat);
        } catch (error) {
          this.logger.warn(`Failed to load chat file: ${fullPath}`, error);
        }
      }
    }
  }

  private async scanFolder(folderPath: string): Promise<void> {
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

  async findByPath(filePath: string): Promise<Chat> {
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

  async findAll(): Promise<Chat[]> {
    return Array.from(this.chatCache.values());
  }

  async findById(chatId: string): Promise<Chat | undefined> {
    this.logger.warn(
      `Searching for chat by ID ${chatId} - this performs an exhaustive cache search.` +
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
    targetFolder: string,
    correlationId?: string
  ): Promise<Chat> {
    // Ensure folder exists
    const folderPath = this.resolvePath(targetFolder);
    await createDirectory(folderPath);

    // Generate a unique chat number for the folder
    const chatNumber = await this.getNextChatNumber(folderPath);
    const fileName = `chat${chatNumber}.json`;
    const filePath = path.join(folderPath, fileName);

    const newChat: Chat = {
      ...chat,
      filePath,
    };

    // Save chat to file
    await this.saveChatToFile(newChat, filePath);

    // Get workspace-relative path for display
    const workspacePath = this.pathService.resolveToWorkspacePath(filePath);

    // Emit file created event
    await this.eventBus.emit<ServerChatFileCreatedEvent>({
      kind: "ServerChatFileCreated",
      chatId: newChat.id,
      filePath: workspacePath?.displayPath || newChat.filePath,
      timestamp: new Date(),
      correlationId,
    });

    // Cache the chat
    this.chatCache.set(filePath, newChat);

    return newChat;
  }

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

  async addMessage(
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

    // Get workspace-relative path for display
    const workspacePath = this.pathService.resolveToWorkspacePath(
      chat.filePath
    );

    // Emit file updated event
    await this.eventBus.emit<ServerChatFileUpdatedEvent>({
      kind: "ServerChatFileUpdated",
      chatId: chat.id,
      filePath: workspacePath?.displayPath || chat.filePath,
      timestamp: new Date(),
      correlationId,
    });

    return chat;
  }

  async readChatFile(filePath: string): Promise<Chat> {
    const absolutePath = this.resolvePath(filePath);

    if (!(await fileExists(absolutePath))) {
      throw new ChatFileError(`File does not exist: ${filePath}`);
    }

    return this.readChatFromFile(absolutePath);
  }

  async deleteChat(filePath: string): Promise<void> {
    const normalizedPath = this.resolvePath(filePath);

    if (await fileExists(normalizedPath)) {
      await fs.unlink(normalizedPath);
      this.logger.debug(`Deleted chat file: ${normalizedPath}`);
    }

    this.chatCache.delete(normalizedPath);
  }

  removeFromCache(filePath: string): void {
    const normalizedPath = this.resolvePath(filePath);
    this.chatCache.delete(normalizedPath);
  }

  private resolvePath(filePath: string): string {
    return this.pathService.resolveToAbsolutePath(filePath);
  }

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
  }

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
