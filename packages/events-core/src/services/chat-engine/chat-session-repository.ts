// packages/events-core/src/services/chat-engine/chat-session-repository.ts
import { ILogObj, Logger } from "tslog";
import path from "path";
import { z } from "zod";
import type { SerializableChat } from "./chat-session.js";
import {
  writeJsonFile,
  readJsonFile,
  createDirectory,
  listDirectory,
} from "../../file-helpers.js";

// Chat file data schema for validation
const ChatFileDataSchema = z.object({
  _type: z.literal("chat"),
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  messages: z.array(z.any()),
  metadata: z.record(z.any()).optional(),
  status: z
    .enum(["idle", "processing", "waiting_confirmation", "max_turns_reached"])
    .optional(),
  fileStatus: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  currentTurn: z.number().optional(),
  maxTurns: z.number().optional(),
});

type ChatFileData = z.infer<typeof ChatFileDataSchema>;

export interface ChatSessionRepository {
  saveToFile(
    absoluteFilePath: string,
    chatSession: SerializableChat,
  ): Promise<void>;
  loadFromFile(absoluteFilePath: string): Promise<SerializableChat>;
  deleteFile(absoluteFilePath: string): Promise<void>;
  createNewFile(
    targetDirectory: string,
    chatSession: Omit<SerializableChat, "absoluteFilePath">,
  ): Promise<string>;
}

export class ChatSessionRepositoryImpl implements ChatSessionRepository {
  private readonly logger: Logger<ILogObj>;

  constructor() {
    this.logger = new Logger({ name: "ChatSessionRepository" });
  }

  async saveToFile(
    absoluteFilePath: string,
    chatSession: SerializableChat,
  ): Promise<void> {
    const fileData = this.convertToFileFormat(chatSession);
    await writeJsonFile(absoluteFilePath, fileData);
  }

  async loadFromFile(filePath: string): Promise<SerializableChat> {
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
    chatSession: Omit<SerializableChat, "absoluteFilePath">,
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

  private convertToFileFormat(chatSession: SerializableChat): ChatFileData {
    return {
      _type: "chat",
      id: chatSession.id,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      messages: chatSession.messages,
      metadata: chatSession.metadata,
      status: chatSession.status,
      fileStatus: chatSession.fileStatus,
      currentTurn: chatSession.currentTurn,
      maxTurns: chatSession.maxTurns,
    };
  }

  private convertFromFileFormat(
    fileData: ChatFileData,
    filePath: string,
  ): SerializableChat {
    return {
      id: fileData.id,
      absoluteFilePath: filePath,
      messages: fileData.messages,
      status: fileData.status || "idle",
      fileStatus: fileData.fileStatus || "ACTIVE",
      currentTurn: fileData.currentTurn || 0,
      maxTurns: fileData.maxTurns || 20,
      createdAt: fileData.createdAt,
      updatedAt: fileData.updatedAt,
      metadata: fileData.metadata,
    };
  }
}
