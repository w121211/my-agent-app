import { EventBus } from "../src/event-bus.js";
import { TaskService } from "../src/task-service.js";
import { TaskRepository } from "../src/repositories.js";
import {
  ClientEventKind,
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
import { IWorkspaceManager } from "../src/workspace-manager.js";

// Mock implementation for workspace manager
const mockWorkspaceManager: jest.Mocked<IWorkspaceManager> = {
  loadWorkspace: jest.fn(),
  saveTaskToJson: jest.fn(),
  createTaskFolder: jest.fn(),
  createChatFile: jest.fn(),
  saveChatToFile: jest.fn(),
  readChatFile: jest.fn(),
  getTaskFolderPath: jest.fn(),
  getSubtaskFolderPath: jest.fn(),
  getChatFilePath: jest.fn(),
  ensureFolderExists: jest.fn(),
};

// Mock implementation for task repository
const mockTaskRepository: jest.Mocked<TaskRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createTaskFolder: jest.fn(),
} as unknown as jest.Mocked<TaskRepository>;

describe("TaskService", () => {
  let eventBus: EventBus;
  let taskService: TaskService;
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create fresh event bus for each test
    eventBus = new EventBus({ environment: "server" });

    // Spy on eventBus.emit method
    emitSpy = jest.spyOn(eventBus, "emit");

    // Create task service with mocked dependencies
    taskService = new TaskService(eventBus, mockTaskRepository);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("handleCreateTaskCommand", () => {
    it("should create a task with correct properties and emit expected events", async () => {
      // Arrange
      const createTaskEvent: ClientCreateTaskEvent = {
        kind: "ClientCreateTask",
        taskName: "Test Task",
        taskConfig: { key: "value" },
        timestamp: new Date(),
        correlationId: "test-correlation-id",
      };

      // Mock the createTaskFolder to return a path
      mockTaskRepository.createTaskFolder.mockResolvedValue(
        "/mock/path/to/task"
      );

      // Act
      await eventBus.emit(createTaskEvent);

      // Assert
      // Check if task repository methods were called correctly
      expect(mockTaskRepository.createTaskFolder).toHaveBeenCalledTimes(1);
      expect(mockTaskRepository.save).toHaveBeenCalledTimes(1);

      // Verify the task object created
      expect(mockTaskRepository.save).toHaveBeenCalledTimes(1);
      const saveCall = mockTaskRepository.save.mock.calls[0];
      expect(saveCall).toBeDefined();
      const savedTask = saveCall?.[0] as Task;

      expect(savedTask.title).toBe(createTaskEvent.taskName);
      expect(savedTask.status).toBe("CREATED");
      expect(savedTask.config).toEqual(createTaskEvent.taskConfig);
      expect(savedTask.folderPath).toBe("/mock/path/to/task");

      // Verify events emitted
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining<ServerTaskFolderCreatedEvent>({
          kind: "ServerTaskFolderCreated",
          taskId: savedTask.id,
          folderPath: "/mock/path/to/task",
          correlationId: createTaskEvent.correlationId,
          timestamp: expect.any(Date),
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining<ServerTaskConfigFileCreatedEvent>({
          kind: "ServerTaskConfigFileCreated",
          taskId: savedTask.id,
          filePath: expect.stringContaining("/task.json"),
          config: createTaskEvent.taskConfig,
          correlationId: createTaskEvent.correlationId,
          timestamp: expect.any(Date),
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining<ServerTaskCreatedEvent>({
          kind: "ServerTaskCreated",
          taskId: savedTask.id,
          taskName: createTaskEvent.taskName,
          config: createTaskEvent.taskConfig,
          correlationId: createTaskEvent.correlationId,
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe("handleStartTaskCommand", () => {
    it("should update task status and emit expected events", async () => {
      // Arrange
      const taskId = "test-task-id";
      const startTaskEvent: ClientStartTaskEvent = {
        kind: "ClientStartTask",
        taskId,
        timestamp: new Date(),
        correlationId: "test-correlation-id",
      };

      // Mock finding the task
      const mockTask: Task = {
        id: taskId,
        seqNumber: 1,
        title: "Test Task",
        status: "CREATED" as TaskStatus,
        config: { key: "value" },
        createdAt: new Date(),
        updatedAt: new Date(),
        folderPath: "/mock/path",
      };

      mockTaskRepository.findById.mockResolvedValue(mockTask);

      // Act
      await eventBus.emit(startTaskEvent);

      // Assert
      // Verify task was loaded and status updated
      expect(mockTaskRepository.findById).toHaveBeenCalledWith(taskId);
      expect(mockTaskRepository.save).toHaveBeenCalledTimes(1);

      // Verify saved task has updated status
      const saveCall = mockTaskRepository.save.mock.calls[0];
      expect(saveCall).toBeDefined();
      const savedTask = saveCall?.[0] as Task;
      expect(savedTask.status).toBe("IN_PROGRESS");

      // Verify events emitted
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining<ServerTaskLoadedEvent>({
          kind: "ServerTaskLoaded",
          taskId,
          taskState: expect.objectContaining({ status: "IN_PROGRESS" }),
          correlationId: startTaskEvent.correlationId,
          timestamp: expect.any(Date),
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining<ServerTaskInitializedEvent>({
          kind: "ServerTaskInitialized",
          taskId,
          initialState: { status: "IN_PROGRESS" },
          correlationId: startTaskEvent.correlationId,
          timestamp: expect.any(Date),
        })
      );
    });

    it("should throw error when task not found", async () => {
      // Arrange
      const taskId = "non-existent-task";
      const startTaskEvent: ClientStartTaskEvent = {
        kind: "ClientStartTask",
        taskId,
        timestamp: new Date(),
        correlationId: undefined,
      };

      // Mock task not found
      mockTaskRepository.findById.mockResolvedValue(undefined);

      // Act & Assert
      await expect(eventBus.emit(startTaskEvent)).rejects.toThrow(
        `Task ${taskId} not found`
      );

      // Verify no events emitted for non-existent task
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("Event subscriptions", () => {
    it("should subscribe to correct events", () => {
      // Spy on the subscribe method
      const subscribeSpy = jest.spyOn(eventBus, "subscribe");

      // Create new service to trigger subscriptions
      new TaskService(eventBus, mockTaskRepository);

      // Verify subscribed to the right events
      expect(subscribeSpy).toHaveBeenCalledWith(
        "ClientCreateTask",
        expect.any(Function)
      );

      expect(subscribeSpy).toHaveBeenCalledWith(
        "ClientStartTask",
        expect.any(Function)
      );
    });
  });
});
