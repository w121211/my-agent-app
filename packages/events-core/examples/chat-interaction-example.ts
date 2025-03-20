/**
 * examples/chat-interaction-flow.ts
 *
 * This example demonstrates the chat interaction flow:
 * 1. Create a new chat for a task/subtask
 * 2. Submit an initial prompt
 * 3. Simulate message exchange between user and assistant
 * 4. Show how messages are processed and saved
 */

import path from "node:path";
import { Logger } from "tslog";
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
  ServerEventType,
  ClientStartNewChatCommand,
  ClientSubmitInitialPromptCommand,
  ClientSubmitMessageCommand,
  ServerMessageReceived,
  ServerAgentProcessedMessage,
  ServerAgentResponseGenerated,
  Role,
  Message,
  Task,
  TaskStatus,
  Subtask,
  SubtaskStatus,
  Chat,
  ChatStatus,
  ChatMetadata,
} from "../src/event-types.js";

// Set up logger
const logger = new Logger({ name: "ChatInteractionExample" });

// Helper function to create a test task and subtask
async function setupTestTaskAndSubtask(
  taskRepo: TaskRepository
): Promise<[Task, Subtask]> {
  const taskId = uuidv4();
  const subtaskId = uuidv4();
  const currentTime = new Date();

  const task: Task = {
    id: taskId,
    seqNumber: 1,
    title: "Chat Example Task",
    status: TaskStatus.IN_PROGRESS,
    currentSubtaskId: subtaskId,
    subtasks: [
      {
        id: subtaskId,
        taskId,
        seqNumber: 0,
        title: "Interactive Subtask",
        description: "A subtask for demonstrating chat interactions",
        status: SubtaskStatus.IN_PROGRESS,
        team: {
          agent: Role.ASSISTANT,
          human: Role.USER,
        },
        inputType: "string",
        outputType: "string",
      },
    ],
    config: {
      description: "Example task for chat interaction flow",
    },
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  // Create folder structure and save the task
  const folderPath = await taskRepo.createTaskFolder(task);
  task.folderPath = folderPath;
  await taskRepo.save(task);

  return [task, task.subtasks[0]];
}

// Add custom event handlers for demonstration
function setupCustomEventHandlers(
  eventBus: ReturnType<typeof createServerEventBus>,
  chatId: string
) {
  // Process messages received from the user
  eventBus.subscribe<ServerMessageReceived>(
    ServerEventType.SERVER_MESSAGE_RECEIVED,
    async (event) => {
      if (event.chatId !== chatId || event.message.role !== Role.USER) {
        return;
      }

      logger.info("Processing user message:", event.message.content);

      // Emit event that agent has processed the message
      await eventBus.emit<ServerAgentProcessedMessage>({
        eventType: ServerEventType.SERVER_AGENT_PROCESSED_MESSAGE,
        chatId: event.chatId,
        messageId: event.message.id,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });

      // Generate a simple response
      const responseId = uuidv4();
      const response: Message = {
        id: responseId,
        role: Role.ASSISTANT,
        content: `I received your message: "${event.message.content}". This is a simulated assistant response.`,
        timestamp: new Date(),
        metadata: {
          taskId: event.message.metadata?.taskId,
          subtaskId: event.message.metadata?.subtaskId,
        },
      };

      // Emit agent response generated event
      await eventBus.emit<ServerAgentResponseGenerated>({
        eventType: ServerEventType.SERVER_AGENT_RESPONSE_GENERATED,
        chatId: event.chatId,
        response,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });

      // Also emit message received for the response to ensure it's saved
      await eventBus.emit<ServerMessageReceived>({
        eventType: ServerEventType.SERVER_MESSAGE_RECEIVED,
        chatId: event.chatId,
        message: response,
        timestamp: new Date(),
        correlationId: event.correlationId,
      });
    }
  );
}

async function runChatInteractionExample(): Promise<void> {
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

  // Setup event logging for demonstration
  eventBus.subscribeToAllClientEvents((event) => {
    logger.info(`CLIENT EVENT: ${event.eventType}`, {
      timestamp: event.timestamp,
      correlationId: event.correlationId,
    });
  });

  eventBus.subscribeToAllServerEvents((event) => {
    logger.info(`SERVER EVENT: ${event.eventType}`, {
      timestamp: event.timestamp,
      correlationId: event.correlationId,
    });
  });

  // Create a correlation ID to track this flow
  const correlationId = uuidv4();

  // Set up a test task and subtask
  logger.info("Setting up a test task and subtask...");
  const [task, subtask] = await setupTestTaskAndSubtask(taskRepo);

  // Define chat metadata
  const chatMetadata: ChatMetadata = {
    title: "Example Chat",
    summary: "A chat for demonstration purposes",
    tags: ["example", "chat", "interaction"],
  };

  // 1. Start a new chat
  const chatId = uuidv4();
  const startChatCommand: ClientStartNewChatCommand = {
    eventType: ClientEventType.CLIENT_START_NEW_CHAT_COMMAND,
    taskId: task.id,
    subtaskId: subtask.id,
    metadata: chatMetadata,
    timestamp: new Date(),
    correlationId,
  };

  // Setup custom handlers for this specific chat
  setupCustomEventHandlers(eventBus, chatId);

  logger.info("Starting a new chat...");
  await eventBus.emit(startChatCommand);

  // Wait for chat creation events to propagate
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 2. Submit initial prompt
  const initialPromptCommand: ClientSubmitInitialPromptCommand = {
    eventType: ClientEventType.CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND,
    chatId,
    prompt: "Hello, I'd like to discuss the requirements for this subtask.",
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Submitting initial prompt...");
  await eventBus.emit(initialPromptCommand);

  // Wait for prompt processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 3. Submit a follow-up message
  const followUpMessageCommand: ClientSubmitMessageCommand = {
    eventType: ClientEventType.CLIENT_SUBMIT_MESSAGE_COMMAND,
    chatId,
    content: "What are the next steps we should take?",
    timestamp: new Date(),
    correlationId,
  };

  logger.info("Submitting follow-up message...");
  await eventBus.emit(followUpMessageCommand);

  // Wait for all events to propagate
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Try to retrieve the chat to verify state
  const chat = await chatRepo.findById(chatId);
  if (chat) {
    logger.info(
      `Chat retrieved successfully. It contains ${chat.messages.length} messages.`
    );
    // Log message content for demonstration
    chat.messages.forEach((message, index) => {
      logger.info(`Message ${index + 1}: [${message.role}] ${message.content}`);
    });
  } else {
    logger.warn(
      "Chat could not be retrieved. It might not have been properly saved."
    );
  }

  // Print summary of the flow
  logger.info("Chat interaction flow completed. The expected event flow is:");
  logger.info("1. CLIENT_START_NEW_CHAT_COMMAND - Create a new chat");
  logger.info("2. SERVER_CHAT_CREATED - Chat is created");
  logger.info("3. SERVER_CHAT_FILE_CREATED - Chat file is created");
  logger.info(
    "4. CLIENT_SUBMIT_INITIAL_PROMPT_COMMAND - Submit initial prompt"
  );
  logger.info("5. SERVER_MESSAGE_RECEIVED - Initial prompt is received");
  logger.info("6. SERVER_MESSAGE_SAVED_TO_CHAT_FILE - Message saved to file");
  logger.info(
    "7. SERVER_AGENT_PROCESSED_MESSAGE - Agent processes the message"
  );
  logger.info(
    "8. SERVER_AGENT_RESPONSE_GENERATED - Agent generates a response"
  );
  logger.info("9. SERVER_MESSAGE_RECEIVED - Agent response is received");
  logger.info("10. SERVER_MESSAGE_SAVED_TO_CHAT_FILE - Agent response saved");
  logger.info("11. CLIENT_SUBMIT_MESSAGE_COMMAND - Submit follow-up message");
  logger.info("... (Events 5-10 repeat for the follow-up message)");

  // Cleanup
  eventBus.clear();
}

// Run the example
runChatInteractionExample()
  .then(() => {
    logger.info("Example completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Error during example execution:", error);
    process.exit(1);
  });
