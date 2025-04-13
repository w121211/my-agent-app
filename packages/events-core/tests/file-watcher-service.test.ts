import path from "node:path";
import { EventBus } from "../src/event-bus.js";
import {
  FileWatcherService,
  createFileWatcher,
} from "../src/file-watcher-service.js";

interface MockWatcher {
  on: jest.Mock;
  close: jest.Mock;
  triggerEvent: (event: string, ...args: any[]) => void;
}

// Mock the chokidar library
jest.mock("chokidar", () => {
  const eventHandlers: Record<string, Function[]> = {};

  // Create the mock watcher with explicit type
  const mockWatcher: MockWatcher = {
    on: jest.fn((event, handler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
      return mockWatcher;
    }),
    close: jest.fn().mockResolvedValue(undefined),
    // Helper to trigger events in tests
    triggerEvent: (event: string, ...args: any[]) => {
      if (eventHandlers[event]) {
        eventHandlers[event].forEach((handler) => handler(...args));
      }
    },
  };

  return {
    watch: jest.fn(() => mockWatcher),
  };
});

// Mock fs/promises module
jest.mock("node:fs/promises", () => {
  return {
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true }),
    readdir: jest.fn().mockResolvedValue([]),
  };
});

// TODO: Consider not mocking EventBus and instead using a test instance
// Mock the EventBus
jest.mock("../src/event-bus", () => {
  return {
    EventBus: jest.fn().mockImplementation(() => ({
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockReturnValue(() => {}),
      subscribeToAllClientEvents: jest.fn().mockReturnValue(() => {}),
      subscribeToAllServerEvents: jest.fn().mockReturnValue(() => {}),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      hasHandlers: jest.fn().mockReturnValue(false),
      getHandlerCount: jest.fn().mockReturnValue(0),
      clear: jest.fn(),
      getEnvironment: jest.fn().mockReturnValue("server"),
    })),
  };
});

describe("FileWatcherService", () => {
  let fileWatcherService: FileWatcherService;
  let mockEventBus: EventBus;
  const workspacePath = "/test/workspace";

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = new EventBus({ environment: "server" });
    fileWatcherService = new FileWatcherService(mockEventBus, workspacePath);
  });

  test("constructor initializes with default options", () => {
    // Access the private field in FileWatcherService for testing purposes
    const options = (fileWatcherService as any).chokidarOptions;

    // Assert default options are set
    expect(options).toMatchObject({
      persistent: true,
      ignored: expect.arrayContaining([
        /(^|[\/\\])\../,
        "**/*.tmp",
        "**/*.log",
        "**/node_modules/**",
      ]),
      ignoreInitial: false,
      awaitWriteFinish: true,
    });
  });

  test("constructor merges user options with defaults", () => {
    // Arrange
    const customOptions = {
      ignored: ["**/*.csv"],
      ignoreInitial: true,
    };

    // Act
    const customWatcher = new FileWatcherService(
      mockEventBus,
      workspacePath,
      customOptions
    );

    // Access the private field in FileWatcherService for testing purposes
    const options = (customWatcher as any).chokidarOptions;

    // Assert options are properly merged
    expect(options).toMatchObject({
      persistent: true, // From default
      ignored: ["**/*.csv"], // From custom options (overriding default)
      ignoreInitial: true, // From custom options (overriding default)
      awaitWriteFinish: true, // From default
    });
  });

  test("startWatching initializes the file watcher", () => {
    // Act
    fileWatcherService.startWatching();

    // Get the chokidar module
    const chokidar = require("chokidar");

    // Assert
    expect(chokidar.watch).toHaveBeenCalledWith(
      workspacePath,
      expect.any(Object)
    );
    expect(fileWatcherService.isActive()).toBe(true);
  });

  test("startWatching does nothing if already watching", () => {
    // Arrange
    fileWatcherService.startWatching();
    const chokidar = require("chokidar");
    chokidar.watch.mockClear();

    // Act
    fileWatcherService.startWatching();

    // Assert
    expect(chokidar.watch).not.toHaveBeenCalled();
  });

  test("stopWatching closes the watcher", async () => {
    // Arrange
    fileWatcherService.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();

    // Act
    await fileWatcherService.stopWatching();

    // Assert
    expect(mockWatcher.close).toHaveBeenCalled();
    expect(fileWatcherService.isActive()).toBe(false);
  });

  test("file events are emitted to the event bus", () => {
    // Arrange
    fileWatcherService.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();
    const filePath = path.join(workspacePath, "test.json");

    // Act
    mockWatcher.triggerEvent("add", filePath);

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerFileWatcherEvent",
        timestamp: expect.any(Date),
        data: expect.objectContaining({
          fsEventKind: "add",
          srcPath: "test.json",
          isDirectory: false,
        }),
      })
    );
  });

  test("directory events are emitted to the event bus", () => {
    // Arrange
    fileWatcherService.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();
    const dirPath = path.join(workspacePath, "test-dir");

    // Act
    mockWatcher.triggerEvent("addDir", dirPath);

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerFileWatcherEvent",
        timestamp: expect.any(Date),
        data: expect.objectContaining({
          fsEventKind: "addDir",
          srcPath: "test-dir",
          isDirectory: true,
        }),
      })
    );
  });

  test("error events are emitted to the event bus", () => {
    // Arrange
    fileWatcherService.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();
    const testError = new Error("Test error");

    // Act
    mockWatcher.triggerEvent("error", testError);

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerFileWatcherEvent",
        timestamp: expect.any(Date),
        data: expect.objectContaining({
          fsEventKind: "error",
          srcPath: "",
          isDirectory: false,
          error: testError,
        }),
      })
    );
  });

  test("ready event is emitted to the event bus", () => {
    // Arrange
    fileWatcherService.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();

    // Act
    mockWatcher.triggerEvent("ready");

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerFileWatcherEvent",
        timestamp: expect.any(Date),
        data: expect.objectContaining({
          fsEventKind: "ready",
          srcPath: "",
          isDirectory: false,
        }),
      })
    );
  });

  test("handles workspace tree requests", async () => {
    // Arrange
    const fs = require("node:fs/promises");
    fs.stat.mockResolvedValue({ isDirectory: () => true });
    fs.readdir.mockResolvedValue([
      { name: "file1.txt", isDirectory: () => false },
      { name: "dir1", isDirectory: () => true },
    ]);

    // Mock buildFolderTree implementation
    const mockFolderTree = {
      name: "test",
      path: "/",
      isDirectory: true,
      children: [],
    };
    jest
      .spyOn(fileWatcherService as any, "buildFolderTree")
      .mockResolvedValue(mockFolderTree);

    // Act - simulate receiving a workspace tree request
    const requestEvent = {
      kind: "ClientRequestWorkspaceFolderTree",
      timestamp: new Date(),
      correlationId: "test-correlation-id",
      workspacePath: "",
    };

    await (fileWatcherService as any).handleWorkspaceTreeRequest(requestEvent);

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ServerWorkspaceFolderTreeResponsed",
        correlationId: "test-correlation-id",
        workspacePath: "",
        folderTree: mockFolderTree,
      })
    );
  });
});

describe("createFileWatcher", () => {
  test("creates and starts a FileWatcherService instance", () => {
    // Arrange
    const mockEventBus = new EventBus({ environment: "server" });
    const workspacePath = "/test/workspace";

    // Spy on FileWatcherService's startWatching method
    const startWatchingSpy = jest.spyOn(
      FileWatcherService.prototype,
      "startWatching"
    );

    // Act
    const fileWatcher = createFileWatcher(mockEventBus, workspacePath);

    // Assert
    expect(fileWatcher).toBeInstanceOf(FileWatcherService);
    expect(startWatchingSpy).toHaveBeenCalled();
    expect(fileWatcher.isActive()).toBe(true);

    // Clean up
    startWatchingSpy.mockRestore();
  });

  test("passes custom options to the FileWatcherService constructor", () => {
    // Arrange
    const mockEventBus = new EventBus({ environment: "server" });
    const workspacePath = "/test/workspace";
    const customOptions = {
      ignored: ["**/*.csv"],
      ignoreInitial: true,
    };

    // Get the chokidar module
    const chokidar = require("chokidar");

    // Act
    createFileWatcher(mockEventBus, workspacePath, customOptions);

    // Assert
    expect(chokidar.watch).toHaveBeenCalledWith(
      workspacePath,
      expect.objectContaining(customOptions)
    );
  });
});
