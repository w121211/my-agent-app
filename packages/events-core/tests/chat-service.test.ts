import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { ChatService } from "../src/chat-service.js";
import { IEventBus } from "../src/event-bus.js";
import { ChatFileService } from "../src/chat-file-service.js";
import { TaskService } from "../src/task-service.js";
import {
  Chat,
  ChatMessage,
  ClientCreateNewChatEvent,
  ClientSubmitUserChatMessageEvent,
  ClientOpenFileEvent,
  ClientOpenChatFileEvent,
  ServerChatCreatedEvent,
  ServerChatFileCreatedEvent,
  ServerNewChatCreatedEvent,
  ServerChatInitializedEvent,
  ServerUserChatMessagePostProcessedEvent,
  ServerChatMessageAppendedEvent,
  ServerChatUpdatedEvent,
  ServerAIResponseRequestedEvent,
  ServerAIResponseGeneratedEvent,
  ServerAIResponsePostProcessedEvent,
  ServerFileTypeDetectedEvent,
  ServerChatFileOpenedEvent,
  ServerArtifactFileCreatedEvent,
} from "../src/event-types.js";

// Mock dependencies
jest.mock("uuid");
jest.mock("node:fs/promises");

// Mock UUID generation to return predictable values
const mockUuid = "123e4567-e89b-12d3-a456-426614174000";
(uuidv4 as jest.Mock).mockReturnValue(mockUuid);

describe("ChatService", () => {
  // Test variables
  const workspacePath = "/test/workspace";
  let eventBus: jest.Mocked<IEventBus>;
  let chatFileService: jest.Mocked<ChatFileService>;
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

    chatFileService = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findAll: jest.fn(),
      createChat: jest.fn(),
      addMessage: jest.fn(),
      readChatFile: jest.fn(),
      initialize: jest.fn(),
      deleteChat: jest.fn(),
      removeFromCache: jest.fn(),
    } as unknown as jest.Mocked<ChatFileService>;

    taskService = {
      createTask: jest.fn().mockResolvedValue({
        taskId: mockUuid,
        folderPath: path.join(workspacePath, `task-${mockUuid}`),
      }),
    } as unknown as jest.Mocked<TaskService>;

    // Initialize service with mocks
    chatService = new ChatService(
      eventBus,
      chatFileService,
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

      const chat: Chat = {
        id: mockUuid,
        filePath: path.join(workspacePath, `chat1.json`),
        status: "ACTIVE",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          mode: "chat",
          model: "gpt-4",
          knowledge: ["knowledge1"],
          title: "New Chat",
        },
      };

      chatFileService.createChat.mockResolvedValue(chat);
      chatFileService.findByPath.mockResolvedValue(chat);
      chatFileService.addMessage.mockResolvedValue(chat);

      // Get the handler that was registered for ClientCreateNewChat
      const createNewChatHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientCreateNewChat")[1];

      // Act
      await createNewChatHandler(event);

      // Assert
      expect(taskService.createTask).not.toHaveBeenCalled();

      expect(chatFileService.createChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUuid,
          status: "ACTIVE",
          messages: [],
          metadata: {
            mode: "chat",
            model: "gpt-4",
            knowledge: ["knowledge1"],
            title: "New Chat",
          },
        }),
        workspacePath,
        "corr-123"
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatCreatedEvent>({
          kind: "ServerChatCreated",
          chatId: mockUuid,
          chatObject: chat,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerNewChatCreatedEvent>({
          kind: "ServerNewChatCreated",
          chatId: mockUuid,
          chatObject: chat,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Check if the message was added when a prompt was provided
      expect(chatFileService.addMessage).toHaveBeenCalledWith(
        chat.filePath,
        expect.objectContaining<ChatMessage>({
          id: mockUuid,
          role: "USER",
          content: "Hello, AI!",
          timestamp: expect.any(Date),
        }),
        "corr-123"
      );
    });

    it("should create a new chat with a new task", async () => {
      // Arrange
      const taskId = mockUuid;
      const taskFolderPath = path.join(workspacePath, `task-${taskId}`);

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

      const chat: Chat = {
        id: mockUuid,
        filePath: path.join(taskFolderPath, `chat1.json`),
        status: "ACTIVE",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          mode: "chat",
          model: "default",
          knowledge: [],
          title: "New Chat",
        },
      };

      chatFileService.createChat.mockResolvedValue(chat);
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

      expect(chatFileService.createChat).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUuid,
          status: "ACTIVE",
          messages: [],
          metadata: {
            mode: "chat",
            model: "default",
            knowledge: [],
            title: "New Chat",
          },
        }),
        taskFolderPath,
        "corr-123"
      );

      // Check that events were emitted correctly
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatCreatedEvent>({
          kind: "ServerChatCreated",
          chatId: mockUuid,
          chatObject: chat,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerNewChatCreatedEvent>({
          kind: "ServerNewChatCreated",
          chatId: mockUuid,
          chatObject: chat,
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

      const chat: Chat = {
        id: mockUuid,
        filePath: path.join(workspacePath, `chat1.json`),
        status: "ACTIVE",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          mode: "chat",
          model: "default",
          knowledge: [],
          title: "New Chat",
        },
      };

      chatFileService.createChat.mockResolvedValue(chat);

      // Get the handler
      const createNewChatHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientCreateNewChat")[1];

      // Act
      await createNewChatHandler(event);

      // Assert
      expect(chatFileService.addMessage).not.toHaveBeenCalled();
    });
  });

  describe("handleSubmitUserChatMessage", () => {
    it("should process a user message and generate an AI response", async () => {
      // Arrange
      const chatId = mockUuid;
      const chat: Chat = {
        id: chatId,
        filePath: "/path/to/chat.json",
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
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

      chatFileService.findById.mockResolvedValue(chat);
      chatFileService.findByPath.mockResolvedValue(chat);
      chatFileService.addMessage.mockResolvedValue(chat);

      // Get the handler
      const submitMessageHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientSubmitUserChatMessage")[1];

      // Act
      await submitMessageHandler(event);

      // Assert
      expect(chatFileService.addMessage).toHaveBeenCalledWith(
        chat.filePath,
        expect.objectContaining<ChatMessage>({
          id: mockUuid,
          role: "USER",
          content: "Hello, AI!",
          timestamp: expect.any(Date),
        }),
        "corr-123"
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
          }),
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Check that chat updated event was emitted
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatUpdatedEvent>({
          kind: "ServerChatUpdated",
          chatId,
          chat,
          update: {
            kind: "MESSAGE_ADDED",
            message: expect.objectContaining({
              id: mockUuid,
              role: "USER",
              content: "Hello, AI!",
            }),
          },
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

      // Check that AI response was generated
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
      expect(chatFileService.addMessage).toHaveBeenCalledWith(
        chat.filePath,
        expect.objectContaining<ChatMessage>({
          role: "ASSISTANT",
          id: expect.any(String),
          content: expect.any(String),
          timestamp: expect.any(Date),
        }),
        "corr-123"
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

      chatFileService.findById.mockResolvedValue(undefined);

      // Get the handler
      const submitMessageHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientSubmitUserChatMessage")[1];

      // Act & Assert
      await expect(submitMessageHandler(event)).rejects.toThrow(
        "Chat not found with ID: non-existent-id"
      );
    });

    it("should detect and process artifacts in AI responses", async () => {
      // Arrange
      const chatId = mockUuid;
      const chat: Chat = {
        id: chatId,
        filePath: "/path/to/chat.json",
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
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

      chatFileService.findById.mockResolvedValue(chat);
      chatFileService.findByPath.mockResolvedValue(chat);
      chatFileService.addMessage.mockResolvedValue(chat);

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

      // Assert - this is commented out as in the original test
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

  describe("handleOpenFile", () => {
    it("should detect file type and handle non-chat files", async () => {
      // Arrange
      const filePath = "path/to/document.txt";
      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath,
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      // Mock determineFileType to return "text" (non-chat)
      jest
        .spyOn(chatService as any, "determineFileType")
        .mockReturnValue("text");

      // Get the handler
      const openFileHandler = (eventBus.subscribe as jest.Mock).mock.calls.find(
        (call) => call[0] === "ClientOpenFile"
      )[1];

      // Act
      await openFileHandler(event);

      // Assert
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerFileTypeDetectedEvent>({
          kind: "ServerFileTypeDetected",
          filePath,
          fileType: "text",
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // Should not proceed to open chat
      expect(chatFileService.findByPath).not.toHaveBeenCalled();
    });

    it("should redirect chat files to handleOpenChatFile", async () => {
      // Arrange
      const filePath = "path/to/chat1.json";
      const chat: Chat = {
        id: "chat123",
        filePath,
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock findByPath to return the chat object
      chatFileService.findByPath.mockResolvedValue(chat);

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath,
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      // Mock determineFileType to return "chat"
      jest
        .spyOn(chatService as any, "determineFileType")
        .mockReturnValue("chat");

      // Get the handler
      const openFileHandler = (eventBus.subscribe as jest.Mock).mock.calls.find(
        (call) => call[0] === "ClientOpenFile"
      )[1];

      // Act
      await openFileHandler(event);

      // Assert
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerFileTypeDetectedEvent>({
          kind: "ServerFileTypeDetected",
          filePath,
          fileType: "chat",
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );

      // It should call findByPath
      expect(chatFileService.findByPath).toHaveBeenCalledWith(filePath);

      // It should emit the chat file opened event
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatFileOpenedEvent>({
          kind: "ServerChatFileOpened",
          filePath,
          chat,
          timestamp: expect.any(Date),
          correlationId: "corr-123",
        })
      );
    });
  });

  describe("handleOpenChatFile", () => {
    it("should open and initialize a chat file", async () => {
      // Arrange
      const filePath = "path/to/chat1.json";
      const chat: Chat = {
        id: "chat123",
        filePath,
        messages: [],
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const event: ClientOpenChatFileEvent = {
        kind: "ClientOpenChatFile",
        filePath,
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      chatFileService.findByPath.mockResolvedValue(chat);

      // Get the handler
      const openChatFileHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientOpenChatFile")[1];

      // Act
      await openChatFileHandler(event);

      // Assert
      expect(chatFileService.findByPath).toHaveBeenCalledWith(filePath);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<ServerChatFileOpenedEvent>({
          kind: "ServerChatFileOpened",
          filePath,
          chat,
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

    it("should throw an error when file does not exist", async () => {
      // Arrange
      const filePath = "path/to/missing-chat.json";

      const event: ClientOpenChatFileEvent = {
        kind: "ClientOpenChatFile",
        filePath,
        timestamp: new Date(),
      };

      chatFileService.findByPath.mockRejectedValue(
        new Error(`Failed to open chat file: ${filePath}`)
      );

      // Get the handler
      const openChatFileHandler = (
        eventBus.subscribe as jest.Mock
      ).mock.calls.find((call) => call[0] === "ClientOpenChatFile")[1];

      // Act & Assert
      await expect(openChatFileHandler(event)).rejects.toThrow(
        `Failed to open chat file: ${filePath}`
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

      expect(eventBus.subscribe).toHaveBeenCalledWith(
        "ClientOpenChatFile",
        expect.any(Function)
      );
    });
  });
});
