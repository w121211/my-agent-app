// packages/events-core/src/services/chat-engine/chat-session-repository.ts

import { promises as fs } from "fs";
import path from "path";
import { ILogObj, Logger } from "tslog";
import { z } from "zod";
import { modelMessageSchema } from "ai";
import type { ModelMessage, ToolSet } from "ai";
import {
  writeJsonFile,
  readJsonFile,
  createDirectory,
  listDirectory,
} from "../../file-helpers.js";

export type ChatSessionStatus =
  | "idle"
  | "processing"
  | "waiting_confirmation"
  | "max_turns_reached";

export type ChatFileStatus = "active" | "archived";

export type ChatMode = "chat" | "agent";

export interface ChatMetadata {
  title?: string;
  tags?: string[];
  mode?: ChatMode;
  knowledge?: string[];
  promptDraft?: string;
}

export interface ChatMessageMetadata {
  timestamp: Date;
  subtaskId?: string;
  taskId?: string;
  fileReferences?: {
    path: string;
    md5: string;
  }[];
}

export interface ChatMessage {
  id: string;
  message: ModelMessage;
  metadata: ChatMessageMetadata;
}

export interface ChatSessionData {
  _type: "chat";
  id: string;
  absoluteFilePath: string;
  messages: ChatMessage[];
  // modelId: `${string}:${string}`; // `providerId:modelId` format
  modelId: `${string}/${string}`; // `providerId/modelId` format
  sessionStatus: ChatSessionStatus;
  fileStatus: ChatFileStatus;
  currentTurn: number;
  maxTurns: number;
  toolSet?: ToolSet;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ChatMetadata;
}

// Zod schemas for validation and type inference
const ChatMetadataSchema: z.ZodType<ChatMetadata> = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mode: z.enum(["chat", "agent"]).optional(),
  knowledge: z.array(z.string()).optional(),
  promptDraft: z.string().optional(),
});

const ChatMessageMetadataSchema: z.ZodType<ChatMessageMetadata> = z.object({
  timestamp: z.coerce.date(),
  subtaskId: z.string().optional(),
  taskId: z.string().optional(),
  fileReferences: z
    .array(
      z.object({
        path: z.string(),
        md5: z.string(),
      }),
    )
    .optional(),
});

const ChatMessageSchema: z.ZodType<ChatMessage> = z.object({
  id: z.string(),
  message: modelMessageSchema,
  metadata: ChatMessageMetadataSchema,
});

export const ChatSessionDataSchema: z.ZodType<ChatSessionData> = z.object({
  _type: z.literal("chat"),
  id: z.string(),
  absoluteFilePath: z.string(),
  messages: z.array(ChatMessageSchema),
  modelId: z.string().regex(/^.+\/.+$/) as z.ZodType<`${string}/${string}`>, // `providerId/modelId` format
  toolSet: z.any().optional(), // ToolSet from AI SDK
  sessionStatus: z.enum([
    "idle",
    "processing",
    "waiting_confirmation",
    "max_turns_reached",
  ]),
  fileStatus: z.enum(["active", "archived"]),
  currentTurn: z.number(),
  maxTurns: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: ChatMetadataSchema.optional(),
});

export interface ChatSessionRepository {
  saveToFile(
    absoluteFilePath: string,
    chatSession: ChatSessionData,
  ): Promise<void>;
  loadFromFile(absoluteFilePath: string): Promise<ChatSessionData>;
  deleteFile(absoluteFilePath: string): Promise<void>;
  createNewFile(
    targetDirectory: string,
    chatSession: Omit<ChatSessionData, "absoluteFilePath">,
  ): Promise<string>;
}

export class ChatSessionRepositoryImpl implements ChatSessionRepository {
  private readonly logger: Logger<ILogObj>;

  constructor() {
    this.logger = new Logger({ name: "ChatSessionRepository" });
  }

  async saveToFile(
    absoluteFilePath: string,
    chatSession: ChatSessionData,
  ): Promise<void> {
    await writeJsonFile(absoluteFilePath, chatSession);
  }

  async loadFromFile(filePath: string): Promise<ChatSessionData> {
    const fileData = await readJsonFile<unknown>(filePath);
    const validatedData = ChatSessionDataSchema.parse(fileData);
    return validatedData;
  }

  async deleteFile(absoluteFilePath: string): Promise<void> {
    await fs.unlink(absoluteFilePath);
  }

  async createNewFile(
    targetDirectory: string,
    chatSession: Omit<ChatSessionData, "absoluteFilePath">,
  ): Promise<string> {
    await createDirectory(targetDirectory);
    const chatNumber = await this.getNextChatNumber(targetDirectory);
    const filePath = path.join(targetDirectory, `chat${chatNumber}.chat.json`);

    const chatData = {
      ...chatSession,
      absoluteFilePath: filePath,
    };

    await writeJsonFile(filePath, chatData);

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
}
