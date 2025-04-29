import fs from "node:fs/promises";
import path from "node:path";
import { IEventBus } from "../src/event-bus.js";
import {
  ClientOpenFileEvent,
  ServerFileOpenedEvent,
} from "../src/event-types.js";
import { FileService } from "../src/file-service.js";
import { fileExists } from "../src/repositories.js";

// Mock dependencies
jest.mock("node:fs/promises");
jest.mock("../src/repositories.js", () => ({
  fileExists: jest.fn(),
}));

describe("FileService", () => {
  let mockEventBus: jest.Mocked<IEventBus>;
  let fileService: FileService;
  let openFileHandler: Function;
  const workspacePath = "/workspace";

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockImplementation((event, handler) => {
        if (event === "ClientOpenFile") {
          openFileHandler = handler;
        }
        return jest.fn();
      }),
      subscribeToAllClientEvents: jest.fn().mockReturnValue(jest.fn()),
      subscribeToAllServerEvents: jest.fn().mockReturnValue(jest.fn()),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      hasHandlers: jest.fn().mockReturnValue(false),
      getHandlerCount: jest.fn().mockReturnValue(0),
      clear: jest.fn(),
    };

    fileService = new FileService(mockEventBus, workspacePath);
  });

  test("subscribes to ClientOpenFile events on initialization", () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledWith(
      "ClientOpenFile",
      expect.any(Function)
    );
  });

  describe("handleOpenFile", () => {
    test("skips chat files", async () => {
      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "test.chat.json",
        timestamp: new Date(),
      };

      await openFileHandler(event);

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test("throws error for non-existent files", async () => {
      (fileExists as jest.Mock).mockResolvedValue(false);

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "nonexistent.txt",
        timestamp: new Date(),
      };

      await expect(openFileHandler(event)).rejects.toThrow(
        "File does not exist: nonexistent.txt"
      );
    });

    test("reads text file and emits ServerFileOpened event", async () => {
      (fileExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue("file content");

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "test.js",
        timestamp: new Date(),
        correlationId: "test-correlation",
      };

      await openFileHandler(event);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        kind: "ServerFileOpened",
        filePath: "test.js",
        content: "file content",
        fileType: "javascript",
        timestamp: expect.any(Date),
        correlationId: "test-correlation",
      });
    });

    test("reads binary file and emits ServerFileOpened with base64 content", async () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03]);
      (fileExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(buffer);

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "image.png",
        timestamp: new Date(),
      };

      await openFileHandler(event);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        kind: "ServerFileOpened",
        filePath: "image.png",
        content: buffer.toString("base64"),
        fileType: "image",
        timestamp: expect.any(Date),
        correlationId: undefined,
      });
    });

    test("handles files with unknown extensions", async () => {
      (fileExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue("unknown content");

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "unknown.xyz",
        timestamp: new Date(),
      };

      await openFileHandler(event);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        kind: "ServerFileOpened",
        filePath: "unknown.xyz",
        content: "unknown content",
        fileType: "unknown",
        timestamp: expect.any(Date),
        correlationId: undefined,
      });
    });

    test("resolves paths correctly", async () => {
      (fileExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue("file content");

      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: "folder/test.txt",
        timestamp: new Date(),
      };

      await openFileHandler(event);

      expect(fileExists).toHaveBeenCalledWith(
        path.join(workspacePath, "folder/test.txt")
      );
    });

    test("uses absolute path when provided", async () => {
      (fileExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue("file content");

      const absolutePath = "/absolute/path/file.txt";
      const event: ClientOpenFileEvent = {
        kind: "ClientOpenFile",
        filePath: absolutePath,
        timestamp: new Date(),
      };

      await openFileHandler(event);

      expect(fileExists).toHaveBeenCalledWith(absolutePath);
    });
  });
});
