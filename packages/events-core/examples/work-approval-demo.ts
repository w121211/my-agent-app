// work-approval-demo.ts
import { Logger } from "tslog";
import { v4 as uuidv4 } from "uuid";
import { createServerEventBus } from "../src/event-bus.js";
import { WorkspaceManager } from "../src/workspace-manager.js";
import { TaskRepository, ChatRepository } from "../src/repositories.js";
import { TaskService } from "../src/task-service.js";
import { SubtaskService } from "../src/subtask-service.js";
import { ChatService } from "../src/chat-service.js";
import {
  ClientEventType,
  ServerEventType,
  ClientCreateTaskCommand,
  ClientStartSubtaskCommand,
  ClientCompleteSubtaskCommand,
  ClientApproveWork,
  ServerNextSubtaskTriggered,
  ServerTaskCreated,
  ServerSubtaskCompleted,
  ServerChatCreated,
} from "../src/types.js";

// Setup logger
const logger = new Logger({ name: "WorkApprovalDemo" });

async function runWorkApprovalDemo() {
  logger.info("Starting Work Approval Flow demonstration");

  // Initialize workspace and repositories
  const workspaceManager = new WorkspaceManager("./workspace");
  const taskRepo = new TaskRepository(workspaceManager);
  const chatRepo = new ChatRepository(workspaceManager);

  // Create event bus
  const eventBus = createServerEventBus();

  // Initialize services
  const taskService = new TaskService(eventBus, taskRepo);
  const subtaskService = new SubtaskService(eventBus, taskRepo);
  const chatService = new ChatService(eventBus, chatRepo);

  // Track IDs for the demo
  let demoTaskId: string | undefined;
  let demoSubtaskId: string | undefined;
  let demoChatId: string | undefined;
  let nextSubtaskTriggered = false;

  // Subscribe to key events to track the flow
  eventBus.subscribe<ServerTaskCreated>(
    ServerEventType.SERVER_TASK_CREATED,
    (event) => {
      logger.info(`Task created: ${event.taskId} - ${event.taskName}`);
      demoTaskId = event.taskId;
    }
  );

  eventBus.subscribe<ServerSubtaskCompleted>(
    ServerEventType.SERVER_SUBTASK_COMPLETED,
    (event) => {
      logger.info(`Subtask completed: ${event.subtaskId}`);
    }
  );

  eventBus.subscribe<ServerChatCreated>(
    ServerEventType.SERVER_CHAT_CREATED,
    (event) => {
      logger.info(`Chat created: ${event.chatId}`);
      demoChatId = event.chatId;
    }
  );

  eventBus.subscribe<ServerNextSubtaskTriggered>(
    ServerEventType.SERVER_NEXT_SUBTASK_TRIGGERED,
    (event) => {
      logger.info(`Next subtask triggered after ${event.currentSubtaskId}`);
      nextSubtaskTriggered = true;
    }
  );

  // Add custom handler for work approval
  // (In a real implementation, this would be part of one of the services)
  eventBus.subscribe<ClientApproveWork>(
    ClientEventType.CLIENT_APPROVE_WORK,
    async (event) => {
      logger.info(`Work approved in chat: ${event.chatId}`);

      // Find the associated task and subtask for this chat
      const chat = await chatRepo.findById(event.chatId);
      if (!chat) {
        throw new Error(`Chat not found: ${event.chatId}`);
      }

      // Trigger next subtask
      await eventBus.emit<ServerNextSubtaskTriggered>({
        eventType: ServerEventType.SERVER_NEXT_SUBTASK_TRIGGERED,
        taskId: chat.taskId,
        currentSubtaskId: chat.subtaskId,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    }
  );

  // Step 1: Create a task
  const correlationId = uuidv4();
  logger.info("Creating a new task");
  await eventBus.emit<ClientCreateTaskCommand>({
    eventType: ClientEventType.CLIENT_CREATE_TASK_COMMAND,
    taskName: "Work Approval Demo Task",
    taskConfig: {
      description: "Task to demonstrate work approval flow",
    },
    timestamp: new Date(),
    correlationId,
  });

  // Wait for task creation to be processed
  await waitForCondition(() => !!demoTaskId);
  logger.info(`Using task ID: ${demoTaskId}`);

  // Get the first subtask ID (created during task creation)
  const task = await taskRepo.findById(demoTaskId!);
  if (!task || task.subtasks.length === 0 || !task.subtasks[0]) {
    throw new Error("Task not found or has no subtasks");
  }

  demoSubtaskId = task.subtasks[0].id;
  logger.info(`Using subtask ID: ${demoSubtaskId}`);

  // Step 2: Start the first subtask
  logger.info("Starting the first subtask");
  await eventBus.emit<ClientStartSubtaskCommand>({
    eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND,
    taskId: demoTaskId!,
    subtaskId: demoSubtaskId,
    timestamp: new Date(),
    correlationId,
  });

  // Wait for chat to be created
  await waitForCondition(() => !!demoChatId);
  logger.info(`Associated chat created: ${demoChatId}`);

  // Step 3: Complete the subtask with requiresApproval=true
  logger.info("Completing subtask with requiresApproval=true");
  await eventBus.emit<ClientCompleteSubtaskCommand>({
    eventType: ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND,
    taskId: demoTaskId!,
    subtaskId: demoSubtaskId,
    output: "Completed work that requires approval",
    requiresApproval: true,
    timestamp: new Date(),
    correlationId,
  });

  logger.info("Subtask completed and waiting for approval");

  // Wait a moment to simulate user reviewing the work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 4: Approve the work
  logger.info("Approving the completed work");
  await eventBus.emit<ClientApproveWork>({
    eventType: ClientEventType.CLIENT_APPROVE_WORK,
    chatId: demoChatId!,
    approvedWork: "Approved work content",
    timestamp: new Date(),
    correlationId,
  });

  // Wait for next subtask to be triggered
  await waitForCondition(() => nextSubtaskTriggered, 3000);
  logger.info("Work approval flow completed successfully");

  // Clean up
  setTimeout(() => {
    logger.info("Demonstration completed");
    process.exit(0);
  }, 1000);
}

// Helper function to wait for a condition to be true
async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// Run the demonstration
runWorkApprovalDemo().catch((error) => {
  logger.error("Demonstration failed:", error);
  process.exit(1);
});
