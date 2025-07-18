// packages/events-core/src/server/root-router.ts
import { ILogObj, Logger } from "tslog";
import { router } from "./trpc-server.js";
import { createServerEventBus } from "../event-bus.js";
import { TaskRepository } from "../services/task-repository.js";
import { TaskService } from "../services/task-service.js";
import { ChatService } from "../services/chat-service.js";
import { FileService } from "../services/file-service.js";
import { createUserSettingsRepository } from "../services/user-settings-repository.js";
import { ChatRepository } from "../services/chat-repository.js";
import { FileWatcherService } from "../services/file-watcher-service.js";
import { createUserSettingsService } from "../services/user-settings-service.js";
import { createProjectFolderService } from "../services/project-folder-service.js";
import { createEventRouter } from "./routers/event-router.js";
import { createTaskRouter } from "./routers/task-router.js";
import { createChatRouter } from "./routers/chat-router.js";
import { createProjectFolderRouter } from "./routers/project-folder-router.js";
import { createFileRouter } from "./routers/file-router.js";
import { createUserSettingsRouter } from "./routers/user-settings-router.js";

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
    fileWatcherService
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

  // Using ChatRepository
  const chatRepository = new ChatRepository();

  // Initialize chat repository with any existing chats
  const folders = await projectFolderService.getAllProjectFolders();
  for (const folder of folders) {
    logger.info(`Scanning folder: ${folder.path}`);
    await chatRepository.scanFolder(folder.path);
  }
  logger.info(`Chat repository initialized with folders`);

  const chatService = new ChatService(
    eventBus,
    chatRepository,
    taskService,
    projectFolderService
  );
  const fileService = new FileService(eventBus);
  const userSettingsService = createUserSettingsService(userSettingsRepo);

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
    event: createEventRouter(eventBus),
    userSettings: createUserSettingsRouter(userSettingsService),
  });
}

export type AppRouter = Awaited<ReturnType<typeof createAppRouter>>;
