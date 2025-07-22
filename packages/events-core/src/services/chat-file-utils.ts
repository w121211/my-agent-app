// packages/events-core/src/services/chat-file-utils.ts

import path from "node:path";
import type { ILogObj, Logger } from "tslog";
import type { FileService } from "./file-service.js";
import type { ProjectFolderService } from "./project-folder-service.js";
import { extractFileReferences, processFileReferences } from "./message-processing-utils.js";
import type { Chat } from "./chat-service.js";

export async function processMessageFileReferences(
  message: string,
  chat: Chat,
  projectFolderService: ProjectFolderService,
  fileService: FileService,
  logger: Logger<ILogObj>
): Promise<string> {
  try {
    // Extract file references from the message
    const fileRefs = extractFileReferences(message);
    
    if (fileRefs.length === 0) {
      return message;
    }

    // Get the project folder for this chat
    const projectFolder = await projectFolderService.getProjectFolderForPath(
      chat.absoluteFilePath
    );

    if (!projectFolder) {
      logger.warn(`No project folder found for chat at ${chat.absoluteFilePath}`);
      return message;
    }

    // Load file contents
    const fileContentMap = await loadFileContentsForChat(
      fileRefs, 
      projectFolder.path, 
      fileService, 
      logger
    );

    // Process the message to replace file references
    return processFileReferences(message, fileContentMap, projectFolder.path);
  } catch (error) {
    logger.error(`Error processing file references: ${error}`);
    return message; // Return original message on error
  }
}

export async function loadFileContentsForChat(
  fileRefs: string[],
  projectPath: string,
  fileService: FileService,
  logger: Logger<ILogObj>
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
        logger.warn(`File ${filePath} is outside project folder, skipping`);
        continue;
      }

      // Load the file content using FileService
      const fileContent = await fileService.openFile(absolutePath);
      fileContentMap.set(filePath, fileContent.content);
      
      logger.debug(`Loaded content for file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to load file ${filePath}: ${error}`);
      // Don't add to map - will keep original @filename syntax
    }
  }

  return fileContentMap;
}

export function extractChatFileReferences(content: string): Array<{ path: string; md5: string }> {
  const references: Array<{ path: string; md5: string }> = [];
  // Use @ syntax consistently (not # syntax)
  const fileRefs = extractFileReferences(content);
  
  return fileRefs.map(path => ({
    path,
    md5: "placeholder", // TODO: Implement actual MD5 calculation if needed
  }));
}