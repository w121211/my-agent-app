// packages/events-core/src/services/task-service.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus, BaseEvent } from "../event-bus.js";
import type { TaskRepository } from "./task-repository.js";

// Define types specific to the task service
export type TaskStatus =
  | "CREATED"
  | "INITIALIZED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface Task {
  id: string;
  seqNumber: number;
  title: string;
  status: TaskStatus;
  currentSubtaskId?: string;
  absoluteDirectoryPath?: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Define the TaskUpdatedEvent
export type TaskUpdateType =
  | "STATUS_CHANGED"
  | "SUBTASK_UPDATED"
  | "CONFIG_UPDATED";

export interface TaskUpdatedEvent extends BaseEvent {
  kind: "TaskUpdatedEvent";
  taskId: string;
  updateType: TaskUpdateType;
  changes: Record<string, unknown>;
  task: Task;
}

export class TaskService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly taskRepo: TaskRepository;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.logger = new Logger({ name: "TaskService" });
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;
  }

  async createTask(
    taskName: string,
    taskConfig: Record<string, unknown>,
    parentAbsoluteDirectoryPath: string,
    correlationId?: string
  ): Promise<{ taskId: string; absoluteDirectoryPath: string }> {
    const taskId = uuidv4();
    const now = new Date();

    const task: Omit<Task, "absoluteDirectoryPath"> = {
      id: taskId,
      seqNumber: 0,
      title: taskName,
      status: "CREATED",
      config: taskConfig,
      createdAt: now,
      updatedAt: now,
    };

    const completedTask = await this.taskRepo.createTask(
      task,
      parentAbsoluteDirectoryPath
    );

    return {
      taskId: completedTask.id,
      absoluteDirectoryPath: completedTask.absoluteDirectoryPath!,
    };
  }

  async startTask(taskId: string, correlationId?: string): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const previousStatus = task.status;
    task.status = "IN_PROGRESS";
    task.updatedAt = new Date();
    await this.taskRepo.updateTask(task);

    // Emit task updated event for status change
    await this.eventBus.emit<TaskUpdatedEvent>({
      kind: "TaskUpdatedEvent",
      taskId,
      updateType: "STATUS_CHANGED",
      changes: {
        status: {
          previous: previousStatus,
          current: task.status,
        },
      },
      task,
      timestamp: new Date(),
      correlationId,
    });

    return task;
  }

  async getTaskById(taskId: string): Promise<Task | undefined> {
    return this.taskRepo.findById(taskId);
  }

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepo.findAll();
  }
}
