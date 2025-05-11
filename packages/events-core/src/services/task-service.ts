// packages/events-core/src/services/task-service.ts
import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import type { IEventBus } from "../event-bus.js";
import type { TaskRepository } from "../repositories.js";
import type {
  ServerTaskCreatedEvent,
  ServerTaskFolderCreatedEvent,
  ServerTaskConfigFileCreatedEvent,
  ServerTaskInitializedEvent,
  ServerTaskLoadedEvent,
  Task,
} from "../event-types.js";

export class TaskService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly taskRepo: TaskRepository;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.logger = new Logger({ name: "TaskService" });
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;
  }

  /**
   * Creates a new task
   */
  async createTask(
    taskName: string,
    taskConfig: Record<string, unknown>,
    correlationId?: string
  ): Promise<{ taskId: string; folderPath: string }> {
    const taskId = uuidv4();
    const now = new Date();

    const task: Task = {
      id: taskId,
      seqNumber: 0,
      title: taskName,
      status: "CREATED",
      config: taskConfig,
      createdAt: now,
      updatedAt: now,
    };

    const folderPath = await this.taskRepo.createTaskFolder(task);
    task.folderPath = folderPath;

    await this.eventBus.emit<ServerTaskFolderCreatedEvent>({
      kind: "ServerTaskFolderCreated",
      taskId,
      folderPath,
      timestamp: new Date(),
      correlationId,
    });

    await this.eventBus.emit<ServerTaskConfigFileCreatedEvent>({
      kind: "ServerTaskConfigFileCreated",
      taskId,
      filePath: `${folderPath}/task.json`,
      config: taskConfig,
      timestamp: new Date(),
      correlationId,
    });

    await this.taskRepo.save(task);

    await this.eventBus.emit<ServerTaskCreatedEvent>({
      kind: "ServerTaskCreated",
      taskId,
      taskName,
      config: taskConfig,
      timestamp: new Date(),
      correlationId,
    });

    return { taskId, folderPath };
  }

  /**
   * Starts a task
   */
  async startTask(taskId: string, correlationId?: string): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = "IN_PROGRESS";
    task.updatedAt = new Date();
    await this.taskRepo.save(task);

    await this.eventBus.emit<ServerTaskLoadedEvent>({
      kind: "ServerTaskLoaded",
      taskId,
      taskState: task,
      timestamp: new Date(),
      correlationId,
    });

    await this.eventBus.emit<ServerTaskInitializedEvent>({
      kind: "ServerTaskInitialized",
      taskId,
      initialState: { status: task.status },
      timestamp: new Date(),
      correlationId,
    });

    return task;
  }

  /**
   * Gets a task by ID
   */
  async getTaskById(taskId: string): Promise<Task | undefined> {
    return this.taskRepo.findById(taskId);
  }

  /**
   * Gets all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    return this.taskRepo.findAll();
  }
}
