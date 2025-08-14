// apps/my-app-svelte/src/services/task-service.ts
import { Logger } from "tslog";
import { trpcClient } from "../lib/trpc-client";
import { tasksByPath, addTask, updateTask, clearTasks } from "../stores/task-store.svelte";
import { setLoading, showToast } from "../stores/ui-store.svelte";

export interface Task {
  id: string;
  seqNumber: number;
  title: string;
  status: "CREATED" | "INITIALIZED" | "IN_PROGRESS" | "COMPLETED";
  currentSubtaskId?: string;
  absoluteDirectoryPath?: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskUpdatedEvent {
  taskId: string;
  updateType: "STATUS_CHANGED" | "SUBTASK_UPDATED" | "CONFIG_UPDATED";
  changes: Record<string, unknown>;
  task: Task;
}

class TaskService {
  private logger = new Logger({ name: "TaskService" });

  async createTask(
    taskName: string,
    parentDirectoryPath: string,
    taskConfig: Record<string, unknown> = {},
  ) {
    setLoading("createTask", true);

    try {
      this.logger.info("Creating task:", taskName, "in:", parentDirectoryPath);
      const result = await trpcClient.task.create.mutate({
        taskName,
        taskConfig,
        parentAbsoluteDirectoryPath: parentDirectoryPath,
      });

      // Load the created task details
      const task = await this.getTaskById(result.taskId);

      // Update tasks store
      addTask(task);

      showToast("Task created successfully", "success");
      this.logger.info("Task created:", result.taskId);

      return {
        taskId: result.taskId,
        absoluteDirectoryPath: result.absoluteDirectoryPath,
      };
    } catch (error) {
      this.logger.error("Failed to create task:", error);
      showToast(`Failed to create task: ${error instanceof Error ? error.message : String(error)}`, "error");
      throw error;
    } finally {
      setLoading("createTask", false);
    }
  }

  async startTask(taskId: string) {
    setLoading("startTask", true);

    try {
      this.logger.info("Starting task:", taskId);
      const updatedTask = await trpcClient.task.start.mutate({
        taskId,
      });

      // Update task in stores
      this.updateTaskInStores(updatedTask);

      showToast(`Task "${updatedTask.title}" started`, "success");
      this.logger.info("Task started:", taskId);

      return updatedTask;
    } catch (error) {
      this.logger.error("Failed to start task:", error);
      showToast(`Failed to start task: ${error instanceof Error ? error.message : String(error)}`, "error");
      throw error;
    } finally {
      setLoading("startTask", false);
    }
  }

  async getTaskById(taskId: string): Promise<Task> {
    try {
      this.logger.debug("Getting task by ID:", taskId);
      const task = await trpcClient.task.getById.query({
        taskId,
      });

      this.logger.debug("Task retrieved:", taskId);
      return task;
    } catch (error) {
      this.logger.error("Failed to get task by ID:", error);
      showToast(`Failed to get task: ${error instanceof Error ? error.message : String(error)}`, "error");
      throw error;
    }
  }

  async getAllTasks() {
    setLoading("loadTasks", true);

    try {
      this.logger.info("Loading all tasks...");
      const allTasks = await trpcClient.task.getAll.query();

      // Update tasks store
      clearTasks();
      allTasks.forEach(task => addTask(task));

      // Update tasksByPath mapping
      const pathMapping = new Map<string, Task>();
      allTasks.forEach((task) => {
        if (task.absoluteDirectoryPath) {
          pathMapping.set(task.absoluteDirectoryPath, task);
        }
      });
      // tasksByPath is already updated by addTask()

      this.logger.info(`Loaded ${allTasks.length} tasks`);
      return allTasks;
    } catch (error) {
      this.logger.error("Failed to load tasks:", error);
      showToast(`Failed to load tasks: ${error instanceof Error ? error.message : String(error)}`, "error");
      throw error;
    } finally {
      setLoading("loadTasks", false);
    }
  }

  getTaskForPath(directoryPath: string): Task | undefined {
    return tasksByPath.get(directoryPath);
  }

  getTaskStatusBadge(status: string) {
    const statusConfig = {
      COMPLETED: {
        label: "completed",
        className: "bg-green-600/20 text-green-400 border-green-600/40",
      },
      IN_PROGRESS: {
        label: "running",
        className: "bg-blue-600/20 text-blue-400 border-blue-600/40",
      },
      CREATED: {
        label: "created",
        className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/40",
      },
      INITIALIZED: {
        label: "ready",
        className: "bg-purple-600/20 text-purple-400 border-purple-600/40",
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.CREATED
    );
  }

  // Event handlers
  handleTaskEvent(event: TaskUpdatedEvent) {
    this.logger.debug("Handling task event:", event.updateType, event.taskId);

    // Update task in stores
    this.updateTaskInStores(event.task);

    // Show status change notification
    if (event.updateType === "STATUS_CHANGED") {
      showToast(
        `Task "${event.task.title}" status changed to ${event.task.status}`,
        "info",
      );
    }
  }

  private updateTaskInStores(updatedTask: Task) {
    updateTask(updatedTask);
  }
}

export const taskService = new TaskService();
