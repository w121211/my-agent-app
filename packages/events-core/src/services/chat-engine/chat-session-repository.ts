// packages/events-core/src/services/chat-engine/chat-session-repository.ts

import { ILogObj, Logger } from "tslog";
import path from "path";
import { z } from "zod";
import type { LanguageModel } from "ai";
import type {
  ChatFileData,
  ChatMessage,
  ChatSessionStatus,
  ChatFileStatus,
  ChatMetadata,
} from "./types.js";
import {
  writeJsonFile,
  readJsonFile,
  createDirectory,
  listDirectory,
} from "../../file-helpers.js";

// Zod schema for chat file validation
const ChatFileDataSchema = z.object({
  _type: z.literal("chat"),
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messages: z.array(z.any()), // UIMessage array
  model: z.any(), // LanguageModel (can be string or complex object)
  sessionStatus: z.enum([
    "idle",
    "processing",
    "waiting_confirmation",
    "max_turns_reached",
  ]),
  fileStatus: z.enum(["ACTIVE", "ARCHIVED"]),
  currentTurn: z.number(),
  maxTurns: z.number(),
  metadata: z.record(z.any()).optional(),
});

// File format for persistence
type ChatFileFormat = z.infer<typeof ChatFileDataSchema>;

export interface ChatSessionRepository {
  saveToFile(
    absoluteFilePath: string,
    chatSession: ChatFileData,
  ): Promise<void>;
  loadFromFile(absoluteFilePath: string): Promise<ChatFileData>;
  deleteFile(absoluteFilePath: string): Promise<void>;
  createNewFile(
    targetDirectory: string,
    chatSession: Omit<ChatFileData, "absoluteFilePath">,
  ): Promise<string>;
}

export class ChatSessionRepositoryImpl implements ChatSessionRepository {
  private readonly logger: Logger<ILogObj>;

  constructor() {
    this.logger = new Logger({ name: "ChatSessionRepository" });
  }

  async saveToFile(
    absoluteFilePath: string,
    chatSession: ChatFileData,
  ): Promise<void> {
    const fileData = this.convertToFileFormat(chatSession);
    await writeJsonFile(absoluteFilePath, fileData);
  }

  async loadFromFile(filePath: string): Promise<ChatFileData> {
    const fileData = await readJsonFile<unknown>(filePath);
    const validatedData = ChatFileDataSchema.parse(fileData);
    return this.convertFromFileFormat(validatedData, filePath);
  }

  async deleteFile(absoluteFilePath: string): Promise<void> {
    const fs = await import("fs/promises");
    await fs.unlink(absoluteFilePath);
  }

  async createNewFile(
    targetDirectory: string,
    chatSession: Omit<ChatFileData, "absoluteFilePath">,
  ): Promise<string> {
    await createDirectory(targetDirectory);
    const chatNumber = await this.getNextChatNumber(targetDirectory);
    const filePath = path.join(targetDirectory, `chat${chatNumber}.chat.json`);

    const chatData = {
      ...chatSession,
      absoluteFilePath: filePath,
    };

    const fileData = this.convertToFileFormat(chatData);
    await writeJsonFile(filePath, fileData);

    return filePath;
  }

  private async getNextChatNumber(folderPath: string): Promise<number> {
    const files = await listDirectory(folderPath);
    const chatNumbers = files
      .filter((file) => file.name.match(/^chat\d+\.chat\.json$/))
      .map((file) => {
        const match = file.name.match(/^chat(\d+)\.chat\.json$/);
        return match ? parseInt(match[1]!, 10) : 0;
      })
      .filter((num) => !isNaN(num));

    return chatNumbers.length > 0 ? Math.max(...chatNumbers) + 1 : 1;
  }

  private convertToFileFormat(chatSession: ChatFileData): ChatFileFormat {
    return {
      _type: "chat",
      id: chatSession.id,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      messages: chatSession.messages, // UIMessage array - preserve as-is
      model: chatSession.model, // LanguageModel - preserve as-is
      sessionStatus: chatSession.sessionStatus,
      fileStatus: chatSession.fileStatus,
      currentTurn: chatSession.currentTurn,
      maxTurns: chatSession.maxTurns,
      metadata: chatSession.metadata,
    };
  }

  private convertFromFileFormat(
    fileData: ChatFileFormat,
    filePath: string,
  ): ChatFileData {
    return {
      id: fileData.id,
      absoluteFilePath: filePath,
      messages: fileData.messages as ChatMessage[], // UIMessage array
      model: fileData.model as LanguageModel,
      sessionStatus: fileData.sessionStatus,
      fileStatus: fileData.fileStatus,
      currentTurn: fileData.currentTurn,
      maxTurns: fileData.maxTurns,
      createdAt: fileData.createdAt,
      updatedAt: fileData.updatedAt,
      metadata: fileData.metadata as ChatMetadata,
    };
  }
}
