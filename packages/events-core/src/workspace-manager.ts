import fs from "node:fs/promises";
import path from "node:path";
import { ILogObj, Logger } from "tslog";
import {
  Chat,
  Task,
  EntityNotFoundError,
  RepositoryError,
} from "./event-types.js";

/**
 * Interface defining workspace management operations
 */
export interface IWorkspaceManager {
  /**
   * Load all tasks from workspace
   */
  loadWorkspace(): Promise<Record<string, Task>>;

  /**
   * Save task data to JSON file
   */
  saveTaskToJson(task: Task): Promise<void>;

  /**
   * Create new task folder structure
   */
  createTaskFolder(task: Task): Promise<string>;

  /**
   * Create chat file in the specified folder and return path
   */
  createChatFile(chat: Chat, folderPath: string): Promise<string>;

  /**
   * Save chat to the specified file path
   */
  saveChatToFile(chat: Chat, filePath: string): Promise<void>;

  /**
   * Read chat from file
   */
  readChatFile(filePath: string): Promise<Chat>;

  /**
   * Get the folder path for a task
   */
  getTaskFolderPath(taskId: string): Promise<string | undefined>;

  /**
   * Get the folder path for a subtask
   */
  getSubtaskFolderPath(
    taskId: string,
    subtaskId: string
  ): Promise<string | undefined>;

  /**
   * Get the file path for a chat
   */
  getChatFilePath(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<string | undefined>;

  /**
   * Ensure a folder exists, creating it if necessary
   */
  ensureFolderExists(path: string): Promise<void>;
}

/**
 * File-based implementation of workspace management
 */
export class WorkspaceManager implements IWorkspaceManager {
  private readonly logger: Logger<ILogObj>;
  private readonly workspacePath: string;

  // Constants for folder and file naming patterns
  private static readonly TASK_FOLDER_PATTERN = /^t(\d+)-[\w-]+$/;
  private static readonly SUBTASK_FOLDER_PATTERN = /^s(\d+)-[\w-]+$/;
  private static readonly CHAT_FILE_PATTERN =
    /^c(\d+)-(\d{8}_\d{6})\.chat\.json$/;

  constructor(workspacePath: string, logger?: Logger<ILogObj>) {
    this.workspacePath = workspacePath;
    this.logger = logger || new Logger({ name: "WorkspaceManager" });
  }

  public async loadWorkspace(): Promise<Record<string, Task>> {
    const tasks: Record<string, Task> = {};

    try {
      const entries = await fs.readdir(this.workspacePath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Check if folder matches task pattern
        if (!WorkspaceManager.TASK_FOLDER_PATTERN.test(entry.name)) continue;

        try {
          const taskPath = path.join(this.workspacePath, entry.name);
          const task = await this.loadTaskFromFolder(taskPath);

          if (task) {
            tasks[task.id] = task;
          }
        } catch (error) {
          this.logger.error(`Error loading task from ${entry.name}: ${error}`);
          continue;
        }
      }

      return tasks;
    } catch (error) {
      this.logger.error(`Error loading workspace: ${error}`);
      throw new RepositoryError(`Failed to load workspace: ${error}`);
    }
  }

  public async saveTaskToJson(task: Task): Promise<void> {
    if (!task.folderPath) {
      throw new RepositoryError("Task folder path cannot be undefined");
    }

    const taskFolder = task.folderPath;
    const taskFile = path.join(taskFolder, "task.json");
    const historyFolder = path.join(taskFolder, "history");

    try {
      // Ensure history folder exists
      await this.ensureFolderExists(historyFolder);

      // Create backup with timestamp
      const timestamp = this.formatTimestamp();
      const historyFile = path.join(historyFolder, `task_${timestamp}.json`);

      // Convert task to JSON
      const taskJson = JSON.stringify(task, null, 2);

      // Write to main task file and history file
      await Promise.all([
        fs.writeFile(taskFile, taskJson, "utf-8"),
        fs.writeFile(historyFile, taskJson, "utf-8"),
      ]);
    } catch (error) {
      this.logger.error(`Error saving task to JSON: ${error}`);
      throw new RepositoryError(`Failed to save task: ${error}`);
    }
  }

  public async createTaskFolder(task: Task): Promise<string> {
    try {
      // Format task folder name
      const folderName = `t${String(task.seqNumber).padStart(2, "0")}-${this.formatName(task.title)}`;
      const taskFolder = path.join(this.workspacePath, folderName);

      // Create main task folder and history subfolder
      await this.ensureFolderExists(taskFolder);
      await this.ensureFolderExists(path.join(taskFolder, "history"));

      // Create subtask folders
      for (const subtask of task.subtasks) {
        const subtaskFolder = path.join(
          taskFolder,
          `s${String(subtask.seqNumber).padStart(2, "0")}-${this.formatName(subtask.title)}`
        );
        await this.ensureFolderExists(subtaskFolder);
      }

      return taskFolder;
    } catch (error) {
      this.logger.error(`Error creating task folder: ${error}`);
      throw new RepositoryError(`Failed to create task folder: ${error}`);
    }
  }

  public async createChatFile(chat: Chat, folderPath: string): Promise<string> {
    try {
      // Generate chat file name with timestamp in the expected format: YYYYMMDD_HHMMSS
      const timestamp = this.formatTimestamp();

      // Get existing chat files to determine next chat number
      const files = await fs.readdir(folderPath);
      const chatFiles = files.filter((file) => file.endsWith(".chat.json"));
      const chatCount = chatFiles.length;

      const filename = `c${String(chatCount + 1).padStart(2, "0")}-${timestamp}.chat.json`;
      const filePath = path.join(folderPath, filename);

      await this.saveChatToFile(chat, filePath);

      return filePath;
    } catch (error) {
      this.logger.error(`Error creating chat file: ${error}`);
      throw new RepositoryError(`Failed to create chat file: ${error}`);
    }
  }

  public async saveChatToFile(chat: Chat, filePath: string): Promise<void> {
    try {
      const chatJson = JSON.stringify(chat, null, 2);
      await fs.writeFile(filePath, chatJson, "utf-8");
    } catch (error) {
      this.logger.error(`Error saving chat to file: ${error}`);
      throw new RepositoryError(`Failed to save chat to file: ${error}`);
    }
  }

  public async readChatFile(filePath: string): Promise<Chat> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as Chat;
    } catch (error) {
      this.logger.error(`Error reading chat file: ${error}`);
      throw new RepositoryError(`Failed to read chat file: ${error}`);
    }
  }

  public async getTaskFolderPath(taskId: string): Promise<string | undefined> {
    try {
      const entries = await fs.readdir(this.workspacePath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const taskPath = path.join(this.workspacePath, entry.name);
            const task = await this.loadTaskFromFolder(taskPath);

            if (task && task.id === taskId) {
              return taskPath;
            }
          } catch (error) {
            // Skip to next entry if there's an error
            continue;
          }
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Error getting task folder path: ${error}`);
      throw new RepositoryError(`Failed to get task folder path: ${error}`);
    }
  }

  public async getSubtaskFolderPath(
    taskId: string,
    subtaskId: string
  ): Promise<string | undefined> {
    const taskFolder = await this.getTaskFolderPath(taskId);
    if (!taskFolder) return undefined;

    try {
      // First load the task to get subtask info
      const task = await this.loadTaskFromFolder(taskFolder);
      if (!task) return undefined;

      // Find the subtask
      const subtask = task.subtasks.find((s) => s.id === subtaskId);
      if (!subtask) return undefined;

      // Find the subtask folder based on subtask sequence number
      const subtaskPattern = new RegExp(
        `^s${String(subtask.seqNumber).padStart(2, "0")}-[\\w-]+$`
      );

      const entries = await fs.readdir(taskFolder, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && subtaskPattern.test(entry.name)) {
          return path.join(taskFolder, entry.name);
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Error getting subtask folder path: ${error}`);
      throw new RepositoryError(`Failed to get subtask folder path: ${error}`);
    }
  }

  public async getChatFilePath(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<string | undefined> {
    const subtaskFolder = await this.getSubtaskFolderPath(taskId, subtaskId);
    if (!subtaskFolder) return undefined;

    try {
      const entries = await fs.readdir(subtaskFolder, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".chat.json")) {
          try {
            const filePath = path.join(subtaskFolder, entry.name);
            const chat = await this.readChatFile(filePath);

            if (chat.id === chatId) {
              return filePath;
            }
          } catch (error) {
            // Skip to next entry if there's an error
            continue;
          }
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Error getting chat file path: ${error}`);
      throw new RepositoryError(`Failed to get chat file path: ${error}`);
    }
  }

  public async ensureFolderExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Error ensuring folder exists: ${error}`);
      throw new RepositoryError(`Failed to ensure folder exists: ${error}`);
    }
  }

  // Helper methods
  private async loadTaskFromFolder(
    folderPath: string
  ): Promise<Task | undefined> {
    const taskFile = path.join(folderPath, "task.json");

    try {
      const content = await fs.readFile(taskFile, "utf-8");
      return JSON.parse(content) as Task;
    } catch (error) {
      this.logger.debug(`Could not load task from ${folderPath}: ${error}`);
      return undefined;
    }
  }

  private formatName(name: string): string {
    // Convert to lowercase, replace spaces and special chars with hyphens
    return name
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/[-\s]+/g, "-")
      .replace(/^-+|-+$/g, ""); // Trim hyphens from start and end
  }

  private formatTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/T/, "_")
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "");
  }
}
