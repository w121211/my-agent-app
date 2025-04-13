import path from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { EventBus } from "../src/event-bus.js";
import { FileWatcherService } from "../src/file-watcher-service.js";
import {
  ServerFileWatcherEvent,
  ServerEventUnion,
  ServerWorkspaceFolderTreeResponsedEvent,
} from "../src/event-types.js";

describe("FileWatcherService Integration Tests", () => {
  let tempDir: string;
  let eventBus: EventBus;
  let fileWatcherService: FileWatcherService;
  // Separate arrays for different event types to avoid type issues
  let fileWatcherEvents: ServerFileWatcherEvent[] = [];
  let treeResponseEvents: ServerWorkspaceFolderTreeResponsedEvent[] = [];

  // Create a temporary directory and setup file watcher before tests
  beforeAll(async () => {
    // Create a temp directory for our test files
    tempDir = await mkdtemp(path.join(tmpdir(), "file-watcher-test-"));

    // Create the event bus for server environment
    eventBus = new EventBus({ environment: "server" });

    // Setup event bus subscriber to capture file watcher events
    eventBus.subscribe<ServerFileWatcherEvent>(
      "ServerFileWatcherEvent",
      (event) => {
        fileWatcherEvents.push(event);
      }
    );

    // Also subscribe to workspace tree response events
    eventBus.subscribe<ServerWorkspaceFolderTreeResponsedEvent>(
      "ServerWorkspaceFolderTreeResponsed",
      (event) => {
        treeResponseEvents.push(event);
      }
    );

    // Create the file watcher with a shorter wait time for tests
    fileWatcherService = new FileWatcherService(eventBus, tempDir, {
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Start watching the temp directory
    fileWatcherService.startWatching();

    // Wait for the 'ready' event before proceeding with tests
    await waitForEvent("ready", 5000);

    // Clear events to start fresh
    fileWatcherEvents = [];
  });

  // Clean up after all tests complete
  afterAll(async () => {
    // Stop the file watcher
    await fileWatcherService.stopWatching();

    // Clean up the temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  // Reset events arrays before each test
  beforeEach(() => {
    fileWatcherEvents = [];
    treeResponseEvents = [];
  });

  // Helper function to wait for a specific file watcher event type
  const waitForEvent = (eventKind: string, timeout = 2000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const checkInterval = 100;
      let elapsed = 0;

      const checkForEvent = () => {
        const event = fileWatcherEvents.find(
          (e) => e.data.fsEventKind === eventKind
        );
        if (event) {
          resolve();
          return;
        }

        elapsed += checkInterval;
        if (elapsed >= timeout) {
          reject(new Error(`Timeout waiting for ${eventKind} event`));
          return;
        }

        setTimeout(checkForEvent, checkInterval);
      };

      checkForEvent();
    });
  };

  test("should detect file creation", async () => {
    // Create a new file
    const filePath = path.join(tempDir, "test-file.txt");
    await writeFile(filePath, "Hello, World!");

    // Wait for add event
    await waitForEvent("add");

    // Verify that we received the correct event
    const addEvent = fileWatcherEvents.find(
      (e) =>
        e.data.fsEventKind === "add" &&
        path.basename(e.data.srcPath) === "test-file.txt"
    );

    expect(addEvent).toBeDefined();
    expect(addEvent?.data.isDirectory).toBe(false);
  });

  test("should detect file changes", async () => {
    // Create a file first
    const filePath = path.join(tempDir, "change-test.txt");
    await writeFile(filePath, "Initial content");

    // Wait for add event
    await waitForEvent("add");

    // Clear events
    fileWatcherEvents = [];

    // Modify the file
    await writeFile(filePath, "Modified content");

    // Wait for change event
    await waitForEvent("change");

    // Verify that we received the correct event
    const changeEvent = fileWatcherEvents.find(
      (e) =>
        e.data.fsEventKind === "change" &&
        path.basename(e.data.srcPath) === "change-test.txt"
    );

    expect(changeEvent).toBeDefined();
    expect(changeEvent?.data.isDirectory).toBe(false);
  });

  test("should detect directory creation", async () => {
    // Create a new directory
    const dirPath = path.join(tempDir, "test-dir");
    await mkdir(dirPath);

    // Wait for addDir event
    await waitForEvent("addDir");

    // Verify that we received the correct event
    const addDirEvent = fileWatcherEvents.find(
      (e) =>
        e.data.fsEventKind === "addDir" &&
        path.basename(e.data.srcPath) === "test-dir"
    );

    expect(addDirEvent).toBeDefined();
    expect(addDirEvent?.data.isDirectory).toBe(true);
  });

  test("should handle workspace tree request", async () => {
    // Create a subfolder structure
    const subDir = path.join(tempDir, "workspace-tree-test");
    await mkdir(subDir);
    await writeFile(path.join(subDir, "file1.txt"), "Test content");

    // Wait for events to be processed
    await waitForEvent("add");

    // Request workspace tree
    await eventBus.emit({
      kind: "ClientRequestWorkspaceFolderTree",
      timestamp: new Date(),
      correlationId: "test-correlation",
      workspacePath: "",
    });

    // Look for the response event with a timeout
    const waitForTreeResponse = async (
      timeout = 2000
    ): Promise<ServerWorkspaceFolderTreeResponsedEvent | null> => {
      return new Promise((resolve) => {
        const checkInterval = 100;
        let elapsed = 0;

        const checkForResponse = () => {
          if (treeResponseEvents.length > 0 && treeResponseEvents[0]) {
            // Access the first element with a safety check
            resolve(treeResponseEvents[0]);
            return;
          }

          elapsed += checkInterval;
          if (elapsed >= timeout) {
            resolve(null);
            return;
          }

          setTimeout(checkForResponse, checkInterval);
        };

        checkForResponse();
      });
    };

    const treeResponseEvent = await waitForTreeResponse();

    // Verify the response
    expect(treeResponseEvent).not.toBeNull();

    if (treeResponseEvent) {
      expect(treeResponseEvent.correlationId).toBe("test-correlation");
      expect(treeResponseEvent.folderTree).toBeDefined();

      // Define expected structure (might need to adjust based on exact implementation)
      const expectedStructure = {
        name: path.basename(tempDir),
        path: "/",
        isDirectory: true,
        children: [
          {
            name: "workspace-tree-test",
            path: "/workspace-tree-test",
            isDirectory: true,
            children: [
              {
                name: "file1.txt",
                path: "/workspace-tree-test/file1.txt",
                isDirectory: false,
              },
            ],
          },
          // Other files/folders created in previous tests would be here
        ],
      };

      // Verify tree structure matches expected structure
      // You might need a more sophisticated comparison that ignores
      // order of children or additional properties
      expect(
        verifyTreeStructure(treeResponseEvent.folderTree, expectedStructure)
      ).toBe(true);
    }
  });
});

// Helper function to verify tree structure
function verifyTreeStructure(actual: any, expected: any): boolean {
  // Check basic properties
  if (actual.name !== expected.name) return false;
  if (actual.isDirectory !== expected.isDirectory) return false;

  // For directories, verify children
  if (expected.isDirectory) {
    // Find matching children by name
    for (const expectedChild of expected.children) {
      const actualChild = actual.children.find(
        (child: any) => child.name === expectedChild.name
      );

      if (!actualChild) return false;

      // Recursively verify child structure
      if (!verifyTreeStructure(actualChild, expectedChild)) return false;
    }
  }

  return true;
}
