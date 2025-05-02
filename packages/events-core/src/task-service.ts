import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { IEventBus } from "./event-bus.js";
import { TaskRepository } from "./repositories.js";
import {
  ClientCreateTaskEvent,
  ServerTaskCreatedEvent,
  ServerTaskFolderCreatedEvent,
  ServerTaskConfigFileCreatedEvent,
  ClientStartTaskEvent,
  ServerTaskInitializedEvent,
  ServerTaskLoadedEvent,
  Task,
} from "./event-types.js";

export class TaskService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly taskRepo: TaskRepository;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.logger = new Logger({ name: "TaskService" });
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;

    this.eventBus.subscribe<ClientCreateTaskEvent>(
      "ClientCreateTask",
      this.handleCreateTaskCommand.bind(this)
    );

    this.eventBus.subscribe<ClientStartTaskEvent>(
      "ClientStartTask",
      this.handleStartTaskCommand.bind(this)
    );
  }

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

  private async handleCreateTaskCommand(
    event: ClientCreateTaskEvent
  ): Promise<void> {
    await this.createTask(
      event.taskName,
      event.taskConfig,
      event.correlationId
    );
  }

  private async handleStartTaskCommand(
    event: ClientStartTaskEvent
  ): Promise<void> {
    const task = await this.taskRepo.findById(event.taskId);

    if (!task) {
      throw new Error(`Task ${event.taskId} not found`);
    }

    task.status = "IN_PROGRESS";
    task.updatedAt = new Date();
    await this.taskRepo.save(task);

    await this.eventBus.emit<ServerTaskLoadedEvent>({
      kind: "ServerTaskLoaded",
      taskId: event.taskId,
      taskState: task,
      timestamp: new Date(),
      correlationId: event.correlationId,
    });

    await this.eventBus.emit<ServerTaskInitializedEvent>({
      kind: "ServerTaskInitialized",
      taskId: event.taskId,
      initialState: { status: task.status },
      timestamp: new Date(),
      correlationId: event.correlationId,
    });
  }
}
