import { ILogObj, Logger } from "tslog";
import { IEventBus } from "./event-bus.js";
import { TaskRepository } from "./repositories.js";
import {
  ClientCompleteSubtaskCommand,
  ClientEventType,
  ClientStartNewChatCommand,
  ClientStartSubtaskCommand,
  ServerEventType,
  ServerNextSubtaskTriggered,
  ServerSubtaskCompleted,
  ServerSubtaskStarted,
  ServerSubtaskUpdated,
  SubtaskStatus,
} from "./event-types.js";

/**
 * Service for managing subtask lifecycle and operations
 */
export class SubtaskService {
  private readonly logger: Logger<ILogObj>;
  private readonly eventBus: IEventBus;
  private readonly taskRepo: TaskRepository;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.logger = new Logger({ name: "SubtaskService" });
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;

    // Register event handlers
    this.eventBus.subscribe<ClientStartSubtaskCommand>(
      "CLIENT_START_SUBTASK_COMMAND",
      this.handleStartSubtaskCommand.bind(this)
    );

    this.eventBus.subscribe<ClientCompleteSubtaskCommand>(
      "CLIENT_COMPLETE_SUBTASK_COMMAND",
      this.handleCompleteSubtaskCommand.bind(this)
    );

    this.eventBus.subscribe<ServerSubtaskUpdated>(
      "SERVER_SUBTASK_UPDATED",
      this.onSubtaskUpdated.bind(this)
    );
  }

  /**
   * Handles starting a subtask and manages the task execution flow
   */
  private async handleStartSubtaskCommand(
    command: ClientStartSubtaskCommand
  ): Promise<void> {
    // Get task and subtask using repository
    const [task, subtask] = await this.taskRepo.getSubtask(
      command.taskId,
      command.subtaskId
    );

    // Handle already running task state
    if (task.currentSubtaskId) {
      if (task.currentSubtaskId === command.subtaskId) {
        this.logger.warn(`Subtask ${command.subtaskId} is already running`);
        return;
      }
    }

    // Update task and subtask status
    subtask.status = "IN_PROGRESS";
    task.currentSubtaskId = subtask.id;
    await this.taskRepo.save(task);

    // Start new chat
    await this.eventBus.emit<ClientStartNewChatCommand>({
      eventType: "CLIENT_START_NEW_CHAT_COMMAND",
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // Emit status update event
    await this.eventBus.emit<ServerSubtaskUpdated>({
      eventType: "SERVER_SUBTASK_UPDATED",
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      status: "IN_PROGRESS",
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // Emit started event
    await this.eventBus.emit<ServerSubtaskStarted>({
      eventType: "SERVER_SUBTASK_STARTED",
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      input: undefined, // Input handling will be implemented later
      timestamp: new Date(),
      correlationId: command.correlationId,
    });
  }

  /**
   * Handles completing a subtask and triggering the next one if no approval needed
   */
  private async handleCompleteSubtaskCommand(
    command: ClientCompleteSubtaskCommand
  ): Promise<void> {
    // Get task and subtask
    const [task, subtask] = await this.taskRepo.getSubtask(
      command.taskId,
      command.subtaskId
    );

    // Update subtask status
    subtask.status = "COMPLETED";
    await this.taskRepo.saveSubtask(subtask);

    // Emit completion events
    await this.eventBus.emit<ServerSubtaskUpdated>({
      eventType: "SERVER_SUBTASK_UPDATED",
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      status: "COMPLETED",
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    await this.eventBus.emit<ServerSubtaskCompleted>({
      eventType: "SERVER_SUBTASK_COMPLETED",
      taskId: command.taskId,
      subtaskId: command.subtaskId,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // If no approval required, trigger next subtask
    if (!command.requiresApproval) {
      await this.eventBus.emit<ServerNextSubtaskTriggered>({
        eventType: "SERVER_NEXT_SUBTASK_TRIGGERED",
        taskId: command.taskId,
        currentSubtaskId: command.subtaskId,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });
    }
  }

  /**
   * Updates subtask status in repository when status changes
   */
  private async onSubtaskUpdated(event: ServerSubtaskUpdated): Promise<void> {
    const [task, subtask] = await this.taskRepo.getSubtask(
      event.taskId,
      event.subtaskId
    );

    subtask.status = event.status;
    await this.taskRepo.saveSubtask(subtask);
  }
}
