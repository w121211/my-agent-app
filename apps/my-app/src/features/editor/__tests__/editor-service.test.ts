import "reflect-metadata";
import { ILogObj, Logger } from "tslog";
import { IEventBus } from "@repo/events-core/event-bus";
import {
  ServerTaskCreated,
  ServerChatCreated,
  ServerMessageReceived,
  ServerSubtaskStarted,
  ServerEventType,
  ChatMetadata,
} from "@repo/events-core/event-types";
import { EditorService } from "../editor-service";
import { useEditorStore } from "../editor-store";

// Remove type that wasn't working
// import { ILogObj, Logger } from "tslog";

// Mock the Zustand store
jest.mock("../editor-store", () => ({
  useEditorStore: {
    getState: jest.fn().mockReturnValue({
      createNewTask: jest.fn(),
      createNewChat: jest.fn(),
      sendMessage: jest.fn(),
      setSelectedItem: jest.fn(),
      toggleFolder: jest.fn(),
      isExpanded: jest.fn().mockReturnValue(false),
      data: {
        id: "root",
        name: "editor",
        type: "folder",
        children: [],
      },
    }),
  },
}));

describe("EditorService", () => {
  // Mock dependencies
  const mockEventBus: jest.Mocked<IEventBus> = {
    emit: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue(() => {}),
    subscribeToAllClientEvents: jest.fn().mockReturnValue(() => {}),
    subscribeToAllServerEvents: jest.fn().mockReturnValue(() => {}),
    unsubscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
    hasHandlers: jest.fn().mockReturnValue(false),
    getHandlerCount: jest.fn().mockReturnValue(0),
    clear: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger<ILogObj>;

  let editorService: EditorService;
  let store: ReturnType<typeof useEditorStore.getState>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Get a fresh reference to the store mock
    store = useEditorStore.getState();

    // Create a new instance of EditorService for each test
    editorService = new EditorService(mockEventBus, mockLogger);
  });

  describe("initialization", () => {
    it("should register event handlers during initialization", () => {
      // The constructor should have registered handlers for all server events
      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(17); // Total number of server events
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "EditorService initialized"
      );
    });
  });

  describe("server event handlers", () => {
    it("should handle SERVER_TASK_CREATED event", () => {
      // Find the handler for SERVER_TASK_CREATED
      const createTaskHandler = findEventHandler("SERVER_TASK_CREATED");

      // Call the handler with a sample event
      createTaskHandler({
        eventType: "SERVER_TASK_CREATED" as ServerEventType,
        timestamp: new Date(),
        taskId: "task123",
        taskName: "New Task",
        config: {},
      } as ServerTaskCreated);

      // Verify store interaction
      expect(store.createNewTask).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith("Task created: task123");
    });

    it("should handle SERVER_CHAT_CREATED event", () => {
      // Mock findItemById to return a subtask folder
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(editorService as any, "findItemById").mockReturnValue({
        id: "subtask123",
        type: "folder",
        name: "s1-planning",
      });

      // Find the handler for SERVER_CHAT_CREATED
      const createChatHandler = findEventHandler("SERVER_CHAT_CREATED");

      // Call the handler with a sample event
      createChatHandler({
        eventType: "SERVER_CHAT_CREATED" as ServerEventType,
        timestamp: new Date(),
        taskId: "task123",
        subtaskId: "subtask123",
        chatId: "chat123",
      } as ServerChatCreated);

      // Verify store interaction
      expect(store.createNewChat).toHaveBeenCalledWith("subtask123");
      expect(mockLogger.debug).toHaveBeenCalledWith("Chat created: chat123");
    });

    it("should handle SERVER_MESSAGE_RECEIVED event", () => {
      // Mock findItemById to return a chat item
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(editorService as any, "findItemById").mockReturnValue({
        id: "chat123",
        type: "chat",
        name: "chat.json",
      });

      // Find the handler for SERVER_MESSAGE_RECEIVED
      const messageReceivedHandler = findEventHandler(
        "SERVER_MESSAGE_RECEIVED"
      );

      // Call the handler with a sample event
      messageReceivedHandler({
        eventType: "SERVER_MESSAGE_RECEIVED" as ServerEventType,
        timestamp: new Date(),
        chatId: "chat123",
        message: {
          id: "msg123",
          role: "USER",
          content: "Hello",
          timestamp: new Date(),
        },
      } as ServerMessageReceived);

      // Verify store interaction
      expect(store.sendMessage).toHaveBeenCalledWith("chat123", "Hello");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Message received for chat: chat123"
      );
    });

    it("should handle SERVER_SUBTASK_STARTED event", () => {
      // Mock findItemById to return a subtask folder
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(editorService as any, "findItemById").mockReturnValue({
        id: "subtask123",
        type: "folder",
        name: "s1-planning",
      });

      // Find the handler for SERVER_SUBTASK_STARTED
      const subtaskStartedHandler = findEventHandler("SERVER_SUBTASK_STARTED");

      // Call the handler with a sample event
      subtaskStartedHandler({
        eventType: "SERVER_SUBTASK_STARTED" as ServerEventType,
        timestamp: new Date(),
        taskId: "task123",
        subtaskId: "subtask123",
      } as ServerSubtaskStarted);

      // Verify store interaction
      expect(store.setSelectedItem).toHaveBeenCalledWith({
        id: "subtask123",
        type: "folder",
        name: "s1-planning",
      });
      expect(store.toggleFolder).toHaveBeenCalledWith("subtask123");
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Subtask started: subtask123"
      );
    });
  });

  describe("client event methods", () => {
    it("should emit CLIENT_CREATE_TASK_COMMAND", () => {
      const taskName = "New Task";
      const taskConfig = { key: "value" };

      editorService.clientCreateTask(taskName, taskConfig);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        eventType: "CLIENT_CREATE_TASK_COMMAND",
        timestamp: expect.any(Date),
        taskName,
        taskConfig,
      });
    });

    it("should emit CLIENT_SUBMIT_MESSAGE_COMMAND", () => {
      const chatId = "chat123";
      const content = "Hello world";

      editorService.clientSubmitMessage(chatId, content);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        eventType: "CLIENT_SUBMIT_MESSAGE_COMMAND",
        timestamp: expect.any(Date),
        chatId,
        content,
      });
    });

    it("should emit CLIENT_START_NEW_CHAT_COMMAND", () => {
      const taskId = "task123";
      const subtaskId = "subtask123";
      const metadata: ChatMetadata = { title: "Chat Title" };

      editorService.clientStartNewChat(taskId, subtaskId, metadata);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        eventType: "CLIENT_START_NEW_CHAT_COMMAND",
        timestamp: expect.any(Date),
        taskId,
        subtaskId,
        metadata,
      });
    });

    it("should emit CLIENT_APPROVE_WORK", () => {
      const chatId = "chat123";
      const approvedWork = "Approved code";

      editorService.clientApproveWork(chatId, approvedWork);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        eventType: "CLIENT_APPROVE_WORK",
        timestamp: expect.any(Date),
        chatId,
        approvedWork,
      });
    });
  });

  // Helper function to find an event handler by event type
  function findEventHandler(eventType: string) {
    // Find the call to subscribe with the matching event type
    const calls = mockEventBus.subscribe.mock.calls;
    const matchingCall = calls.find((call) => call[0] === eventType);

    if (!matchingCall) {
      throw new Error(`No handler registered for event type: ${eventType}`);
    }

    // Return the handler function (second argument)
    return matchingCall[1];
  }
});
