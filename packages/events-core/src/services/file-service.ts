// packages/events-core/src/services/file-service.ts
import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import type { IEventBus } from "../event-bus.js";
import type { ServerFileOpenedEvent } from "../event-types.js";
import { fileExists } from "../file-helpers.js";
import type { WorkspacePathService } from "./workspace-path-service.js";

export interface FileContent {
  content: string;
  fileType: string;
  filePath: string;
  workspacePath?: string;
  isBase64?: boolean;
}

export class FileService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly pathService: WorkspacePathService;

  constructor(eventBus: IEventBus, pathService: WorkspacePathService) {
    this.logger = new Logger({ name: "FileService" });
    this.eventBus = eventBus;
    this.pathService = pathService;
  }

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

    // Resolve workspace path info
    const workspacePath = this.pathService.resolveToWorkspacePath(fullPath);
    const displayPath = workspacePath ? workspacePath.displayPath : filePath;

    const fileContent: FileContent = {
      content,
      fileType,
      filePath: displayPath,
      workspacePath: workspacePath?.workspace,
      isBase64,
    };

    // Emit file opened event
    await this.eventBus.emit<ServerFileOpenedEvent>({
      kind: "ServerFileOpened",
      filePath: displayPath,
      content,
      fileType,
      timestamp: new Date(),
      correlationId,
    });

    return fileContent;
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

  private resolvePath(filePath: string): string {
    return this.pathService.resolveToAbsolutePath(filePath);
  }
}
