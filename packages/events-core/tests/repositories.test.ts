import fs from "node:fs/promises";
import { Dirent } from "node:fs";
import {
  TaskRepository,
  ChatRepository,
  createDirectory,
  writeJsonFile,
  readJsonFile,
  fileExists,
  listDirectory,
} from "../src/repositories.js";
import {
  Task,
  Chat,
  ChatMessage,
  EntityNotFoundError,
  ConcurrencyError,
  TaskStatus,
  ChatStatus,
  Role,
} from "../src/event-types.js";

// Mock the fs module
jest.mock("node:fs/promises");
const mockFs = jest.mocked(fs);

// Mock path.join for consistent paths in tests
jest.mock("node:path", () => ({
  ...jest.requireActual("node:path"),
  join: jest.fn((...args) => args.join("/")),
  isAbsolute: jest.fn((p) => p.startsWith("/")),
}));

describe("File Operation Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createDirectory", () => {
    it("should create a directory with recursive option", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      const dirPath = "/test/dir";

      const result = await createDirectory(dirPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(result).toBe(dirPath);
    });
  });

  describe("writeJsonFile", () => {
    it("should write formatted JSON to a file", async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      const filePath = "/test/file.json";
      const data = { test: "data" };

      await writeJsonFile(filePath, data);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        filePath,
        JSON.stringify(data, null, 2),
        "utf8"
      );
    });
  });

  describe("readJsonFile", () => {
    it("should read and parse JSON from a file", async () => {
      const data = { test: "data" };
      mockFs.readFile.mockResolvedValue(JSON.stringify(data));
      const filePath = "/test/file.json";

      const result = await readJsonFile(filePath);

      expect(mockFs.readFile).toHaveBeenCalledWith(filePath, "utf8");
      expect(result).toEqual(data);
    });
  });

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      mockFs.access.mockResolvedValue(undefined);
      const filePath = "/test/file.json";

      const result = await fileExists(filePath);

      expect(mockFs.access).toHaveBeenCalledWith(filePath);
      expect(result).toBe(true);
    });

    it("should return false if file does not exist", async () => {
      mockFs.access.mockRejectedValue(new Error("File not found"));
      const filePath = "/test/file.json";

      const result = await fileExists(filePath);

      expect(mockFs.access).toHaveBeenCalledWith(filePath);
      expect(result).toBe(false);
    });
  });

  describe("listDirectory", () => {
    it("should list directory entries with isDirectory flag", async () => {
      const mockEntries = [
        { name: "file1.txt", isDirectory: () => false },
        { name: "dir1", isDirectory: () => true },
      ] as Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      const dirPath = "/test/dir";

      const result = await listDirectory(dirPath);

      expect(mockFs.readdir).toHaveBeenCalledWith(dirPath, {
        withFileTypes: true,
      });
      expect(result).toEqual([
        { name: "file1.txt", isDirectory: false },
        { name: "dir1", isDirectory: true },
      ]);
    });
  });
});

describe("TaskRepository", () => {
  const workspacePath = "/test/workspace";
  let taskRepo: TaskRepository;
  let mockTask: Task;

  beforeEach(() => {
    jest.clearAllMocks();
    taskRepo = new TaskRepository(workspacePath);
    mockTask = {
      id: "task-123",
      seqNumber: 1,
      title: "Test Task",
      status: "CREATED" as TaskStatus,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe("save", () => {
    it("should save task in memory and to file if folderPath exists", async () => {
      mockTask.folderPath = "/test/workspace/task-123";
      mockFs.writeFile.mockResolvedValue(undefined);

      await taskRepo.save(mockTask);

      // Verify in-memory storage
      const savedTask = await taskRepo.findById(mockTask.id);
      expect(savedTask).toEqual(mockTask);

      // Verify file system storage
      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCallArgs = mockFs.writeFile.mock.calls[0];
      expect(writeCallArgs?.[0]).toBe("/test/workspace/task-123/task.json");

      const parsedTask = JSON.parse(writeCallArgs?.[1] as string);
      // Convert string dates back to Date objects for comparison
      parsedTask.createdAt = new Date(parsedTask.createdAt);
      parsedTask.updatedAt = new Date(parsedTask.updatedAt);
      expect(parsedTask).toEqual(mockTask);
    });

    it("should save task only in memory if no folderPath", async () => {
      await taskRepo.save(mockTask);

      const savedTask = await taskRepo.findById(mockTask.id);
      expect(savedTask).toEqual(mockTask);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it("should throw ConcurrencyError if trying to save older version", async () => {
      await taskRepo.save(mockTask);

      const olderTask = {
        ...mockTask,
        updatedAt: new Date(mockTask.updatedAt.getTime() - 1000),
      };

      await expect(taskRepo.save(olderTask)).rejects.toThrow(ConcurrencyError);
    });
  });

  describe("createTaskFolder", () => {
    it("should create a folder for the task", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      const folderPath = await taskRepo.createTaskFolder(mockTask);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        "/test/workspace/task-task-123",
        { recursive: true }
      );
      expect(folderPath).toBe("/test/workspace/task-task-123");
    });
  });

  describe("loadWorkspace", () => {
    it("should load tasks from workspace directory", async () => {
      // Mock directory listing
      const mockEntries = [
        { name: "task-123", isDirectory: () => true },
        { name: "other-dir", isDirectory: () => true },
        { name: "file.txt", isDirectory: () => false },
      ] as Dirent[];

      mockFs.readdir.mockResolvedValue(mockEntries);
      mockFs.access.mockResolvedValue(undefined);

      // Mock task file content
      const taskData = {
        id: "123",
        seqNumber: 1,
        title: "Test Task",
        status: "CREATED",
        config: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(taskData));

      await taskRepo.loadWorkspace();

      const loadedTask = await taskRepo.findById("123");
      expect(loadedTask).toBeDefined();
      expect(loadedTask?.title).toBe("Test Task");
    });
  });

  describe("findById and findAll", () => {
    it("should find task by id", async () => {
      await taskRepo.save(mockTask);

      const foundTask = await taskRepo.findById(mockTask.id);

      expect(foundTask).toEqual(mockTask);
    });

    it("should return undefined for non-existent id", async () => {
      const foundTask = await taskRepo.findById("non-existent");

      expect(foundTask).toBeUndefined();
    });

    it("should return all tasks", async () => {
      const mockTask2 = { ...mockTask, id: "task-456" };
      await taskRepo.save(mockTask);
      await taskRepo.save(mockTask2);

      const allTasks = await taskRepo.findAll();

      expect(allTasks).toHaveLength(2);
      expect(allTasks).toContainEqual(mockTask);
      expect(allTasks).toContainEqual(mockTask2);
    });
  });

  describe("remove", () => {
    it("should remove task from memory", async () => {
      await taskRepo.save(mockTask);

      await taskRepo.remove(mockTask.id);

      const foundTask = await taskRepo.findById(mockTask.id);
      expect(foundTask).toBeUndefined();
    });

    it("should do nothing for non-existent id", async () => {
      await expect(taskRepo.remove("non-existent")).resolves.not.toThrow();
    });
  });
});

describe("ChatRepository", () => {
  const workspacePath = "/test/workspace";
  let chatRepo: ChatRepository;
  let mockChat: Chat;
  let mockMessage: ChatMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    chatRepo = new ChatRepository(workspacePath);
    mockMessage = {
      id: "msg-123",
      role: "USER" as Role,
      content: "Test message",
      timestamp: new Date(),
    };
    mockChat = {
      id: "chat-123",
      taskId: "task-456",
      messages: [mockMessage],
      status: "ACTIVE" as ChatStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe("save", () => {
    it("should save chat in memory and to file if filePath exists", async () => {
      mockChat.filePath = "/test/workspace/chat-123.json";
      mockFs.writeFile.mockResolvedValue(undefined);

      await chatRepo.save(mockChat);

      const savedChat = await chatRepo.findById(mockChat.id);
      expect(savedChat).toEqual(mockChat);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("should save chat only in memory if no filePath", async () => {
      await chatRepo.save(mockChat);

      const savedChat = await chatRepo.findById(mockChat.id);
      expect(savedChat).toEqual(mockChat);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it("should throw ConcurrencyError if trying to save older version", async () => {
      await chatRepo.save(mockChat);

      const olderChat = {
        ...mockChat,
        updatedAt: new Date(mockChat.updatedAt.getTime() - 1000),
      };

      await expect(chatRepo.save(olderChat)).rejects.toThrow(ConcurrencyError);
    });
  });

  describe("createChat", () => {
    it("should create a chat file and return its path", async () => {
      const taskFolderPath = "/test/workspace/task-456";
      mockFs.writeFile.mockResolvedValue(undefined);

      const filePath = await chatRepo.createChat(mockChat, taskFolderPath);

      expect(filePath).toBe("/test/workspace/task-456/chat-123.chat.json");
      expect(mockFs.writeFile).toHaveBeenCalled();

      const savedChat = await chatRepo.findById(mockChat.id);
      expect(savedChat).toBeDefined();
      expect(savedChat?.filePath).toBe(filePath);
    });
  });

  describe("addMessage", () => {
    it("should add message to chat and save it", async () => {
      mockChat.filePath = "/test/workspace/chat-123.json";
      await chatRepo.save(mockChat);

      const newMessage: ChatMessage = {
        id: "msg-456",
        role: "ASSISTANT" as Role,
        content: "Response message",
        timestamp: new Date(),
      };

      mockFs.writeFile.mockResolvedValue(undefined);
      await chatRepo.addMessage(mockChat.id, newMessage);

      const updatedChat = await chatRepo.findById(mockChat.id);
      expect(updatedChat?.messages).toHaveLength(2);
      expect(updatedChat?.messages[1]).toEqual(newMessage);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("should throw EntityNotFoundError for non-existent chat", async () => {
      const newMessage: ChatMessage = {
        id: "msg-456",
        role: "ASSISTANT" as Role,
        content: "Response message",
        timestamp: new Date(),
      };

      await expect(
        chatRepo.addMessage("non-existent", newMessage)
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe("getChatFilePath", () => {
    it("should return file path if exists", async () => {
      mockFs.access.mockResolvedValue(undefined);

      const filePath = await chatRepo.getChatFilePath("task-456", "chat-123");

      expect(filePath).toBe("/test/workspace/task-task-456/chat-123.chat.json");
    });

    it("should return undefined if file does not exist", async () => {
      mockFs.access.mockRejectedValue(new Error("File not found"));

      const filePath = await chatRepo.getChatFilePath("task-456", "chat-123");

      expect(filePath).toBeUndefined();
    });
  });

  describe("loadChat", () => {
    it("should load chat from file if exists", async () => {
      mockFs.access.mockResolvedValue(undefined);

      const chatFileData = {
        _type: "chat",
        chatId: "chat-123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: "Test Chat",
        messages: [
          {
            id: "msg-123",
            role: "USER",
            content: "Hello",
            timestamp: new Date().toISOString(),
          },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(chatFileData));

      const chat = await chatRepo.loadChat("task-456", "chat-123");

      expect(chat).toBeDefined();
      expect(chat?.id).toBe("chat-123");
      expect(chat?.messages).toHaveLength(1);
      expect(chat?.messages?.[0]?.content).toBe("Hello");
    });

    it("should return undefined if file does not exist", async () => {
      mockFs.access.mockRejectedValue(new Error("File not found"));

      const chat = await chatRepo.loadChat("task-456", "chat-123");

      expect(chat).toBeUndefined();
    });
  });

  describe("readChatFile", () => {
    it("should read and parse chat file", async () => {
      const chatFileData = {
        _type: "chat",
        chatId: "chat-123",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: "Test Chat",
        messages: [
          {
            id: "msg-123",
            role: "USER",
            content: "Hello",
            timestamp: new Date().toISOString(),
          },
        ],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(chatFileData));

      const filePath = "/test/workspace/task-456/chat-123.chat.json";
      const chat = await chatRepo.readChatFile(filePath);

      expect(chat).toBeDefined();
      expect(chat.id).toBe("chat-123");
      expect(chat.taskId).toBe("456"); // Extracted from path
      expect(chat.messages).toHaveLength(1);
      expect(chat.filePath).toBe(filePath);
    });

    it("should throw error if file is not a chat file", async () => {
      const invalidData = {
        _type: "not-chat",
        chatId: "chat-123",
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidData));

      const filePath = "/test/workspace/task-456/chat-123.chat.json";

      await expect(chatRepo.readChatFile(filePath)).rejects.toThrow(
        "is not a chat file"
      );
    });
  });

  describe("findById and findAll", () => {
    it("should find chat by id", async () => {
      await chatRepo.save(mockChat);

      const foundChat = await chatRepo.findById(mockChat.id);

      expect(foundChat).toEqual(mockChat);
    });

    it("should return undefined for non-existent id", async () => {
      const foundChat = await chatRepo.findById("non-existent");

      expect(foundChat).toBeUndefined();
    });

    it("should return all chats", async () => {
      const mockChat2 = { ...mockChat, id: "chat-456" };
      await chatRepo.save(mockChat);
      await chatRepo.save(mockChat2);

      const allChats = await chatRepo.findAll();

      expect(allChats).toHaveLength(2);
      expect(allChats).toContainEqual(mockChat);
      expect(allChats).toContainEqual(mockChat2);
    });
  });

  describe("remove", () => {
    it("should remove chat from memory", async () => {
      await chatRepo.save(mockChat);

      await chatRepo.remove(mockChat.id);

      const foundChat = await chatRepo.findById(mockChat.id);
      expect(foundChat).toBeUndefined();
    });

    it("should do nothing for non-existent id", async () => {
      await expect(chatRepo.remove("non-existent")).resolves.not.toThrow();
    });
  });
});
