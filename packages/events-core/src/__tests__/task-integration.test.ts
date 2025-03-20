import mockFs from "mock-fs";
import path from "path";
import { EventBus } from "../event-bus.js";
import { TaskService } from "../task-service.js";
import { SubtaskService } from "../subtask-service.js";
import { TaskRepository } from "../repositories.js";
import {
  Task,
  Chat,
  SubtaskStatus,
  ClientEventType,
  ServerEventType,
  ClientCreateTaskCommand,
  ServerTaskCreated,
  ServerSubtaskStarted,
} from "../event-types.js";

// Mock implementation of WorkspaceManager
interface IWorkspaceManager {
  saveTaskToJson(task: Task): Promise<void>;
  createTaskFolder(task: Task): Promise<string>;
  getChatFilePath(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<string | undefined>;
  getSubtaskFolderPath(
    taskId: string,
    subtaskId: string
  ): Promise<string | undefined>;
  createChatFile(chat: Chat, folderPath: string): Promise<string>;
  saveChatToFile(chat: Chat, filePath: string): Promise<void>;
  readChatFile(filePath: string): Promise<Chat>;
  loadWorkspace(): Promise<Record<string, Task>>;
}

class MockWorkspaceManager implements IWorkspaceManager {
  private workspacePath: string;

  constructor(workspacePath: string = "/workspace") {
    this.workspacePath = workspacePath;
  }

  async createTaskFolder(task: Task): Promise<string> {
    const folderPath = path.join(this.workspacePath, task.id);
    return folderPath;
  }

  async saveTaskToJson(task: Task): Promise<void> {
    // Mock implementation
  }

  async getChatFilePath(
    taskId: string,
    subtaskId: string,
    chatId: string
  ): Promise<string | undefined> {
    return path.join(this.workspacePath, taskId, subtaskId, `${chatId}.json`);
  }

  async getSubtaskFolderPath(
    taskId: string,
    subtaskId: string
  ): Promise<string | undefined> {
    return path.join(this.workspacePath, taskId, subtaskId);
  }

  async getTaskFolderPath(taskId: string): Promise<string | undefined> {
    return path.join(this.workspacePath, taskId);
  }

  async ensureFolderExists(folderPath: string): Promise<void> {
    // Mock implementation
  }

  async createChatFile(chat: Chat, folderPath: string): Promise<string> {
    return path.join(folderPath, `${chat.id}.json`);
  }

  async saveChatToFile(chat: Chat, filePath: string): Promise<void> {
    // Mock implementation
  }

  async readChatFile(filePath: string): Promise<Chat> {
    throw new Error("Not implemented in mock");
  }

  async loadWorkspace(): Promise<Record<string, Task>> {
    return {};
  }
}

describe("Task Creation Integration Test", () => {
  let eventBus: EventBus;
  let taskRepo: TaskRepository;
  let taskService: TaskService;
  let subtaskService: SubtaskService;
  let workspaceManager: MockWorkspaceManager;

  beforeEach(() => {
    // Setup mock filesystem
    mockFs({
      "/workspace": {},
    });

    // Initialize dependencies
    eventBus = new EventBus({ environment: "server" });
    workspaceManager = new MockWorkspaceManager("/workspace");
    taskRepo = new TaskRepository(workspaceManager);

    // Spy on file operations
    jest.spyOn(workspaceManager, "createTaskFolder");
    jest.spyOn(workspaceManager, "saveTaskToJson");

    // Initialize services
    taskService = new TaskService(eventBus, taskRepo);
    subtaskService = new SubtaskService(eventBus, taskRepo);
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test("should create a task and start the first subtask", async () => {
    // Track event completion with promises
    let taskCreatedResolve: (value: unknown) => void;
    const taskCreatedPromise = new Promise((resolve) => {
      taskCreatedResolve = resolve;
    });

    let subtaskStartedResolve: (value: unknown) => void;
    const subtaskStartedPromise = new Promise((resolve) => {
      subtaskStartedResolve = resolve;
    });

    // Subscribe to key events
    const taskCreatedUnsubscribe = eventBus.subscribe<ServerTaskCreated>(
      ServerEventType.SERVER_TASK_CREATED,
      () => {
        taskCreatedResolve(undefined);
        taskCreatedUnsubscribe();
      }
    );

    const subtaskStartedUnsubscribe = eventBus.subscribe<ServerSubtaskStarted>(
      ServerEventType.SERVER_SUBTASK_STARTED,
      () => {
        subtaskStartedResolve(undefined);
        subtaskStartedUnsubscribe();
      }
    );

    // Create and emit task creation command
    const createTaskCommand: ClientCreateTaskCommand = {
      eventType: ClientEventType.CLIENT_CREATE_TASK_COMMAND,
      taskName: "Test Task",
      taskConfig: {},
      timestamp: new Date(),
      correlationId: "test-correlation-id",
    };

    await eventBus.emit(createTaskCommand);

    // Wait for events to complete
    await Promise.all([taskCreatedPromise, subtaskStartedPromise]);

    // Verify task creation and subtask status
    const tasks = await taskRepo.findAll();
    expect(tasks.length).toBe(1);

    const task = tasks[0];
    expect(task).toBeDefined();
    expect(task?.title).toBe("Test Task");
    expect(task?.subtasks.length).toBe(2);
    expect(task?.subtasks[0]).toBeDefined();
    expect(task?.subtasks[0]?.status).toBe(SubtaskStatus.IN_PROGRESS);
    expect(task?.currentSubtaskId).toBe(task?.subtasks[0]?.id);

    // Verify file system operations were called
    expect(workspaceManager.createTaskFolder).toHaveBeenCalled();
    expect(workspaceManager.saveTaskToJson).toHaveBeenCalled();
  });
});
