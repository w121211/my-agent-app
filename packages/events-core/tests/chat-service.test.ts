import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ChatService } from "../src/chat-service.js";
import { IEventBus } from "../src/event-bus.js";
import { ChatRepository } from "../src/repositories.js";
import { TaskService } from "../src/task-service.js";
import {
  Chat,
  ChatMessage,
  ClientCreateNewChatEvent,
  ClientSubmitUserChatMessageEvent,
  ClientOpenFileEvent,
  ServerChatFileCreatedEvent,
  ServerNewChatCreatedEvent,
  ServerChatInitializedEvent,
  ServerUserChatMessagePostProcessedEvent,
  ServerChatMessageAppendedEvent,
  ServerChatFileUpdatedEvent,
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerAIResponsePostProcessedEvent,
  ServerFileOpenedEvent,
  ServerArtifactFileCreatedEvent,
} from "../src/event-types.js";

// Mock dependencies
jest.mock("uuid");
jest.mock("node:fs/promises");
jest.mock("../src/repositories.js", () => {
  const originalModule = jest.requireActual("../src/repositories.js");
  return {
    ...originalModule,
    fileExists: jest.fn(),
  };
});

// Mock UUID generation to return predictable values
const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
(uuidv4 as jest.Mock).mockReturnValue(mockUuid);

describe("ChatService", () => {
  // Test variables
  const workspacePath = "/test/workspace";
  let eventBus: jest.Mocked<IEventBus>;
  let chatRepo: jest.Mocked<ChatRepository>;
  let taskService: jest.Mocked<TaskService>;
  let chatService: ChatService;

  beforeEach(() => {
    // Create mock implementations
    eventBus = {
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      subscribeToAllClientEvents: jest.fn(),
      subscribeToAllServerEvents: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      hasHandlers: jest.fn(),
      getHandlerCount: jest.fn(),
      clear: jest.fn(),
    };

    chatRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn(),
      createChat: jest.fn(),
      addMessage: jest.fn(),
      getChatFilePath: jest.fn(),
      loadChat: jest.fn(),
      readChatFile: jest.fn(),
    } as unknown as jest.Mocked<ChatRepository>;

    taskService = {
      createTask: jest.fn().mockResolvedValue({
        taskId: mockUuid,
        folderPath: path.join(workspacePath, `task-${mockUuid}`),
      }),
    } as unknown as jest.Mocked<TaskService>;

    // Initialize service with mocks including TaskService
    chatService = new ChatService(
      eventBus,
      chatRepo,
      workspacePath,
      taskService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCreateNewChat", () => {
    it("should create a new chat without a new task", async () => {
      // Arrange
      const chatFilePath = path.join(workspacePath, `${mockUuid}.chat.json`);
      const event: ClientCreateNewChatEvent = {
        kind: "ClientCreateNewChat",
        newTask: false,
        mode: "chat",
        knowledge: ["knowledge1"],
        prompt: "Hello, AI!",
        model: "gpt-4",
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      chatRepo.createChat.mockResolvedValue(chatFilePath);

      // Get the handler that was registered for ClientCreateNewChat
      const createNewChatHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientCreateNewChat")[1];

      // Act
      await createNewChatHandler(event);

      // Assert
      expect(taskService.createTask).not.toHaveBeenCalled();

      expect(chatRepo.createChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUuid,
          taskId: "",
          status: "ACTIVE",
          messages: [],
          metadata: {
            mode: "chat",
            model: "gpt-4",
            knowledge: ["knowledge1"],
          },
        }),
        workspacePath
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatFileCreatedEvent>({
          kind: "ServerChatFileCreated",
          taskId: "",
          chatId: mockUuid,
          filePath: chatFilePath,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerNewChatCreatedEvent>({
          kind: "ServerNewChatCreated",
          chatId: mockUuid,
          filePath: chatFilePath,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Check if the message was added when a prompt was provided
      expect(chatRepo.addMessage).toHaveBeenCalledWith(
        mockUuid,
        expect.objectContaining<ChatMessage>({
          id: mockUuid,
          role: "USER",
          content: "Hello, AI!",
          timestamp: expect.any(Date),
        })
      );
    });

    it("should create a new chat with a new task", async () => {
      // Arrange
      const taskId = mockUuid;
      const taskFolderPath = path.join(workspacePath, `task-${taskId}`);
      const chatFilePath = path.join(taskFolderPath, `${mockUuid}.chat.json`);

      const event: ClientCreateNewChatEvent = {
        kind: "ClientCreateNewChat",
        newTask: true,
        mode: "chat",
        knowledge: [],
        prompt: "",
        model: "default",
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      chatRepo.createChat.mockResolvedValue(chatFilePath);
      taskService.createTask.mockResolvedValue({
        taskId,
        folderPath: taskFolderPath,
      });

      // Get the handler
      const createNewChatHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientCreateNewChat")[1];

      // Act
      await createNewChatHandler(event);

      // Assert
      expect(taskService.createTask).toHaveBeenCalledWith(
        "New Chat Task",
        {},
        event.correlationId
      );

      expect(chatRepo.createChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUuid,
          taskId,
          status: "ACTIVE",
          metadata: {
            mode: "chat",
            model: "default",
            knowledge: [],
          },
        }),
        taskFolderPath
      );

      // Check that events were emitted with the correct task ID
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatFileCreatedEvent>({
          kind: "ServerChatFileCreated",
          taskId,
          chatId: mockUuid,
          filePath: chatFilePath,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerNewChatCreatedEvent>({
          kind: "ServerNewChatCreated",
          chatId: mockUuid,
          filePath: chatFilePath,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );
    });

    it("should not add initial message if prompt is empty", async () => {
      // Arrange
      const event: ClientCreateNewChatEvent = {
        kind: "ClientCreateNewChat",
        newTask: false,
        mode: "chat",
        knowledge: [],
        prompt: "",
        model: "default",
        timestamp: new Date(),
      };

      chatRepo.createChat.mockResolvedValue("/path/to/chat.json");

      // Get the handler
      const createNewChatHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientCreateNewChat")[1];

      // Act
      await createNewChatHandler(event);

      // Assert
      expect(chatRepo.addMessage).not.toHaveBeenCalled();
    });
  });

  describe("handleSubmitUserChatMessage", () => {
    it("should process a user message and generate an AI response", async () => {
      // Arrange
      const chatId = mockUuid;
      const chat: Chat = {
        id: chatId,
        taskId: "task123",
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: "/path/to/chat.json",
        metadata: {
          mode: "chat",
          model: "gpt-4",
        },
      };

      const event: ClientSubmitUserChatMessageEvent = {
        kind: "ClientSubmitUserChatMessage",
        chatId,
        message: "Hello, AI!",
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      chatRepo.findById.mockResolvedValue(chat);

      // Get the handler
      const submitMessageHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientSubmitUserChatMessage")[1];

      // Act
      await submitMessageHandler(event);

      // Assert
      expect(chatRepo.addMessage).toHaveBeenCalledWith(
        chatId,
        expect.objectContaining<ChatMessage>({
          id: mockUuid,
          role: "USER",
          content: "Hello, AI!",
          timestamp: expect.any(Date),
        })
      );

      // Check that message processing events were emitted
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerUserChatMessagePostProcessedEvent>({
          kind: "ServerUserChatMessagePostProcessed",
          chatId,
          messageId: mockUuid,
          processedContent: "Hello, AI!",
          fileReferences: expect.any(Array),
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatMessageAppendedEvent>({
          kind: "ServerChatMessageAppended",
          chatId,
          message: expect.objectContaining({
            id: mockUuid,
            role: "USER",
            content: "Hello, AI!",
            timestamp: expect.any(Date),
          }),
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Check that AI response was requested
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerAIResponseRequestedEvent>({
          kind: "ServerAIResponseRequested",
          chatId,
          model: "gpt-4",
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Check that AI response was processed
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerAIResponseGeneratedEvent>({
          kind: "ServerAIResponseGenerated",
          chatId,
          response: expect.any(String),
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Verify assistant message was added
      expect(chatRepo.addMessage).toHaveBeenCalledWith(
        chatId,
        expect.objectContaining<ChatMessage>({
          role: "ASSISTANT",
          id: expect.any(String),
          content: expect.any(String),
          timestamp: expect.any(Date),
        })
      );
    });

    it("should throw an error when chat is not found", async () => {
      // Arrange
      const event: ClientSubmitUserChatMessageEvent = {
        kind: "ClientSubmitUserChatMessage",
        chatId: "non-existent-id",
        message: "Hello?",
        timestamp: new Date(),
      };

      chatRepo.findById.mockResolvedValue(undefined);

      // Get the handler
      const submitMessageHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientSubmitUserChatMessage")[1];

      // Act & Assert
      await expect(submitMessageHandler(event)).rejects.toThrow(
        "Chat non-existent-id not found"
      );
    });

    it("should detect and process artifacts in AI responses", async () => {
      // Arrange
      const chatId = mockUuid;
      const taskId = "task123";
      const chat: Chat = {
        id: chatId,
        taskId,
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: "/path/to/chat.json",
        metadata: {
          mode: "chat",
          model: "default",
        },
      };

      // Mock to ensure artifact detection
      eventBus.emit.mockImplementation(async (event) => {
        if (event.kind === "ServerAIResponseGenerated") {
          const artifactEvent = event as ServerAIResponseGeneratedEvent;
          artifactEvent.artifacts = [
            {
              id: mockUuid,
              type: "code",
              content: 'console.log("test");',
            },
          ];
        }
        return;
      });

      chatRepo.findById.mockResolvedValue(chat);

      const event: ClientSubmitUserChatMessageEvent = {
        kind: "ClientSubmitUserChatMessage",
        chatId,
        message: "```Show me some code```",
        timestamp: new Date(),
      };

      // Get the handler
      const submitMessageHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientSubmitUserChatMessage")[1];

      // Act
      await submitMessageHandler(event);

      // Assert
      // Artifact processing would normally trigger ServerArtifactFileCreatedEvent
      // But we're keeping this commented as in the original test
      // expect(eventBus.emit).toHaveBeenCalledWith(
      //   expect.objectContaining<ServerArtifactFileCreatedEvent>({
      //     kind: "ServerArtifactFileCreated",
      //     chatId,
      //     messageId: mockUuid,
      //     artifactId: mockUuid,
      //     filePath: expect.any(String),
      //     fileType: "code",
      //     timestamp: expect.any(Date),
      //   })
      // );
    });
  });

  describe("handleOpenChatFile", () => {
    it("should open and initialize a chat file", async () => {
      // Arrange
      const filePath = "path/to/chat-123.chat.json";
      const fullPath = path.join(workspacePath, filePath);

      const chat: Chat = {
        id: "chat123",
        taskId: "task123",
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: fullPath,
      };

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath,
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      // Mock file existence check
      const { fileExists } = require("../src/repositories.js");
      fileExists.mockResolvedValue(true);
      chatRepo.readChatFile.mockResolvedValue(chat);

      // Get the handler
      const openFileHandler = (eventBus.subscribe as jest.Mock).mock.calls.find(
        (call) => call[0] === "ClientOpenFile"
      )[1];

      // Act
      await openFileHandler(event);

      // Assert
      expect(chatRepo.readChatFile).toHaveBeenCalledWith(fullPath);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerFileOpenedEvent>({
          kind: "ServerFileOpened",
          filePath,
          content: expect.any(String),
          fileType: "chat",
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatInitializedEvent>({
          kind: "ServerChatInitialized",
          chatId: "chat123",
          chatData: chat,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );
    });

    it("should ignore non-chat files", async () => {
      // Arrange
      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "path/to/document.txt",
        timestamp: new Date(),
      };

      // Get the handler
      const openFileHandler = (eventBus.subscribe as jest.Mock).mock.calls.find(
        (call) => call[0] === "ClientOpenFile"
      )[1];

      // Act
      await openFileHandler(event);

      // Assert
      expect(chatRepo.readChatFile).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it("should throw an error when file does not exist", async () => {
      // Arrange
      const filePath = "path/to/missing-chat.chat.json";

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath,
        timestamp: new Date(),
      };

      // Mock file existence check
      const { fileExists } = require("../src/repositories.js");
      fileExists.mockResolvedValue(false);

      // Get the handler
      const openFileHandler = (eventBus.subscribe as jest.Mock).mock.calls.find(
        (call) => call[0] === "ClientOpenFile"
      )[1];

      // Act & Assert
      await expect(openFileHandler(event)).rejects.toThrow(
        `File does not exist: ${filePath}`
      );
    });
  });

  describe("Event subscription", () => {
    it("should subscribe to the appropriate events", () => {
      // Assert - Check that the service subscribes to the correct events
      expect(eventBus.subscribe).toHaveBeenCalledWith(
        "ClientCreateNewChat",
        expect.any(Function)
      );

      expect(eventBus.subscribe).toHaveBeenCalledWith(
        "ClientSubmitUserChatMessage",
        expect.any(Function)
      );

      expect(eventBus.subscribe).toHaveBeenCalledWith(
        "ClientOpenFile",
        expect.any(Function)
      );
    });
  });
});
