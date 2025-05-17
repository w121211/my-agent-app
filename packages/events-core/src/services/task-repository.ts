// packages/events-core/src/services/task-repository.ts
import path from "node:path";
import fs from "node:fs/promises";
import { ILogObj, Logger } from "tslog";
import { z } from "zod";
import {
  createDirectory,
  fileExists,
  readJsonFile,
  writeJsonFile,
  listDirectory,
} from "../file-helpers.js";
import type { Task, TaskStatus } from "./task-service.js";

export class TaskRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskRepositoryError";
  }
}

export class TaskNotFoundError extends TaskRepositoryError {
  constructor(identifier: string) {
    super(`Task with identifier ${identifier} not found`);
    this.name = "TaskNotFoundError";
  }
}

const TaskStatusSchema = z.enum([
  "CREATED",
  "INITIALIZED",
  "IN_PROGRESS",
  "COMPLETED",
]);

const TaskFileDataSchema = z.object({
  _type: z.literal("task"),
  id: z.string(),
  seqNumber: z.number(),
  title: z.string(),
  status: TaskStatusSchema,
  currentSubtaskId: z.string().optional(),
  config: z.record(z.unknown()),
  createdAt: z.string().transform((val) => new Date(val)),
  updatedAt: z.string().transform((val) => new Date(val)),
});

type TaskFileData = Omit<Task, "absoluteDirectoryPath"> & {
  _type: "task";
};

export class TaskRepository {
  private readonly logger: Logger<ILogObj>;
  private readonly taskCache: Map<string, Task> = new Map();
  private readonly pathToIdMap: Map<string, string> = new Map();

  constructor() {
    this.logger = new Logger({ name: "TaskRepository" });
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing TaskRepository");
    this.logger.info(`Initialized with ${this.taskCache.size} tasks`);
  }

  async scanDirectory(absoluteDirectoryPath: string): Promise<void> {
    const entries = await listDirectory(absoluteDirectoryPath);

    for (const entry of entries) {
      if (!entry.isDirectory || !entry.name.startsWith("task-")) {
        continue;
      }

      const taskAbsoluteDirectoryPath = path.join(
        absoluteDirectoryPath,
        entry.name
      );
      const taskFilePath = path.join(taskAbsoluteDirectoryPath, "task.json");

      if (await fileExists(taskFilePath)) {
        try {
          const task = await this.readTaskFromFile(
            taskFilePath,
            taskAbsoluteDirectoryPath
          );
          this.taskCache.set(task.id, task);
          this.pathToIdMap.set(taskAbsoluteDirectoryPath, task.id);
        } catch (error) {
          this.logger.warn(`Failed to load task file: ${taskFilePath}`, error);
        }
      }

      await this.scanDirectory(taskAbsoluteDirectoryPath);
    }
  }

  async findByAbsolutePath(absoluteDirectoryPath: string): Promise<Task> {
    const taskId = this.pathToIdMap.get(absoluteDirectoryPath);
    if (taskId) {
      const task = this.taskCache.get(taskId);
      if (task) {
        return task;
      }
    }

    const taskFilePath = path.join(absoluteDirectoryPath, "task.json");
    if (await fileExists(taskFilePath)) {
      const task = await this.readTaskFromFile(
        taskFilePath,
        absoluteDirectoryPath
      );
      this.taskCache.set(task.id, task);
      this.pathToIdMap.set(absoluteDirectoryPath, task.id);
      return task;
    }

    throw new TaskNotFoundError(absoluteDirectoryPath);
  }

  async findById(taskId: string): Promise<Task | undefined> {
    return this.taskCache.get(taskId);
  }

  async findAll(): Promise<Task[]> {
    return Array.from(this.taskCache.values());
  }

  async createTask(
    task: Omit<Task, "absoluteDirectoryPath">,
    parentAbsoluteDirectoryPath: string
  ): Promise<Task> {
    const taskDirectoryName = `task-${task.id}`;
    const absoluteDirectoryPath = path.join(
      parentAbsoluteDirectoryPath,
      taskDirectoryName
    );
    await createDirectory(absoluteDirectoryPath);

    const newTask: Task = {
      ...task,
      absoluteDirectoryPath: absoluteDirectoryPath,
    };

    await this.saveTaskToFile(newTask, absoluteDirectoryPath);

    this.taskCache.set(newTask.id, newTask);
    this.pathToIdMap.set(absoluteDirectoryPath, newTask.id);

    return newTask;
  }

  async updateTask(task: Task): Promise<Task> {
    if (!task.absoluteDirectoryPath) {
      throw new TaskRepositoryError(
        "Task has no absoluteDirectoryPath specified"
      );
    }

    this.taskCache.set(task.id, task);
    this.pathToIdMap.set(task.absoluteDirectoryPath, task.id);

    await this.saveTaskToFile(task, task.absoluteDirectoryPath);

    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (
      task.absoluteDirectoryPath &&
      (await fileExists(task.absoluteDirectoryPath))
    ) {
      const taskFilePath = path.join(task.absoluteDirectoryPath, "task.json");
      if (await fileExists(taskFilePath)) {
        await fs.unlink(taskFilePath);
        this.logger.debug(`Deleted task file: ${taskFilePath}`);
      }
    }

    this.taskCache.delete(taskId);
    if (task.absoluteDirectoryPath) {
      this.pathToIdMap.delete(task.absoluteDirectoryPath);
    }
  }

  removeFromCache(taskId: string): void {
    const task = this.taskCache.get(taskId);
    if (task && task.absoluteDirectoryPath) {
      this.pathToIdMap.delete(task.absoluteDirectoryPath);
    }
    this.taskCache.delete(taskId);
  }

  private async saveTaskToFile(
    task: Task,
    absoluteDirectoryPath: string
  ): Promise<void> {
    const taskFilePath = path.join(absoluteDirectoryPath, "task.json");

    const taskFile: TaskFileData = {
      _type: "task",
      id: task.id,
      seqNumber: task.seqNumber,
      title: task.title,
      status: task.status,
      currentSubtaskId: task.currentSubtaskId,
      config: task.config,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    await writeJsonFile(taskFilePath, taskFile);
  }

  private async readTaskFromFile(
    taskFilePath: string,
    absoluteDirectoryPath: string
  ): Promise<Task> {
    const fileContent = await readJsonFile<unknown>(taskFilePath);

    const taskFileData = TaskFileDataSchema.parse(fileContent);

    const task: Task = {
      id: taskFileData.id,
      seqNumber: taskFileData.seqNumber,
      title: taskFileData.title,
      status: taskFileData.status,
      currentSubtaskId: taskFileData.currentSubtaskId,
      absoluteDirectoryPath: absoluteDirectoryPath,
      config: taskFileData.config,
      createdAt: taskFileData.createdAt,
      updatedAt: taskFileData.updatedAt,
    };

    return task;
  }
}
