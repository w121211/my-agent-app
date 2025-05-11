// packages/events-core/src/services/file-service.ts
import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import type { IEventBus } from "../event-bus.js";
import { fileExists } from "../file-helpers.js";

export interface FileContent {
  content: string;
  fileType: string;
  absoluteFilePath: string;
  isBase64?: boolean;
}

export class FileService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.logger = new Logger({ name: "FileService" });
    this.eventBus = eventBus;
  }

  async openFile(
    absoluteFilePath: string,
    correlationId?: string
  ): Promise<FileContent> {
    // Skip chat files as they are handled by ChatService
    if (absoluteFilePath.endsWith(".chat.json")) {
      throw new Error("Chat files should be opened using the Chat service");
    }

    const fileType = this.getFileType(absoluteFilePath);

    // Check if file exists
    const exists = await fileExists(absoluteFilePath);
    if (!exists) {
      throw new Error(`File does not exist: ${absoluteFilePath}`);
    }

    // Read the file content based on type
    let content: string;
    let isBase64 = false;

    if (this.isBinaryFile(fileType)) {
      const buffer = await fs.readFile(absoluteFilePath);
      content = buffer.toString("base64");
      isBase64 = true;
    } else {
      content = await fs.readFile(absoluteFilePath, "utf8");
    }

    return {
      content,
      fileType,
      absoluteFilePath,
      isBase64,
    };
  }

  getFileType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    const fileTypeMap: Record<string, string> = {
      ".js": "javascript",
      ".ts": "typescript",
      ".jsx": "javascript",
      ".tsx": "typescript",
      ".html": "html",
      ".css": "css",
      ".json": "json",
      ".md": "markdown",
      ".txt": "text",
      ".py": "python",
      ".java": "java",
      ".c": "c",
      ".cpp": "cpp",
      ".go": "go",
      ".rs": "rust",
      ".rb": "ruby",
      ".php": "php",
      ".cs": "csharp",
      ".swift": "swift",
      ".kt": "kotlin",
      // Binary files
      ".png": "image",
      ".jpg": "image",
      ".jpeg": "image",
      ".gif": "image",
      ".pdf": "pdf",
      ".zip": "archive",
      ".tar": "archive",
      ".gz": "archive",
    };

    return fileTypeMap[extension] || "unknown";
  }

  private isBinaryFile(fileType: string): boolean {
    const binaryTypes = ["image", "pdf", "archive"];
    return binaryTypes.includes(fileType);
  }
}
