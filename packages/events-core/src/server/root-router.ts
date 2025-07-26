// packages/events-core/src/server/root-router.ts
import { ILogObj, Logger } from "tslog";
import { router } from "./trpc-server.js";
import { createServerEventBus } from "../event-bus.js";
import { TaskRepository } from "../services/task-repository.js";
import { TaskService } from "../services/task-service.js";
import { FileService } from "../services/file-service.js";
import { createUserSettingsRepository } from "../services/user-settings-repository.js";
import { FileWatcherService } from "../services/file-watcher-service.js";
import { createUserSettingsService } from "../services/user-settings-service.js";
import { createProjectFolderService } from "../services/project-folder-service.js";
import { createEventRouter } from "./routers/event-router.js";
import { createTaskRouter } from "./routers/task-router.js";
import { createProjectFolderRouter } from "./routers/project-folder-router.js";
import { createFileRouter } from "./routers/file-router.js";
import { createUserSettingsRouter } from "./routers/user-settings-router.js";
import { createToolCallRouter } from "./routers/tool-call-router.js";
import { createChatEngineRouter } from "./routers/chat-engine-router.js";
import { ToolRegistry } from "../services/tool-call/tool-registry.js";
import { ToolCallScheduler } from "../services/tool-call/tool-call-scheduler.js";
import { ApprovalMode } from "../services/tool-call/types.js";

export async function createAppRouter(userDataDir: string) {
  // Setup logger
  const logger: Logger<ILogObj> = new Logger({ name: "AppServer" });

  // Create event bus for server-side events
  const eventBus = createServerEventBus({ logger });

  // Create repositories
  const userSettingsRepo = createUserSettingsRepository(userDataDir);

  // Create services
  const fileWatcherService = new FileWatcherService(eventBus);

  const projectFolderService = createProjectFolderService(
    eventBus,
    userSettingsRepo,
    fileWatcherService,
  );

  // Create task repository
  const taskRepo = new TaskRepository();

  // Initialize task repository with any existing tasks
  // projectFolderService.getAllProjectFolders();
  // .then(async (folders) => {
  //   for (const folder of folders) {
  //     await taskRepo.scanFolder(folder.path);
  //   }
  //   logger.info(`Task repository initialized with folders`);
  // })
  // .catch((err) =>
  //   logger.error(
  //     "Failed to initialize task repository with project folders:",
  //     err
  //   )
  // );

  const taskService = new TaskService(eventBus, taskRepo);

  const fileService = new FileService(eventBus);
  const userSettingsService = createUserSettingsService(userSettingsRepo);

  // Initialize tool registry and scheduler
  const toolRegistry = new ToolRegistry(eventBus, logger);
  const toolCallScheduler = new ToolCallScheduler({
    toolRegistry: Promise.resolve(toolRegistry),
    eventBus,
    logger,
    approvalMode: ApprovalMode.DEFAULT,
  });

  // Start watching all project folders
  projectFolderService
    .startWatchingAllProjectFolders()
    .catch((err) =>
      logger.error("Failed to start watching project folders:", err),
    );

  // Create the application router
  return router({
    task: createTaskRouter(taskService),
    chatEngine: createChatEngineRouter(
      eventBus,
      taskService,
      projectFolderService,
      userSettingsService,
    ),
    projectFolder: createProjectFolderRouter(projectFolderService),
    file: createFileRouter(fileService),
    event: createEventRouter(eventBus),
    userSettings: createUserSettingsRouter(userSettingsService),
    toolCall: createToolCallRouter(toolCallScheduler, toolRegistry),
  });
}

export type AppRouter = Awaited<ReturnType<typeof createAppRouter>>;
