import mockFs from "mock-fs";
import fs from "fs/promises";
import path from "path";
import { WorkspaceManager } from "../src/workspace-manager.js";
import {
  Task,
  Chat,
  TaskStatus,
  SubtaskStatus,
  ChatStatus,
  Role,
} from "../src/event-types.js";

describe("WorkspaceManager", () => {
  const WORKSPACE_PATH = "/workspace";
  const TASK_FOLDER_PATH = "/workspace/t01-test-task";
  const PLANNING_FOLDER_PATH = "/workspace/t01-test-task/s00-planning";
  const SETUP_FOLDER_PATH = "/workspace/t01-test-task/s01-setup";
  const CHAT_FILE_PATH =
    "/workspace/t01-test-task/s00-planning/c01-20240225_000000.chat.json";

  let workspaceManager: WorkspaceManager;

  // Sample data for testing
  const sampleTask: Task = {
    id: "task-123",
    seqNumber: 1,
    title: "Test Task",
    status: "CREATED",
    subtasks: [
      {
        id: "subtask-1",
        taskId: "task-123",
        seqNumber: 0,
        title: "Planning",
        description: "Initial planning",
        status: "PENDING",
        team: {
          agent: "ASSISTANT",
        },
        inputType: "string",
        outputType: "json",
      },
      {
        id: "subtask-2",
        taskId: "task-123",
        seqNumber: 1,
        title: "Setup",
        description: "Setup environment",
        status: "PENDING",
        team: {
          agent: "FUNCTION_EXECUTOR",
          human: "USER",
        },
        inputType: "json",
        outputType: "json",
      },
    ],
    folderPath: TASK_FOLDER_PATH,
    config: {},
    createdAt: new Date("2024-02-25T00:00:00Z"),
    updatedAt: new Date("2024-02-25T00:00:00Z"),
  };

  const sampleChat: Chat = {
    id: "chat-123",
    taskId: "task-123",
    subtaskId: "subtask-1",
    messages: [
      {
        id: "msg-1",
        role: "USER",
        content: "Hello, this is a test message",
        timestamp: new Date("2024-02-25T00:00:00Z"),
      },
    ],
    status: "ACTIVE",
    createdAt: new Date("2024-02-25T00:00:00Z"),
    updatedAt: new Date("2024-02-25T00:00:00Z"),
  };

  beforeEach(() => {
    // Create a mock logger to avoid file system access conflicts with mock-fs
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Initialize with mock logger
    workspaceManager = new WorkspaceManager(WORKSPACE_PATH, mockLogger as any);

    // Setup mock filesystem
    mockFs({
      [WORKSPACE_PATH]: {
        "t01-test-task": {
          "task.json": JSON.stringify(sampleTask, null, 2),
          history: {},
          "s00-planning": {
            "c01-20240225_000000.chat.json": JSON.stringify(
              sampleChat,
              null,
              2
            ),
          },
          "s01-setup": {},
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  describe("loadWorkspace", () => {
    it("should load tasks from workspace", async () => {
      const tasks = await workspaceManager.loadWorkspace();

      expect(tasks).toHaveProperty("task-123");
      expect(tasks["task-123"]!.title).toBe("Test Task");
      expect(tasks["task-123"]!.subtasks).toHaveLength(2);
    });

    it("should handle empty workspace", async () => {
      mockFs.restore();
      mockFs({
        [WORKSPACE_PATH]: {},
      });

      const tasks = await workspaceManager.loadWorkspace();

      expect(Object.keys(tasks)).toHaveLength(0);
    });

    it("should ignore non-task folders", async () => {
      mockFs.restore();
      mockFs({
        [WORKSPACE_PATH]: {
          "t01-test-task": {
            "task.json": JSON.stringify(sampleTask, null, 2),
          },
          "not-a-task-folder": {},
        },
      });

      const tasks = await workspaceManager.loadWorkspace();

      expect(Object.keys(tasks)).toHaveLength(1);
      expect(tasks).toHaveProperty("task-123");
    });

    it("should throw when workspace path does not exist", async () => {
      mockFs.restore();
      mockFs({});

      await expect(workspaceManager.loadWorkspace()).rejects.toThrow(
        /Failed to load workspace/
      );
    });
  });

  describe("saveTaskToJson", () => {
    it("should save task to JSON file and create history backup", async () => {
      await workspaceManager.saveTaskToJson(sampleTask);

      const taskFile = await fs.readFile(
        path.join(TASK_FOLDER_PATH, "task.json"),
        "utf-8"
      );
      const task = JSON.parse(taskFile);

      expect(task.id).toBe("task-123");

      const historyFiles = await fs.readdir(
        path.join(TASK_FOLDER_PATH, "history")
      );
      expect(historyFiles.length).toBe(1);
      expect(historyFiles[0]).toMatch(/^task_\d+_\d+\.json$/);
    });

    it("should throw if task has no folderPath", async () => {
      const invalidTask = { ...sampleTask, folderPath: undefined };

      await expect(
        workspaceManager.saveTaskToJson(invalidTask)
      ).rejects.toThrow("Task folder path cannot be undefined");
    });
  });

  describe("createTaskFolder", () => {
    it("should create task folder with correct structure", async () => {
      const newTask = {
        ...sampleTask,
        id: "task-456",
        seqNumber: 2,
        title: "New Task",
        folderPath: undefined,
      };

      const folderPath = await workspaceManager.createTaskFolder(newTask);

      expect(folderPath).toBe("/workspace/t02-new-task");

      const exists = await fs
        .stat(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      // Verify subfolders
      const historyExists = await fs
        .stat(path.join(folderPath, "history"))
        .then(() => true)
        .catch(() => false);
      expect(historyExists).toBe(true);

      const planningExists = await fs
        .stat(path.join(folderPath, "s00-planning"))
        .then(() => true)
        .catch(() => false);
      expect(planningExists).toBe(true);
    });

    it("should handle special characters in task title", async () => {
      const newTask = {
        ...sampleTask,
        id: "task-789",
        title: "Special@#$%^&*()Title",
        folderPath: undefined,
      };

      const folderPath = await workspaceManager.createTaskFolder(newTask);

      expect(folderPath).toBe("/workspace/t01-specialtitle");
    });
  });

  describe("createChatFile", () => {
    it("should create chat file with correct name format", async () => {
      const newChat = {
        ...sampleChat,
        id: "chat-456",
      };

      const filePath = await workspaceManager.createChatFile(
        newChat,
        PLANNING_FOLDER_PATH
      );

      expect(filePath).toMatch(
        /^\/workspace\/t01-test-task\/s00-planning\/c02-\d+_\d+\.chat\.json$/
      );

      const content = await fs.readFile(filePath, "utf-8");
      const chat = JSON.parse(content);
      expect(chat.id).toBe("chat-456");
    });

    it("should handle folder with no existing chat files", async () => {
      const newChat = {
        ...sampleChat,
        id: "chat-789",
      };

      const filePath = await workspaceManager.createChatFile(
        newChat,
        SETUP_FOLDER_PATH
      );

      expect(filePath).toMatch(
        /^\/workspace\/t01-test-task\/s01-setup\/c01-\d+_\d+\.chat\.json$/
      );
    });
  });

  describe("saveChatToFile", () => {
    it("should save chat to specified file path", async () => {
      const newChat = {
        ...sampleChat,
        id: "chat-new",
      };

      const filePath = "/workspace/new-chat.json";
      await workspaceManager.saveChatToFile(newChat, filePath);

      const content = await fs.readFile(filePath, "utf-8");
      const chat = JSON.parse(content);
      expect(chat.id).toBe("chat-new");
    });
  });

  describe("readChatFile", () => {
    it("should read chat from file", async () => {
      const chat = await workspaceManager.readChatFile(CHAT_FILE_PATH);

      expect(chat.id).toBe("chat-123");
      expect(chat.messages).toHaveLength(1);
      expect(chat.messages[0]?.content).toBe("Hello, this is a test message");
    });

    it("should throw when file does not exist", async () => {
      const filePath = "/workspace/non-existent-file.json";

      await expect(workspaceManager.readChatFile(filePath)).rejects.toThrow(
        /Failed to read chat file/
      );
    });
  });

  describe("getTaskFolderPath", () => {
    it("should find task folder path by task ID", async () => {
      const folderPath = await workspaceManager.getTaskFolderPath("task-123");

      expect(folderPath).toBe(TASK_FOLDER_PATH);
    });

    it("should return undefined when task ID not found", async () => {
      const folderPath =
        await workspaceManager.getTaskFolderPath("non-existent-task");

      expect(folderPath).toBeUndefined();
    });
  });

  describe("getSubtaskFolderPath", () => {
    it("should find subtask folder path by task ID and subtask ID", async () => {
      const folderPath = await workspaceManager.getSubtaskFolderPath(
        "task-123",
        "subtask-1"
      );

      expect(folderPath).toBe(PLANNING_FOLDER_PATH);
    });

    it("should return undefined when subtask ID not found", async () => {
      const folderPath = await workspaceManager.getSubtaskFolderPath(
        "task-123",
        "non-existent-subtask"
      );

      expect(folderPath).toBeUndefined();
    });

    it("should return undefined when task ID not found", async () => {
      const folderPath = await workspaceManager.getSubtaskFolderPath(
        "non-existent-task",
        "subtask-1"
      );

      expect(folderPath).toBeUndefined();
    });
  });

  describe("getChatFilePath", () => {
    it("should find chat file path by IDs", async () => {
      const filePath = await workspaceManager.getChatFilePath(
        "task-123",
        "subtask-1",
        "chat-123"
      );

      expect(filePath).toBe(CHAT_FILE_PATH);
    });

    it("should return undefined when chat ID not found", async () => {
      const filePath = await workspaceManager.getChatFilePath(
        "task-123",
        "subtask-1",
        "non-existent-chat"
      );

      expect(filePath).toBeUndefined();
    });

    it("should return undefined when subtask ID not found", async () => {
      const filePath = await workspaceManager.getChatFilePath(
        "task-123",
        "non-existent-subtask",
        "chat-123"
      );

      expect(filePath).toBeUndefined();
    });
  });

  describe("ensureFolderExists", () => {
    it("should create folder if it does not exist", async () => {
      const folderPath = "/workspace/new-folder";

      await workspaceManager.ensureFolderExists(folderPath);

      const exists = await fs
        .stat(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("should create nested folder structure", async () => {
      const folderPath = "/workspace/nested/folder/structure";

      await workspaceManager.ensureFolderExists(folderPath);

      const exists = await fs
        .stat(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("should not throw error if folder already exists", async () => {
      await expect(
        workspaceManager.ensureFolderExists(TASK_FOLDER_PATH)
      ).resolves.not.toThrow();
    });
  });
});
