// src/workspaceManager.ts

import { promises as fs } from "fs";
import * as path from "path";
import { Logger } from "tslog";
import { Chat, Task } from "./types";

export interface IWorkspaceManager {
  loadWorkspace(): Promise<Record<string, Task>>;
  saveTaskToJson(task: Task): Promise<void>;
  createTaskFolder(task: Task): Promise<string>;
  createChatFile(chat: Chat, folderPath: string): Promise<string>;
  saveChatToFile(chat: Chat, filePath: string): Promise<void>;
  readChatFile(filePath: string): Promise<Chat>;
  getTaskFolderPath(taskId: string): Promise<string | undefined>;
  getSubtaskFolderPath(
    taskId: string,
    subtaskId: string
  ): Promise<string | undefined>;
  getChatFilePath(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<string | undefined>;
  ensureFolderExists(path: string): Promise<void>;
}

export class WorkspaceManager implements IWorkspaceManager {
  private workspacePath: string;
  private logger: Logger;

  // 文件夾和檔案命名模式
  private readonly TASK_FOLDER_PATTERN = /^t(\d+)-[\w-]+$/;
  private readonly SUBTASK_FOLDER_PATTERN = /^s(\d+)-[\w-]+$/;
  private readonly CHAT_FILE_PATTERN = /^c(\d+)-(\d{8}_\d{6})\.chat\.json$/;

  constructor(workspacePath: string) {
    this.workspacePath = path.resolve(workspacePath);
    this.logger = new Logger({ name: "WorkspaceManager" });
  }

  async loadWorkspace(): Promise<Record<string, Task>> {
    const tasks: Record<string, Task> = {};
    const entries = await fs.readdir(this.workspacePath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory() || !this.TASK_FOLDER_PATTERN.test(entry.name)) {
        continue;
      }

      try {
        const taskPath = path.join(this.workspacePath, entry.name);
        const task = await this.loadTaskFromFolder(taskPath);
        if (task) {
          tasks[task.id] = task;
        }
      } catch (error) {
        this.logger.error(`Error loading task from ${entry.name}: ${error}`);
      }
    }

    return tasks;
  }

  async saveTaskToJson(task: Task): Promise<void> {
    if (!task.folderPath) {
      throw new Error("Task folder path cannot be None");
    }

    const taskFolder = task.folderPath;
    const taskFile = path.join(taskFolder, "task.json");
    const historyFolder = path.join(taskFolder, "history");

    await this.ensureFolderExists(historyFolder);

    const timestamp = this.formatTimestamp(new Date());
    const historyFile = path.join(historyFolder, `task_${timestamp}.json`);
    const taskJson = JSON.stringify(task, null, 2);

    await Promise.all([
      fs.writeFile(taskFile, taskJson, "utf8"),
      fs.writeFile(historyFile, taskJson, "utf8"),
    ]);
  }

  async createTaskFolder(task: Task): Promise<string> {
    const folderName = `t${task.seqNumber.toString().padStart(2, "0")}-${this.formatName(task.title)}`;
    const taskFolder = path.join(this.workspacePath, folderName);

    await this.ensureFolderExists(taskFolder);
    await this.ensureFolderExists(path.join(taskFolder, "history"));

    for (const subtask of task.subtasks) {
      const subtaskFolder = path.join(
        taskFolder,
        `s${subtask.seqNumber.toString().padStart(2, "0")}-${this.formatName(subtask.title)}`
      );
      await this.ensureFolderExists(subtaskFolder);
    }

    return taskFolder;
  }

  async createChatFile(chat: Chat, folderPath: string): Promise<string> {
    const timestamp = this.formatTimestamp(new Date());
    const chatFiles = (await fs.readdir(folderPath)).filter((f) =>
      f.endsWith(".chat.json")
    );
    const chatCount = chatFiles.length;
    const filename = `c${(chatCount + 1).toString().padStart(2, "0")}-${timestamp}.chat.json`;

    const filePath = path.join(folderPath, filename);
    await this.saveChatToFile(chat, filePath);
    return filePath;
  }

  async saveChatToFile(chat: Chat, filePath: string): Promise<void> {
    const chatJson = JSON.stringify(chat, null, 2);
    await fs.writeFile(filePath, chatJson, "utf8");
  }

  async readChatFile(filePath: string): Promise<Chat> {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as Chat;
  }

  async getTaskFolderPath(taskId: string): Promise<string | undefined> {
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
        } catch {
          continue;
        }
      }
    }
    return undefined;
  }

  async getSubtaskFolderPath(
    taskId: string,
    subtaskId: string
  ): Promise<string | undefined> {
    const taskFolder = await this.getTaskFolderPath(taskId);
    if (!taskFolder) {
      return undefined;
    }

    const entries = await fs.readdir(taskFolder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && this.SUBTASK_FOLDER_PATTERN.test(entry.name)) {
        try {
          const task = await this.loadTaskFromFolder(taskFolder);
          if (task) {
            const subtask = task.subtasks.find((s) => s.id === subtaskId);
            if (subtask) {
              return path.join(taskFolder, entry.name);
            }
          }
        } catch {
          continue;
        }
      }
    }
    return undefined;
  }

  async getChatFilePath(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<string | undefined> {
    const subtaskFolder = await this.getSubtaskFolderPath(taskId, subtaskId);
    if (!subtaskFolder) {
      return undefined;
    }

    const entries = await fs.readdir(subtaskFolder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".chat.json")) {
        try {
          const chatPath = path.join(subtaskFolder, entry.name);
          const chat = await this.readChatFile(chatPath);
          if (chat.id === chatId) {
            return chatPath;
          }
        } catch {
          continue;
        }
      }
    }
    return undefined;
  }

  async ensureFolderExists(folderPath: string): Promise<void> {
    await fs.mkdir(folderPath, { recursive: true });
  }

  private async loadTaskFromFolder(
    folderPath: string
  ): Promise<Task | undefined> {
    const taskFile = path.join(folderPath, "task.json");
    try {
      const content = await fs.readFile(taskFile, "utf8");
      return JSON.parse(content) as Task;
    } catch {
      return undefined;
    }
  }

  private formatName(name: string): string {
    return name
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s-]+/g, "-")
      .trim("-");
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }
}
