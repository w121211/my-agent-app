/**
 * examples/task-creation-flow.ts
 * 
 * This example demonstrates the task creation and initialization flow:
 * 1. Create a task with CLIENT_CREATE_TASK_COMMAND
 * 2. Observe the events triggered in the process
 * 3. Show the complete flow from task creation to first subtask start
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
import { ClientEventType, ClientCreateTaskCommand } from "../src/types.js";

// Set up logger
const logger = new Logger({ name: "TaskCreationExample" });

async function runTaskCreationExample(): Promise<void> {
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
  
  // Subscribe to all events for demonstration purposes
  eventBus.subscribeToAllClientEvents((event) => {
    logger.info(`CLIENT EVENT: ${event.eventType}`, { 
      timestamp: event.timestamp,
      ...event 
    });
  });
  
  eventBus.subscribeToAllServerEvents((event) => {
    logger.info(`SERVER EVENT: ${event.eventType}`, { 
      timestamp: event.timestamp,
      ...event 
    });
  });
  
  // Create a correlation ID to track this flow
  const correlationId = uuidv4();
  
  // 1. Create a task creation command
  const createTaskCommand: ClientCreateTaskCommand = {
    eventType: ClientEventType.CLIENT_CREATE_TASK_COMMAND,
    taskName: "Example Task",
    taskConfig: {
      description: "This is an example task created for demonstration purposes",
      priority: "high"
    },
    timestamp: new Date(),
    correlationId
  };
  
  logger.info("Starting task creation example...");
  
  // 2. Emit the task creation command
  await eventBus.emit(createTaskCommand);
  
  // 3. Wait for a moment to allow all events to propagate
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  logger.info("Task creation flow completed. The system should have performed these steps:");
  logger.info("1. Created a new task with default subtasks (Planning and Setup)");
  logger.info("2. Created a folder structure for the task");
  logger.info("3. Auto-started the task");
  logger.info("4. Started the first subtask");
  logger.info("5. Created a chat for the first subtask");
  
  // Cleanup (in a real app, you might want to preserve the workspace)
  eventBus.clear();
}

// Run the example
runTaskCreationExample()
  .then(() => {
    logger.info("Example completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Error during example execution:", error);
    process.exit(1);
  });
