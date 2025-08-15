// apps/my-app-svelte/src/stores/task-store.svelte.ts
import type { Task } from "../services/task-service";

// Core task state
export const tasks = $state<Task[]>([]);
export const tasksByPath = $state<Map<string, Task>>(new Map());

// Helper functions for working with task stores

export function addTask(task: Task) {
  tasks.push(task);

  if (task.absoluteDirectoryPath) {
    tasksByPath.set(task.absoluteDirectoryPath, task);
  }
}

export function updateTask(updatedTask: Task) {
  // Update tasks array
  const index = tasks.findIndex((task) => task.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = updatedTask;
  }

  // Update tasksByPath mapping
  if (updatedTask.absoluteDirectoryPath) {
    tasksByPath.set(updatedTask.absoluteDirectoryPath, updatedTask);
  }
}

export function removeTask(taskId: string) {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index !== -1) {
    const removedTask = tasks[index];
    tasks.splice(index, 1);
    
    // Remove from path mapping
    if (removedTask?.absoluteDirectoryPath) {
      tasksByPath.delete(removedTask.absoluteDirectoryPath);
    }
  }
}

export function clearTasks() {
  tasks.splice(0, tasks.length);
  tasksByPath.clear();
}

// Task status utilities
export function getTaskStatusConfig(status: Task["status"]) {
  const statusConfig = {
    COMPLETED: {
      label: "completed",
      className: "bg-green-600/20 text-green-400 border-green-600/40",
      icon: "check-circle-fill",
    },
    IN_PROGRESS: {
      label: "running",
      className: "bg-blue-600/20 text-blue-400 border-blue-600/40",
      icon: "play-circle-fill",
    },
    CREATED: {
      label: "created",
      className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/40",
      icon: "plus-circle-fill",
    },
    INITIALIZED: {
      label: "ready",
      className: "bg-purple-600/20 text-purple-400 border-purple-600/40",
      icon: "gear-fill",
    },
  };

  return statusConfig[status] || statusConfig.CREATED;
}

export function isTaskFolder(folderName: string): boolean {
  return folderName.startsWith("task-");
}

export function extractTaskIdFromPath(path: string): string | null {
  const segments = path.split("/");
  const taskFolder = segments.find((segment) => segment.startsWith("task-"));

  if (!taskFolder) return null;

  // Extract ID from folder name like "task-uuid"
  const taskId = taskFolder.substring(5); // Remove "task-" prefix
  return taskId || null;
}