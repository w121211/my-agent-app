// File path: packages/events-core/src/server/root-router.ts

import { ILogObj, Logger } from "tslog";
// import { router } from "./trpc.js";
import { router } from "./trpc-server.js";
import { createServerEventBus } from "../event-bus.js";
import { TaskRepository } from "../repositories.js";
import { TaskService } from "../services/task-service.js";
import { ChatService } from "../services/chat-service.js";
import { WorkspaceService } from "../services/workspace-service.js";
import { FileService } from "../services/file-service.js";
import { UserSettingsRepository } from "../services/user-settings-repository.js";
import { ChatFileService } from "../services/chat-file-service.js";
import { FileWatcherService } from "../services/file-watcher-service.js";
import { createTaskRouter } from "./routers/task-router.js";
import { createChatRouter } from "./routers/chat-router.js";
import { createWorkspaceRouter } from "./routers/workspace-router.js";
import { createFileRouter } from "./routers/file-router.js";
import { createNotificationRouter } from "./routers/notification-router.js";

export function createAppRouter() {
  // Setup logger
  const logger: Logger<ILogObj> = new Logger({ name: "AppServer" });

  // Create event bus for server-side events
  const eventBus = createServerEventBus({ logger });

  // Set workspace path from environment or use default
  const workspacePath = process.env.WORKSPACE_PATH || "./workspace";

  // Create repositories
  const userSettingsRepo = new UserSettingsRepository(
    `${workspacePath}/settings.json`
  );
  const taskRepo = new TaskRepository(workspacePath);

  // Create services
  const workspaceService = new WorkspaceService(eventBus, userSettingsRepo);
  const taskService = new TaskService(eventBus, taskRepo);
  const chatFileService = new ChatFileService(workspacePath, eventBus);
  const chatService = new ChatService(
    eventBus,
    chatFileService,
    workspacePath,
    taskService
  );
  const fileService = new FileService(eventBus, workspacePath);

  // Initialize file watcher
  const fileWatcher = new FileWatcherService(eventBus);

  // Start watching all workspaces
  workspaceService
    .startWatchingAllWorkspaces()
    .catch((err) => logger.error("Failed to start watching workspaces:", err));

  // Create the application router
  return router({
    task: createTaskRouter(taskService),
    chat: createChatRouter(chatService),
    workspace: createWorkspaceRouter(workspaceService),
    file: createFileRouter(fileService),
    notification: createNotificationRouter(eventBus),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
