// apps/my-app-svelte/src/stores/task-store.ts
import { writable, derived } from "svelte/store";
import type { Task } from "../services/task-service";

// Core task state
export const tasks = writable<Task[]>([]);
export const tasksByPath = writable<Map<string, Task>>(new Map());

// Derived stores
export const taskCount = derived(tasks, ($tasks) => $tasks.length);

export const tasksByStatus = derived(tasks, ($tasks) => {
  const byStatus = {
    CREATED: [] as Task[],
    INITIALIZED: [] as Task[],
    IN_PROGRESS: [] as Task[],
    COMPLETED: [] as Task[],
  };

  $tasks.forEach((task) => {
    if (byStatus[task.status]) {
      byStatus[task.status].push(task);
    }
  });

  return byStatus;
});

export const activeTasks = derived(tasks, ($tasks) =>
  $tasks.filter(
    (task) => task.status === "IN_PROGRESS" || task.status === "INITIALIZED",
  ),
);

export const completedTasks = derived(tasks, ($tasks) =>
  $tasks.filter((task) => task.status === "COMPLETED"),
);

export const runningTasksCount = derived(
  tasks,
  ($tasks) => $tasks.filter((task) => task.status === "IN_PROGRESS").length,
);

export const pendingTasksCount = derived(
  tasks,
  ($tasks) =>
    $tasks.filter(
      (task) => task.status === "CREATED" || task.status === "INITIALIZED",
    ).length,
);

export const recentTasks = derived(tasks, ($tasks) => {
  return [...$tasks]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);
});

// Helper functions for working with task stores
export function getTaskForPath(directoryPath: string) {
  return derived(
    tasksByPath,
    ($tasksByPath) => $tasksByPath.get(directoryPath) || null,
  );
}

export function findTaskById(taskId: string) {
  return derived(
    tasks,
    ($tasks) => $tasks.find((task) => task.id === taskId) || null,
  );
}

export function addTask(task: Task) {
  tasks.update((currentTasks) => [...currentTasks, task]);

  if (task.absoluteDirectoryPath) {
    tasksByPath.update(
      (mapping) => new Map(mapping.set(task.absoluteDirectoryPath!, task)),
    );
  }
}

export function updateTask(updatedTask: Task) {
  // Update tasks array
  tasks.update((currentTasks) =>
    currentTasks.map((task) =>
      task.id === updatedTask.id ? updatedTask : task,
    ),
  );

  // Update tasksByPath mapping
  if (updatedTask.absoluteDirectoryPath) {
    tasksByPath.update(
      (mapping) =>
        new Map(mapping.set(updatedTask.absoluteDirectoryPath!, updatedTask)),
    );
  }
}

export function removeTask(taskId: string) {
  let removedTask: Task | null = null;

  tasks.update((currentTasks) => {
    const index = currentTasks.findIndex((task) => task.id === taskId);
    if (index !== -1) {
      removedTask = currentTasks[index];
      return currentTasks.filter((task) => task.id !== taskId);
    }
    return currentTasks;
  });

  // Remove from path mapping
  if (removedTask?.absoluteDirectoryPath) {
    tasksByPath.update((mapping) => {
      const newMapping = new Map(mapping);
      newMapping.delete(removedTask!.absoluteDirectoryPath!);
      return newMapping;
    });
  }
}

export function clearTasks() {
  tasks.set([]);
  tasksByPath.set(new Map());
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
