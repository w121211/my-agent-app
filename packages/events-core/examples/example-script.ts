import path from "node:path";
import { Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";

// Import core components
import { createServerEventBus } from "../src/event-bus.js";
import { TaskService } from "../src/task-service.js";
import { SubtaskService } from "../src/subtask-service.js";
import { ChatService } from "../src/chat-service.js";
import { TaskRepository, ChatRepository } from "../src/repositories.js";
import { WorkspaceManager } from "../src/workspace-manager.js";
import {
  ClientEventType,
  ClientCreateTaskCommand,
  TaskStatus,
  ServerTaskCreated,
  ServerTaskFolderCreated,
  ServerEventType,
  Role,
} from "../src/event-types.js";

// Create root logger
const logger = new Logger({ name: "EventSystemExample" });

/**
 * Main function to set up and demonstrate the event system
 */
async function runEventSystemExample(): Promise<void> {
  logger.info("Starting event system example");

  // Set up workspace path (typically would be from config)
  const workspacePath = path.join(process.cwd(), "workspace");

  // Initialize components
  const workspaceManager = new WorkspaceManager(workspacePath);
  const eventBus = createServerEventBus();

  // Create repositories
  const taskRepo = new TaskRepository(workspaceManager);
  const chatRepo = new ChatRepository(workspaceManager);

  // Initialize services with event bus and repositories
  const taskService = new TaskService(eventBus, taskRepo);
  const subtaskService = new SubtaskService(eventBus, taskRepo);
  const chatService = new ChatService(eventBus, chatRepo);

  // Set up event listeners for demonstration purposes
  setupEventListeners(eventBus);

  // Create a task - this will trigger the whole workflow
  await createTask(eventBus);

  // In a real application, you would keep the process running
  // But for this example, we'll just wait a bit for events to process
  await new Promise((resolve) => setTimeout(resolve, 3000));

  logger.info("Event system example completed");
}

/**
 * Set up event listeners to log events for demonstration
 */
function setupEventListeners(
  eventBus: ReturnType<typeof createServerEventBus>
): void {
  // Listen for task created event
  eventBus.subscribe<ServerTaskCreated>(
    ServerEventType.SERVER_TASK_CREATED,
    (event) => {
      logger.info(`[EVENT] Task created: ${event.taskId} - ${event.taskName}`);
    }
  );

  // Listen for task folder created event
  eventBus.subscribe<ServerTaskFolderCreated>(
    ServerEventType.SERVER_TASK_FOLDER_CREATED,
    (event) => {
      logger.info(`[EVENT] Task folder created at ${event.folderPath}`);
    }
  );

  // Subscribe to all server events for logging purposes
  eventBus.subscribeToAllServerEvents((event) => {
    logger.debug(`Received server event: ${event.eventType}`);
  });
}

/**
 * Create a task by emitting a command
 */
async function createTask(
  eventBus: ReturnType<typeof createServerEventBus>
): Promise<void> {
  const taskName = "Example Task";
  const correlationId = uuidv4();

  logger.info(`Creating task: ${taskName}`);

  // Create task config with custom workflow definition
  const taskConfig = {
    description: "An example task to demonstrate the event system",
    workflow: {
      steps: [
        {
          name: "Planning",
          teamConfig: {
            agent: Role.ASSISTANT,
          },
        },
        {
          name: "Development",
          teamConfig: {
            agent: Role.ASSISTANT,
            human: Role.USER,
          },
        },
        {
          name: "Testing",
          teamConfig: {
            agent: Role.FUNCTION_EXECUTOR,
          },
        },
      ],
    },
  };

  // Emit the create task command
  const createTaskCommand: ClientCreateTaskCommand = {
    eventType: ClientEventType.CLIENT_CREATE_TASK_COMMAND,
    taskName,
    taskConfig,
    timestamp: new Date(),
    correlationId,
  };

  // Emit the command to create a task
  // This will trigger the task creation flow in TaskService
  await eventBus.emit(createTaskCommand);

  logger.info(
    `Emitted ${ClientEventType.CLIENT_CREATE_TASK_COMMAND} with correlation ID: ${correlationId}`
  );
}

// Run the example
runEventSystemExample().catch((error) => {
  logger.error("Error running event system example:", error);
  process.exit(1);
});
