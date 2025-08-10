// packages/events-core/src/services/chat-engine/message-processor.ts

import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ILogObj, Logger } from "tslog";
import type { ModelMessage, UIMessage, UserModelMessage } from "ai";
import type { FileService } from "../file-service.js";

// Utility functions to process ModelMessage

export function getUserModelMessageContentString(
  message: UserModelMessage,
): string {
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");
  }
  throw new Error(
    `Unsupported UserModelMessage content type: ${typeof content}`,
  );
}

export function convertModelMessageContentToParts(
  modelMessage: ModelMessage,
): UIMessage["parts"] {
  if (modelMessage.role === "user") {
    const content = modelMessage.content;
    if (typeof content === "string") {
      return [{ type: "text", text: content }];
    }
    // Convert UserContent parts to UIMessage parts
    return content.map((part) => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text };
        case "image":
          return {
            type: "data-image",
            id: uuidv4(),
            data: part.image,
          };
        case "file":
          return {
            type: "data-file",
            id: uuidv4(),
            data: { content: part.data },
          };
        default:
          throw new Error(
            `Unsupported content part type: ${(part as { type: string }).type}`,
          );
      }
    });
  } else if (modelMessage.role === "assistant") {
    const content = modelMessage.content;
    if (typeof content === "string") {
      return [{ type: "text", text: content }];
    }
    // Handle AssistantContent parts
    return content.map((part) => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text };
        case "tool-call":
          return {
            type: `tool-${part.toolName}` as const,
            toolCallId: part.toolCallId,
            state: "output-available" as const,
            input: (part as unknown as { args: unknown }).args,
            output: "pending",
          };
        default:
          throw new Error(
            `Unsupported assistant content part type: ${(part as { type: string }).type}`,
          );
      }
    });
  } else {
    // For system and tool messages, assume text content
    return [{ type: "text", text: String(modelMessage.content) }];
  }
}

// Message processor class to handle file references and other message processing

export class MessageProcessor {
  private readonly logger: Logger<ILogObj> = new Logger({
    name: "MessageProcessor",
  });

  constructor(private fileService: FileService) {}

  async processFileReferences(
    message: string,
    projectPath: string,
  ): Promise<string> {
    try {
      // Extract file references from the message
      const fileRefs = this.extractFileReferences(message);

      if (fileRefs.length === 0) {
        return message;
      }

      // Load file contents
      const fileContentMap = await this.loadFileContents(fileRefs, projectPath);

      // Process the message to replace file references
      return this.processFileReferencesInMessage(message, fileContentMap);
    } catch (error) {
      this.logger.error(`Error processing file references: ${error}`);
      return message; // Return original message on error
    }
  }

  extractFileReferences(message: string): string[] {
    const fileRefRegex = /@([^\s]+)/g;
    const matches: string[] = [];
    let match;

    while ((match = fileRefRegex.exec(message)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }

    return matches;
  }

  private processFileReferencesInMessage(
    message: string,
    fileContentMap: Map<string, string>,
  ): string {
    const fileRefRegex = /@([^\s]+)/g;

    return message.replace(fileRefRegex, (match, filePath) => {
      const content = fileContentMap.get(filePath);
      if (content !== undefined) {
        return `<file data-path="${filePath}">${content}</file>`;
      }
      return match;
    });
  }

  private async loadFileContents(
    fileRefs: string[],
    projectPath: string,
  ): Promise<Map<string, string>> {
    const fileContentMap = new Map<string, string>();

    for (const filePath of fileRefs) {
      try {
        // Resolve the file path relative to the project
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(projectPath, filePath);

        // Check if the file is within the project folder
        const isInProject = absolutePath.startsWith(projectPath);
        if (!isInProject) {
          this.logger.warn(
            `File ${filePath} is outside project folder, skipping`,
          );
          continue;
        }

        // Load the file content using FileService
        const fileContent = await this.fileService.openFile(absolutePath);
        fileContentMap.set(filePath, fileContent.content);

        this.logger.debug(`Loaded content for file: ${filePath}`);
      } catch (error) {
        this.logger.warn(`Failed to load file ${filePath}: ${error}`);
        // Don't add to map - will keep original @filename syntax
      }
    }

    return fileContentMap;
  }

  extractChatFileReferences(
    content: string,
  ): Array<{ path: string; md5: string }> {
    const fileRefs = this.extractFileReferences(content);

    return fileRefs.map((path) => ({
      path,
      md5: "placeholder", // TODO: Implement actual MD5 calculation if needed
    }));
  }

  // Future utility methods for other message processing features
  processInputDataPlaceholders(
    message: string,
    inputData: Record<string, any>,
  ): string {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;

    return message.replace(placeholderRegex, (match, key) => {
      const value = inputData[key];
      if (value !== undefined) {
        return String(value);
      }
      return match;
    });
  }

  extractInputDataPlaceholders(message: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(message)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }

    return matches;
  }
}
