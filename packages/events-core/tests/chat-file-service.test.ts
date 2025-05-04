import path from "node:path";
import fs from "node:fs/promises";
import { IEventBus } from "../src/event-bus.js";
import {
  ChatFileService,
  ChatNotFoundError,
  ChatFileError,
} from "../src/chat-file-service.js";
import * as fileHelpers from "../src/file-helpers.js";
import {
  Chat,
  ChatMessage,
  Role,
  ServerChatFileCreatedEvent,
  ServerChatFileUpdatedEvent,
} from "../src/event-types.js";

// Mock dependencies
jest.mock("../src/file-helpers.js");
jest.mock("node:fs/promises");

// Mock file helpers
const mockCreateDirectory = fileHelpers.createDirectory as jest.Mock;
const mockFileExists = fileHelpers.fileExists as jest.Mock;
const mockReadJsonFile = fileHelpers.readJsonFile as jest.Mock;
const mockWriteJsonFile = fileHelpers.writeJsonFile as jest.Mock;
const mockListDirectory = fileHelpers.listDirectory as jest.Mock;

// Mock EventBus
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

// Test constants
const TEST_WORKSPACE_PATH = "/test/workspace";

// Test fixtures
const createTestChat = (id: string, filePath: string): Chat => ({
  id,
  filePath,
  messages: [],
  status: "ACTIVE",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
  metadata: {
    title: "Test Chat",
    mode: "chat",
    model: "default",
  },
});

const createTestMessage = (role: Role = "USER"): ChatMessage => ({
  id: "msg-123",
  role,
  content: "Test message content",
  timestamp: new Date("2023-01-01"),
});

describe("ChatFileService", () => {
  let chatFileService: ChatFileService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockFileExists.mockResolvedValue(true);
    mockCreateDirectory.mockResolvedValue(TEST_WORKSPACE_PATH);
    mockListDirectory.mockResolvedValue([]);

    chatFileService = new ChatFileService(TEST_WORKSPACE_PATH, mockEventBus);
  });

  describe("initialize", () => {
    it("should scan the workspace and load chats", async () => {
      // Setup directory listing mock to return some folders
      mockListDirectory.mockResolvedValueOnce([
        { name: "folder1", isDirectory: true },
        { name: "file1.txt", isDirectory: false },
      ]);

      // Setup subdirectory listing to include a chat file
      mockListDirectory.mockResolvedValueOnce([
        { name: "chat1.json", isDirectory: false },
      ]);

      // Setup chat file content
      const testChat = {
        _type: "chat",
        id: "chat-123",
        createdAt: new Date("2023-01-01").toISOString(),
        updatedAt: new Date("2023-01-01").toISOString(),
        title: "Test Chat",
        messages: [],
      };
      mockReadJsonFile.mockResolvedValueOnce(testChat);

      await chatFileService.initialize();

      expect(mockListDirectory).toHaveBeenCalledWith(TEST_WORKSPACE_PATH);
      expect(mockListDirectory).toHaveBeenCalledWith(
        path.join(TEST_WORKSPACE_PATH, "folder1")
      );
      expect(mockReadJsonFile).toHaveBeenCalledWith(
        path.join(TEST_WORKSPACE_PATH, "folder1", "chat1.json")
      );

      const chats = await chatFileService.findAll();
      expect(chats.length).toBe(1);
      expect(chats[0]?.id).toBe("chat-123");
    });

    it("should handle errors when loading chat files", async () => {
      mockListDirectory.mockResolvedValueOnce([
        { name: "folder1", isDirectory: true },
      ]);
      mockListDirectory.mockResolvedValueOnce([
        { name: "chat1.json", isDirectory: false },
      ]);

      mockReadJsonFile.mockRejectedValueOnce(new Error("File read error"));

      await expect(chatFileService.initialize()).resolves.not.toThrow();

      const chats = await chatFileService.findAll();
      expect(chats.length).toBe(0);
    });
  });

  describe("findByPath", () => {
    it("should return chat from cache if available", async () => {
      const testFilePath = path.join(TEST_WORKSPACE_PATH, "chat1.json");
      const testChat = createTestChat("chat-123", testFilePath);

      // Manually add to cache
      (chatFileService as any).chatCache.set(testFilePath, testChat);

      const result = await chatFileService.findByPath(testFilePath);

      expect(result).toEqual(testChat);
      expect(mockReadJsonFile).not.toHaveBeenCalled();
    });

    it("should load and cache chat if not in cache", async () => {
      const testFilePath = path.join(TEST_WORKSPACE_PATH, "chat1.json");

      mockFileExists.mockResolvedValueOnce(true);

      const mockFileData = {
        _type: "chat",
        id: "chat-123",
        createdAt: new Date("2023-01-01").toISOString(),
        updatedAt: new Date("2023-01-01").toISOString(),
        title: "Test Chat",
        messages: [],
      };
      mockReadJsonFile.mockResolvedValueOnce(mockFileData);

      const result = await chatFileService.findByPath(testFilePath);

      expect(result.id).toBe("chat-123");
      expect(result.filePath).toBe(testFilePath);
      expect(mockReadJsonFile).toHaveBeenCalledWith(testFilePath);

      // Verify chat is now cached
      const cachedChat = await chatFileService.findByPath(testFilePath);
      expect(cachedChat).toEqual(result);
      expect(mockReadJsonFile).toHaveBeenCalledTimes(1);
    });

    it("should throw ChatNotFoundError when file does not exist", async () => {
      const nonExistentPath = path.join(
        TEST_WORKSPACE_PATH,
        "nonexistent.json"
      );
      mockFileExists.mockResolvedValueOnce(false);

      await expect(chatFileService.findByPath(nonExistentPath)).rejects.toThrow(
        ChatNotFoundError
      );
    });
  });

  describe("findAll", () => {
    it("should return all chats from cache", async () => {
      const chat1 = createTestChat("chat-1", "path1");
      const chat2 = createTestChat("chat-2", "path2");

      // Manually add to cache
      (chatFileService as any).chatCache.set("path1", chat1);
      (chatFileService as any).chatCache.set("path2", chat2);

      const result = await chatFileService.findAll();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(chat1);
      expect(result).toContainEqual(chat2);
    });

    it("should return empty array when cache is empty", async () => {
      const result = await chatFileService.findAll();
      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should find a chat by id", async () => {
      const chat1 = createTestChat("chat-1", "path1");
      const chat2 = createTestChat("chat-2", "path2");

      // Manually add to cache
      (chatFileService as any).chatCache.set("path1", chat1);
      (chatFileService as any).chatCache.set("path2", chat2);

      const result = await chatFileService.findById("chat-2");

      expect(result).toEqual(chat2);
    });

    it("should return undefined when chat with id is not found", async () => {
      const result = await chatFileService.findById("nonexistent-id");
      expect(result).toBeUndefined();
    });
  });

  describe("createChat", () => {
    it("should create a new chat and save it to file", async () => {
      // Setup for getNextChatNumber
      mockListDirectory.mockResolvedValueOnce([
        { name: "chat1.json", isDirectory: false },
        { name: "chat3.json", isDirectory: false },
        { name: "other.txt", isDirectory: false },
      ]);

      const mockChatData = {
        id: "new-chat-id",
        status: "ACTIVE" as const,
        messages: [],
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        metadata: { title: "New Test Chat" },
      };

      const result = await chatFileService.createChat(
        mockChatData,
        TEST_WORKSPACE_PATH,
        "corr-123"
      );

      expect(mockCreateDirectory).toHaveBeenCalledWith(TEST_WORKSPACE_PATH);
      expect(mockListDirectory).toHaveBeenCalledWith(TEST_WORKSPACE_PATH);

      // Expected file path with next number (should be chat4.json)
      const expectedFilePath = path.join(TEST_WORKSPACE_PATH, "chat4.json");

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expectedFilePath,
        expect.objectContaining({
          _type: "chat",
          id: "new-chat-id",
          title: "New Test Chat",
        })
      );

      expect(result).toEqual({
        ...mockChatData,
        filePath: expectedFilePath,
      });

      // Verify chat was cached
      const cachedChats = await chatFileService.findAll();
      expect(cachedChats).toContainEqual(result);

      // Verify event was emitted (after file write promise resolves)
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ServerChatFileCreatedEvent>>({
          kind: "ServerChatFileCreated",
          chatId: "new-chat-id",
          filePath: expectedFilePath,
          correlationId: "corr-123",
        })
      );
    });
  });

  describe("addMessage", () => {
    it("should add a message to an existing chat", async () => {
      const testFilePath = path.join(TEST_WORKSPACE_PATH, "chat1.json");
      const testChat = createTestChat("chat-123", testFilePath);
      (chatFileService as any).chatCache.set(testFilePath, testChat);

      const message = createTestMessage();

      const result = await chatFileService.addMessage(
        testFilePath,
        message,
        "corr-123"
      );

      expect(result.messages).toContainEqual(message);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(
        testChat.updatedAt.getTime()
      );

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        testFilePath,
        expect.objectContaining({
          _type: "chat",
          id: "chat-123",
          messages: [message],
        })
      );

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ServerChatFileUpdatedEvent>>({
          kind: "ServerChatFileUpdated",
          chatId: "chat-123",
          filePath: testFilePath,
          correlationId: "corr-123",
        })
      );

      const cachedChat = await chatFileService.findByPath(testFilePath);
      expect(cachedChat.messages).toContainEqual(message);
    });

    it("should throw error when chat is not found", async () => {
      const nonExistentPath = path.join(
        TEST_WORKSPACE_PATH,
        "nonexistent.json"
      );
      mockFileExists.mockResolvedValueOnce(false);

      await expect(
        chatFileService.addMessage(
          nonExistentPath,
          createTestMessage(),
          "corr-123"
        )
      ).rejects.toThrow();
    });
  });

  describe("readChatFile", () => {
    it("should read chat from file", async () => {
      const testFilePath = path.join(TEST_WORKSPACE_PATH, "chat1.json");

      mockFileExists.mockResolvedValueOnce(true);

      const mockFileData = {
        _type: "chat",
        id: "chat-read",
        createdAt: new Date("2023-01-01").toISOString(),
        updatedAt: new Date("2023-01-01").toISOString(),
        title: "Read Test Chat",
        messages: [],
      };
      mockReadJsonFile.mockResolvedValueOnce(mockFileData);

      const result = await chatFileService.readChatFile(testFilePath);

      expect(mockFileExists).toHaveBeenCalledWith(testFilePath);
      expect(mockReadJsonFile).toHaveBeenCalledWith(testFilePath);

      expect(result.id).toBe("chat-read");
      expect(result.filePath).toBe(testFilePath);
    });

    it("should throw error when file does not exist", async () => {
      const nonExistentPath = path.join(
        TEST_WORKSPACE_PATH,
        "nonexistent.json"
      );
      mockFileExists.mockResolvedValueOnce(false);

      await expect(
        chatFileService.readChatFile(nonExistentPath)
      ).rejects.toThrow(ChatFileError);
    });

    it("should throw error when file is not a valid chat file", async () => {
      const testFilePath = path.join(TEST_WORKSPACE_PATH, "invalid.json");
      mockFileExists.mockResolvedValueOnce(true);

      // Invalid chat file (missing _type: 'chat')
      mockReadJsonFile.mockResolvedValueOnce({
        id: "invalid",
        createdAt: new Date("2023-01-01").toISOString(),
        updatedAt: new Date("2023-01-01").toISOString(),
      });

      await expect(chatFileService.readChatFile(testFilePath)).rejects.toThrow(
        ChatFileError
      );
    });
  });

  describe("deleteChat", () => {
    it("should delete a chat file and remove from cache", async () => {
      const testFilePath = path.join(
        TEST_WORKSPACE_PATH,
        "chat-to-delete.json"
      );

      // Add chat to cache
      const testChat = createTestChat("chat-delete", testFilePath);
      (chatFileService as any).chatCache.set(testFilePath, testChat);

      mockFileExists.mockResolvedValueOnce(true);

      const mockUnlink = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(fs, "unlink").mockImplementation(mockUnlink);

      await chatFileService.deleteChat(testFilePath);

      expect(mockUnlink).toHaveBeenCalledWith(testFilePath);

      const chats = await chatFileService.findAll();
      expect(chats).not.toContainEqual(testChat);
    });

    it("should not throw when file does not exist", async () => {
      const nonExistentPath = path.join(
        TEST_WORKSPACE_PATH,
        "nonexistent.json"
      );
      mockFileExists.mockResolvedValueOnce(false);

      const mockUnlink = jest.fn();
      jest.spyOn(fs, "unlink").mockImplementation(mockUnlink);

      await expect(
        chatFileService.deleteChat(nonExistentPath)
      ).resolves.not.toThrow();
      expect(mockUnlink).not.toHaveBeenCalled();
    });
  });

  describe("removeFromCache", () => {
    it("should remove a chat from cache", async () => {
      const testFilePath = path.join(
        TEST_WORKSPACE_PATH,
        "chat-to-remove.json"
      );

      // Add chat to cache
      const testChat = createTestChat("chat-remove", testFilePath);
      (chatFileService as any).chatCache.set(testFilePath, testChat);

      const cachedChats = await chatFileService.findAll();
      expect(cachedChats).toContainEqual(testChat);

      chatFileService.removeFromCache(testFilePath);

      const updatedChats = await chatFileService.findAll();
      expect(updatedChats).not.toContainEqual(testChat);
    });

    it("should handle relative paths", async () => {
      const relativePath = "folder/chat-relative.json";
      const absolutePath = path.join(TEST_WORKSPACE_PATH, relativePath);

      // Add chat to cache with absolute path
      const testChat = createTestChat("chat-relative", absolutePath);
      (chatFileService as any).chatCache.set(absolutePath, testChat);

      chatFileService.removeFromCache(relativePath);

      const chats = await chatFileService.findAll();
      expect(chats).not.toContainEqual(testChat);
    });
  });
});
