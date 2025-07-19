// packages/events-core/examples/chat-client-demo.ts
import { ChatClient } from "../src/services/chat-engine/chat-client.js";
import { ChatRepository } from "../src/services/chat-repository.js";
import { TaskService } from "../src/services/task-service.js";
import { ProjectFolderService } from "../src/services/project-folder-service.js";
import { FileWatcherService } from "../src/services/file-watcher-service.js";
import { EventBus } from "../src/event-bus.js";
import { TaskRepository } from "../src/services/task-repository.js";
import { UserSettingsRepository } from "../src/services/user-settings-repository.js";
import { UserSettingsService } from "../src/services/user-settings-service.js";
import path from "path";
import fs from "fs/promises";

async function setupDemo(): Promise<ChatClient> {
  // Create event bus
  const eventBus = new EventBus({ environment: "server" });

  // Create a temporary directory for demo data
  const demoDir = path.join(process.cwd(), "demo-chat-project");
  await fs.mkdir(demoDir, { recursive: true });

  // Setup repositories
  const chatRepository = new ChatRepository();
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

  // Initialize repositories
  await chatRepository.initialize();

  // Add project folder
  await projectFolderService.addProjectFolder(demoDir);

  // Create ChatClient
  const chatClient = new ChatClient(
    eventBus,
    chatRepository,
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

async function demonstrateBasicConversation(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Basic Conversation Demo ===");

  // Create a new chat session
  const sessionId = await chatClient.createSession(
    projectDir,
    false, // no new task
    "chat",
    ["general"],
    "Hello, how are you?",
    "default",
  );

  console.log(`✅ Created chat session: ${sessionId}`);

  // Send additional messages
  console.log("\n💬 Sending message: 'Can you help me with TypeScript?'");
  const result1 = await chatClient.sendMessage(
    sessionId,
    "Can you help me with TypeScript?",
    undefined,
  );
  console.log("📤 Result:", result1);

  console.log("\n💬 Sending message: 'What are the best practices?'");
  const result2 = await chatClient.sendMessage(
    sessionId,
    "What are the best practices?",
    undefined,
  );
  console.log("📤 Result:", result2);

  // Get final chat state
  const finalChat = await chatClient.getChatById(sessionId);
  console.log(
    `\n📊 Final chat state: ${finalChat.messages.length} messages, status: ${finalChat.status}`,
  );

  return sessionId;
}

async function demonstrateSessionManagement(
  chatClient: ChatClient,
  sessionId: string,
) {
  console.log("\n🔵 === Session Management Demo ===");

  // Load existing session
  console.log(`🔄 Loading session: ${sessionId}`);
  await chatClient.loadSession(sessionId);

  // Get session details
  const chat = await chatClient.getSession(sessionId);
  console.log(`📋 Loaded session with ${chat.messages.length} messages`);

  // Update prompt draft
  console.log("\n✏️ Updating prompt draft...");
  await chatClient.updatePromptDraft(
    sessionId,
    "Draft: How to implement design patterns?",
  );

  // Save session
  console.log("💾 Saving session...");
  await chatClient.saveSession();

  console.log("✅ Session management complete");
}

async function demonstrateMultipleSessions(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Multiple Sessions Demo ===");

  // Create multiple chat sessions
  const session1 = await chatClient.createSession(
    projectDir,
    false,
    "chat",
    ["typescript"],
    "Tell me about TypeScript interfaces",
    "default",
  );

  const session2 = await chatClient.createSession(
    projectDir,
    false,
    "agent",
    ["react"],
    "Help me build a React component",
    "default",
  );

  console.log(`✅ Created sessions: ${session1}, ${session2}`);

  // Send messages to different sessions
  await chatClient.sendMessage(session1, "What are union types?");
  await chatClient.sendMessage(session2, "How do I use hooks?");

  // List all chats
  const allChats = await chatClient.getAllChats();
  console.log(`📈 Total chats: ${allChats.length}`);

  allChats.forEach((chat, index) => {
    console.log(
      `  ${index + 1}. ${chat.id} - ${chat.messages.length} messages (${chat.metadata?.mode})`,
    );
  });

  return [session1, session2];
}

async function demonstrateToolConfirmation(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Tool Confirmation Demo ===");

  // Create a session
  const sessionId = await chatClient.createSession(
    projectDir,
    false,
    "agent",
    ["development"],
    "Create a new file for me",
    "default",
  );

  console.log(`✅ Created tool demo session: ${sessionId}`);

  // Note: In a real implementation, this would trigger tool calls
  // For demo purposes, we'll simulate the tool confirmation flow
  try {
    const mockToolCalls = [
      {
        id: "tool_1",
        name: "create_file",
        arguments: { path: "demo.ts", content: "console.log('Hello');" },
        needsConfirmation: true,
      },
    ];

    console.log("🔧 Simulating tool confirmation...");
    // This would normally be called when the AI returns tool calls
    const result = await chatClient.sendToolConfirmation(
      sessionId,
      mockToolCalls,
    );
    console.log("📤 Tool confirmation result:", result);
    // console.log("⚠️ Tool execution is currently a placeholder implementation");
  } catch (error) {
    console.log(
      "ℹ️ Tool confirmation demo skipped (expected for placeholder implementation)",
    );
  }
}

async function demonstrateAbortOperation(
  chatClient: ChatClient,
  projectDir: string,
) {
  console.log("\n🔵 === Abort Operation Demo ===");

  const sessionId = await chatClient.createSession(
    projectDir,
    false,
    "chat",
    ["general"],
    undefined,
    "default",
  );

  console.log(`✅ Created abort demo session: ${sessionId}`);

  // Get the chat session instance
  const chatSession = await chatClient.getSession(sessionId);

  // Start a conversation but abort it quickly
  const messagePromise = chatSession.runTurn({
    type: "user_message",
    content: "This is a long message that will be aborted",
  });

  // Abort after a short delay
  setTimeout(() => {
    console.log("🛑 Aborting operation...");
    chatSession.abort();
  }, 50);

  try {
    await messagePromise;
    console.log("✅ Operation completed (not aborted)");
  } catch (error) {
    if (error instanceof Error && error.message.includes("cancelled")) {
      console.log("✅ Operation successfully aborted");
    } else {
      console.log("❌ Unexpected error:", error);
    }
  }
}

async function demonstrateErrorHandling(chatClient: ChatClient) {
  console.log("\n🔵 === Error Handling Demo ===");

  try {
    // Try to get a non-existent chat
    await chatClient.getChatById("non-existent-id");
  } catch (error) {
    console.log(
      "✅ Caught expected error for non-existent chat:",
      (error as Error).message,
    );
  }

  try {
    // Try to send message to non-existent chat
    await chatClient.sendMessage("non-existent-id", "Hello");
  } catch (error) {
    console.log(
      "✅ Caught expected error for invalid session:",
      (error as Error).message,
    );
  }

  try {
    // Try to create chat outside project folder
    await chatClient.createSession("/invalid/path", false, "chat", []);
  } catch (error) {
    console.log(
      "✅ Caught expected error for invalid path:",
      (error as Error).message,
    );
  }
}

async function cleanupDemo() {
  console.log("\n🧹 Cleaning up demo files...");
  const demoDir = path.join(process.cwd(), "demo-chat-project");
  try {
    await fs.rm(demoDir, { recursive: true, force: true });
    console.log("✅ Cleanup complete");
  } catch (error) {
    console.log("⚠️ Cleanup warning:", error);
  }
}

async function main() {
  console.log("🚀 ChatClient Demo Starting...\n");

  try {
    // Setup
    const chatClient = await setupDemo();
    const projectDir = path.join(process.cwd(), "demo-chat-project");

    // Run demonstrations
    const sessionId = await demonstrateBasicConversation(
      chatClient,
      projectDir,
    );
    await demonstrateSessionManagement(chatClient, sessionId);
    const [session1, session2] = await demonstrateMultipleSessions(
      chatClient,
      projectDir,
    );
    await demonstrateToolConfirmation(chatClient, projectDir);
    await demonstrateAbortOperation(chatClient, projectDir);
    await demonstrateErrorHandling(chatClient);

    console.log("\n🎉 Demo completed successfully!");

    // Summary
    console.log("\n📊 === Demo Summary ===");
    const allChats = await chatClient.getAllChats();
    console.log(`Total chats created: ${allChats.length}`);
    allChats.forEach((chat, index) => {
      console.log(
        `  ${index + 1}. ${chat.metadata?.title || "Untitled"} (${chat.messages.length} messages)`,
      );
    });
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    await cleanupDemo();
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runChatClientDemo };
