import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import { IEventBus } from "./event-bus.js";
import { ClientOpenFileEvent, ServerFileOpenedEvent } from "./event-types.js";
import { fileExists } from "./repositories.js";

export class FileService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly workspacePath: string;

  constructor(eventBus: IEventBus, workspacePath: string) {
    this.logger = new Logger({ name: "FileService" });
    this.eventBus = eventBus;
    this.workspacePath = workspacePath;

    this.eventBus.subscribe<ClientOpenFileEvent>(
      "ClientOpenFile",
      this.handleOpenFile.bind(this)
    );
  }

  private async handleOpenFile(event: ClientOpenFileEvent): Promise<void> {
    const filePath = event.filePath;

    // Skip chat files as they are handled by ChatService
    if (filePath.endsWith(".chat.json")) {
      return;
    }

    const fileType = this.determineFileType(filePath);
    const fullPath = this.resolvePath(filePath);

    // Check if file exists
    const exists = await fileExists(fullPath);
    if (!exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Read the file content based on type
    let content: string;
    if (this.isBinaryFile(fileType)) {
      const buffer = await fs.readFile(fullPath);
      content = buffer.toString("base64");
    } else {
      content = await fs.readFile(fullPath, "utf8");
    }

    await this.eventBus.emit<ServerFileOpenedEvent>({
      kind: "ServerFileOpened",
      filePath,
      content,
      fileType,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });
  }

  private determineFileType(filePath: string): string {
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

  private resolvePath(relativePath: string): string {
    return path.isAbsolute(relativePath)
      ? relativePath
      : path.join(this.workspacePath, relativePath);
  }
}
