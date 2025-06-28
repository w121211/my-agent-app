// packages/events-core/src/services/chat-repository.ts
import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import { z } from "zod";
import {
  createDirectory,
  fileExists,
  readJsonFile,
  writeJsonFile,
  listDirectory,
} from "../file-helpers.js";
import type { Chat, ChatMessage, ChatStatus } from "./chat-service.js";

export class ChatFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatFileError";
  }
}

export class ChatFileNotFoundError extends ChatFileError {
  constructor(filePath: string) {
    super(`Chat with path ${filePath} not found`);
    this.name = "ChatFileNotFoundError";
  }
}

// Define serializable versions of the types using Zod
const RoleSchema = z.enum(["ASSISTANT", "USER", "FUNCTION_EXECUTOR"]);
const ChatStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]); // Schema for ChatStatus

const ChatMessageSchema = z.object({
  id: z.string(),
  role: RoleSchema,
  content: z.string(),
  timestamp: z.string().transform((val) => new Date(val)), // Keep ISO string for JSON, parse to Date
  metadata: z.record(z.unknown()).optional(),
});

const ChatMetadataSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mode: z.enum(["chat", "agent"]).optional(),
  model: z.string().optional(),
  knowledge: z.array(z.string()).optional(),
  promptDraft: z.string().optional(), // Added promptDraft
});

// Schema for serialized chat file data
const ChatFileDataSchema = z.object({
  _type: z.literal("chat"),
  id: z.string(),
  status: ChatStatusSchema, // Added status
  createdAt: z.string().transform((val) => new Date(val)), // Keep ISO string for JSON, parse to Date
  updatedAt: z.string().transform((val) => new Date(val)), // Keep ISO string for JSON, parse to Date
  messages: z.array(ChatMessageSchema),
  metadata: ChatMetadataSchema.optional(),
});

// Type derived from schema
// This represents the structure of the JSON file
type ChatFileData = {
  _type: "chat";
  id: string;
  status: ChatStatus;
  createdAt: Date; // Zod transform handles this
  updatedAt: Date; // Zod transform handles this
  messages: ChatMessage[]; // ChatMessage already has Date type for timestamp due to Zod transform
  metadata?: ChatMetadata; // ChatMetadataSchema now includes promptDraft, and its fields are optional
};

export class ChatRepository {
  private readonly logger: Logger<ILogObj>;
  private readonly chatCache: Map<string, Chat> = new Map(); // absoluteFilePath -> Chat

  constructor() {
    this.logger = new Logger({ name: "ChatRepository" });
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

    throw new ChatFileNotFoundError(absoluteFilePath);
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
    chat: Omit<Chat, "absoluteFilePath">,
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
      absoluteFilePath: absoluteFilePath,
    };

    // Save chat to file
    await this.saveChatToFile(newChat, absoluteFilePath);

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

    return chat;
  }

  async readChatFile(absoluteFilePath: string): Promise<Chat> {
    if (!(await fileExists(absoluteFilePath))) {
      throw new ChatFileNotFoundError(
        `File does not exist: ${absoluteFilePath}`
      );
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

  async updateChat(chat: Chat, correlationId?: string): Promise<Chat> {
    if (!this.chatCache.has(chat.absoluteFilePath) && !(await fileExists(chat.absoluteFilePath))) {
      throw new ChatFileNotFoundError(chat.absoluteFilePath);
    }

    chat.updatedAt = new Date(); // Ensure updatedAt is always fresh on update

    // Update cache first
    this.chatCache.set(chat.absoluteFilePath, chat);

    // Then save to file
    await this.saveChatToFile(chat, chat.absoluteFilePath);
    this.logger.debug(`Updated chat ${chat.id} at ${chat.absoluteFilePath}`, { correlationId });
    return chat;
  }

  private async saveChatToFile(
    chat: Chat,
    absoluteFilePath: string
  ): Promise<void> {
    // Create a serializable version of the chat data
    const serializableMessages = chat.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    }));

    const chatFileForPersistence = { // This structure must match what ChatFileDataSchema expects as input for serialization
      _type: "chat" as const,
      id: chat.id,
      status: chat.status, // Save status
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      messages: serializableMessages,
      metadata: chat.metadata, // promptDraft is part of metadata
    };

    // Before writing, ensure the data conforms to the schema that includes string dates.
    // This step is more for ensuring our manual object construction is correct.
    // Zod doesn't directly serialize, but we are creating an object to be written as JSON.
    // We could define a separate schema for serialization if we wanted strict validation before write.

    await writeJsonFile(absoluteFilePath, chatFileForPersistence);
  }

  private async readChatFromFile(absoluteFilePath: string): Promise<Chat> {
    const fileContent = await readJsonFile<unknown>(absoluteFilePath);

    // Parse and validate the file content using Zod
    // ChatFileDataSchema will parse string dates to Date objects and validate status
    const chatFileData = ChatFileDataSchema.parse(fileContent);

    const chat: Chat = {
      id: chatFileData.id,
      absoluteFilePath: absoluteFilePath,
      messages: chatFileData.messages, // Timestamps are Date objects here due to Zod transform
      status: chatFileData.status, // Use status from file
      createdAt: chatFileData.createdAt, // Date object
      updatedAt: chatFileData.updatedAt, // Date object
      metadata: chatFileData.metadata, // Includes promptDraft, if present
    };

    return chat;
  }
}
