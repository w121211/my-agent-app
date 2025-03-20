import { IEventBus } from "../event-bus.js";
import { TaskRepository } from "../repositories.js";
import { SubtaskService } from "../subtask-service.js";
import {
  ClientEventType,
  ClientStartSubtaskCommand,
  ClientCompleteSubtaskCommand,
  ServerEventType,
  ServerSubtaskUpdated,
  Subtask,
  SubtaskStatus,
  Task,
  TaskStatus,
  Role,
} from "../event-types.js";

// Type for accessing private methods during testing
type PrivateSubtaskService = {
  handleStartSubtaskCommand: (
    command: ClientStartSubtaskCommand
  ) => Promise<void>;
  handleCompleteSubtaskCommand: (
    command: ClientCompleteSubtaskCommand
  ) => Promise<void>;
  onSubtaskUpdated: (event: ServerSubtaskUpdated) => Promise<void>;
};

describe("SubtaskService", () => {
  // Mock dependencies
  const mockEventBus = {
    emit: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue(() => {}),
  } as unknown as jest.Mocked<IEventBus>;

  const mockTaskRepo = {
    getSubtask: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    saveSubtask: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TaskRepository>;

  // Create service instance
  const subtaskService = new SubtaskService(mockEventBus, mockTaskRepo);
  const privateService = subtaskService as unknown as PrivateSubtaskService;

  // Test data
  const taskId = "task-123";
  const subtaskId = "subtask-123";

  const sampleSubtask: Subtask = {
    id: subtaskId,
    taskId,
    seqNumber: 1,
    title: "Test Subtask",
    description: "Test description",
    status: SubtaskStatus.PENDING,
    team: {
      agent: Role.ASSISTANT,
      human: Role.USER,
    },
    inputType: "string",
    outputType: "string",
  };
  const sampleTask: Task = {
    id: taskId,
    seqNumber: 1,
    title: "Test Task",
    status: TaskStatus.CREATED,
    subtasks: [sampleSubtask],
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {},
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockTaskRepo.getSubtask.mockResolvedValue([sampleTask, sampleSubtask]);
  });

  test("should register event handlers on initialization", () => {
    // Create a new service to verify subscription behavior
    new SubtaskService(mockEventBus, mockTaskRepo);

    // Verify event subscriptions
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      ClientEventType.CLIENT_START_SUBTASK_COMMAND,
      expect.any(Function)
    );
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND,
      expect.any(Function)
    );
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      ServerEventType.SERVER_SUBTASK_UPDATED,
      expect.any(Function)
    );
  });

  test("should start a subtask and update its status", async () => {
    const command: ClientStartSubtaskCommand = {
      eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND,
      taskId,
      subtaskId,
      timestamp: new Date(),
    };

    await privateService.handleStartSubtaskCommand(command);

    expect(mockTaskRepo.getSubtask).toHaveBeenCalledWith(taskId, subtaskId);
    expect(mockTaskRepo.save).toHaveBeenCalled();

    // Verify events were emitted
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ClientEventType.CLIENT_START_NEW_CHAT_COMMAND,
      })
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ServerEventType.SERVER_SUBTASK_UPDATED,
        status: SubtaskStatus.IN_PROGRESS,
      })
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ServerEventType.SERVER_SUBTASK_STARTED,
      })
    );
  });

  test("should update current subtask when starting a different subtask", async () => {
    // Setup task with a different current subtask
    const differentSubtaskId = "different-subtask";
    const taskWithDifferentSubtask = {
      ...sampleTask,
      currentSubtaskId: differentSubtaskId,
    };

    mockTaskRepo.getSubtask.mockResolvedValueOnce([
      taskWithDifferentSubtask,
      sampleSubtask,
    ]);

    const command: ClientStartSubtaskCommand = {
      eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND,
      taskId,
      subtaskId,
      timestamp: new Date(),
    };

    await privateService.handleStartSubtaskCommand(command);

    expect(mockTaskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        currentSubtaskId: subtaskId,
      })
    );
  });

  test("should complete a subtask and wait for approval", async () => {
    const command: ClientCompleteSubtaskCommand = {
      eventType: ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND,
      taskId,
      subtaskId,
      output: "Test output",
      requiresApproval: true,
      timestamp: new Date(),
    };

    await privateService.handleCompleteSubtaskCommand(command);

    expect(mockTaskRepo.saveSubtask).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SubtaskStatus.COMPLETED,
      })
    );

    // Should NOT trigger next subtask
    expect(mockEventBus.emit).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ServerEventType.SERVER_NEXT_SUBTASK_TRIGGERED,
      })
    );
  });

  test("should complete a subtask and trigger next without approval", async () => {
    const command: ClientCompleteSubtaskCommand = {
      eventType: ClientEventType.CLIENT_COMPLETE_SUBTASK_COMMAND,
      taskId,
      subtaskId,
      output: "Test output",
      requiresApproval: false,
      timestamp: new Date(),
    };

    await privateService.handleCompleteSubtaskCommand(command);

    // Should trigger next subtask
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: ServerEventType.SERVER_NEXT_SUBTASK_TRIGGERED,
        taskId,
        currentSubtaskId: subtaskId,
      })
    );
  });

  test("should update subtask status in repository", async () => {
    const event: ServerSubtaskUpdated = {
      eventType: ServerEventType.SERVER_SUBTASK_UPDATED,
      taskId,
      subtaskId,
      status: SubtaskStatus.IN_PROGRESS,
      timestamp: new Date(),
    };

    await privateService.onSubtaskUpdated(event);

    expect(mockTaskRepo.saveSubtask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: subtaskId,
        status: SubtaskStatus.IN_PROGRESS,
      })
    );
  });

  test("should skip if subtask is already running", async () => {
    // Setup task with the same current subtask
    const taskWithSameSubtask = {
      ...sampleTask,
      currentSubtaskId: subtaskId,
    };

    mockTaskRepo.getSubtask.mockResolvedValueOnce([
      taskWithSameSubtask,
      sampleSubtask,
    ]);

    const command: ClientStartSubtaskCommand = {
      eventType: ClientEventType.CLIENT_START_SUBTASK_COMMAND,
      taskId,
      subtaskId,
      timestamp: new Date(),
    };

    await privateService.handleStartSubtaskCommand(command);

    // Should not update or emit events
    expect(mockTaskRepo.save).not.toHaveBeenCalled();
    expect(mockEventBus.emit).not.toHaveBeenCalled();
  });
});
