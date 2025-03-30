import { EventBus } from "../event-bus.js";
import { ChatService } from "../chat-service.js";
import { ChatRepository } from "../repositories.js";
import {
  ClientStartNewChatCommand,
  Chat,
  ChatMessage,
} from "../event-types.js";
import { IWorkspaceManager } from "../workspace-manager.js"; // Import workspace manager interface

// Mock dependencies
jest.mock("../repositories.js");
jest.mock("../workspace-manager.js");

describe("ChatService", () => {
  // Test setup
  let eventBus: EventBus;
  let chatRepo: ChatRepository;
  let workspaceManager: IWorkspaceManager;
  let chatService: ChatService;

  // Spy on eventBus.emit to track emitted events
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create fresh instances for each test
    eventBus = new EventBus({ environment: "server" });

    // Create mock workspace manager
    workspaceManager = {
      createDirectory: jest.fn().mockResolvedValue("/mock/dir"),
      writeFile: jest.fn().mockResolvedValue("/mock/file"),
      readFile: jest.fn().mockResolvedValue("mock content"),
      fileExists: jest.fn().mockResolvedValue(true),
      getWorkspacePath: jest.fn().mockReturnValue("/mock/workspace"),
    } as unknown as IWorkspaceManager;

    // Create repository with workspace manager
    chatRepo = new ChatRepository(workspaceManager);

    // Mock repository methods
    (chatRepo.createChat as jest.Mock).mockResolvedValue("mock/path/to/chat");
    (chatRepo.addMessage as jest.Mock).mockResolvedValue(undefined);

    emitSpy = jest.spyOn(eventBus, "emit");

    // Initialize the service under test
    chatService = new ChatService(eventBus, chatRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleStartNewChatCommand", () => {
    it("should create a new chat and emit chat created event", async () => {
      // Arrange
      const command: ClientStartNewChatCommand = {
        eventType: "CLIENT_START_NEW_CHAT_COMMAND",
        taskId: "task-123",
        subtaskId: "subtask-456",
        timestamp: new Date(),
        correlationId: "corr-789",
        metadata: {
          title: "Test Chat",
        },
      };

      // Act
      await eventBus.emit(command);

      // Assert
      expect(chatRepo.createChat).toHaveBeenCalledTimes(1);

      // Verify the chat object created
      const chatArg = (chatRepo.createChat as jest.Mock).mock
        .calls[0][0] as Chat;
      expect(chatArg.taskId).toBe(command.taskId);
      expect(chatArg.subtaskId).toBe(command.subtaskId);
      expect(chatArg.status).toBe("ACTIVE");
      expect(chatArg.metadata).toEqual(command.metadata);

      // Verify SERVER_CHAT_CREATED event was emitted
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SERVER_CHAT_CREATED",
          taskId: command.taskId,
          subtaskId: command.subtaskId,
          correlationId: command.correlationId,
        })
      );

      // Verify message was added
      expect(chatRepo.addMessage).toHaveBeenCalledTimes(2); // Initial prompt + agent response
    });

    it("should process messages with APPROVE keyword", async () => {
      // Arrange
      const command: ClientStartNewChatCommand = {
        eventType: "CLIENT_START_NEW_CHAT_COMMAND",
        taskId: "task-123",
        subtaskId: "subtask-456",
        timestamp: new Date(),
      };

      // Mock the addMessage to simulate adding a message with APPROVE
      (chatRepo.addMessage as jest.Mock).mockImplementationOnce(
        async (chatId: string, message: ChatMessage) => {
          // Trigger the private onMessageReceived method by simulating a USER message with APPROVE
          const approveMessage: ChatMessage = {
            id: "msg-approve",
            role: "USER",
            content: "I APPROVE this work",
            timestamp: new Date(),
          };

          // We need to directly invoke the method, but it's private
          // This is a bit of a hack, but it's for testing a private method
          (chatService as any).onMessageReceived(
            { id: chatId },
            approveMessage
          );
        }
      );

      // Act
      await eventBus.emit(command);

      // Assert
      // Verify CLIENT_APPROVE_WORK event was emitted
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "CLIENT_APPROVE_WORK",
        })
      );
    });

    it("should generate agent responses to user messages", async () => {
      // Arrange
      const command: ClientStartNewChatCommand = {
        eventType: "CLIENT_START_NEW_CHAT_COMMAND",
        taskId: "task-123",
        subtaskId: "subtask-456",
        timestamp: new Date(),
      };

      // Act
      await eventBus.emit(command);

      // Assert
      // Verify at least 2 messages were added (initial prompt + response)
      expect(chatRepo.addMessage).toHaveBeenCalledTimes(2);

      // Get the messages that were added
      const messages = (chatRepo.addMessage as jest.Mock).mock.calls.map(
        (call) => call[1] as ChatMessage
      );

      // Ensure we have at least 2 messages
      expect(messages.length).toBeGreaterThanOrEqual(2);

      // First should be USER message (initial prompt)
      expect(messages[0]?.role).toBe("USER");

      // Second should be ASSISTANT message (agent response)
      expect(messages[1]?.role).toBe("ASSISTANT");
    });
  });

  describe("Event handling integration", () => {
    it("should correctly subscribe to events on initialization", () => {
      // Spy on the subscribe method
      const subscribeSpy = jest.spyOn(eventBus, "subscribe");

      // Create a new service to trigger subscriptions
      new ChatService(eventBus, chatRepo);

      // Verify the service subscribed to the expected events
      expect(subscribeSpy).toHaveBeenCalledWith(
        "CLIENT_START_NEW_CHAT_COMMAND",
        expect.any(Function)
      );
    });
  });
});
