// src/subtaskService.ts

import { Logger } from "tslog";
import { IEventBus } from "./event-bus.js";
import { TaskRepository } from "./repositories.js";
import {
  CompleteSubtaskCommand,
  EventType,
  NextSubtaskTriggeredEvent,
  StartNewChatCommand,
  StartSubtaskCommand,
  SubtaskCompletedEvent,
  SubtaskStartedEvent,
  SubtaskStatus,
  SubtaskUpdatedEvent,
} from "./types.js";

export class SubtaskService {
  private eventBus: IEventBus;
  private taskRepo: TaskRepository;
  private logger: Logger;

  constructor(eventBus: IEventBus, taskRepo: TaskRepository) {
    this.eventBus = eventBus;
    this.taskRepo = taskRepo;
    this.logger = new Logger({ name: "SubtaskService" });

    // 訂閱事件
    this.eventBus.subscribeAsync(
      EventType.START_SUBTASK_COMMAND,
      this.handleStartSubtaskCommand.bind(this)
    );
    this.eventBus.subscribeAsync(
      EventType.COMPLETE_SUBTASK_COMMAND,
      this.handleCompleteSubtaskCommand.bind(this)
    );
    this.eventBus.subscribeAsync(
      EventType.SUBTASK_UPDATED_EVENT,
      this.onSubtaskUpdated.bind(this)
    );
  }

  private async handleStartSubtaskCommand(
    command: StartSubtaskCommand
  ): Promise<void> {
    try {
      const [task, subtask] = await this.taskRepo.getSubtask(
        command.taskId,
        command.subtaskId
      );

      // 檢查運行狀態
      if (task.currentSubtaskId) {
        if (task.currentSubtaskId === command.subtaskId) {
          this.logger.warn(`Subtask ${command.subtaskId} is already running`);
          return;
        }
      }

      // 更新任務和子任務狀態
      subtask.status = SubtaskStatus.IN_PROGRESS;
      task.currentSubtaskId = subtask.id;
      await this.taskRepo.save(task);

      const now = new Date();

      // 啟動新聊天
      await this.eventBus.publish({
        eventType: EventType.START_NEW_CHAT_COMMAND,
        taskId: command.taskId,
        subtaskId: command.subtaskId,
        timestamp: now,
        correlationId: command.correlationId,
      });

      // 發布狀態更新事件
      await this.eventBus.publish({
        eventType: EventType.SUBTASK_UPDATED_EVENT,
        taskId: command.taskId,
        subtaskId: command.subtaskId,
        status: SubtaskStatus.IN_PROGRESS,
        timestamp: now,
        correlationId: command.correlationId,
      });

      // 發布子任務開始事件
      await this.eventBus.publish({
        eventType: EventType.SUBTASK_STARTED_EVENT,
        taskId: command.taskId,
        subtaskId: command.subtaskId,
        input: null, // 後續實現輸入處理
        timestamp: now,
        correlationId: command.correlationId,
      });
    } catch (error) {
      this.logger.error(`Failed to start subtask: ${error}`);
      throw error;
    }
  }

  private async handleCompleteSubtaskCommand(
    command: CompleteSubtaskCommand
  ): Promise<void> {
    try {
      const [task, subtask] = await this.taskRepo.getSubtask(
        command.taskId,
        command.subtaskId
      );

      // 更新子任務狀態
      subtask.status = SubtaskStatus.COMPLETED;
      await this.taskRepo.saveSubtask(subtask);

      const now = new Date();

      // 發布完成事件
      await Promise.all([
        this.eventBus.publish({
          eventType: EventType.SUBTASK_UPDATED_EVENT,
          taskId: command.taskId,
          subtaskId: command.subtaskId,
          status: SubtaskStatus.COMPLETED,
          timestamp: now,
          correlationId: command.correlationId,
        }),
        this.eventBus.publish({
          eventType: EventType.SUBTASK_COMPLETED_EVENT,
          taskId: command.taskId,
          subtaskId: command.subtaskId,
          timestamp: now,
          correlationId: command.correlationId,
        }),
      ]);

      // 如果不需要審批，觸發下一子任務
      if (!command.requiresApproval) {
        await this.eventBus.publish({
          eventType: EventType.NEXT_SUBTASK_TRIGGERED_EVENT,
          taskId: command.taskId,
          currentSubtaskId: command.subtaskId,
          timestamp: now,
          correlationId: command.correlationId,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to complete subtask: ${error}`);
      throw error;
    }
  }

  private async onSubtaskUpdated(event: SubtaskUpdatedEvent): Promise<void> {
    try {
      const [task, subtask] = await this.taskRepo.getSubtask(
        event.taskId,
        event.subtaskId
      );
      subtask.status = event.status;
      await this.taskRepo.saveSubtask(subtask);
    } catch (error) {
      this.logger.error(`Failed to update subtask status: ${error}`);
      throw error;
    }
  }
}
