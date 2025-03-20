/**
 * examples/subtask-execution-flow.ts
 *
 * This example demonstrates the subtask execution flow:
 * 1. Start a specific subtask
 * 2. Create a chat for the subtask
 * 3. Complete the subtask
 * 4. Trigger the next subtask automatically
 */

import { Logger } from "tslog";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Import necessary components from the event system
import { createServerEventBus } from "../src/event-bus.js";
import { TaskService } from "../src/task-service.js";
import { SubtaskService } from "../src/subtask-service.js";
import { ChatService } from "../src/chat-service.js";
import { TaskRepository, ChatRepository } from "../src/repositories.js";
import { WorkspaceManager } from "../src/workspace-manager.js";
import {
  ClientEventType,
  ClientStartSubtaskCommand,
  ClientCompleteSubtaskCommand,
  ServerEventType,
  Task,
  TaskStatus,
  Subtask,
  SubtaskStatus,
  Role,
} from "../src/event-types.js";

// Set up logger
const logger = new Logger({ name: "SubtaskExecutionExample" });

async function setupTestTask(taskRepo: TaskRepository): Promise<Task> {
  // Create a sample task with two subtasks for testing
  const taskId = uuidv4();
  const firstSubtaskId = uuidv4();
  const secondSubtaskId = uuidv4();
  const currentTime = new Date();

  const task: Task = {
    id: taskId,
    seqNumber: 1,
    title: "Example Task",
    status: TaskStatus.CREATED,
    subtasks: [
      {
        id: firstSubtaskId,
        taskId,
        seqNumber: 0,
        title: "First Subtask",
        description: "This is the first subtask",
        status: SubtaskStatus.PENDING,
        team: {
          agent: Role.ASSISTANT,
          human: Role.USER,
        },
        inputType: "string",
        outputType: "json",
      },
      {
        id: secondSubtaskId,
        taskId,
        seqNumber: 1,
        title: "Second Subtask",
        description: "This is the second subtask",
        status: SubtaskStatus.PENDING,
        team: {
          agent: Role.ASSISTANT,
          human: Role.USER,
        },
        inputType: "json",
        outputType: "string",
      },
    ],
    config: {
      description: "Example task for subtask execution flow",
    },
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  // Create folder structure and save the task
  const folderPath = await taskRepo.createTaskFolder(task);
  task.folderPath = folderPath;
  await taskRepo.save(task);

  return task;
}

async function runSubtaskExecutionExample(): Promise<void> {
  // Create a temporary workspace directory for this example
  const workspaceDir = path.join(process.cwd(), "temp-workspace");

  // Initialize the workspace manager
  const workspaceManager = new WorkspaceManager(workspaceDir, logger);
  await workspaceManager.ensureFolderExists(workspaceDir);

  // Initialize repositories
  const taskRepo = new TaskRepository(workspaceManager);
  const chatRepo = new ChatRepository(workspaceManager);

  // Create event bus
  const eventBus = createServerEventBus({ logger });

  // Initialize services
  const taskService = new TaskService(eventBus, taskRepo);
  const subtaskService = new SubtaskService(eventBus, taskRepo);
  const chatService = new ChatService(eventBus, chatRepo);

  // Setup event tracking for demonstration
  const receivedEvents: string[] = [];

  eventBus.subscribeToAllClientEvents((event) => {
    logger.info(`CLIENT EVENT: ${event.eventType}`, {
      timestamp: event.timestamp,
      ...event,
    });
    receivedEvents.push(event.eventType);
  });

  eventBus.subscribeToAllServerEvents((event) => {
    logger.info(`SERVER EVENT: ${event.eventType}`, {
      timestamp: event.timestamp,
      ...event,
    });
    receivedEvents.push(event.eventType);
  });

  // Create a correlation ID to track this flow
  const correlationId = uuidv4();

  // Setup a test task with two subtasks
  logger.info("Setting up a test task with subtasks...");
  const task = await setupTestTask(taskRepo);
  const firstSubtask = task.subtasks[0];

  logger.info("Starting subtask execution example...");

  // 1. Start the first subtask
  const startSubtaskCommand: ClientStartSubtaskCommand = {
    eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND,
    taskId: task.id,
    subtaskId: firstSubtask.id,
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Starting first subtask...");
  await eventBus.emit(startSubtaskCommand);

  // Wait for a moment to allow events to propagate
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 2. Complete the subtask (without requiring approval)
  const completeSubtaskCommand: ClientCompleteSubtaskCommand = {
    eventType: ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND,
    taskId: task.id,
    subtaskId: firstSubtask.id,
    output: JSON.stringify({ result: "First subtask completed successfully" }),
    requiresApproval: false, // No approval needed, will auto-trigger next subtask
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Completing first subtask...");
  await eventBus.emit(completeSubtaskCommand);

  // Wait for all events to propagate
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Print summary of the flow
  logger.info("Subtask execution flow completed. The expected event flow is:");
  logger.info("1. CLIENT_START_SUBTASK_COMMAND - Start the first subtask");
  logger.info(
    "2. CLIENT_START_NEW_CHAT_COMMAND - Create a chat for the subtask"
  );
  logger.info("3. SERVER_CHAT_CREATED - Chat is created");
  logger.info(
    "4. SERVER_SUBTASK_UPDATED - Subtask status changed to IN_PROGRESS"
  );
  logger.info("5. SERVER_SUBTASK_STARTED - Subtask started execution");
  logger.info("6. CLIENT_COMPLETE_SUBTASK_COMMAND - Mark subtask as completed");
  logger.info(
    "7. SERVER_SUBTASK_UPDATED - Subtask status changed to COMPLETED"
  );
  logger.info("8. SERVER_SUBTASK_COMPLETED - Subtask completion confirmed");
  logger.info("9. SERVER_NEXT_SUBTASK_TRIGGERED - Next subtask is triggered");
  logger.info("10. CLIENT_START_SUBTASK_COMMAND - Second subtask is started");

  // Check if all expected events were received
  logger.info("Actual events received:", receivedEvents);

  // Cleanup
  eventBus.clear();
}

// Run the example
runSubtaskExecutionExample()
  .then(() => {
    logger.info("Example completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Error during example execution:", error);
    process.exit(1);
  });
