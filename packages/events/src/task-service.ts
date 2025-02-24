// src/taskService.ts

import { Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { IEventBus } from "./eventBus";
import { TaskRepository } from "./repositories.js";
import {
  CreateTaskCommand,
  EventType,
  NextSubtaskTriggeredEvent,
  Role,
  StartSubtaskCommand,
  StartTaskCommand,
  Subtask,
  SubtaskStatus,
  Task,
  TaskCreatedEvent,
  TaskFolderCreatedEvent,
  TaskLoadedEvent,
  TaskStatus,
  TeamConfig,
} from "./types";

export class TaskService {
  private eventBus: IEventBus;
  private taskRepo: TaskRepository;
  private logger: Logger;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;
    this.logger = new Logger({ name: "TaskService" });

    // 註冊命令處理器
    this.eventBus.subscribeAsync(
      EventType.CREATE_TASK_COMMAND,
      this.handleCreateTaskCommand.bind(this)
    );
    this.eventBus.subscribeAsync(
      EventType.START_TASK_COMMAND,
      this.handleStartTaskCommand.bind(this)
    );
    this.eventBus.subscribeAsync(
      EventType.NEXT_SUBTASK_TRIGGERED_EVENT,
      this.onNextSubtaskTriggered.bind(this)
    );
  }

  private async handleCreateTaskCommand(
    command: CreateTaskCommand
  ): Promise<void> {
    const taskId = uuidv4();
    const currentTime = new Date();

    // 初始化任務對象
    const task: Task = {
      id: taskId,
      seqNumber: 0, // 將在保存時設置
      title: command.taskName,
      status: TaskStatus.CREATED,
      subtasks: [
        {
          id: uuidv4(),
          taskId,
          seqNumber: 0,
          title: "Planning",
          description: "Initial planning phase",
          status: SubtaskStatus.PENDING,
          team: { agent: Role.ASSISTANT },
          inputType: "string",
          outputType: "json",
        },
        {
          id: uuidv4(),
          taskId,
          seqNumber: 1,
          title: "Setup",
          description: "Setup initial configuration",
          status: SubtaskStatus.PENDING,
          team: { agent: Role.FUNCTION_EXECUTOR, human: Role.USER },
          inputType: "json",
          outputType: "json",
        },
      ],
      config: command.taskConfig,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    // 創建任務文件夾結構
    const folderPath = await this.taskRepo.createTaskFolder(task);
    task.folderPath = folderPath;

    // 發布任務文件夾創建事件
    await this.eventBus.publish({
      eventType: EventType.TASK_FOLDER_CREATED_EVENT,
      taskId,
      folderPath,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // 保存任務
    await this.taskRepo.save(task);

    // 發布任務創建事件
    await this.eventBus.publish({
      eventType: EventType.TASK_CREATED_EVENT,
      taskId,
      taskName: command.taskName,
      config: command.taskConfig,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // 自動啟動任務
    await this.eventBus.publish({
      eventType: EventType.START_TASK_COMMAND,
      taskId,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });
  }

  private async handleStartTaskCommand(
    command: StartTaskCommand
  ): Promise<void> {
    const task = await this.taskRepo.findById(command.taskId);
    if (!task) {
      throw new Error(`Task ${command.taskId} not found`);
    }

    // 發布任務加載事件
    await this.eventBus.publish({
      eventType: EventType.TASK_LOADED_EVENT,
      taskId: command.taskId,
      taskState: task,
      timestamp: new Date(),
      correlationId: command.correlationId,
    });

    // 啟動第一個子任務
    if (task.subtasks.length > 0) {
      const firstSubtask = task.subtasks[0];
      await this.eventBus.publish({
        eventType: EventType.START_SUBTASK_COMMAND,
        taskId: task.id,
        subtaskId: firstSubtask.id,
        timestamp: new Date(),
        correlationId: command.correlationId,
      });
    }
  }

  private async onNextSubtaskTriggered(
    event: NextSubtaskTriggeredEvent
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

    if (currentSubtask.status !== SubtaskStatus.COMPLETED) {
      throw new Error(
        `Current subtask ${event.currentSubtaskId} not completed`
      );
    }

    // 尋找下一個子任務
    const nextSubtask = task.subtasks.find(
      (s) => s.seqNumber === currentSubtask.seqNumber + 1
    );

    if (nextSubtask) {
      // 啟動下一個子任務
      await this.eventBus.publish({
        eventType: EventType.START_SUBTASK_COMMAND,
        taskId: task.id,
        subtaskId: nextSubtask.id,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    } else {
      // 如果沒有更多子任務，完成任務
      task.status = TaskStatus.COMPLETED;
      task.updatedAt = new Date();
      await this.taskRepo.save(task);
    }
  }
}
