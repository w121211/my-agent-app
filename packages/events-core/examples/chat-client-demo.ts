// packages/events-core/examples/new-chat-client-demo.ts
// Run with: `AI_GATEWAY_API_KEY="your_api_key" pnpm dlx tsx examples/new-chat-client-demo.ts`

import { tool } from "ai";
import { Logger } from "tslog";
import { z } from "zod";
import type { ToolSet, UserModelMessage } from "ai";
import type { ILogObj } from "tslog";
import { EventBus } from "../src/event-bus.js";
import { ChatClient } from "../src/services/chat-engine/chat-client.js";
import { ChatSessionRepositoryImpl } from "../src/services/chat-engine/chat-session-repository.js";
import { ToolRegistry } from "../src/services/tool-call/tool-registry.js";
import { TaskService } from "../src/services/task-service.js";
import { ProjectFolderService } from "../src/services/project-folder-service.js";
import { UserSettingsService } from "../src/services/user-settings-service.js";
import { FileService } from "../src/services/file-service.js";
import { UserSettingsRepository } from "../src/services/user-settings-repository.js";
import { FileWatcherService } from "../src/services/file-watcher-service.js";
import { TaskRepository } from "../src/services/task-repository.js";
import type {
  TurnResult,
  ChatSession,
} from "../src/services/chat-engine/chat-session.js";

interface DemoServices {
  projectFolderService: ProjectFolderService;
  userSettingsService: UserSettingsService;
  taskService: TaskService;
  fileService: FileService;
  chatSessionRepository: ChatSessionRepositoryImpl;
  toolRegistry: ToolRegistry;
}

// Helper function to safely log TurnResult without ReadableStream
function logTurnResult<TOOLS extends ToolSet>(
  message: string,
  result: TurnResult<TOOLS>,
) {
  const safeResult = {
    sessionStatus: result.sessionStatus,
    currentTurn: result.currentTurn,
    toolCallsAwaitingConfirmation:
      result.toolCallsAwaitingConfirmation?.length || 0,
    hasStreamResult: !!result.streamResult,
  };
  logger.info(message, safeResult);
}

const logger = new Logger<ILogObj>();
const eventBus = new EventBus({
  environment: "server",
  logger,
});

async function setupServices(): Promise<DemoServices> {
  // Create settings directory
  const fs = await import("fs/promises");
  const settingsDir = "/tmp/dev-agent-temp";
  await fs.mkdir(settingsDir, { recursive: true });

  // Initialize repositories
  const userSettingsRepository = new UserSettingsRepository(
    `${settingsDir}/settings.json`,
  );
  const taskRepository = new TaskRepository();
  const fileWatcherService = new FileWatcherService(eventBus);

  // Initialize services
  const projectFolderService = new ProjectFolderService(
    eventBus,
    userSettingsRepository,
    fileWatcherService,
  );

  const userSettingsService = new UserSettingsService(userSettingsRepository);

  const taskService = new TaskService(eventBus, taskRepository);

  const fileService = new FileService(eventBus);

  const chatSessionRepository = new ChatSessionRepositoryImpl();
  const toolRegistry = new ToolRegistry(eventBus, logger);

  return {
    projectFolderService,
    userSettingsService,
    taskService,
    fileService,
    chatSessionRepository,
    toolRegistry,
  };
}

async function setupTools(toolRegistry: ToolRegistry) {
  // Register a calculator tool with confirmation
  const calculatorTool = tool({
    description: "Perform basic arithmetic calculations",
    inputSchema: z.object({
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("The arithmetic operation to perform"),
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
    execute: async ({ operation, a, b }) => {
      logger.info("Calculator tool executing", { operation, a, b });

      let result: number;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            throw new Error("Division by zero is not allowed");
          }
          result = a / b;
          break;
      }

      return {
        operation,
        operands: [a, b],
        result,
        calculation: `${a} ${operation} ${b} = ${result}`,
      };
    },
  });

  // Confirmation logic that requires confirmation for certain operations
  const confirmationLogic = async (input: {
    operation: string;
    a: number;
    b: number;
  }): Promise<boolean> => {
    const { operation, a, b } = input;

    // Require confirmation for division or large numbers
    if (operation === "divide" || Math.abs(a) > 100 || Math.abs(b) > 100) {
      logger.info("Confirmation required for operation", { operation, a, b });
      return true;
    }

    return false;
  };

  toolRegistry.registerTool("calculator", calculatorTool, {
    source: "built-in",
    confirmationLogic,
  });

  return toolRegistry.getToolSet(["calculator"]);
}

async function runChatDemo(): Promise<{
  chatClient: ChatClient<ToolSet>;
  chatSession: ChatSession<ToolSet>;
  services: DemoServices;
}> {
  logger.info("Starting new chat client demo");

  // Setup services
  const services = await setupServices();
  await setupTools(services.toolRegistry);

  // Create chat client
  const chatClient = new ChatClient(
    eventBus,
    services.chatSessionRepository,
    services.taskService,
    services.projectFolderService,
    services.userSettingsService,
    services.fileService,
    services.toolRegistry,
  );

  // Register a project folder first
  const tempDir = "/tmp/chat-demo";
  const fs = await import("fs/promises");
  await fs.mkdir(tempDir, { recursive: true });
  await services.projectFolderService.addProjectFolder(tempDir);

  logger.info("Creating new chat session...");

  // 1. Create a new chat with openai/gpt-4o model
  const chatSession = await chatClient.createChat(tempDir, {
    modelId: "openai/gpt-4o",
    mode: "chat",
    prompt: "You are a helpful assistant with access to a calculator tool.",
  });

  logger.info(`Chat session created: ${chatSession.id}`);
  logger.info(`Chat file path: ${chatSession.absoluteFilePath}`);

  // 2. Test sendMessage function
  logger.info("Testing sendMessage function...");

  const userMessage: UserModelMessage = {
    role: "user",
    content:
      "Calculate 150 multiplied by 25, and then divide the result by 5. Show me the step-by-step calculation.",
  };

  logger.info("Sending user message:", userMessage);

  const result1 = await chatClient.sendMessage(
    chatSession.absoluteFilePath,
    chatSession.id,
    userMessage,
  );

  logTurnResult("First sendMessage result:", result1);
  logger.info("Chat session messages:", chatSession.messages);

  // 3. Test confirmToolCall function if there are pending confirmations
  if (
    result1.toolCallsAwaitingConfirmation &&
    result1.toolCallsAwaitingConfirmation.length > 0
  ) {
    logger.info("Testing confirmToolCall function...");

    for (const toolCall of result1.toolCallsAwaitingConfirmation) {
      logger.info(`Confirming tool call: ${toolCall.toolCallId}`, {
        toolName: toolCall.toolName,
        input: toolCall.input,
      });

      const confirmResult = await chatClient.confirmToolCall(
        chatSession.absoluteFilePath,
        chatSession.id,
        toolCall.toolCallId,
        "yes", // Always confirm for demo
      );

      logTurnResult("Tool call confirmation result:", confirmResult);
      logger.info(
        "Chat session messages after confirmation:",
        chatSession.messages,
      );

      // If there are more confirmations needed, continue the loop
      if (
        confirmResult.toolCallsAwaitingConfirmation &&
        confirmResult.toolCallsAwaitingConfirmation.length > 0
      ) {
        logger.info("More tool calls awaiting confirmation...");
      } else {
        logger.info("All tool calls confirmed, conversation continuing...");
        break;
      }
    }
  } else {
    logger.info("No tool calls awaiting confirmation");
  }

  // Test another message to see the complete conversation flow
  logger.info("Sending follow-up message...");

  const userMessage2: UserModelMessage = {
    role: "user",
    content: "Now calculate what 10% of that final result would be.",
  };

  const result2 = await chatClient.sendMessage(
    chatSession.absoluteFilePath,
    chatSession.id,
    userMessage2,
  );

  logTurnResult("Follow-up message result:", result2);
  logger.info("Chat session messages after follow-up:", chatSession.messages);

  // Handle any additional confirmations
  if (
    result2.toolCallsAwaitingConfirmation &&
    result2.toolCallsAwaitingConfirmation.length > 0
  ) {
    for (const toolCall of result2.toolCallsAwaitingConfirmation) {
      const confirmResult = await chatClient.confirmToolCall(
        chatSession.absoluteFilePath,
        chatSession.id,
        toolCall.toolCallId,
        "yes",
      );
      logTurnResult("Follow-up tool call confirmation result:", confirmResult);
      logger.info(
        "Chat session messages after follow-up confirmation:",
        chatSession.messages,
      );
    }
  }

  logger.info("=== Chat demo completed successfully! ===");
  logger.info("Both sendMessage and confirmToolCall functions tested");

  return { chatClient, chatSession, services };
}

async function testRerunFunction(
  chatClient: ChatClient<ToolSet>,
  chatSession: ChatSession<ToolSet>,
  services: DemoServices,
): Promise<{
  chatClient: ChatClient<ToolSet>;
  chatSession: ChatSession<ToolSet>;
  services: DemoServices;
}> {
  logger.info("=== Starting rerun function test ===");
  logger.info("Reusing existing chat session for rerun test");
  logger.info(`Chat session ID: ${chatSession.id}`);
  logger.info(`Chat file path: ${chatSession.absoluteFilePath}`);
  logger.info("Messages before rerun:", chatSession.messages.length);

  // Test the rerun functionality on the existing session
  logger.info("Testing rerunChat function...");

  const rerunResult = await chatClient.rerunChat(
    chatSession.absoluteFilePath,
    chatSession.id,
  );

  logTurnResult("Rerun result:", rerunResult);
  logger.info("Messages after rerun:", chatSession.messages.length);

  logger.info("=== Rerun function test completed successfully! ===");

  return { chatClient, chatSession, services };
}

async function main() {
  logger.info("Starting chat client demo with both functions");

  // Run the main chat demo
  logger.info("=== Running main chat demo ===");
  const demoResult = await runChatDemo();

  // Run the rerun function test using the same session
  logger.info("=== Running rerun function test ===");
  await testRerunFunction(
    demoResult.chatClient,
    demoResult.chatSession,
    demoResult.services,
  );

  logger.info("=== All demos completed successfully! ===");
}

// Run the demo
main().catch((error) => {
  logger.error("Demo failed with error:", error);
  process.exit(1);
});
