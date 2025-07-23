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
  save(
    chatSession: SerializableChat,
    targetDirectory?: string,
  ): Promise<string>;
  load(chatSessionId: string): Promise<SerializableChat>;
  loadFromFile(filePath: string): Promise<SerializableChat>;
  delete(chatSessionId: string): Promise<void>;
}

export class ChatSessionRepositoryImpl implements ChatSessionRepository {
  private readonly logger: Logger<ILogObj>;
  private pathIndex: Map<string, string> = new Map();

  constructor() {
    this.logger = new Logger({ name: "ChatSessionRepository" });
  }

  async save(
    chatSession: SerializableChat,
    targetDirectory?: string,
  ): Promise<string> {
    let filePath: string;

    if (chatSession.absoluteFilePath) {
      filePath = chatSession.absoluteFilePath;
    } else {
      if (!targetDirectory) {
        throw new Error("Target directory is required for new chat sessions");
      }
      filePath = await this.generateNewFilePath(targetDirectory);
    }

    const fileData = this.convertToFileFormat(chatSession);
    await writeJsonFile(filePath, fileData);

    this.pathIndex.set(chatSession.id, filePath);

    return filePath;
  }

  async load(chatSessionId: string): Promise<SerializableChat> {
    const filePath = await this.resolveFilePath(chatSessionId);
    return this.loadFromFile(filePath);
  }

  async loadFromFile(filePath: string): Promise<SerializableChat> {
    const fileData = await readJsonFile<unknown>(filePath);
    const validatedData = ChatFileDataSchema.parse(fileData);
    return this.convertFromFileFormat(validatedData, filePath);
  }

  async delete(chatSessionId: string): Promise<void> {
    const filePath = await this.resolveFilePath(chatSessionId);
    const fs = await import("fs/promises");
    await fs.unlink(filePath);
    this.pathIndex.delete(chatSessionId);
  }

  private async generateNewFilePath(targetDirectory: string): Promise<string> {
    await createDirectory(targetDirectory);
    const chatNumber = await this.getNextChatNumber(targetDirectory);
    return path.join(targetDirectory, `chat${chatNumber}.chat.json`);
  }

  private async getNextChatNumber(folderPath: string): Promise<number> {
    const files = await listDirectory(folderPath);
    const chatNumbers = files
      .filter((file) => file.name.match(/^chat\d+\.chat\.json$/))
      .map((file) => {
        const match = file.name.match(/^chat(\d+)\.chat\.json$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num));

    return chatNumbers.length > 0 ? Math.max(...chatNumbers) + 1 : 1;
  }

  private async resolveFilePath(chatSessionId: string): Promise<string> {
    if (this.pathIndex.has(chatSessionId)) {
      return this.pathIndex.get(chatSessionId)!;
    }

    const filePath = await this.searchForChatFile(chatSessionId);
    if (!filePath) {
      throw new Error(`Chat file not found for session ID: ${chatSessionId}`);
    }

    this.pathIndex.set(chatSessionId, filePath);
    return filePath;
  }

  private async searchForChatFile(
    chatSessionId: string,
  ): Promise<string | null> {
    const projectFolders = await this.getProjectFolders();

    for (const projectFolder of projectFolders) {
      const chatFile = await this.findChatInDirectory(
        projectFolder,
        chatSessionId,
      );
      if (chatFile) {
        return chatFile;
      }
    }

    return null;
  }

  private async getProjectFolders(): Promise<string[]> {
    try {
      const userSettingsPath = path.join(process.cwd(), "user-settings.json");
      const userSettings = await readJsonFile<{ projectFolders?: string[] }>(
        userSettingsPath,
      );
      return userSettings.projectFolders || [];
    } catch {
      return [process.cwd()];
    }
  }

  private async findChatInDirectory(
    directory: string,
    chatSessionId: string,
  ): Promise<string | null> {
    try {
      const files = await listDirectory(directory);

      for (const file of files) {
        if (file.name.endsWith(".chat.json")) {
          const filePath = path.join(directory, file.name);
          try {
            const fileData = await readJsonFile<ChatFileData>(filePath);
            if (fileData.id === chatSessionId) {
              return filePath;
            }
          } catch {
            continue;
          }
        }
      }

      for (const file of files) {
        if (file.type === "directory") {
          const subPath = path.join(directory, file.name);
          const result = await this.findChatInDirectory(subPath, chatSessionId);
          if (result) {
            return result;
          }
        }
      }
    } catch {
      // Directory access error, skip
    }

    return null;
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

  async buildPathIndex(): Promise<void> {
    this.logger.info("Building chat session path index...");
    this.pathIndex.clear();

    const projectFolders = await this.getProjectFolders();

    for (const projectFolder of projectFolders) {
      await this.indexDirectory(projectFolder);
    }

    this.logger.info(`Indexed ${this.pathIndex.size} chat sessions`);
  }

  private async indexDirectory(directory: string): Promise<void> {
    try {
      const files = await listDirectory(directory);

      for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (file.name.endsWith(".chat.json")) {
          try {
            const fileData = await readJsonFile<ChatFileData>(filePath);
            this.pathIndex.set(fileData.id, filePath);
          } catch {
            continue;
          }
        } else if (file.type === "directory") {
          await this.indexDirectory(filePath);
        }
      }
    } catch {
      // Directory access error, skip
    }
  }
}
