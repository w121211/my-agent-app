import path from "path";
import { EventBus } from "../event-bus.js";
import { FileWatcher, createFileWatcher } from "../file-watcher.js";
import { ServerEventType } from "../event-types.js";

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

// Mock the EventBus
jest.mock("../event-bus", () => {
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
    })),
  };
});

describe("FileWatcher", () => {
  let fileWatcher: FileWatcher;
  let mockEventBus: EventBus;
  const workspacePath = "/test/workspace";

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = new EventBus({ environment: "server" });
    fileWatcher = new FileWatcher(mockEventBus, workspacePath);
  });

  test("constructor initializes with default options", () => {
    // Access the private field in FileWatcher for testing purposes
    const options = (fileWatcher as any).chokidarOptions;

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
    const customWatcher = new FileWatcher(
      mockEventBus,
      workspacePath,
      customOptions
    );

    // Access the private field in FileWatcher for testing purposes
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
    fileWatcher.startWatching();

    // Get the chokidar module
    const chokidar = require("chokidar");

    // Assert
    expect(chokidar.watch).toHaveBeenCalledWith(
      workspacePath,
      expect.any(Object)
    );
    expect(fileWatcher.isActive()).toBe(true);
  });

  test("startWatching does nothing if already watching", () => {
    // Arrange
    fileWatcher.startWatching();
    const chokidar = require("chokidar");
    chokidar.watch.mockClear();

    // Act
    fileWatcher.startWatching();

    // Assert
    expect(chokidar.watch).not.toHaveBeenCalled();
  });

  test("stopWatching closes the watcher", async () => {
    // Arrange
    fileWatcher.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();

    // Act
    await fileWatcher.stopWatching();

    // Assert
    expect(mockWatcher.close).toHaveBeenCalled();
    expect(fileWatcher.isActive()).toBe(false);
  });

  test("file events are emitted to the event bus", () => {
    // Arrange
    fileWatcher.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();
    const filePath = path.join(workspacePath, "test.json");

    // Act
    mockWatcher.triggerEvent("add", filePath);

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SERVER_FILE_SYSTEM",
        data: expect.objectContaining({
          eventType: "add",
          srcPath: "test.json",
          isDirectory: false,
        }),
      })
    );
  });

  test("directory events are emitted to the event bus", () => {
    // Arrange
    fileWatcher.startWatching();
    const chokidar = require("chokidar");
    const mockWatcher = chokidar.watch();
    const dirPath = path.join(workspacePath, "test-dir");

    // Act
    mockWatcher.triggerEvent("addDir", dirPath);

    // Assert
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SERVER_FILE_SYSTEM",
        data: expect.objectContaining({
          eventType: "addDir",
          srcPath: "test-dir",
          isDirectory: true,
        }),
      })
    );
  });
});

describe("createFileWatcher", () => {
  test("creates and starts a FileWatcher instance", () => {
    // Arrange
    const mockEventBus = new EventBus({ environment: "server" });
    const workspacePath = "/test/workspace";

    // Spy on FileWatcher's startWatching method
    const startWatchingSpy = jest.spyOn(FileWatcher.prototype, "startWatching");

    // Act
    const fileWatcher = createFileWatcher(mockEventBus, workspacePath);

    // Assert
    expect(fileWatcher).toBeInstanceOf(FileWatcher);
    expect(startWatchingSpy).toHaveBeenCalled();
    expect(fileWatcher.isActive()).toBe(true);

    // Clean up
    startWatchingSpy.mockRestore();
  });

  test("passes custom options to the FileWatcher constructor", () => {
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
