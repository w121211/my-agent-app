import { TaskService } from "../src/task-service.js";
import { IEventBus } from "../src/event-bus.js";
import { TaskRepository } from "../src/repositories.js";
import {
  ClientCreateTaskEvent,
  ClientStartTaskEvent,
  ServerTaskCreatedEvent,
  ServerTaskFolderCreatedEvent,
  ServerTaskConfigFileCreatedEvent,
  ServerTaskInitializedEvent,
  ServerTaskLoadedEvent,
  Task,
  TaskStatus,
} from "../src/event-types.js";

describe("TaskService", () => {
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockTaskRepo: jest.Mocked<TaskRepository>;
  let taskService: TaskService;
  let eventHandlers: Record<string, Function> = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock event bus that captures handlers for testing
    mockEventBus = {
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockImplementation((eventKind, handler) => {
        eventHandlers[eventKind] = handler;
        return jest.fn(); // Return unsubscribe function
      }),
      subscribeToAllClientEvents: jest.fn(),
      subscribeToAllServerEvents: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      hasHandlers: jest.fn(),
      getHandlerCount: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<IEventBus>;

    // Create mock task repository
    mockTaskRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn(),
      createTaskFolder: jest.fn(),
    } as unknown as jest.Mocked<TaskRepository>;

    // Initialize service which registers event handlers
    taskService = new TaskService(mockEventBus, mockTaskRepo);
  });

  describe("Task Creation", () => {
    it("should process task creation and emit appropriate events", async () => {
      // Arrange
      const taskName = "Test Task";
      const taskConfig = { setting: "value" };
      const folderPath = "/path/to/task-folder";

      const createTaskEvent: ClientCreateTaskEvent = {
        kind: "ClientCreateTask",
        taskName,
        taskConfig,
        timestamp: new Date(),
        correlationId: "test-correlation-id",
      };

      mockTaskRepo.createTaskFolder.mockResolvedValue(folderPath);

      // Act
      const handler = eventHandlers["ClientCreateTask"];
      if (!handler) throw new Error("Handler for ClientCreateTask not found");
      await handler(createTaskEvent);

      // Assert
      expect(mockTaskRepo.createTaskFolder).toHaveBeenCalled();
      expect(mockTaskRepo.save).toHaveBeenCalled();

      // Verify saved task properties
      const savedTask = mockTaskRepo.save.mock.calls[0]?.[0] as Task;
      expect(savedTask.title).toBe(taskName);
      expect(savedTask.status).toBe("CREATED");
      expect(savedTask.config).toEqual(taskConfig);
      expect(savedTask.folderPath).toBe(folderPath);

      // Verify emitted events
      expect(mockEventBus.emit).toHaveBeenCalledTimes(3);

      // Check ServerTaskFolderCreatedEvent
      const folderCreatedEvent = mockEventBus.emit.mock.calls
        .map((call) => call[0])
        .find(
          (event) => event.kind === "ServerTaskFolderCreated"
        ) as ServerTaskFolderCreatedEvent;

      expect(folderCreatedEvent).toBeDefined();
      expect(folderCreatedEvent.folderPath).toBe(folderPath);
      expect(folderCreatedEvent.taskId).toBe(savedTask.id);
      expect(folderCreatedEvent.correlationId).toBe(
        createTaskEvent.correlationId
      );

      // Check ServerTaskConfigFileCreatedEvent
      const configFileCreatedEvent = mockEventBus.emit.mock.calls
        .map((call) => call[0])
        .find(
          (event) => event.kind === "ServerTaskConfigFileCreated"
        ) as ServerTaskConfigFileCreatedEvent;

      expect(configFileCreatedEvent).toBeDefined();
      expect(configFileCreatedEvent.config).toEqual(taskConfig);
      expect(configFileCreatedEvent.filePath).toBe(`${folderPath}/task.json`);
      expect(configFileCreatedEvent.correlationId).toBe(
        createTaskEvent.correlationId
      );

      // Check ServerTaskCreatedEvent
      const taskCreatedEvent = mockEventBus.emit.mock.calls
        .map((call) => call[0])
        .find(
          (event) => event.kind === "ServerTaskCreated"
        ) as ServerTaskCreatedEvent;

      expect(taskCreatedEvent).toBeDefined();
      expect(taskCreatedEvent.taskName).toBe(taskName);
      expect(taskCreatedEvent.config).toEqual(taskConfig);
      expect(taskCreatedEvent.correlationId).toBe(
        createTaskEvent.correlationId
      );
    });
  });

  describe("Task Starting", () => {
    it("should update task status to IN_PROGRESS when starting a task", async () => {
      // Arrange
      const taskId = "test-task-id";
      const startTaskEvent: ClientStartTaskEvent = {
        kind: "ClientStartTask",
        taskId,
        timestamp: new Date(),
        correlationId: "test-correlation-id",
      };

      const existingTask: Task = {
        id: taskId,
        seqNumber: 1,
        title: "Existing Task",
        status: "CREATED" as TaskStatus,
        config: { key: "value" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTaskRepo.findById.mockResolvedValue(existingTask);

      // Act
      const handler = eventHandlers["ClientStartTask"];
      if (!handler) throw new Error("Handler for ClientStartTask not found");
      await handler(startTaskEvent);

      // Assert
      expect(mockTaskRepo.findById).toHaveBeenCalledWith(taskId);

      // Verify the task was updated
      const savedTask = mockTaskRepo.save.mock.calls[0]?.[0] as Task;
      expect(savedTask.id).toBe(taskId);
      expect(savedTask.status).toBe("IN_PROGRESS");

      // Verify emitted events
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

      // Check ServerTaskLoadedEvent
      const taskLoadedEvent = mockEventBus.emit.mock.calls
        .map((call) => call[0])
        .find(
          (event) => event.kind === "ServerTaskLoaded"
        ) as ServerTaskLoadedEvent;

      expect(taskLoadedEvent).toBeDefined();
      expect(taskLoadedEvent.taskId).toBe(taskId);
      expect(taskLoadedEvent.taskState).toEqual(savedTask);
      expect(taskLoadedEvent.correlationId).toBe(startTaskEvent.correlationId);

      // Check ServerTaskInitializedEvent
      const taskInitializedEvent = mockEventBus.emit.mock.calls
        .map((call) => call[0])
        .find(
          (event) => event.kind === "ServerTaskInitialized"
        ) as ServerTaskInitializedEvent;

      expect(taskInitializedEvent).toBeDefined();
      expect(taskInitializedEvent.taskId).toBe(taskId);
      expect(taskInitializedEvent.initialState).toEqual({
        status: "IN_PROGRESS",
      });
      expect(taskInitializedEvent.correlationId).toBe(
        startTaskEvent.correlationId
      );
    });

    it("should throw an error when starting a non-existent task", async () => {
      // Arrange
      const taskId = "non-existent-task-id";
      const startTaskEvent: ClientStartTaskEvent = {
        kind: "ClientStartTask",
        taskId,
        timestamp: new Date(),
        correlationId: "test-correlation-id",
      };

      mockTaskRepo.findById.mockResolvedValue(undefined);

      // Act & Assert
      const handler = eventHandlers["ClientStartTask"];
      if (!handler) throw new Error("Handler for ClientStartTask not found");
      await expect(handler(startTaskEvent)).rejects.toThrow(
        `Task ${taskId} not found`
      );

      // Verify no further processing happened
      expect(mockTaskRepo.save).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });
});
