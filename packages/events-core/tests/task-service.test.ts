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
  BaseEvent,
} from "../src/event-types.js";

describe("TaskService", () => {
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockTaskRepo: jest.Mocked<TaskRepository>;
  let taskService: TaskService;
  let eventHandlers: Record<string, (event: BaseEvent) => Promise<void>> = {};

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
    it("should create a task and emit appropriate events in correct order", async () => {
      // Arrange
      const taskName = "Test Task";
      const taskConfig = { setting: "value" };
      const folderPath = "/path/to/task-folder";
      const correlationId = "test-correlation-id";

      const createTaskEvent: ClientCreateTaskEvent = {
        kind: "ClientCreateTask",
        taskName,
        taskConfig,
        timestamp: new Date(),
        correlationId,
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

      // Verify emitted events and their order
      expect(mockEventBus.emit).toHaveBeenCalledTimes(3);

      const emittedEvents = mockEventBus.emit.mock.calls.map((call) => call[0]);

      // First event should be ServerTaskFolderCreatedEvent
      expect(emittedEvents[0]?.kind).toBe("ServerTaskFolderCreated");
      const folderCreatedEvent =
        emittedEvents[0] as ServerTaskFolderCreatedEvent;
      expect(folderCreatedEvent.folderPath).toBe(folderPath);
      expect(folderCreatedEvent.taskId).toBe(savedTask.id);
      expect(folderCreatedEvent.correlationId).toBe(correlationId);

      // Second event should be ServerTaskConfigFileCreatedEvent
      expect(emittedEvents[1]?.kind).toBe("ServerTaskConfigFileCreated");
      const configFileCreatedEvent =
        emittedEvents[1] as ServerTaskConfigFileCreatedEvent;
      expect(configFileCreatedEvent.config).toEqual(taskConfig);
      expect(configFileCreatedEvent.filePath).toBe(`${folderPath}/task.json`);
      expect(configFileCreatedEvent.correlationId).toBe(correlationId);

      // Third event should be ServerTaskCreatedEvent
      expect(emittedEvents[2]?.kind).toBe("ServerTaskCreated");
      const taskCreatedEvent = emittedEvents[2] as ServerTaskCreatedEvent;
      expect(taskCreatedEvent.taskName).toBe(taskName);
      expect(taskCreatedEvent.config).toEqual(taskConfig);
      expect(taskCreatedEvent.correlationId).toBe(correlationId);
    });

    it("should properly create a task through direct method call", async () => {
      // Arrange
      const taskName = "Direct Method Task";
      const taskConfig = { direct: "method-call" };
      const folderPath = "/path/to/direct-task";
      const correlationId = "direct-correlation-id";

      mockTaskRepo.createTaskFolder.mockResolvedValue(folderPath);

      // Act
      const result = await taskService.createTask(
        taskName,
        taskConfig,
        correlationId
      );

      // Assert
      expect(result).toEqual({
        taskId: expect.any(String),
        folderPath,
      });

      expect(mockTaskRepo.createTaskFolder).toHaveBeenCalled();
      expect(mockTaskRepo.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe("Task Starting", () => {
    it("should update task status to IN_PROGRESS when starting a task", async () => {
      // Arrange
      const taskId = "test-task-id";
      const correlationId = "test-correlation-id";

      const startTaskEvent: ClientStartTaskEvent = {
        kind: "ClientStartTask",
        taskId,
        timestamp: new Date(),
        correlationId,
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

      // Verify emitted events and their order
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

      const emittedEvents = mockEventBus.emit.mock.calls.map((call) => call[0]);

      // First event should be ServerTaskLoadedEvent
      expect(emittedEvents[0]?.kind).toBe("ServerTaskLoaded");
      const taskLoadedEvent = emittedEvents[0] as ServerTaskLoadedEvent;
      expect(taskLoadedEvent.taskId).toBe(taskId);
      expect(taskLoadedEvent.taskState).toEqual(savedTask);
      expect(taskLoadedEvent.correlationId).toBe(correlationId);

      // Second event should be ServerTaskInitializedEvent
      expect(emittedEvents[1]?.kind).toBe("ServerTaskInitialized");
      const taskInitializedEvent =
        emittedEvents[1] as ServerTaskInitializedEvent;
      expect(taskInitializedEvent.taskId).toBe(taskId);
      expect(taskInitializedEvent.initialState).toEqual({
        status: "IN_PROGRESS",
      });
      expect(taskInitializedEvent.correlationId).toBe(correlationId);
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
