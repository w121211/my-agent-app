import { EventBus } from "../event-bus.js";
import { TaskService } from "../task-service.js";
import { TaskRepository } from "../repositories.js";
import {
  ClientEventType,
  ClientCreateTaskCommand,
  ClientStartTaskCommand,
  ClientStartSubtaskCommand,
  ServerNextSubtaskTriggered,
  ServerEventType,
  Task,
  TaskStatus,
  SubtaskStatus,
} from "../event-types.js";
import { IWorkspaceManager } from "../workspace-manager.js";

// Mock dependencies
jest.mock("../repositories");
jest.mock("../workspace-manager");

describe("TaskService", () => {
  // Test setup
  let eventBus: EventBus;
  let taskRepo: TaskRepository;
  let workspaceManager: IWorkspaceManager;
  let taskService: TaskService;
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create fresh instances for each test
    eventBus = new EventBus({ environment: "server" });

    // Mock workspace manager
    workspaceManager = {
      createDirectory: jest.fn().mockResolvedValue("/mock/tasks/task-123"),
      writeFile: jest
        .fn()
        .mockResolvedValue("/mock/tasks/task-123/config.json"),
      readFile: jest.fn().mockResolvedValue(JSON.stringify({ key: "value" })),
      fileExists: jest.fn().mockResolvedValue(true),
      getWorkspacePath: jest.fn().mockReturnValue("/mock/workspace"),
    } as unknown as IWorkspaceManager;

    // Create repository with workspace manager
    taskRepo = new TaskRepository(workspaceManager);

    // Mock repository methods
    (taskRepo.createTaskFolder as jest.Mock).mockResolvedValue(
      "/mock/tasks/task-123"
    );
    (taskRepo.save as jest.Mock).mockResolvedValue(undefined);
    (taskRepo.findById as jest.Mock).mockImplementation(
      async (taskId: string) => {
        // Default mock task
        return {
          id: taskId,
          seqNumber: 1,
          title: "Test Task",
          status: "CREATED",
          subtasks: [
            {
              id: "subtask-1",
              taskId,
              seqNumber: 0,
              title: "First Subtask",
              description: "First subtask description",
              status: "PENDING",
              team: { agent: "ASSISTANT" },
              inputType: "string",
              outputType: "json",
            },
            {
              id: "subtask-2",
              taskId,
              seqNumber: 1,
              title: "Second Subtask",
              description: "Second subtask description",
              status: "PENDING",
              team: { agent: "FUNCTION_EXECUTOR", human: "USER" },
              inputType: "json",
              outputType: "json",
            },
          ],
          folderPath: `/mock/tasks/${taskId}`,
          config: { key: "value" },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    );

    // Spy on eventBus.emit
    emitSpy = jest.spyOn(eventBus, "emit");

    // Initialize the service under test
    taskService = new TaskService(eventBus, taskRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCreateTaskCommand", () => {
    it("should create a task, save it, and emit appropriate events", async () => {
      // Arrange
      const command: ClientCreateTaskCommand = {
        eventType: "CLIENT_CREATE_TASK_COMMAND",
        taskName: "New Test Task",
        taskConfig: { testKey: "testValue" },
        timestamp: new Date(),
        correlationId: "corr-123",
      };

      // Act
      await eventBus.emit(command);

      // Assert
      expect(taskRepo.createTaskFolder).toHaveBeenCalledTimes(1);
      expect(taskRepo.save).toHaveBeenCalledTimes(1);

      // Check if task was created correctly
      const taskArg = (taskRepo.save as jest.Mock).mock.calls[0][0] as Task;
      expect(taskArg.title).toBe(command.taskName);
      expect(taskArg.config).toEqual(command.taskConfig);
      expect(taskArg.status).toBe("CREATED");
      expect(taskArg.subtasks.length).toBe(2); // Default Planning and Setup subtasks

      // Check emitted events
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SERVER_TASK_FOLDER_CREATED",
          correlationId: command.correlationId,
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SERVER_TASK_CREATED",
          taskName: command.taskName,
          config: command.taskConfig,
          correlationId: command.correlationId,
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "CLIENT_START_TASK_COMMAND",
          correlationId: command.correlationId,
        })
      );
    });
  });

  describe("handleStartTaskCommand", () => {
    it("should load task and start the first subtask", async () => {
      // Arrange
      const command: ClientStartTaskCommand = {
        eventType: "CLIENT_START_TASK_COMMAND",
        taskId: "task-123",
        timestamp: new Date(),
        correlationId: "corr-456",
      };

      // Act
      await eventBus.emit(command);

      // Assert
      expect(taskRepo.findById).toHaveBeenCalledWith(command.taskId);

      // Check emitted events
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "SERVER_TASK_LOADED",
          taskId: command.taskId,
          correlationId: command.correlationId,
        })
      );

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "CLIENT_START_SUBTASK_COMMAND",
          taskId: command.taskId,
          subtaskId: "subtask-1", // First subtask ID
          correlationId: command.correlationId,
        })
      );
    });

    it("should throw error if task not found", async () => {
      // Arrange
      const command: ClientStartTaskCommand = {
        eventType: "CLIENT_START_TASK_COMMAND",
        taskId: "non-existent-task",
        timestamp: new Date(),
      };

      // Mock repository to return undefined
      (taskRepo.findById as jest.Mock).mockResolvedValueOnce(undefined);

      // Act & Assert
      await expect(eventBus.emit(command)).rejects.toThrow(
        "Task non-existent-task not found"
      );
    });
  });

  describe("onNextSubtaskTriggered", () => {
    it("should start the next subtask when current one is completed", async () => {
      // Arrange
      const event: ServerNextSubtaskTriggered = {
        eventType: "SERVER_NEXT_SUBTASK_TRIGGERED",
        taskId: "task-123",
        currentSubtaskId: "subtask-1",
        timestamp: new Date(),
        correlationId: "corr-789",
      };

      // Mock the task with completed first subtask
      (taskRepo.findById as jest.Mock).mockResolvedValueOnce({
        id: "task-123",
        seqNumber: 1,
        title: "Test Task",
        status: "IN_PROGRESS",
        subtasks: [
          {
            id: "subtask-1",
            taskId: "task-123",
            seqNumber: 0,
            title: "First Subtask",
            description: "First subtask description",
            status: "COMPLETED", // Already completed
            team: { agent: "ASSISTANT" },
            inputType: "string",
            outputType: "json",
          },
          {
            id: "subtask-2",
            taskId: "task-123",
            seqNumber: 1,
            title: "Second Subtask",
            description: "Second subtask description",
            status: "PENDING",
            team: { agent: "FUNCTION_EXECUTOR", human: "USER" },
            inputType: "json",
            outputType: "json",
          },
        ],
        folderPath: "/mock/tasks/task-123",
        config: { key: "value" },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await eventBus.emit(event);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "CLIENT_START_SUBTASK_COMMAND",
          taskId: "task-123",
          subtaskId: "subtask-2", // Next subtask
          correlationId: event.correlationId,
        })
      );
    });

    it("should complete the task if no more subtasks", async () => {
      // Arrange
      const event: ServerNextSubtaskTriggered = {
        eventType: "SERVER_NEXT_SUBTASK_TRIGGERED",
        taskId: "task-123",
        currentSubtaskId: "subtask-2", // Last subtask
        timestamp: new Date(),
      };

      // Mock the task with completed last subtask
      const mockTask = {
        id: "task-123",
        seqNumber: 1,
        title: "Test Task",
        status: "IN_PROGRESS",
        subtasks: [
          {
            id: "subtask-1",
            taskId: "task-123",
            seqNumber: 0,
            title: "First Subtask",
            description: "First subtask description",
            status: "COMPLETED",
            team: { agent: "ASSISTANT" },
            inputType: "string",
            outputType: "json",
          },
          {
            id: "subtask-2",
            taskId: "task-123",
            seqNumber: 1,
            title: "Second Subtask",
            description: "Second subtask description",
            status: "COMPLETED", // Last subtask completed
            team: { agent: "FUNCTION_EXECUTOR", human: "USER" },
            inputType: "json",
            outputType: "json",
          },
        ],
        folderPath: "/mock/tasks/task-123",
        config: { key: "value" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (taskRepo.findById as jest.Mock).mockResolvedValueOnce(mockTask);

      // Act
      await eventBus.emit(event);

      // Assert
      expect(taskRepo.save).toHaveBeenCalled();

      // Check task status was updated to COMPLETED
      const savedTask = (taskRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedTask.status).toBe("COMPLETED");
    });

    it("should throw error if current subtask is not completed", async () => {
      // Arrange
      const event: ServerNextSubtaskTriggered = {
        eventType: "SERVER_NEXT_SUBTASK_TRIGGERED",
        taskId: "task-123",
        currentSubtaskId: "subtask-1",
        timestamp: new Date(),
      };

      // Mock task with non-completed subtask
      (taskRepo.findById as jest.Mock).mockResolvedValueOnce({
        id: "task-123",
        subtasks: [
          {
            id: "subtask-1",
            taskId: "task-123",
            seqNumber: 0,
            status: "IN_PROGRESS", // Not completed
          },
        ],
      });

      // Act & Assert
      await expect(eventBus.emit(event)).rejects.toThrow(
        "Current subtask subtask-1 not completed"
      );
    });
  });

  describe("Event handling integration", () => {
    it("should correctly subscribe to events on initialization", () => {
      // Spy on the subscribe method
      const subscribeSpy = jest.spyOn(eventBus, "subscribe");

      // Create a new service to trigger subscriptions
      new TaskService(eventBus, taskRepo);

      // Verify the service subscribed to the expected events
      expect(subscribeSpy).toHaveBeenCalledWith(
        "CLIENT_CREATE_TASK_COMMAND",
        expect.any(Function)
      );

      expect(subscribeSpy).toHaveBeenCalledWith(
        "CLIENT_START_TASK_COMMAND",
        expect.any(Function)
      );

      expect(subscribeSpy).toHaveBeenCalledWith(
        "SERVER_NEXT_SUBTASK_TRIGGERED",
        expect.any(Function)
      );
    });
  });
});
