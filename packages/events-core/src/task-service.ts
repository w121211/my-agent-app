import { ILogObj, Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { IEventBus } from "./event-bus.js";
import { TaskRepository } from "./repositories.js";
import {
  ClientEventType,
  ServerEventType,
  ClientCreateTaskCommand,
  ServerNextSubtaskTriggered,
  Role,
  ClientStartSubtaskCommand,
  ClientStartTaskCommand,
  Subtask,
  SubtaskStatus,
  Task,
  ServerTaskCreated,
  ServerTaskFolderCreated,
  ServerTaskLoaded,
  TaskStatus,
  TeamConfig,
} from "./event-types.js";

/**
 * Service for managing task lifecycle and operations
 */
export class TaskService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly taskRepo: TaskRepository;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.logger = new Logger({ name: "TaskService" });
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;

    // Register event handlers
    this.eventBus.subscribe<ClientCreateTaskCommand>(
      "CLIENT_CREATE_TASK_COMMAND",
      this.handleCreateTaskCommand.bind(this)
    );

    this.eventBus.subscribe<ClientStartTaskCommand>(
      "CLIENT_START_TASK_COMMAND",
      this.handleStartTaskCommand.bind(this)
    );

    this.eventBus.subscribe<ServerNextSubtaskTriggered>(
      "SERVER_NEXT_SUBTASK_TRIGGERED",
      this.onNextSubtaskTriggered.bind(this)
    );
  }

  /**
   * Handles the creation of a new task
   */
  private async handleCreateTaskCommand(
    command: ClientCreateTaskCommand
  ): Promise<void> {
    const taskId = uuidv4();
    const currentTime = new Date();

    // Create initial subtasks
    const planningSubtaskId = uuidv4();
    const setupSubtaskId = uuidv4();

    // Initialize task with default subtasks
    const task: Task = {
      id: taskId,
      seqNumber: 0, // Will be set when saved
      title: command.taskName,
      status: "CREATED",
      subtasks: [
        {
          id: planningSubtaskId,
          taskId,
          seqNumber: 0,
          title: "Planning",
          description: "Initial planning phase",
          status: "PENDING",
          team: {
            agent: "ASSISTANT",
            human: undefined,
          },
          inputType: "string",
          outputType: "json",
        },
        {
          id: setupSubtaskId,
          taskId,
          seqNumber: 1,
          title: "Setup",
          description: "Setup initial configuration",
          status: "PENDING",
          team: {
            agent: "FUNCTION_EXECUTOR",
            human: "USER",
          },
          inputType: "json",
          outputType: "json",
        },
      ],
      config: command.taskConfig,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    // Create task folder structure
    const folderPath = await this.taskRepo.createTaskFolder(task);
    task.folderPath = folderPath;

    // Publish TaskFolderCreated event
    await this.eventBus.emit<ServerTaskFolderCreated>({
      eventType: "SERVER_TASK_FOLDER_CREATED",
      taskId,
      folderPath,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // Save the task
    await this.taskRepo.save(task);

    // Publish TaskCreated event
    await this.eventBus.emit<ServerTaskCreated>({
      eventType: "SERVER_TASK_CREATED",
      taskId,
      taskName: command.taskName,
      config: command.taskConfig,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // Auto-start the task
    await this.eventBus.emit<ClientStartTaskCommand>({
      eventType: "CLIENT_START_TASK_COMMAND",
      taskId,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });
  }

  /**
   * Handles starting a task
   */
  private async handleStartTaskCommand(
    command: ClientStartTaskCommand
  ): Promise<void> {
    const task = await this.taskRepo.findById(command.taskId);

    if (!task) {
      throw new Error(`Task ${command.taskId} not found`);
    }

    // Emit task loaded event
    await this.eventBus.emit<ServerTaskLoaded>({
      eventType: "SERVER_TASK_LOADED",
      taskId: command.taskId,
      taskState: task,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // Start first subtask if available
    if (task.subtasks.length > 0) {
      const firstSubtask = task.subtasks[0];

      if (firstSubtask) {
        await this.eventBus.emit<ClientStartSubtaskCommand>({
          eventType: "CLIENT_START_SUBTASK_COMMAND",
          taskId: task.id,
          subtaskId: firstSubtask.id,
          timestamp: new Date(),
          correlationId: command.correlationId,
        });
      }
    }
  }

  /**
   * Handles transitioning to the next subtask
   */
  private async onNextSubtaskTriggered(
    event: ServerNextSubtaskTriggered
  ): Promise<void> {
    const task = await this.taskRepo.findById(event.taskId);

    if (!task) {
      throw new Error(`Task ${event.taskId} not found`);
    }

    const currentSubtask = task.subtasks.find(
      (s) => s.id === event.currentSubtaskId
    );

    if (!currentSubtask) {
      throw new Error(`Subtask ${event.currentSubtaskId} not found`);
    }

    if (currentSubtask.status !== "COMPLETED") {
      throw new Error(
        `Current subtask ${event.currentSubtaskId} not completed`
      );
    }

    // Find next subtask
    const nextSubtask = task.subtasks.find(
      (s) => s.seqNumber === currentSubtask.seqNumber + 1
    );

    if (nextSubtask) {
      // Start next subtask
      await this.eventBus.emit<ClientStartSubtaskCommand>({
        eventType: "CLIENT_START_SUBTASK_COMMAND",
        taskId: task.id,
        subtaskId: nextSubtask.id,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    } else {
      // Complete task if no more subtasks
      task.status = "COMPLETED";
      task.updatedAt = new Date();
      await this.taskRepo.save(task);
    }
  }
}
