// packages/events-core/src/services/chat-engine/message-processor.ts

import path from "node:path";
import type { ILogObj, Logger } from "tslog";
import type { FileService } from "../file-service.js";
import type { ProjectFolderService } from "../project-folder-service.js";

export class MessageProcessor {
  constructor(
    private projectFolderService: ProjectFolderService,
    private fileService: FileService,
    private logger: Logger<ILogObj>
  ) {}

  async processFileReferences(
    message: string,
    projectPath: string
  ): Promise<string> {
    try {
      // Extract file references from the message
      const fileRefs = this.extractFileReferences(message);
      
      if (fileRefs.length === 0) {
        return message;
      }

      // Load file contents
      const fileContentMap = await this.loadFileContents(
        fileRefs, 
        projectPath
      );

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
    fileContentMap: Map<string, string>
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
    projectPath: string
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
          this.logger.warn(`File ${filePath} is outside project folder, skipping`);
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

  extractChatFileReferences(content: string): Array<{ path: string; md5: string }> {
    const fileRefs = this.extractFileReferences(content);
    
    return fileRefs.map(path => ({
      path,
      md5: "placeholder", // TODO: Implement actual MD5 calculation if needed
    }));
  }

  // Future utility methods for other message processing features
  processInputDataPlaceholders(
    message: string,
    inputData: Record<string, any>
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