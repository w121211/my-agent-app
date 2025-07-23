// packages/events-core/examples/enhanced-chat-client-demo.ts
import { ChatClient } from "../src/services/chat-engine/chat-client.js";
import { ChatSessionRepositoryImpl } from "../src/services/chat-engine/chat-session-repository.js";
import { TaskService } from "../src/services/task-service.js";
import { ProjectFolderService } from "../src/services/project-folder-service.js";
import { FileWatcherService } from "../src/services/file-watcher-service.js";
import { EventBus } from "../src/event-bus.js";
import { TaskRepository } from "../src/services/task-repository.js";
import { UserSettingsRepository } from "../src/services/user-settings-repository.js";
import { UserSettingsService } from "../src/services/user-settings-service.js";
import path from "path";
import fs from "fs/promises";

async function setupEnhancedDemo(): Promise<ChatClient> {
  // Create event bus
  const eventBus = new EventBus({ environment: "server" });

  // Create a temporary directory for demo data
  const demoDir = path.join(process.cwd(), "enhanced-chat-demo");
  await fs.mkdir(demoDir, { recursive: true });

  // Setup repositories
  const chatSessionRepository = new ChatSessionRepositoryImpl();
  const taskRepository = new TaskRepository();
  const userSettingsRepository = new UserSettingsRepository(
    path.join(demoDir, "user-settings.json"),
  );

  // Setup services
  const userSettingsService = new UserSettingsService(userSettingsRepository);
  const taskService = new TaskService(eventBus, taskRepository);
  const fileWatcherService = new FileWatcherService(eventBus);
  const projectFolderService = new ProjectFolderService(
    eventBus,
    userSettingsRepository,
    fileWatcherService,
  );

  // Add project folder
  await projectFolderService.addProjectFolder(demoDir);

  // Build path index for chat session repository
  await chatSessionRepository.buildPathIndex();

  // Create enhanced ChatClient
  const chatClient = new ChatClient(
    eventBus,
    chatSessionRepository,
    taskService,
    projectFolderService,
  );

  // Subscribe to chat events for demo
  eventBus.subscribe("ChatUpdatedEvent", (event: any) => {
    console.log(`📢 Event: ${event.updateType}`, {
      chatId: event.chatId,
      status: event.chat.status,
      messageCount: event.chat.messages.length,
    });
  });

  return chatClient;
}

async function demonstrateNewChatCreation(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === New Chat Creation Demo (Enhanced API) ===");

  // Create chat using new simplified API
  const sessionId1 = await chatClient.createChat(projectDir, {
    mode: "chat",
    model: "gpt-4",
    knowledge: ["typescript", "nodejs"],
    prompt: "Hello, I need help with TypeScript development",
  });

  console.log(`✅ Created chat session: ${sessionId1}`);

  // Create another chat for agent mode
  const sessionId2 = await chatClient.createChat(projectDir, {
    mode: "agent",
    model: "claude-3.5-sonnet",
    knowledge: ["react", "frontend"],
    newTask: true,
  });

  console.log(`✅ Created agent session: ${sessionId2}`);

  return [sessionId1, sessionId2];
}

async function demonstrateSessionPoolManagement(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Session Pool Management Demo ===");

  // Create multiple sessions to test pool management
  const sessionIds: string[] = [];
  
  for (let i = 1; i <= 12; i++) {
    const sessionId = await chatClient.createChat(projectDir, {
      mode: i % 2 === 0 ? "agent" : "chat",
      model: "default",
      knowledge: [`topic-${i}`],
    });
    sessionIds.push(sessionId);
    console.log(`📝 Created session ${i}/12: ${sessionId}`);
  }

  console.log("📊 Session pool should have automatically evicted older sessions");

  // Test loading sessions (should trigger LRU behavior)
  for (const sessionId of sessionIds.slice(0, 5)) {
    try {
      await chatClient.sendMessage(sessionId, `Test message for ${sessionId}`);
      console.log(`✅ Successfully sent message to session: ${sessionId.substring(0, 8)}...`);
    } catch (error) {
      console.log(`⚠️ Session may have been evicted: ${sessionId.substring(0, 8)}...`);
    }
  }

  return sessionIds;
}

async function demonstrateEnhancedMessaging(
  chatClient: ChatClient,
  sessionIds: string[],
) {
  console.log("\n🔵 === Enhanced Messaging Demo ===");

  const sessionId = sessionIds[0];

  // Send message with attachments
  console.log("💬 Sending message with attachments...");
  const result1 = await chatClient.sendMessage(sessionId, "Can you review this code?", [
    {
      fileName: "example.ts",
      content: "const greeting = 'Hello, World!'; console.log(greeting);",
    },
    {
      fileName: "package.json",
      content: '{"name": "demo", "version": "1.0.0"}',
    },
  ]);
  console.log("📤 Message result:", result1);

  // Test rerun functionality
  console.log("\n🔄 Testing rerun functionality...");
  const rerunResult = await chatClient.rerunChat(sessionId, {
    message: "Please explain the previous code in detail",
  });
  console.log("📤 Rerun result:", rerunResult);

  return sessionId;
}

async function demonstrateToolConfirmation(
  chatClient: ChatClient,
  sessionId: string,
) {
  console.log("\n🔵 === Tool Confirmation Demo ===");

  try {
    // Simulate a tool confirmation scenario
    console.log("🔧 Testing tool confirmation workflow...");
    
    const confirmResult = await chatClient.confirmToolCall(
      sessionId,
      "tool_123",
      "approved",
    );
    
    console.log("✅ Tool confirmation result:", confirmResult);
  } catch (error) {
    console.log("ℹ️ Tool confirmation demo skipped (session not waiting for confirmation)");
  }
}

async function demonstrateChatManagement(
  chatClient: ChatClient,
  sessionIds: string[],
) {
  console.log("\n🔵 === Chat Management Demo ===");

  const sessionId = sessionIds[0];

  // Update chat metadata
  console.log("✏️ Updating chat metadata...");
  await chatClient.updateChat(sessionId, {
    metadata: {
      title: "Updated Chat Title",
      tags: ["demo", "enhanced"],
      summary: "This is a demo chat with enhanced features",
    },
    maxTurns: 50,
  });

  // Load chat from file
  console.log("📂 Testing file-based chat loading...");
  try {
    const chatData = await chatClient.getChatById(sessionId);
    console.log(`📋 Chat loaded: ${chatData.metadata?.title || "Untitled"}`);
    console.log(`   Messages: ${chatData.messages.length}`);
    console.log(`   Max turns: ${chatData.maxTurns}`);
    console.log(`   Status: ${chatData.status}`);
  } catch (error) {
    console.log("⚠️ Error loading chat:", (error as Error).message);
  }

  // Test abort functionality
  console.log("\n🛑 Testing abort functionality...");
  await chatClient.abortChat(sessionId);
  console.log("✅ Abort signal sent");
}

async function demonstrateConcurrentSessions(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Concurrent Sessions Demo ===");

  // Create multiple sessions and send messages concurrently
  const sessions = await Promise.all([
    chatClient.createChat(projectDir, {
      mode: "chat",
      prompt: "Tell me about JavaScript",
    }),
    chatClient.createChat(projectDir, {
      mode: "agent", 
      prompt: "Help me build a React component",
    }),
    chatClient.createChat(projectDir, {
      mode: "chat",
      prompt: "Explain async/await",
    }),
  ]);

  console.log(`✅ Created ${sessions.length} concurrent sessions`);

  // Send messages to all sessions concurrently
  const messagePromises = sessions.map((sessionId, index) =>
    chatClient.sendMessage(sessionId, `Concurrent message ${index + 1}`)
  );

  const results = await Promise.allSettled(messagePromises);
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`✅ Session ${index + 1} completed successfully`);
    } else {
      console.log(`❌ Session ${index + 1} failed:`, result.reason);
    }
  });

  return sessions;
}

async function demonstrateErrorHandling(chatClient: ChatClient) {
  console.log("\n🔵 === Error Handling Demo ===");

  try {
    await chatClient.sendMessage("non-existent-session", "Test message");
  } catch (error) {
    console.log("✅ Caught expected error for non-existent session:", (error as Error).message);
  }

  try {
    await chatClient.deleteChat("invalid-session-id");
  } catch (error) {
    console.log("✅ Caught expected error for invalid deletion:", (error as Error).message);
  }

  try {
    await chatClient.createChat("/invalid/path/outside/project");
  } catch (error) {
    console.log("✅ Caught expected error for invalid project path:", (error as Error).message);
  }
}

async function cleanupEnhancedDemo() {
  console.log("\n🧹 Cleaning up enhanced demo files...");
  const demoDir = path.join(process.cwd(), "enhanced-chat-demo");
  try {
    await fs.rm(demoDir, { recursive: true, force: true });
    console.log("✅ Cleanup complete");
  } catch (error) {
    console.log("⚠️ Cleanup warning:", error);
  }
}

async function main() {
  console.log("🚀 Enhanced ChatClient Demo Starting...\n");

  try {
    // Setup
    const chatClient = await setupEnhancedDemo();
    const projectDir = path.join(process.cwd(), "enhanced-chat-demo");

    // Run demonstrations
    const [sessionId1, sessionId2] = await demonstrateNewChatCreation(
      chatClient,
      projectDir,
    );

    const allSessionIds = await demonstrateSessionPoolManagement(
      chatClient,
      projectDir,
    );

    await demonstrateEnhancedMessaging(chatClient, [sessionId1, sessionId2]);
    await demonstrateToolConfirmation(chatClient, sessionId1);
    await demonstrateChatManagement(chatClient, [sessionId1, sessionId2]);

    const concurrentSessions = await demonstrateConcurrentSessions(
      chatClient,
      projectDir,
    );

    await demonstrateErrorHandling(chatClient);

    console.log("\n🎉 Enhanced demo completed successfully!");

    // Summary
    console.log("\n📊 === Enhanced Demo Summary ===");
    const totalSessions = [...allSessionIds, ...concurrentSessions];
    console.log(`Total sessions created: ${totalSessions.length}`);
    console.log("✨ New features demonstrated:");
    console.log("  - Session pool management with LRU eviction");
    console.log("  - Enhanced chat creation API with configuration");
    console.log("  - Message attachments support");
    console.log("  - Chat rerun functionality");
    console.log("  - Tool confirmation workflow");
    console.log("  - Concurrent session handling");
    console.log("  - File-based chat persistence");
    console.log("  - Comprehensive error handling");

  } catch (error) {
    console.error("❌ Enhanced demo failed:", error);
  } finally {
    await cleanupEnhancedDemo();
  }
}

// Run the enhanced demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runEnhancedChatClientDemo };