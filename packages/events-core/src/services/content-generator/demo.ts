// packages/events-core/src/services/content-generator/demo.ts
import { createClientEventBus } from "../../event-bus.js";
import { createUserSettingsRepository } from "../user-settings-repository.js";
import { createUserSettingsService } from "../user-settings-service.js";
import { EnhancedChatClient } from "./enhanced-chat-client.js";
import type { ChatModelConfig } from "./types.js";

export async function demoEnhancedChatClient() {
  console.log("🚀 Starting Enhanced Chat Client Demo with AI SDK v5 Architecture");

  // Set up dependencies
  const eventBus = createClientEventBus();
  const userSettingsRepo = createUserSettingsRepository("/tmp/demo-settings");
  const userSettingsService = createUserSettingsService(userSettingsRepo);
  
  // Mock chat repository
  const mockChatRepository = {
    createChat: async (data: any, targetDir: string) => ({
      ...data,
      absoluteFilePath: `/tmp/chat-${data.id}.json`,
    }),
    findById: async (id: string) => null,
    updateMetadata: async () => {},
  } as any;

  const client = new EnhancedChatClient(
    eventBus,
    mockChatRepository,
    userSettingsService,
  );

  // Configure user settings with mock providers
  await userSettingsService.updateUserSettings({
    providers: {
      openai: { enabled: true, apiKey: "mock-key" },
      anthropic: { enabled: true, apiKey: "mock-key" },
    },
  });

  // Define model configuration following the new architecture
  const modelConfig: ChatModelConfig = {
    provider: "openai",
    modelId: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: "You are a helpful AI assistant.",
  };

  console.log("📋 Model Config:", modelConfig);

  // Get available models
  const availableModels = await client.getAvailableModels();
  console.log("🤖 Available Models:", availableModels);

  // Validate model configuration
  const isValid = await client.validateModelConfig(modelConfig);
  console.log("✅ Model Config Valid:", isValid);

  // Create a new chat session
  const sessionId = await client.createSession(
    "/tmp/demo-target",
    modelConfig,
    "Hello! Can you help me understand the new AI SDK v5 architecture?",
  );

  console.log("💬 Created Chat Session:", sessionId);

  // Send another message
  const result = await client.sendMessage(
    sessionId,
    "What are the key benefits of using AI SDK v5?",
  );

  console.log("🎯 Conversation Result:", result);
  console.log("✨ Demo completed successfully!");
}

// Run demo if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('demo.ts')) {
  demoEnhancedChatClient().catch(console.error);
}