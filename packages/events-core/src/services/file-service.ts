// File path: packages/events-core/src/services/file-service.ts

import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type { ServerFileOpenedEvent } from "../event-types.js";
import { fileExists } from "../file-helpers.js";

export interface FileContent {
  content: string;
  fileType: string;
  filePath: string;
  isBase64?: boolean;
}

export class FileService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly workspacePath: string;

  constructor(eventBus: IEventBus, workspacePath: string) {
    this.logger = new Logger({ name: "FileService" });
    this.eventBus = eventBus;
    this.workspacePath = workspacePath;
  }

  /**
   * Open a file and return its content
   */
  async openFile(
    filePath: string,
    correlationId?: string
  ): Promise<FileContent> {
    // Skip chat files as they are handled by ChatService
    if (filePath.endsWith(".chat.json")) {
      throw new Error("Chat files should be opened using the Chat service");
    }

    const fileType = this.getFileType(filePath);
    const fullPath = this.resolvePath(filePath);

    // Check if file exists
    const exists = await fileExists(fullPath);
    if (!exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Read the file content based on type
    let content: string;
    let isBase64 = false;

    if (this.isBinaryFile(fileType)) {
      const buffer = await fs.readFile(fullPath);
      content = buffer.toString("base64");
      isBase64 = true;
    } else {
      content = await fs.readFile(fullPath, "utf8");
    }

    const fileContent: FileContent = {
      content,
      fileType,
      filePath,
      isBase64,
    };

    // Emit file opened event
    await this.eventBus.emit<ServerFileOpenedEvent>({
      kind: "ServerFileOpened",
      filePath,
      content,
      fileType,
      timestamp: new Date(),
      correlationId,
    });

    return fileContent;
  }

  /**
   * Get file type based on extension
   */
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

  /**
   * Check if file type is binary
   */
  private isBinaryFile(fileType: string): boolean {
    const binaryTypes = ["image", "pdf", "archive"];
    return binaryTypes.includes(fileType);
  }

  /**
   * Resolve a path to an absolute path
   */
  private resolvePath(relativePath: string): string {
    return path.isAbsolute(relativePath)
      ? relativePath
      : path.join(this.workspacePath, relativePath);
  }
}
