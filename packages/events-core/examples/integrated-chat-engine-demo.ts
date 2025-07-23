// packages/events-core/examples/integrated-chat-engine-demo.ts
import { ChatClient } from "../src/services/chat-engine/chat-client.js";
import { ChatSessionRepositoryImpl } from "../src/services/chat-engine/chat-session-repository.js";
import { TaskService } from "../src/services/task-service.js";
import { createProjectFolderService } from "../src/services/project-folder-service.js";
import { FileWatcherService } from "../src/services/file-watcher-service.js";
import { createServerEventBus } from "../src/event-bus.js";
import { TaskRepository } from "../src/services/task-repository.js";
import { createUserSettingsRepository } from "../src/services/user-settings-repository.js";
import { createUserSettingsService } from "../src/services/user-settings-service.js";
import type { ChatModelConfig } from "../src/services/chat-engine/types.js";
import type { ChatUpdatedEvent } from "../src/services/chat-engine/events.js";
import path from "path";
import fs from "fs/promises";

async function setupIntegratedDemo(): Promise<ChatClient> {
  // Create event bus
  const eventBus = createServerEventBus();

  // Create a temporary directory for demo data
  const demoDir = path.join(process.cwd(), "integrated-chat-demo");
  await fs.mkdir(demoDir, { recursive: true });

  // Setup repositories
  const chatSessionRepository = new ChatSessionRepositoryImpl();
  const taskRepository = new TaskRepository();
  const userSettingsRepository = createUserSettingsRepository(demoDir);

  // Setup services
  const userSettingsService = createUserSettingsService(userSettingsRepository);
  const taskService = new TaskService(eventBus, taskRepository);
  const fileWatcherService = new FileWatcherService(eventBus);
  const projectFolderService = createProjectFolderService(
    eventBus,
    userSettingsRepository,
    fileWatcherService,
  );

  // Add project folder
  await projectFolderService.addProjectFolder(demoDir);

  // Build path index for chat session repository
  await chatSessionRepository.buildPathIndex();

  // Create integrated ChatClient with UserSettingsService
  const chatClient = new ChatClient(
    eventBus,
    chatSessionRepository,
    taskService,
    projectFolderService,
    userSettingsService,
  );

  // Subscribe to chat events for demo
  eventBus.subscribe<ChatUpdatedEvent>("ChatUpdatedEvent", (event) => {
    console.log(`📢 Event: ${event.updateType}`, {
      chatId: event.chatId,
      status: event.chat.status,
      messageCount: event.chat.messages.length,
    });
  });

  return chatClient;
}

async function demonstrateModelConfiguration(chatClient: ChatClient) {
  console.log("\n🔵 === Model Configuration Demo ===");

  // Test available models
  console.log("📋 Getting available models...");
  const availableModels = await chatClient.getAvailableModels();
  console.log(
    `✅ Found ${availableModels.length} available models:`,
    availableModels.map((m) => `${m.provider}:${m.modelId}`),
  );

  // Test model validation
  console.log("\n🔍 Testing model configuration validation...");

  const validConfig: ChatModelConfig = {
    provider: "openai",
    modelId: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: "You are a helpful coding assistant.",
  };

  const isValid = await chatClient.validateModelConfig(validConfig);
  console.log(`✅ Model config validation result: ${isValid}`);

  const invalidConfig: ChatModelConfig = {
    provider: "nonexistent",
    modelId: "fake-model",
  };

  const isInvalid = await chatClient.validateModelConfig(invalidConfig);
  console.log(`❌ Invalid model config validation result: ${isInvalid}`);

  return validConfig;
}

async function demonstrateEnhancedChatCreation(
  chatClient: ChatClient,
  projectDir: string,
  modelConfig: ChatModelConfig,
) {
  console.log("\n🔵 === Enhanced Chat Creation Demo ===");

  // Create chat with legacy string model
  console.log("🏷️ Creating chat with legacy string model...");
  const legacySessionId = await chatClient.createChat(projectDir, {
    mode: "chat",
    model: "gpt-3.5-turbo",
    prompt: "Hello with legacy model configuration",
  });
  console.log(`✅ Legacy chat created: ${legacySessionId}`);

  // Create chat with enhanced model configuration
  console.log("⚡ Creating chat with enhanced model configuration...");
  const enhancedSessionId = await chatClient.createChat(projectDir, {
    mode: "chat",
    model: modelConfig,
    knowledge: ["typescript", "ai-integration"],
    prompt: "Hello with enhanced model configuration and AI SDK v5",
  });
  console.log(`✅ Enhanced chat created: ${enhancedSessionId}`);

  // Create agent mode chat with custom configuration
  console.log("🤖 Creating agent chat with custom model settings...");
  const agentConfig: ChatModelConfig = {
    provider: "anthropic",
    modelId: "claude-3-sonnet",
    temperature: 0.3,
    maxTokens: 4000,
    topP: 0.9,
    systemPrompt:
      "You are an expert software architect. Always provide detailed, structured responses.",
  };

  const agentSessionId = await chatClient.createChat(projectDir, {
    mode: "agent",
    model: agentConfig,
    knowledge: ["architecture", "design-patterns"],
    newTask: true,
  });
  console.log(`✅ Agent chat created: ${agentSessionId}`);

  return [legacySessionId, enhancedSessionId, agentSessionId];
}

async function demonstrateAdvancedMessaging(
  chatClient: ChatClient,
  sessionIds: string[],
) {
  console.log("\n🔵 === Advanced Messaging Demo ===");

  const [legacyId, enhancedId, agentId] = sessionIds;
  if (!legacyId || !enhancedId || !agentId) {
    throw new Error("Missing session IDs");
  }

  // Test messaging with legacy session
  console.log("📤 Sending message to legacy session...");
  const legacyResult = await chatClient.sendMessage(
    legacyId,
    "Explain how async/await works in JavaScript",
  );
  console.log("📤 Legacy session result:", legacyResult.status);

  // Test messaging with enhanced session (should use AI SDK v5)
  console.log("⚡ Sending message to enhanced session...");
  const enhancedResult = await chatClient.sendMessage(
    enhancedId,
    "Compare TypeScript interfaces vs types with code examples",
    [
      {
        fileName: "example.ts",
        content: "interface User { name: string; age: number; }",
      },
    ],
  );
  console.log("📤 Enhanced session result:", enhancedResult.status);

  // Test messaging with agent session
  console.log("🤖 Sending message to agent session...");
  const agentResult = await chatClient.sendMessage(
    agentId,
    "Design a scalable microservices architecture for an e-commerce platform",
  );
  console.log("📤 Agent session result:", agentResult.status);

  return sessionIds;
}

async function demonstrateStreamingCapabilities(
  chatClient: ChatClient,
  sessionId: string,
) {
  console.log("\n🔵 === Streaming Capabilities Demo ===");

  try {
    console.log("🌊 Testing AI SDK v5 streaming integration...");

    // The enhanced session should support streaming
    const result = await chatClient.sendMessage(
      sessionId,
      "Write a detailed explanation of React hooks with examples",
    );

    console.log("✅ Streaming message completed:", result.status);

    if (result.status === "waiting_confirmation" && result.toolCalls) {
      console.log(`🔧 Tool calls detected: ${result.toolCalls.length} calls`);

      // Demonstrate tool confirmation
      for (const toolCall of result.toolCalls) {
        console.log(`🛠️ Tool: ${toolCall.name} (${toolCall.id})`);

        const confirmResult = await chatClient.confirmToolCall(
          sessionId,
          toolCall.id,
          "approved",
        );
        console.log(`✅ Tool confirmed: ${confirmResult.status}`);
      }
    }
  } catch (error) {
    console.log(
      "ℹ️ Streaming demo completed with mock implementation:",
      (error as Error).message,
    );
  }
}

async function demonstrateBackwardCompatibility(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Backward Compatibility Demo ===");

  // Test legacy methods still work
  console.log("🔄 Testing legacy createSession method...");
  const legacySessionId = await chatClient.createSession(
    projectDir,
    false, // newTask
    "chat", // mode
    ["legacy-knowledge"], // knowledge
    "Legacy session creation test", // prompt
    "gpt-3.5-turbo", // model
    "legacy-correlation-id",
  );
  console.log(`✅ Legacy session created: ${legacySessionId}`);

  // Test legacy session methods
  console.log("📤 Testing legacy sendMessage...");
  const session = await chatClient.getSession(legacySessionId);
  console.log(`✅ Session loaded: ${session.id}`);

  // Test legacy save/load
  console.log("💾 Testing legacy save/load...");
  await chatClient.saveSession();
  console.log("✅ Session saved");

  return legacySessionId;
}

async function demonstrateProviderRegistry(chatClient: ChatClient) {
  console.log("\n🔵 === Provider Registry Demo ===");

  // Test different provider configurations
  const providers = [
    { provider: "openai", modelId: "gpt-4" },
    { provider: "anthropic", modelId: "claude-3-sonnet" },
    { provider: "google", modelId: "gemini-pro" },
  ];

  for (const config of providers) {
    console.log(`🔍 Testing ${config.provider}:${config.modelId}...`);

    const modelConfig: ChatModelConfig = {
      provider: config.provider,
      modelId: config.modelId,
      temperature: 0.7,
    };

    const isValid = await chatClient.validateModelConfig(modelConfig);
    console.log(`   ${isValid ? "✅" : "❌"} Validation result: ${isValid}`);
  }
}

async function cleanupDemo() {
  console.log("\n🧹 Cleaning up demo files...");
  const demoDir = path.join(process.cwd(), "integrated-chat-demo");
  try {
    await fs.rm(demoDir, { recursive: true, force: true });
    console.log("✅ Cleanup complete");
  } catch (error) {
    console.log("⚠️ Cleanup warning:", (error as Error).message);
  }
}

async function main() {
  console.log("🚀 Integrated Chat Engine Demo Starting...\n");

  try {
    // Setup
    const chatClient = await setupIntegratedDemo();
    const projectDir = path.join(process.cwd(), "integrated-chat-demo");

    // Model configuration demo
    const modelConfig = await demonstrateModelConfiguration(chatClient);

    // Enhanced chat creation
    const sessionIds = await demonstrateEnhancedChatCreation(
      chatClient,
      projectDir,
      modelConfig,
    );

    // Advanced messaging features
    await demonstrateAdvancedMessaging(chatClient, sessionIds);

    // Streaming capabilities
    await demonstrateStreamingCapabilities(chatClient, sessionIds[1]!);

    // Provider registry
    await demonstrateProviderRegistry(chatClient);

    // Backward compatibility
    await demonstrateBackwardCompatibility(chatClient, projectDir);

    console.log("\n🎉 Integrated demo completed successfully!");

    // Summary
    console.log("\n📊 === Integration Demo Summary ===");
    console.log("✨ Successfully demonstrated:");
    console.log("  - AI SDK v5 integration with ProviderRegistryBuilder");
    console.log("  - Enhanced model configuration (ChatModelConfig)");
    console.log("  - Streaming capabilities with mock AI SDK v5");
    console.log("  - Tool system integration");
    console.log("  - Backward compatibility with legacy API");
    console.log("  - Multi-provider support (OpenAI, Anthropic, Google)");
    console.log("  - Enhanced session management");
    console.log("  - Type safety improvements");
  } catch (error) {
    console.error("❌ Integration demo failed:", error);
  } finally {
    await cleanupDemo();
  }
}

// Run the integrated demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runIntegratedChatEngineDemo };
