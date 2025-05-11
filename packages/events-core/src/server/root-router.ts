// packages/events-core/src/server/root-router.ts
import { ILogObj, Logger } from "tslog";
import { router } from "./trpc-server.js";
import { createServerEventBus } from "../event-bus.js";
import { TaskRepository } from "../repositories.js";
import { TaskService } from "../services/task-service.js";
import { ChatService } from "../services/chat-service.js";
import { FileService } from "../services/file-service.js";
import { createUserSettingsRepository } from "../services/user-settings-repository.js";
import { ChatFileService } from "../services/chat-file-service.js";
import { FileWatcherService } from "../services/file-watcher-service.js";
import { createUserSettingsService } from "../services/user-settings-service.js";
import { createProjectFolderService } from "../services/project-folder-service.js";
import { createTaskRouter } from "./routers/task-router.js";
import { createChatRouter } from "./routers/chat-router.js";
import { createProjectFolderRouter } from "./routers/project-folder-router.js";
import { createFileRouter } from "./routers/file-router.js";
import { createNotificationRouter } from "./routers/notification-router.js";
import { createUserSettingsRouter } from "./routers/user-settings-router.js";

export function createAppRouter() {
  // Setup logger
  const logger: Logger<ILogObj> = new Logger({ name: "AppServer" });

  // Create event bus for server-side events
  const eventBus = createServerEventBus({ logger });

  // Set app name
  const appName = process.env.APP_NAME || "app";

  // Create repositories
  const userSettingsRepo = createUserSettingsRepository(appName);

  // Default task repository - will be updated based on project folder context when needed
  const taskRepo = new TaskRepository("");

  // Create services
  const projectFolderService = createProjectFolderService(
    eventBus,
    userSettingsRepo
  );
  const taskService = new TaskService(eventBus, taskRepo);
  const chatFileService = new ChatFileService("", eventBus); // Default blank path
  const chatService = new ChatService(
    eventBus,
    chatFileService,
    "", // Default blank path
    taskService
  );
  const fileService = new FileService(eventBus, ""); // Default blank path

  // Create user settings service
  const userSettingsService = createUserSettingsService(
    eventBus,
    userSettingsRepo,
    projectFolderService
  );

  // Initialize file watcher
  const fileWatcher = new FileWatcherService(eventBus);

  // Start watching all project folders
  projectFolderService
    .startWatchingAllProjectFolders()
    .catch((err) =>
      logger.error("Failed to start watching project folders:", err)
    );

  // Create the application router
  return router({
    task: createTaskRouter(taskService),
    chat: createChatRouter(chatService),
    projectFolder: createProjectFolderRouter(projectFolderService),
    file: createFileRouter(fileService),
    notification: createNotificationRouter(eventBus),
    userSettings: createUserSettingsRouter(userSettingsService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
