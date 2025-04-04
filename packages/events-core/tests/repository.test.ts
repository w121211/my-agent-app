import { TaskRepository, ChatRepository } from "../src/repositories.js";
import { IWorkspaceManager } from "../src/workspace-manager.js";
import {
  Task,
  Chat,
  Subtask,
  ChatMessage,
  Role,
  TaskStatus,
  SubtaskStatus,
  ChatStatus,
  EntityNotFoundError,
} from "../src/event-types.js";

// Mock the workspace manager
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

describe("TaskRepository", () => {
  let taskRepo: TaskRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    taskRepo = new TaskRepository(mockWorkspaceManager);
  });

  const mockTask: Task = {
    id: "task-123",
    seqNumber: 1,
    title: "Test Task",
    status: "CREATED",
    subtasks: [],
    folderPath: "/test/path",
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubtask: Subtask = {
    id: "subtask-123",
    taskId: "task-123",
    seqNumber: 1,
    title: "Test Subtask",
    description: "Test Description",
    status: "PENDING",
    team: { agent: "ASSISTANT" },
    inputType: "string",
    outputType: "string",
  };

  test("save should store task in memory and call workspace manager", async () => {
    await taskRepo.save(mockTask);

    // Task should be stored in memory
    const savedTask = await taskRepo.findById(mockTask.id);
    expect(savedTask).toEqual(mockTask);

    // Workspace manager should be called
    expect(mockWorkspaceManager.saveTaskToJson).toHaveBeenCalledWith(mockTask);
  });

  test("createTaskFolder should call workspace manager", async () => {
    mockWorkspaceManager.createTaskFolder.mockResolvedValue(
      "/test/created/path"
    );

    const result = await taskRepo.createTaskFolder(mockTask);

    expect(mockWorkspaceManager.createTaskFolder).toHaveBeenCalledWith(
      mockTask
    );
    expect(result).toBe("/test/created/path");
  });

  test("getSubtask should return task and subtask when both exist", async () => {
    // Setup a task with a subtask
    const taskWithSubtask = {
      ...mockTask,
      subtasks: [mockSubtask],
    };

    await taskRepo.save(taskWithSubtask);

    const [task, subtask] = await taskRepo.getSubtask(
      mockTask.id,
      mockSubtask.id
    );

    expect(task).toEqual(taskWithSubtask);
    expect(subtask).toEqual(mockSubtask);
  });

  test("getSubtask should throw when task does not exist", async () => {
    await expect(
      taskRepo.getSubtask("non-existent", mockSubtask.id)
    ).rejects.toThrow(EntityNotFoundError);
  });

  test("getSubtask should throw when subtask does not exist", async () => {
    await taskRepo.save(mockTask);

    await expect(
      taskRepo.getSubtask(mockTask.id, "non-existent")
    ).rejects.toThrow(EntityNotFoundError);
  });

  test("saveSubtask should update existing subtask in task", async () => {
    // Setup a task with a subtask
    const taskWithSubtask = {
      ...mockTask,
      subtasks: [mockSubtask],
    };

    await taskRepo.save(taskWithSubtask);

    // Update subtask
    const updatedSubtask: Subtask = {
      ...mockSubtask,
      title: "Updated Subtask",
      status: "IN_PROGRESS",
    };

    await taskRepo.saveSubtask(updatedSubtask);

    // Verify task was updated with the new subtask
    const savedTask = await taskRepo.findById(mockTask.id);
    expect(savedTask?.subtasks[0]).toEqual(updatedSubtask);

    // Verify workspace manager was called
    expect(mockWorkspaceManager.saveTaskToJson).toHaveBeenCalledTimes(2);
  });

  test("saveSubtask should add new subtask to task", async () => {
    await taskRepo.save(mockTask);

    const newSubtask: Subtask = {
      id: "subtask-new",
      taskId: mockTask.id,
      seqNumber: 2,
      title: "New Subtask",
      description: "New Description",
      status: "PENDING",
      team: { agent: "ASSISTANT" },
      inputType: "string",
      outputType: "string",
    };

    await taskRepo.saveSubtask(newSubtask);

    // Verify task was updated with the new subtask
    const savedTask = await taskRepo.findById(mockTask.id);
    expect(savedTask?.subtasks).toHaveLength(1);
    expect(savedTask?.subtasks[0]).toEqual(newSubtask);
  });

  test("loadWorkspace should load tasks from workspace manager", async () => {
    const tasksRecord = {
      "task-1": {
        id: "task-1",
        subtasks: [],
        updatedAt: new Date(),
      } as unknown as Task,
      "task-2": {
        id: "task-2",
        subtasks: [],
        updatedAt: new Date(),
      } as unknown as Task,
    };

    mockWorkspaceManager.loadWorkspace.mockResolvedValue(tasksRecord);

    await taskRepo.loadWorkspace();

    // Verify tasks are loaded into memory
    const allTasks = await taskRepo.findAll();
    expect(allTasks).toHaveLength(2);
    expect(allTasks.map((t) => t.id).sort()).toEqual(["task-1", "task-2"]);
  });

  test("remove should delete task from memory", async () => {
    await taskRepo.save(mockTask);
    await taskRepo.remove(mockTask.id);

    const task = await taskRepo.findById(mockTask.id);
    expect(task).toBeUndefined();
  });
});

describe("ChatRepository", () => {
  let chatRepo: ChatRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    chatRepo = new ChatRepository(mockWorkspaceManager);
  });

  const mockChat: Chat = {
    id: "chat-123",
    taskId: "task-123",
    subtaskId: "subtask-123",
    messages: [],
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage: ChatMessage = {
    id: "message-123",
    role: "USER",
    content: "Test message content",
    timestamp: new Date(),
    metadata: {
      taskId: "task-123",
      subtaskId: "subtask-123",
    },
  };

  test("save should store chat in memory and call workspace manager when path exists", async () => {
    mockWorkspaceManager.getChatFilePath.mockResolvedValue(
      "/test/chat/path.json"
    );

    await chatRepo.save(mockChat);

    // Chat should be stored in memory
    const savedChat = await chatRepo.findById(mockChat.id);
    expect(savedChat).toEqual(mockChat);

    // Workspace manager should be called
    expect(mockWorkspaceManager.getChatFilePath).toHaveBeenCalledWith(
      mockChat.taskId,
      mockChat.subtaskId,
      mockChat.id
    );
    expect(mockWorkspaceManager.saveChatToFile).toHaveBeenCalledWith(
      mockChat,
      "/test/chat/path.json"
    );
  });

  test("createChat should create file and store chat", async () => {
    mockWorkspaceManager.getSubtaskFolderPath.mockResolvedValue(
      "/test/subtask/path"
    );
    mockWorkspaceManager.createChatFile.mockResolvedValue(
      "/test/chat/path.json"
    );

    const result = await chatRepo.createChat(mockChat);

    expect(mockWorkspaceManager.getSubtaskFolderPath).toHaveBeenCalledWith(
      mockChat.taskId,
      mockChat.subtaskId
    );
    expect(mockWorkspaceManager.createChatFile).toHaveBeenCalledWith(
      mockChat,
      "/test/subtask/path"
    );
    expect(result).toBe("/test/chat/path.json");

    // Chat should be stored in memory
    const savedChat = await chatRepo.findById(mockChat.id);
    expect(savedChat).toEqual(mockChat);
  });

  test("addMessage should add message to chat and save", async () => {
    mockWorkspaceManager.getChatFilePath.mockResolvedValue(
      "/test/chat/path.json"
    );

    // Save chat first
    await chatRepo.save(mockChat);

    // Add message
    await chatRepo.addMessage(mockChat.id, mockMessage);

    // Verify message was added to chat
    const updatedChat = await chatRepo.findById(mockChat.id);
    expect(updatedChat?.messages).toHaveLength(1);
    expect(updatedChat?.messages[0]).toEqual(mockMessage);

    // Verify chat was saved
    expect(mockWorkspaceManager.saveChatToFile).toHaveBeenCalledTimes(2);
  });

  test("addMessage should throw when chat does not exist", async () => {
    await expect(
      chatRepo.addMessage("non-existent", mockMessage)
    ).rejects.toThrow(EntityNotFoundError);
  });

  test("loadChat should load chat from file system", async () => {
    mockWorkspaceManager.getChatFilePath.mockResolvedValue(
      "/test/chat/path.json"
    );
    mockWorkspaceManager.readChatFile.mockResolvedValue(mockChat);

    const result = await chatRepo.loadChat(
      mockChat.taskId,
      mockChat.subtaskId,
      mockChat.id
    );

    expect(mockWorkspaceManager.getChatFilePath).toHaveBeenCalledWith(
      mockChat.taskId,
      mockChat.subtaskId,
      mockChat.id
    );
    expect(mockWorkspaceManager.readChatFile).toHaveBeenCalledWith(
      "/test/chat/path.json"
    );
    expect(result).toEqual(mockChat);

    // Chat should be stored in memory
    const savedChat = await chatRepo.findById(mockChat.id);
    expect(savedChat).toEqual(mockChat);
  });

  test("loadChat should return undefined when path does not exist", async () => {
    mockWorkspaceManager.getChatFilePath.mockResolvedValue(undefined);

    const result = await chatRepo.loadChat(
      mockChat.taskId,
      mockChat.subtaskId,
      mockChat.id
    );

    expect(result).toBeUndefined();
    expect(mockWorkspaceManager.readChatFile).not.toHaveBeenCalled();
  });

  test("remove should delete chat from memory", async () => {
    await chatRepo.save(mockChat);
    await chatRepo.remove(mockChat.id);

    const chat = await chatRepo.findById(mockChat.id);
    expect(chat).toBeUndefined();
  });
});
